// Gemini連携: 記事の分類・公演情報抽出 (GitHub Actions実行用)。
// scripts/geminiClassifier.mjs と同等のロジック(旧 src/lib/officialNewsGemini.ts から移設。
// Vercel Cronルート廃止に伴い、表示専用となった src/lib からcrawler本体を分離した)。
//
// GEMINI_API_KEY未設定の場合は実際の呼び出しを一切行わず、needs_review:trueの
// 未分類結果を返す。設定されている場合のみ、無料枠モデル(既定 gemini-3.1-flash-lite、
// GEMINI_MODEL環境変数で上書き可)を1件ずつ呼び出す。
//
// 重要:
//   - APIキーはHTTPヘッダ(x-goog-api-key)で送る(URLのクエリパラメータには含めない)。
//   - APIキー・記事本文の値そのものはこのファイルのどこでもログ出力しない。
//   - 呼び出しは1件ずつ・逐次のみ(並列送信はしない。呼び出し側でも並列化しないこと)。
//   - maxOutputTokens=512、thinkingBudget=0に固定。
//   - 429(quota)時は既定でretryOn429:false(自動再試行しない)。quotaMetric/quotaId/
//     quotaValue/retryDelayを記録してai_status:"quota_exhausted"を返す。
//   - 有料モデルへの自動フォールバックは実装しない。

const DEFAULT_MODEL = "gemini-3.1-flash-lite";
const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const REQUEST_TIMEOUT_MS = 30000;
const MAX_BODY_CHARS = 4000;
const MAX_OUTPUT_TOKENS = 512;
const MAX_RETRY_WAIT_MS = 90000;

export type OfficialNewsCategory = "live" | "ticket" | "release" | "media" | "goods" | "fanclub" | "other";

export type GeminiClassifyInput = {
  artist_name: string;
  article_title: string;
  published_date: string | null;
  article_body: string | null;
  article_url: string;
};

export type GeminiUsage = {
  promptTokenCount: number | null;
  candidatesTokenCount: number | null;
  thoughtsTokenCount: number | null;
  totalTokenCount: number | null;
};

export type GeminiQuotaError = {
  quotaMetric: string | null;
  quotaId: string | null;
  quotaValue: string | null;
  retryDelay: string | null;
  retryDelaySeconds: number | null;
};

export type GeminiClassifyResult = {
  ai_status: "not_configured" | "classified" | "error" | "quota_exhausted";
  category: OfficialNewsCategory | null;
  is_event_candidate: boolean | null;
  event_name: string | null;
  tour_name: string | null;
  event_dates: string[] | null;
  venue_names: string[] | null;
  ticket_sale_start: string | null;
  ticket_sale_end: string | null;
  confidence: "high" | "medium" | "low" | null;
  needs_review: boolean;
  review_reason: string;
  usage: GeminiUsage | null;
  quota_error: GeminiQuotaError | null;
};

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    category: { type: "STRING", enum: ["live", "ticket", "release", "media", "goods", "fanclub", "other"] },
    is_event_candidate: { type: "BOOLEAN" },
    event_name: { type: "STRING", nullable: true },
    tour_name: { type: "STRING", nullable: true },
    event_dates: { type: "ARRAY", items: { type: "STRING" } },
    venue_names: { type: "ARRAY", items: { type: "STRING" } },
    ticket_sale_start: { type: "STRING", nullable: true },
    ticket_sale_end: { type: "STRING", nullable: true },
    confidence: { type: "STRING", enum: ["high", "medium", "low"] },
    needs_review: { type: "BOOLEAN" },
    review_reason: { type: "STRING" },
  },
  required: ["category", "is_event_candidate", "confidence", "needs_review", "review_reason"],
};

const SYSTEM_PROMPT = `あなたは日本のアイドル/K-POPアーティストの公式サイトNEWS記事を分類するアシスタントです。
記事のタイトルと本文(タイトル+本文の両方)を読み、以下のJSONスキーマに従って分類・抽出してください。

分類ルール:
- category は live/ticket/release/media/goods/fanclub/other のいずれか一つ。
- 「LIVE」「コンサート」等の単語が含まれていても、CD/デジタル配信/映像作品(Blu-ray/DVD)の
  発売告知であり実際のライブ公演の開催・チケット販売について述べていない場合はliveと判定せず、
  releaseまたはmediaと判定すること(例: 過去公演を収録したLIVE Blu-rayの発売告知はrelease)。
- category が goods/media/release/fanclub/other の場合、is_event_candidate は原則 false とする
  こと(物販・メディア出演・音楽リリース・ファンクラブ企画・その他の記事は、新規公演として
  登録すべき対象ではない)。
- category が live/ticket であっても、公演日程・会場等の具体的な情報が乏しく新規公演の登録には
  使えない案内記事(受付延期のお知らせ、注意喚起、当日運営・グッズ販売に関する案内など)の場合は
  needs_review: true とすること。
- is_event_candidate は、記事が実際に開催される(または開催された)ライブ・コンサート・イベントに
  関する情報を含む場合のみtrue。
- event_dates は可能な限り YYYY-MM-DD のISO 8601形式に統一すること。ただし、本文中に年が
  明記されている日付のみをISO形式にすること。published_dateや文脈から年を推測できるように
  見えても、本文中に年の記載が無い日付(例:「8月22日」のみで年の記載が無い)については、
  絶対に年を補完してはならない。その場合は本文中の表記をそのまま(月日のみ)保持し、
  needs_review: true とすること。
- event_dates/venue_names は本文に明記されている場合のみ配列で返す。複数日程・複数会場がある
  場合はすべて配列で保持すること(1件に丸めない)。
- ticket_sale_start/ticket_sale_end は公演本番の日付ではなく、チケット/抽選/先行受付の受付期間。
- 本文に書かれていない情報は絶対に推測しないこと。
- 情報が不足している、複数解釈がある、記事の主体(誰の公演か)が曖昧、等の場合はneeds_review:trueとし、
  review_reasonに理由を日本語で簡潔に記載すること。
- confidenceは自身の分類・抽出結果に対する確信度(high/medium/low)。`;

const NON_EVENT_CATEGORIES = new Set<OfficialNewsCategory>(["goods", "media", "release", "fanclub", "other"]);

function normalizeEventDate(raw: unknown): { value: string; needsReview: boolean } {
  if (raw == null) return { value: String(raw), needsReview: false };
  const s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return { value: s, needsReview: false };

  const m = /(\d{4})\s*[年/.\-]\s*(\d{1,2})\s*[月/.\-]\s*(\d{1,2})\s*日?/.exec(s);
  if (m) {
    const [, y, mo, d] = m;
    return { value: `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`, needsReview: false };
  }
  return { value: s, needsReview: true };
}

function buildUserPrompt(input: GeminiClassifyInput): string {
  const body = (input.article_body || "").slice(0, MAX_BODY_CHARS);
  return [
    `artist_name: ${input.artist_name}`,
    `article_title: ${input.article_title}`,
    `published_date: ${input.published_date ?? "(不明)"}`,
    `article_url: ${input.article_url}`,
    `article_body:\n${body || "(本文なし)"}`,
  ].join("\n\n");
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function sanitize(msg: string): string {
  return msg.replace(/([?&]key=)[^&\s]+/gi, "$1[REDACTED]");
}

function emptyClassification() {
  return {
    category: null,
    is_event_candidate: null,
    event_name: null,
    tour_name: null,
    event_dates: null,
    venue_names: null,
    ticket_sale_start: null,
    ticket_sale_end: null,
    confidence: null,
    needs_review: true,
    review_reason: "",
  };
}

function notConfiguredResult(reason: string): GeminiClassifyResult {
  return { ai_status: "not_configured", ...emptyClassification(), review_reason: reason, usage: null, quota_error: null };
}

function errorResult(reason: string, usage: GeminiUsage | null = null): GeminiClassifyResult {
  return { ai_status: "error", ...emptyClassification(), review_reason: sanitize(reason), usage, quota_error: null };
}

function quotaExhaustedResult(quotaError: GeminiQuotaError): GeminiClassifyResult {
  return {
    ai_status: "quota_exhausted",
    ...emptyClassification(),
    review_reason: "Gemini無料枠のクォータ上限に達したため、この記事は未処理のまま次回に持ち越し。",
    usage: null,
    quota_error: quotaError,
  };
}

function extractUsage(data: { usageMetadata?: Record<string, number> }): GeminiUsage | null {
  const u = data?.usageMetadata;
  if (!u) return null;
  return {
    promptTokenCount: u.promptTokenCount ?? null,
    candidatesTokenCount: u.candidatesTokenCount ?? null,
    thoughtsTokenCount: u.thoughtsTokenCount ?? null,
    totalTokenCount: u.totalTokenCount ?? null,
  };
}

function parseRetryDelaySeconds(retryDelayStr: string | null): number | null {
  if (!retryDelayStr) return null;
  const m = /^([\d.]+)s$/.exec(retryDelayStr);
  return m ? parseFloat(m[1]) : null;
}

type GoogleErrorDetail = {
  ["@type"]?: string;
  violations?: { quotaMetric?: string; quotaId?: string; quotaValue?: string }[];
  retryDelay?: string;
};

function parseQuotaError(errorJson: { error?: { details?: GoogleErrorDetail[] } } | null): GeminiQuotaError {
  const details = errorJson?.error?.details;
  if (!Array.isArray(details)) {
    return { quotaMetric: null, quotaId: null, quotaValue: null, retryDelay: null, retryDelaySeconds: null };
  }
  const quotaFailure = details.find((d) => d["@type"]?.includes("QuotaFailure"));
  const retryInfo = details.find((d) => d["@type"]?.includes("RetryInfo"));
  const violation = quotaFailure?.violations?.[0];
  const retryDelay = retryInfo?.retryDelay ?? null;
  return {
    quotaMetric: violation?.quotaMetric ?? null,
    quotaId: violation?.quotaId ?? null,
    quotaValue: violation?.quotaValue ?? null,
    retryDelay,
    retryDelaySeconds: parseRetryDelaySeconds(retryDelay),
  };
}

async function callOnce(
  model: string,
  apiKey: string,
  input: GeminiClassifyInput,
  fetchImpl: typeof fetch,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(`${API_BASE}/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: buildUserPrompt(input) }] }],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: MAX_OUTPUT_TOKENS,
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function classifyArticleWithGemini(
  input: GeminiClassifyInput,
  options: { retryOn429?: boolean; fetchImpl?: typeof fetch; timeoutMs?: number } = {},
): Promise<GeminiClassifyResult> {
  const {
    retryOn429 = false,
    fetchImpl = fetch,
    timeoutMs = REQUEST_TIMEOUT_MS,
  } = options;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return notConfiguredResult("GEMINI_API_KEY未設定のためAI分類は未実施。手動確認が必要です。");
  }
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;

  try {
    let res = await callOnce(model, apiKey, input, fetchImpl, timeoutMs);

    if (res.status === 429) {
      const errJson = await res.json().catch(() => null);
      const quota = parseQuotaError(errJson);

      if (!retryOn429) {
        return quotaExhaustedResult(quota);
      }

      if (quota.retryDelaySeconds != null) {
        const waitMs = Math.min(quota.retryDelaySeconds * 1000, MAX_RETRY_WAIT_MS);
        await sleep(waitMs);
        res = await callOnce(model, apiKey, input, fetchImpl, timeoutMs);
        if (res.status === 429) {
          const errJson2 = await res.json().catch(() => null);
          return quotaExhaustedResult(parseQuotaError(errJson2));
        }
      } else {
        return quotaExhaustedResult(quota);
      }
    }

    if (!res.ok) {
      return errorResult(`Gemini APIエラー: HTTP ${res.status}`);
    }

    const data = await res.json();
    const usage = extractUsage(data);
    const finishReason: string | undefined = data?.candidates?.[0]?.finishReason;
    if (finishReason === "MAX_TOKENS") {
      return errorResult("Gemini response exceeded maxOutputTokens and was not classified", usage);
    }
    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return errorResult("Gemini応答にテキストが含まれていません(safety blockまたはmaxOutputTokens超過の可能性)", usage);
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(text);
    } catch {
      return errorResult("Gemini応答のJSONパースに失敗しました", usage);
    }

    if (
      typeof parsed.category !== "string" ||
      ![
        "live",
        "ticket",
        "release",
        "media",
        "goods",
        "fanclub",
        "other",
      ].includes(parsed.category) ||
      typeof parsed.is_event_candidate !== "boolean" ||
      !["high", "medium", "low"].includes(String(parsed.confidence)) ||
      typeof parsed.needs_review !== "boolean" ||
      typeof parsed.review_reason !== "string"
    ) {
      return errorResult("Gemini response JSON failed classification schema validation", usage);
    }

    const category = (parsed.category as OfficialNewsCategory | undefined) ?? null;
    let isEventCandidate = (parsed.is_event_candidate as boolean | undefined) ?? null;
    let needsReview = (parsed.needs_review as boolean | undefined) ?? true;
    const reviewNotes = [(parsed.review_reason as string | undefined) ?? ""];

    if (category && NON_EVENT_CATEGORIES.has(category) && isEventCandidate === true) {
      isEventCandidate = false;
      reviewNotes.push(`[自動補正] category=${category} のため is_event_candidate を false に強制。`);
    }

    const bodyText = input.article_body || "";
    const rawDates = Array.isArray(parsed.event_dates) ? (parsed.event_dates as unknown[]) : [];
    let dateAmbiguous = false;
    const eventDates = rawDates.map((d) => {
      const r = normalizeEventDate(d);
      if (r.needsReview) dateAmbiguous = true;
      return r.value;
    });
    for (const d of eventDates) {
      const m = /^(\d{4})-\d{2}-\d{2}$/.exec(d || "");
      if (m && !bodyText.includes(m[1])) dateAmbiguous = true;
    }
    if (dateAmbiguous) {
      needsReview = true;
      reviewNotes.push("[自動補正] event_datesの年が本文中で確認できない、または年が確定できない表記が含まれるため、needs_review=trueに設定。");
    }

    return {
      ai_status: "classified",
      category,
      is_event_candidate: isEventCandidate,
      event_name: (parsed.event_name as string | undefined) ?? null,
      tour_name: (parsed.tour_name as string | undefined) ?? null,
      event_dates: eventDates,
      venue_names: Array.isArray(parsed.venue_names) ? (parsed.venue_names as string[]) : [],
      ticket_sale_start: (parsed.ticket_sale_start as string | undefined) ?? null,
      ticket_sale_end: (parsed.ticket_sale_end as string | undefined) ?? null,
      confidence: (parsed.confidence as GeminiClassifyResult["confidence"]) ?? null,
      needs_review: needsReview,
      review_reason: reviewNotes.filter(Boolean).join(" "),
      usage,
      quota_error: null,
    };
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      return errorResult("Gemini request timed out; article remains unclassified");
    }
    return errorResult(`Gemini呼び出し中に例外が発生しました: ${e instanceof Error ? e.message : String(e)}`);
  }
}
