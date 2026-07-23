// Gemini連携: 記事の分類・公演情報抽出。
//
// GEMINI_API_KEY未設定の場合は実際の呼び出しを一切行わず、needs_review:trueの
// 未分類候補を返す。設定されている場合のみ、無料枠モデル(デフォルト gemini-3.1-flash-lite、
// GEMINI_MODEL環境変数で上書き可)を1件ずつ呼び出す。
//
// 重要:
//   - APIキーはHTTPヘッダ(x-goog-api-key)で送る(URLのクエリパラメータには含めない)。
//   - APIキー・記事本文の値そのものはこのファイルのどこでもログ出力しない。
//   - 呼び出しは1件ずつ・逐次のみ(並列送信はしない。並列化は呼び出し側でも行わないこと)。
//   - maxOutputTokens=512 に固定してトークン消費を抑える。
//   - 429(quota)時: エラー詳細のquotaMetric/quotaId/quotaValue/retryDelayを記録し、
//     既定(retryOn429:false)では自動再試行を一切行わずai_status:"quota_exhausted"を返す。
//     retryOn429:trueを明示的に渡した場合のみ、retryDelay判明時に1回だけ待って再試行する。
//   - 有料モデルへの自動フォールバックは実装しない。

const DEFAULT_MODEL = "gemini-3.1-flash-lite";
const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const REQUEST_TIMEOUT_MS = 30000;
const MAX_BODY_CHARS = 4000; // トークン量を抑えるため本文を安全な長さに切り詰める
// GEMINI_MAX_OUTPUT_TOKENS環境変数で上書き可能(既定512)。
const MAX_OUTPUT_TOKENS = Number(process.env.GEMINI_MAX_OUTPUT_TOKENS) > 0 ? Number(process.env.GEMINI_MAX_OUTPUT_TOKENS) : 512;
const MAX_RETRY_WAIT_MS = 90000; // retryDelayが長大な場合に無限に待ち続けないための上限

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    category: {
      type: "STRING",
      enum: ["live", "ticket", "release", "media", "goods", "fanclub", "other"],
    },
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

const NON_EVENT_CATEGORIES = new Set(["goods", "media", "release", "fanclub", "other"]);

// "2026年7月11日(土)" 等の和暦区切り表記をISO(YYYY-MM-DD)へ正規化する。
// 年が本文中に見当たらない表記("7月11日"等)は推測せず元の文字列を保持し、needsReview:trueを返す。
function normalizeEventDate(raw) {
  if (raw == null) return { value: raw, needsReview: false };
  const s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return { value: s, needsReview: false };

  let m = s.match(/(\d{4})\s*[年\/.\-]\s*(\d{1,2})\s*[月\/.\-]\s*(\d{1,2})\s*日?/);
  if (m) {
    const [, y, mo, d] = m;
    return { value: `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`, needsReview: false };
  }

  // 年を含まない日付表記("7月11日" "7/11" 等) -> 推測しない。元表記を保持しレビュー対象にする。
  return { value: s, needsReview: true };
}

function buildUserPrompt(input) {
  const body = (input.article_body || "").slice(0, MAX_BODY_CHARS);
  return [
    `artist_name: ${input.artist_name}`,
    `article_title: ${input.article_title}`,
    `published_date: ${input.published_date ?? "(不明)"}`,
    `article_url: ${input.article_url}`,
    `article_body:\n${body || "(本文なし)"}`,
  ].join("\n\n");
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// キーが誤って文字列化されてもログに残らないよう、query文字列の"key="以降を伏せる保険。
function sanitize(msg) {
  if (typeof msg !== "string") return String(msg);
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

function notConfiguredResult(reason) {
  return { ai_status: "not_configured", ...emptyClassification(), review_reason: reason, usage: null, quota_error: null };
}

function errorResult(reason, usage = null, rateLimitHeaders = null) {
  return {
    ai_status: "error",
    ...emptyClassification(),
    review_reason: sanitize(reason),
    usage,
    quota_error: null,
    rate_limit_headers: rateLimitHeaders,
  };
}

function quotaExhaustedResult(quotaError, rateLimitHeaders = null) {
  return {
    ai_status: "quota_exhausted",
    ...emptyClassification(),
    review_reason: "Gemini無料枠のクォータ上限に達したため、この記事は未処理のまま次回に持ち越し。",
    usage: null,
    quota_error: quotaError,
    rate_limit_headers: rateLimitHeaders,
  };
}

// RPM/TPM/RPDの具体的な数値はレスポンスヘッダとしては返らないことが多いが、
// 将来ヘッダが追加された場合に備えて rate-limit/quota 系ヘッダ名を広く拾っておく。
function extractRateLimitHeaders(res) {
  const found = {};
  for (const [key, value] of res.headers.entries()) {
    if (/ratelimit|quota/i.test(key)) found[key] = value;
  }
  return Object.keys(found).length > 0 ? found : null;
}

function extractUsage(data) {
  const u = data?.usageMetadata;
  if (!u) return null;
  return {
    promptTokenCount: u.promptTokenCount ?? null,
    candidatesTokenCount: u.candidatesTokenCount ?? null,
    thoughtsTokenCount: u.thoughtsTokenCount ?? null,
    totalTokenCount: u.totalTokenCount ?? null,
  };
}

function parseRetryDelaySeconds(retryDelayStr) {
  if (!retryDelayStr) return null;
  const m = /^([\d.]+)s$/.exec(retryDelayStr);
  return m ? parseFloat(m[1]) : null;
}

// Google標準のエラーdetails配列からQuotaFailure/RetryInfoを抜き出す。
// フィールドが存在しない場合はnullのまま返す(捏造しない)。
function parseQuotaError(errorJson) {
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

async function callOnce(model, apiKey, input) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}/${model}:generateContent`, {
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
          // thinkingBudget:0(完全無効化)。gemini-3.1-flash-liteで動作確認済み
          // (gemini-flash-latestではHTTP 400で拒否されるため、モデルによって挙動が異なる点に注意)。
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * @param {{artist_name: string, article_title: string, published_date: string|null,
 *          article_body: string|null, article_url: string}} input
 * @param {{retryOn429?: boolean}} options - retryOn429:true にすると、retryDelay判明時に
 *   1回だけ待って再試行する(過去の挙動)。既定はfalse: 429時は一切自動再試行せず、
 *   quotaMetric/quotaId/retryDelayを記録してquota_exhaustedを返す。
 */
export async function classifyArticleWithGemini(input, options = {}) {
  const { retryOn429 = false } = options;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return notConfiguredResult("GEMINI_API_KEY未設定のためAI分類は未実施。手動確認が必要です。");
  }
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;

  try {
    let res = await callOnce(model, apiKey, input);

    if (res.status === 429) {
      const firstRateLimitHeaders = extractRateLimitHeaders(res);
      const errJson = await res.json().catch(() => null);
      const quota = parseQuotaError(errJson);

      if (!retryOn429) {
        // 自動再試行は行わない。quota詳細を記録して未処理のまま返す。
        return quotaExhaustedResult(quota, firstRateLimitHeaders);
      }

      if (quota.retryDelaySeconds != null) {
        const waitMs = Math.min(quota.retryDelaySeconds * 1000, MAX_RETRY_WAIT_MS);
        await sleep(waitMs);
        res = await callOnce(model, apiKey, input);
        if (res.status === 429) {
          const errJson2 = await res.json().catch(() => null);
          return quotaExhaustedResult(parseQuotaError(errJson2), extractRateLimitHeaders(res));
        }
        // 再試行で200等になった場合はそのまま下の通常処理へフォールスルーする。
      } else {
        // retryDelayが不明な場合は無期限に待たず、ここで諦める。
        return quotaExhaustedResult(quota, firstRateLimitHeaders);
      }
    }

    if (!res.ok) {
      return errorResult(`Gemini APIエラー: HTTP ${res.status}`, null, extractRateLimitHeaders(res));
    }

    const rateLimitHeaders = extractRateLimitHeaders(res);
    const data = await res.json();
    const usage = extractUsage(data);
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return errorResult("Gemini応答にテキストが含まれていません(safety blockまたはmaxOutputTokens超過の可能性)", usage);
    }

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      return errorResult("Gemini応答のJSONパースに失敗しました", usage);
    }

    const category = parsed.category ?? null;
    let isEventCandidate = parsed.is_event_candidate ?? null;
    let needsReview = parsed.needs_review ?? true;
    const reviewNotes = [parsed.review_reason ?? ""];

    // ルール1: goods/media/release/fanclub/other は is_event_candidate を原則falseに強制する
    // (プロンプト指示のみに頼らず、確実に適用するための後処理)。
    if (category && NON_EVENT_CATEGORIES.has(category) && isEventCandidate === true) {
      isEventCandidate = false;
      reviewNotes.push(
        "[自動補正] category=" + category + " のため is_event_candidate を false に強制。"
      );
    }

    // ルール3/4: event_datesをISO形式へ正規化。年が不明な表記は元のまま保持しneeds_review:trueにする。
    const bodyText = input.article_body || "";
    const rawDates = Array.isArray(parsed.event_dates) ? parsed.event_dates : [];
    let dateAmbiguous = false;
    const eventDates = rawDates.map((d) => {
      const r = normalizeEventDate(d);
      if (r.needsReview) dateAmbiguous = true;
      return r.value;
    });
    // 安全策: モデルがISO形式で年を補完して返してきた場合でも、その年が本文中に
    // 一度も明記されていなければ「年を推測した疑いあり」としてneeds_reviewを立てる
    // (フォーマットが正しく見えるだけでは、年を推測していないことの証明にならないため)。
    for (const d of eventDates) {
      const m = /^(\d{4})-\d{2}-\d{2}$/.exec(d || "");
      if (m && !bodyText.includes(m[1])) {
        dateAmbiguous = true;
      }
    }
    if (dateAmbiguous) {
      needsReview = true;
      reviewNotes.push("[自動補正] event_datesの年が本文中で確認できない、または年が確定できない表記が含まれるため、needs_review=trueに設定。");
    }

    return {
      ai_status: "classified",
      category,
      is_event_candidate: isEventCandidate,
      event_name: parsed.event_name ?? null,
      tour_name: parsed.tour_name ?? null,
      event_dates: eventDates,
      venue_names: parsed.venue_names ?? [],
      ticket_sale_start: parsed.ticket_sale_start ?? null,
      ticket_sale_end: parsed.ticket_sale_end ?? null,
      confidence: parsed.confidence ?? null,
      needs_review: needsReview,
      review_reason: reviewNotes.filter(Boolean).join(" "),
      usage,
      quota_error: null,
      rate_limit_headers: rateLimitHeaders,
    };
  } catch (e) {
    return errorResult(`Gemini呼び出し中に例外が発生しました: ${e && e.message ? e.message : e}`);
  }
}
