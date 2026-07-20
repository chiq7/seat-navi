/**
 * イベントクローラの共有ロジック。
 * /api/cron/fetch-events (Next.js route) と scripts/dry-run-fetch-events.ts の両方から利用する。
 */

import type Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import crypto from "crypto";
import type { DisabledVenue, FollowMonthLinksVenue, MonthlyPatternVenue, VenueConfig } from "@/lib/eventCrawlerConfig";
import { generateMonthlyPages, getVenueIdAliases, targetMonths } from "@/lib/eventCrawlerConfig";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnySupabaseClient = SupabaseClient<any, any, any>;

export const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
];

export const MAX_TEXT_CHARS = 80_000; // Claude APIに送るテキストの上限（ページ単位。安全弁として維持）
export const CLAUDE_MODEL = "claude-haiku-4-5-20251001";
export const CLAUDE_CONCURRENCY = 3; // Claude呼び出しの同時実行数上限
export const MAX_FOLLOW_PAGES = 20; // follow_month_links型が辿る最大ページ数（安全上限）

export const EXTRACT_PROMPT = (venueName: string, text: string) => `\
以下は「${venueName}」のスケジュールページから抽出したテキストです。

このテキストから「コンサート・ライブ公演」のみを抽出し、JSONのみを返してください（前後の説明文・コードブロック不要）。

出力フォーマット:
[
  {
    "title": "イベントタイトル（アーティスト名を含む完全な名称）",
    "date": "公演日。元ページの表記のままで構いません（例: 2026-10-31 / 2026年10月31日 / 10/31 / 10.31）。不明なら null",
    "genre": "kpop | johnnys | female_idol | male_idol | other"
  }
]

ジャンル分類:
- kpop: 韓国K-POPアーティスト（BTS, TWICE, aespa, SEVENTEEN 等）
- johnnys: ジャニーズ/STARTO系（Snow Man, SixTONES, King & Prince 等）
- female_idol: 日本女性アイドル（乃木坂46, AKB48, NiziU 等）
- male_idol: 日本男性アイドル（BE:FIRST, JO1, BOYS AND MEN 等）
- other: バンド, 演歌, クラシック, スポーツイベント, 展示会, 会議 等

複数日程の扱い（重要）:
- 同一公演が複数の日付で開催される場合（例: 10/31・11/1の2日間公演）、1つのオブジェクトに日付をまとめず、日付ごとに別々のオブジェクトとして出力してください。
- その際、titleは全ての日付で同じ文字列にしてください。
- 例:
  入力（ページ内テキストの一部）: "10.31 Sat 開場16:00/開演17:00　11.1 Sun 開場15:00/開演16:00　Mr.Children Tour 2026"
  出力:
  [
    { "title": "Mr.Children Tour 2026", "date": "10.31", "genre": "other" },
    { "title": "Mr.Children Tour 2026", "date": "11.1", "genre": "other" }
  ]

注意:
- スポーツ試合・展示会・会議・卒業式等は除外
- コンサート/ライブが一件もなければ空配列 [] を返す
- タイトルが空の場合はスキップ

テキスト:
${text}`;

// ---------------------------------------------------------------------------
// ユーティリティ
// ---------------------------------------------------------------------------

export function makeEventId(venueId: string, date: string | null, title: string): string {
  const raw = `${venueId}::${date ?? ""}::${title}`;
  return crypto.createHash("sha256").update(raw, "utf8").digest("hex").slice(0, 20);
}

export function stripHtml(html: string): string {
  // script/style タグとその内容を除去
  let text = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#\d+;/g, " ");

  // 連続する空白・改行を圧縮
  text = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .join("\n");

  return text;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)));
}

export type FetchResult = {
  url: string;
  status: number | "ERROR";
  html: string | null;
  chars: number;
  error: string | null;
  contentType: string;
  contentEncoding: string;
  elapsedMs: number;
};

type MonthTag = { year: number | null; month: number | null; statusKind?: "future_unpublished" | "error" | "config_error" };
export type CrawledPage = FetchResult & MonthTag;

export type EventRow = {
  id: string;
  title: string;
  venue: string;
  venue_id: string;
  date: string | null;
  genre: string;
};

export type MatchedExistingEvent = {
  extractedTitle: string;
  existingTitle: string;
  date: string | null;
  extractedVenueId: string;
  existingVenueId: string;
  existingId: string;
};

export type AmbiguousMatch = {
  extractedTitle: string;
  date: string | null;
  extractedVenueId: string;
  matches: Array<{ id: string; title: string; venue_id: string }>;
};

export type InvalidDateEntry = {
  title: string;
  venue: string;
  venueId: string;
  rawDate: string | null;
  sourceUrl: string;
};

export type MultiDayExpansion = {
  title: string;
  venueId: string;
  rawDate: string | null;
  expandedDates: string[];
  sourceUrl: string;
};

// ---------------------------------------------------------------------------
// 文字コード判定・デコード
// fetch().text() は charset を無視して常にUTF-8として復号する（WHATWG Fetch仕様）ため、
// EUC-JP / Shift_JIS 等を宣言するサイトで文字化けする。arrayBuffer + TextDecoder で
// Content-Type の charset を尊重し、charset不明時のみ候補を試して自動判定する。
// 追加npmパッケージは使わず、Node/ブラウザ標準の TextDecoder (WHATWG Encoding Standard) のみ使用。
// ---------------------------------------------------------------------------

const CHARSET_AUTO_DETECT_CANDIDATES = ["utf-8", "shift_jis", "euc-jp"];

function extractCharsetLabel(contentType: string): string | null {
  const m = /charset\s*=\s*"?([^;"]+)"?/i.exec(contentType);
  if (!m) return null;
  const label = m[1].trim().toLowerCase();
  return label && label !== "unknown" ? label : null;
}

function countReplacementChars(text: string): number {
  return (text.match(/�/g) ?? []).length;
}

function decodeHtmlBuffer(buffer: ArrayBuffer, contentType: string): string {
  const declared = extractCharsetLabel(contentType);
  if (declared) {
    try {
      return new TextDecoder(declared, { fatal: false }).decode(buffer);
    } catch {
      // 未知/未対応のラベルは自動判定にフォールバックする
    }
  }

  // charset不明時のみ: UTF-8を最優先で試し、置換文字(U+FFFD)が出なければ確定。
  // 出た場合のみ Shift_JIS / EUC-JP を試し、最も置換文字が少ないものを採用する。
  let best: { text: string; replacementCount: number } | null = null;
  for (const encoding of CHARSET_AUTO_DETECT_CANDIDATES) {
    let text: string;
    try {
      text = new TextDecoder(encoding, { fatal: false }).decode(buffer);
    } catch {
      continue;
    }
    const replacementCount = countReplacementChars(text);
    if (!best || replacementCount < best.replacementCount) best = { text, replacementCount };
    if (replacementCount === 0) break;
  }
  return best ? best.text : new TextDecoder("utf-8", { fatal: false }).decode(buffer);
}

export async function fetchPage(url: string): Promise<FetchResult> {
  const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": ua,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
      },
      signal: AbortSignal.timeout(15_000),
    });
    const elapsedMs = Date.now() - t0;
    const contentType = res.headers.get("content-type") ?? "";
    const contentEncoding = res.headers.get("content-encoding") ?? "";
    console.log(
      `    GET ${url} -> ${res.status} (${elapsedMs}ms) Content-Type=${contentType || "(none)"} Content-Encoding=${contentEncoding || "(none)"}`
    );
    if (!res.ok) {
      return { url, status: res.status, html: null, chars: 0, error: `HTTP ${res.status}`, contentType, contentEncoding, elapsedMs };
    }
    const buffer = await res.arrayBuffer();
    const html = decodeHtmlBuffer(buffer, contentType);
    return { url, status: res.status, html, chars: html.length, error: null, contentType, contentEncoding, elapsedMs };
  } catch (err) {
    const elapsedMs = Date.now() - t0;
    const error = err instanceof Error ? err.message : String(err);
    console.log(`    GET ${url} -> ERROR (${elapsedMs}ms): ${error}`);
    return { url, status: "ERROR", html: null, chars: 0, error, contentType: "", contentEncoding: "", elapsedMs };
  }
}

// ---------------------------------------------------------------------------
// HTML健全性チェック（バイナリ・文字化けの検出。<html>欠落だけでは即エラーにしない）
// ---------------------------------------------------------------------------

const CONTROL_CHAR_RE = /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g;
const MARKUP_HINTS = ["<html", "<!doctype", "<body", "<div", "<a ", "<a>", "<table", "<p>", "<p ", "<span", "<ul", "<li"];

export function checkHtmlSanity(text: string): { ok: boolean; reason: string } {
  if (!text || !text.trim()) return { ok: false, reason: "本文が空です" };
  const sample = text.slice(0, 20_000);
  const n = sample.length;
  const controlCount = (sample.match(CONTROL_CHAR_RE) ?? []).length;
  const replacementCount = (sample.match(/�/g) ?? []).length;
  const controlRatio = controlCount / n;
  const replacementRatio = replacementCount / n;

  if (controlRatio > 0.02) return { ok: false, reason: `制御文字比率が異常です(${(controlRatio * 100).toFixed(1)}%)` };
  if (replacementRatio > 0.01) return { ok: false, reason: `文字化け(置換文字U+FFFD)比率が異常です(${(replacementRatio * 100).toFixed(1)}%)` };

  const lowered = sample.toLowerCase();
  const hasMarkup = MARKUP_HINTS.some((tag) => lowered.includes(tag));
  if (!hasMarkup) {
    let printable = 0;
    for (const c of sample) {
      const code = c.codePointAt(0) ?? 0;
      if (c === "\n" || c === "\r" || c === "\t" || (code >= 0x20 && code !== 0x7f)) printable++;
    }
    const printableRatio = printable / n;
    if (printableRatio < 0.9) return { ok: false, reason: "HTMLタグが検出できず印字可能文字比率も低いため異常な本文です" };
  }
  return { ok: true, reason: "" };
}

export function applySanityCheck(page: FetchResult): void {
  if (page.html === null) return;
  const { ok, reason } = checkHtmlSanity(page.html);
  if (!ok) {
    console.warn(`    [${page.url}] 本文異常のためスキップ: ${reason}`);
    page.html = null;
    page.error = `本文異常: ${reason}`;
  }
}

// ---------------------------------------------------------------------------
// 404の扱い（monthly_pattern。例: 甲子園の未来月未公開）
// ---------------------------------------------------------------------------

export function classifyMonthly404s(pages: CrawledPage[], now: Date): boolean {
  const { year: cy, month: cm } = targetMonths(now)[1]; // index1 = 当月 (offset 0)
  const all404 = pages.length > 0 && pages.every((p) => p.status === 404);

  for (const p of pages) {
    if (p.status !== 404) continue;
    if (all404) {
      p.statusKind = "config_error";
      continue;
    }
    if (p.year !== null && p.month !== null && (p.year > cy || (p.year === cy && p.month > cm))) {
      p.statusKind = "future_unpublished";
      p.error = null;
    } else {
      p.statusKind = "error";
    }
  }
  return all404;
}

// ---------------------------------------------------------------------------
// follow_month_links: 月切替リンクを辿るクローラ（有明アリーナ・日産スタジアム）
// ---------------------------------------------------------------------------

const MONTH_TEXT_RE_JP = /(\d{4})\s*年\s*(\d{1,2})\s*月/;
const MONTH_TEXT_RE_EN = /(\d{4})\s+(\d{1,2})\s+[A-Za-z]{3,}/;

export function parseMonthFromText(text: string): { year: number; month: number } | null {
  const t = text.trim();
  let m = MONTH_TEXT_RE_JP.exec(t);
  if (m) return { year: Number(m[1]), month: Number(m[2]) };
  m = MONTH_TEXT_RE_EN.exec(t);
  if (m) return { year: Number(m[1]), month: Number(m[2]) };
  return null;
}

export function extractLinks(html: string, baseUrl: string): { url: string; text: string }[] {
  const links: { url: string; text: string }[] = [];
  const anchorRe = /<a\b[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = anchorRe.exec(html))) {
    const href = match[1];
    const text = decodeEntities(match[2].replace(/<[^>]+>/g, " "))
      .replace(/\s+/g, " ")
      .trim();
    try {
      links.push({ url: new URL(href, baseUrl).toString(), text });
    } catch {
      // 不正なURLは無視
    }
  }
  return links;
}

export async function followMonthLinks(
  venue: FollowMonthLinksVenue,
  now: Date
): Promise<{
  pages: CrawledPage[];
  unreachableMonths: { year: number; month: number }[];
}> {
  const targets = targetMonths(now);
  const targetKeys = new Set(targets.map((t) => `${t.year}-${t.month}`));
  const domain = new URL(venue.startUrl).host;

  const visited = new Set<string>();
  const queue: { url: string; knownMonth: { year: number; month: number } | null }[] = [
    { url: venue.startUrl, knownMonth: null },
  ];
  const pages: CrawledPage[] = [];
  const monthToUrl = new Map<string, string>();

  while (queue.length > 0 && visited.size < MAX_FOLLOW_PAGES) {
    const next = queue.shift();
    if (!next) break;
    const { url, knownMonth } = next;
    if (visited.has(url)) continue;
    visited.add(url);

    const page = await fetchPage(url);
    applySanityCheck(page);

    let month = knownMonth;
    const candidateLinks: { url: string; month: { year: number; month: number } | null }[] = [];

    if (page.html !== null) {
      for (const { url: absUrl, text } of extractLinks(page.html, url)) {
        let linkHost: string;
        try {
          linkHost = new URL(absUrl).host;
        } catch {
          continue;
        }
        if (linkHost !== domain) continue; // 同一公式ドメイン外は辿らない
        const m = parseMonthFromText(text);
        if (absUrl === url && m && !month) month = m;
        candidateLinks.push({ url: absUrl, month: m });
      }

      if (!month) {
        // 自己参照リンクで判定できない場合はページ内の表示年月から判定する
        const pageText = stripHtml(page.html);
        const m = MONTH_TEXT_RE_JP.exec(pageText) ?? MONTH_TEXT_RE_EN.exec(pageText);
        if (m) month = { year: Number(m[1]), month: Number(m[2]) };
      }
    }

    const crawledPage: CrawledPage = { ...page, year: month?.year ?? null, month: month?.month ?? null };
    pages.push(crawledPage);

    if (page.html !== null && month && targetKeys.has(`${month.year}-${month.month}`)) {
      const key = `${month.year}-${month.month}`;
      if (!monthToUrl.has(key)) monthToUrl.set(key, url);
    }

    if (page.html !== null) {
      for (const { url: absUrl, month: m } of candidateLinks) {
        if (!m) continue; // 月を判定できないリンクは辿らない（詳細ページ等を自然に除外）
        if (!targetKeys.has(`${m.year}-${m.month}`)) continue; // 前月〜取得可能な未来月の範囲外
        if (visited.has(absUrl)) continue;
        if (queue.some((q) => q.url === absUrl)) continue;
        queue.push({ url: absUrl, knownMonth: m });
      }
    }
  }

  const unreachableMonths = targets.filter((t) => !monthToUrl.has(`${t.year}-${t.month}`));
  return { pages, unreachableMonths };
}

// ---------------------------------------------------------------------------
// 空ページ判定
// ---------------------------------------------------------------------------

const DATE_LIKE_RE = /\d{4}[-/年]\d{1,2}([-/月]\d{0,2})?|\d{1,2}[/月]\d{1,2}日?/;
const EVENT_KEYWORDS = ["公演", "LIVE", "ライブ", "コンサート", "concert", "Concert", "CONCERT", "TOUR", "ツアー", "開催", "チケット", "出演"];
const EXPLICIT_EMPTY_KEYWORDS = [
  "予定はございません",
  "公演の予定はありません",
  "開催予定はありません",
  "該当する情報はありません",
  "イベントはありません",
  "情報がありません",
  "現在、開催予定はありません",
];

export function pageHasEventContent(text: string): boolean {
  if (text.length < 30) return false;
  if (EXPLICIT_EMPTY_KEYWORDS.some((kw) => text.includes(kw))) return false;
  const hasDate = DATE_LIKE_RE.test(text);
  const hasKeyword = EVENT_KEYWORDS.some((kw) => text.includes(kw));
  return hasDate || hasKeyword;
}

// ---------------------------------------------------------------------------
// Claude抽出（同時実行数制限つき）
// ---------------------------------------------------------------------------

export type ExtractedEvent = {
  title: string;
  date: string | null;
  genre: string;
};

class BrokenJsonError extends Error {}

function parseEventsJson(raw: string): ExtractedEvent[] {
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/^```[a-z]*\s*/m, "").replace(/\s*```$/m, "").trim();
  const match = cleaned.match(/\[[\s\S]*\]/);
  if (match) cleaned = match[0];

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new BrokenJsonError(err instanceof Error ? err.message : String(err));
  }
  if (!Array.isArray(parsed)) throw new BrokenJsonError("配列ではありません");
  return parsed as ExtractedEvent[];
}

const JSON_RETRY_INSTRUCTION =
  "\n\n重要: 有効なJSONのみを返してください。前回の応答はJSONとして壊れていました。" +
  "タイトル文字列内に二重引用符(\")が含まれる場合は必ず \\\" にエスケープしてください。";

export async function extractEventsFromText(
  text: string,
  venue: { id: string; name: string },
  claude: Anthropic
): Promise<{ events: ExtractedEvent[]; error: string | null; elapsedMs: number }> {
  let truncated = text;
  if (text.length > MAX_TEXT_CHARS) {
    console.warn(`  [${venue.name}] ページ本文が${MAX_TEXT_CHARS}文字を超過したため切り詰めました(${text.length}→${MAX_TEXT_CHARS})`);
    truncated = text.slice(0, MAX_TEXT_CHARS);
  }
  const basePrompt = EXTRACT_PROMPT(venue.name, truncated);
  const t0 = Date.now();

  const callClaude = async (prompt: string): Promise<string> => {
    const msg = await claude.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });
    return (msg.content[0] as { type: string; text: string }).text;
  };

  try {
    const raw = await callClaude(basePrompt);
    try {
      const events = parseEventsJson(raw);
      return { events, error: null, elapsedMs: Date.now() - t0 };
    } catch (parseErr) {
      if (!(parseErr instanceof BrokenJsonError)) throw parseErr;
      // 壊れたJSONの場合だけ、より厳格な指示を添えて1回だけ再試行する
      console.warn(`  [${venue.name}] Claude応答のJSON解析に失敗したため1回だけ再試行します: ${parseErr.message}`);
      const retryRaw = await callClaude(basePrompt + JSON_RETRY_INSTRUCTION);
      try {
        const events = parseEventsJson(retryRaw);
        return { events, error: null, elapsedMs: Date.now() - t0 };
      } catch (retryErr) {
        const message = retryErr instanceof Error ? retryErr.message : String(retryErr);
        return { events: [], error: `Claude抽出エラー(再試行後も壊れたJSON): ${message}`, elapsedMs: Date.now() - t0 };
      }
    }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return { events: [], error: `Claude抽出エラー: ${error}`, elapsedMs: Date.now() - t0 };
  }
}

export async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, () => worker()));
  return results;
}

const VALID_GENRES = new Set(["kpop", "johnnys", "female_idol", "male_idol", "other"]);

// ---------------------------------------------------------------------------
// 日付正規化（YYYY-MM-DD統一・複数日程の展開）
// ---------------------------------------------------------------------------

function isValidCalendarDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

function formatYmd(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** ページ固有の年月(monthly_pattern/follow_month_links)が無ければ、Asia/Tokyo基準のnow年月を使う */
function referenceYearMonth(pageYear: number | null, pageMonth: number | null, now: Date): { year: number; month: number } {
  if (pageYear !== null && pageMonth !== null) return { year: pageYear, month: pageMonth };
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Tokyo", year: "numeric", month: "numeric" }).formatToParts(now);
  return {
    year: Number(parts.find((p) => p.type === "year")?.value),
    month: Number(parts.find((p) => p.type === "month")?.value),
  };
}

/**
 * 年なし月日(例: 10/31)の年を補完する。
 * イベントカレンダーは常に前方(未来方向)へ掲載される前提で、
 * 「now基準で過去45日を超えない範囲での直近の未来」を最優先する。
 * (例: 7月クロール時に単一ページ内の"1.11"が2027年1月を指す長期先行掲載でも、
 *  従来の「基準年月に最も近い年」判定だと誤って前年寄りの年を選んでしまうため)
 * 該当候補が無い場合のみ、従来通り基準年月(refYear/refMonth)に最も近い年へフォールバックする。
 */
function nearestYearForMonthDay(month: number, day: number, refYear: number, refMonth: number, now: Date): number {
  const GRACE_MS = 45 * 24 * 60 * 60 * 1000; // 45日
  const nowMs = now.getTime();
  const refDate = Date.UTC(refYear, refMonth - 1, 1);
  const candidateYears = [refYear - 1, refYear, refYear + 1, refYear + 2];

  let bestFuture: { year: number; ms: number } | null = null;
  let bestOverall: { year: number; diff: number } | null = null;

  for (const y of candidateYears) {
    const ms = Date.UTC(y, month - 1, day);
    if (ms >= nowMs - GRACE_MS && (!bestFuture || ms < bestFuture.ms)) {
      bestFuture = { year: y, ms };
    }
    const diff = Math.abs(ms - refDate);
    if (!bestOverall || diff < bestOverall.diff) {
      bestOverall = { year: y, diff };
    }
  }

  return bestFuture ? bestFuture.year : (bestOverall ? bestOverall.year : refYear);
}

const EN_MONTHS: Readonly<Record<string, number>> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

/**
 * Claude抽出のdate文字列から、含まれる日付を全て「YYYY-MM-DD」として抽出する。
 * 複数日程が1つの文字列にまとまっている場合(例: "10.31・11.1")も、それぞれ別の日付として返す。
 * 年なし月日は pageYear/pageMonth（無ければ now基準のAsia/Tokyo年月）で年を補完する。
 * 無効な日付・解釈できない文字列は結果に含めない（呼び出し側で0件ならdate=nullとして扱う）。
 */
export function splitDateTokens(
  rawDate: string | null | undefined,
  pageYear: number | null,
  pageMonth: number | null,
  now: Date
): string[] {
  if (!rawDate) return [];
  const text = rawDate;
  const found: { start: number; end: number; date: string }[] = [];

  // 4桁年つきの完全な日付を先に拾う(優先度高。この範囲は後続のMM/DD走査から除外する)
  const fullDatePatterns = [
    /(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日?/g,
    /(\d{4})[./](\d{1,2})[./](\d{1,2})/g,
    /(\d{4})-(\d{1,2})-(\d{1,2})/g,
  ];
  for (const re of fullDatePatterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      const y = Number(m[1]);
      const mo = Number(m[2]);
      const d = Number(m[3]);
      if (isValidCalendarDate(y, mo, d)) {
        found.push({ start: m.index, end: m.index + m[0].length, date: formatYmd(y, mo, d) });
      }
    }
  }

  // 英語表記「Month D, YYYY」/「Month D YYYY」(4桁年つき。曜日名等の誤検出防止のため月名を限定)
  const enDateRe = /\b([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})\b/g;
  let enMatch: RegExpExecArray | null;
  while ((enMatch = enDateRe.exec(text))) {
    const monthNum = EN_MONTHS[enMatch[1].toLowerCase()];
    if (!monthNum) continue;
    const d = Number(enMatch[2]);
    const y = Number(enMatch[3]);
    if (isValidCalendarDate(y, monthNum, d)) {
      found.push({ start: enMatch.index, end: enMatch.index + enMatch[0].length, date: formatYmd(y, monthNum, d) });
    }
  }

  // 消費済み範囲をマスクしてから、年なしの月日系(MM/DD, MM.DD, MM月DD日)を拾う
  let masked = text;
  for (const f of [...found].sort((a, b) => b.start - a.start)) {
    masked = masked.slice(0, f.start) + " ".repeat(f.end - f.start) + masked.slice(f.end);
  }
  const { year: refYear, month: refMonth } = referenceYearMonth(pageYear, pageMonth, now);
  const noYearPatterns = [/(\d{1,2})[./](\d{1,2})(?!\d)/g, /(\d{1,2})\s*月\s*(\d{1,2})\s*日/g];
  for (const re of noYearPatterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(masked))) {
      const mo = Number(m[1]);
      const d = Number(m[2]);
      const y = nearestYearForMonthDay(mo, d, refYear, refMonth, now);
      if (isValidCalendarDate(y, mo, d)) {
        found.push({ start: m.index, end: m.index + m[0].length, date: formatYmd(y, mo, d) });
      }
    }
  }

  found.sort((a, b) => a.start - b.start);
  return Array.from(new Set(found.map((f) => f.date)));
}

/**
 * Claude抽出結果(events)をEventRowへ変換する。
 * 日付が1件も解釈できないイベントはEventRowを作らず invalidDates へ回す(保存対象から除外)。
 * 1イベントから2件以上の日付が展開された場合は multiDayExpansions に記録する(調査用)。
 */
export function toEventRows(
  events: ExtractedEvent[],
  venue: { id: string; name: string },
  pageYear: number | null,
  pageMonth: number | null,
  now: Date,
  sourceUrl: string
): { rows: EventRow[]; invalidDates: InvalidDateEntry[]; multiDayExpansions: MultiDayExpansion[] } {
  const rows: EventRow[] = [];
  const invalidDates: InvalidDateEntry[] = [];
  const multiDayExpansions: MultiDayExpansion[] = [];

  for (const ev of events) {
    if (!ev.title?.trim()) continue;
    const title = ev.title.trim();
    const genre = VALID_GENRES.has(ev.genre) ? ev.genre : "other";
    const dates = splitDateTokens(ev.date, pageYear, pageMonth, now);

    if (dates.length === 0) {
      // YYYY-MM-DDへ正規化できない(不明/無効)場合は保存対象にせず、invalidDatesとして報告する
      invalidDates.push({ title, venue: venue.name, venueId: venue.id, rawDate: ev.date ?? null, sourceUrl });
      continue;
    }

    if (dates.length > 1) {
      multiDayExpansions.push({ title, venueId: venue.id, rawDate: ev.date ?? null, expandedDates: dates, sourceUrl });
    }

    for (const date of dates) {
      rows.push({ id: makeEventId(venue.id, date, title), title, venue: venue.name, venue_id: venue.id, date, genre });
    }
  }
  return { rows, invalidDates, multiDayExpansions };
}

export function normalizeTitle(title: string): string {
  return title
    .normalize("NFKC")
    .trim()
    .replace(/[「」『』“”‘’\"']/g, "")
    .replace(/\s+/g, " ");
}

/**
 * 同一venue_id+date時の第二判定用: normalizeTitle後にUnicode空白を全て除去した比較キー。
 * 「第123 回」と「第123回」のような空白の入り方だけが異なる表記揺れを同一視するために使う。
 * normalizeTitle()自体の定義・保存するtitle自体は変更しない。
 */
export function normalizeTitleIgnoringSpacing(title: string): string {
  return normalizeTitle(title).replace(/\s+/g, "");
}

export function dedupeRows(rows: EventRow[]): EventRow[] {
  // 同一 venue_id / date は、normalizeTitle後さらに空白を除去した比較キーで重複とみなす
  const seen = new Set<string>();
  const result: EventRow[] = [];
  for (const row of rows) {
    const key = `${row.venue_id}::${row.date ?? ""}::${normalizeTitleIgnoringSpacing(row.title)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(row);
  }
  return result;
}

export async function upsertEvents(rows: EventRow[], sb: AnySupabaseClient): Promise<{ saved: number; error: string | null }> {
  if (rows.length === 0) return { saved: 0, error: null };

  const { error } = await sb.from("events").upsert(rows, { onConflict: "id" });
  return error
    ? { saved: 0, error: `DB保存エラー: ${error.message}` }
    : { saved: rows.length, error: null };
}

/**
 * 保存前に「会場IDエイリアス + date完全一致 + normalizeTitle(空白除去後)一致」で既存eventsと照合する。
 * dry-run・本番upsertの両方の経路から共通で呼ばれる（本番でも書き込み前に必ず照合する）。
 *
 * 分岐:
 *   0件一致 → newRows（現行makeEventIdのidのまま新規保存対象）
 *   1件一致 → matchedExisting（既存公演として扱い、保存対象からは外す。既存idへの差し替えはしない＝既存行は一切更新しない）
 *   2件以上 → skippedAmbiguous（どれを既存とするか自動選択せず、保存対象から外して要確認とする）
 */
export async function classifyAgainstExisting(
  rows: EventRow[],
  venueId: string,
  sb: AnySupabaseClient
): Promise<{
  newRows: EventRow[];
  matchedExisting: MatchedExistingEvent[];
  skippedAmbiguous: AmbiguousMatch[];
  error: string | null;
}> {
  if (rows.length === 0) return { newRows: [], matchedExisting: [], skippedAmbiguous: [], error: null };

  const aliasIds = getVenueIdAliases(venueId);
  const { data, error } = await sb
    .from("events")
    .select("id,title,date,venue_id")
    .in("venue_id", aliasIds);

  if (error) {
    // 既存照合ができない場合は安全側に倒し、この会場のどの行も新規/既存判定せず保留する(=保存しない)。
    return { newRows: [], matchedExisting: [], skippedAmbiguous: [], error: `既存公演照合エラー(DB): ${error.message}` };
  }

  const existing = (data ?? []) as Array<{ id: string; title: string; date: string | null; venue_id: string }>;

  const newRows: EventRow[] = [];
  const matchedExisting: MatchedExistingEvent[] = [];
  const skippedAmbiguous: AmbiguousMatch[] = [];

  for (const row of rows) {
    const normalized = normalizeTitleIgnoringSpacing(row.title);
    const matches = existing.filter(
      (event) => event.date === row.date && normalizeTitleIgnoringSpacing(event.title) === normalized
    );

    if (matches.length === 0) {
      newRows.push(row);
    } else if (matches.length === 1) {
      matchedExisting.push({
        extractedTitle: row.title,
        existingTitle: matches[0].title,
        date: row.date,
        extractedVenueId: row.venue_id,
        existingVenueId: matches[0].venue_id,
        existingId: matches[0].id,
      });
    } else {
      skippedAmbiguous.push({
        extractedTitle: row.title,
        date: row.date,
        extractedVenueId: row.venue_id,
        matches: matches.map((m) => ({ id: m.id, title: m.title, venue_id: m.venue_id })),
      });
    }
  }

  return { newRows, matchedExisting, skippedAmbiguous, error: null };
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// 会場単位の処理
// ---------------------------------------------------------------------------

export type PageReport = {
  page: CrawledPage;
  events: ExtractedEvent[];
  statusLabel: string;
  elapsedMs: number;
  error: string | null;
};

export type VenueResult = {
  venueId: string;
  venueName: string;
  type: string;
  pageReports: PageReport[];
  unreachableMonths: { year: number; month: number }[];
  allEventsCount: number;
  rows: EventRow[];
  newRows: EventRow[];
  matchedExisting: MatchedExistingEvent[];
  skippedAmbiguous: AmbiguousMatch[];
  invalidDates: InvalidDateEntry[];
  multiDayExpansions: MultiDayExpansion[];
  saved: number;
  errors: string[];
  failed: boolean;
  elapsedMs: number;
};

export async function processVenue(
  venue: Exclude<VenueConfig, DisabledVenue>,
  claude: Anthropic,
  sb: AnySupabaseClient,
  dryRun: boolean,
  now: Date
): Promise<VenueResult> {
  const t0 = Date.now();
  let pages: CrawledPage[] = [];
  let unreachableMonths: { year: number; month: number }[] = [];
  let configAnomaly = false;

  if (venue.type === "single_url") {
    const page = await fetchPage(venue.url);
    applySanityCheck(page);
    pages = [{ ...page, year: null, month: null }];
  } else if (venue.type === "monthly_pattern") {
    const targets = generateMonthlyPages(venue as MonthlyPatternVenue, now);
    const fetched = await Promise.all(
      targets.map(async ({ year, month, url }): Promise<CrawledPage> => {
        const page = await fetchPage(url);
        return { ...page, year, month };
      })
    );
    configAnomaly = classifyMonthly404s(fetched, now);
    for (const p of fetched) applySanityCheck(p);
    pages = fetched;
  } else {
    const crawl = await followMonthLinks(venue as FollowMonthLinksVenue, now);
    pages = crawl.pages;
    unreachableMonths = crawl.unreachableMonths;
  }

  const successfulPages = pages.filter((p) => p.html !== null);
  const errors: string[] = pages.flatMap((p) => (p.error ? [`${p.url}: ${p.error}`] : []));
  if (configAnomaly) errors.push("全対象月が404でした（URLパターン設定を確認してください）");

  const pageReports: PageReport[] = [];
  const pending: { page: CrawledPage; text: string }[] = [];
  for (const p of pages) {
    if (p.html === null) {
      let label: string;
      if (p.statusKind === "future_unpublished") label = "未来月未公開(404) - 正常";
      else if (p.status === 404) label = "404エラー";
      else if (p.status === "ERROR") label = `取得エラー: ${p.error ?? ""}`;
      else label = `取得エラー: HTTP ${p.status}`;
      pageReports.push({ page: p, events: [], statusLabel: label, elapsedMs: 0, error: null });
      continue;
    }
    const text = stripHtml(p.html);
    if (!pageHasEventContent(text)) {
      pageReports.push({ page: p, events: [], statusLabel: "掲載情報なし", elapsedMs: 0, error: null });
    } else {
      pending.push({ page: p, text });
    }
  }

  const extracted = await mapWithConcurrency(pending, CLAUDE_CONCURRENCY, async ({ page, text }) => {
    const result = await extractEventsFromText(text, venue, claude);
    return { page, ...result };
  });
  for (const r of extracted) {
    pageReports.push({ page: r.page, events: r.events, statusLabel: `${r.events.length}件`, elapsedMs: r.elapsedMs, error: r.error });
    if (r.error) errors.push(`${r.page.url}: ${r.error}`);
  }

  const order = new Map(pages.map((p, i) => [p.url, i] as const));
  pageReports.sort((a, b) => (order.get(a.page.url) ?? 0) - (order.get(b.page.url) ?? 0));

  const allEvents = pageReports.flatMap((r) => r.events);
  // ページごとのyear/month(monthly_pattern/follow_month_links)を使って年なし日付を補完するため、
  // ページ単位でtoEventRowsを呼んでから連結する(single_urlはyear=month=nullでnow基準補完になる)。
  const perPage = pageReports.map((r) => toEventRows(r.events, venue, r.page.year, r.page.month, now, r.page.url));
  let rows = perPage.flatMap((p) => p.rows);
  const invalidDates = perPage.flatMap((p) => p.invalidDates);
  const multiDayExpansions = perPage.flatMap((p) => p.multiDayExpansions);
  rows = dedupeRows(rows);

  // dry-run・本番upsertの両方で、書き込み前に必ず既存公演と照合する。
  const classified = await classifyAgainstExisting(rows, venue.id, sb);
  if (classified.error) errors.push(classified.error);
  const { newRows, matchedExisting, skippedAmbiguous } = classified;

  let saved = 0;
  if (!dryRun) {
    // 一致0件(newRows)のみを保存する。一致1件(matchedExisting)は既存行なので保存も更新もしない。
    // 一致2件以上(skippedAmbiguous)は自動判定せず保存しない。
    const saveResult = await upsertEvents(newRows, sb);
    saved = saveResult.saved;
    if (saveResult.error) errors.push(saveResult.error);
  }

  const elapsedMs = Date.now() - t0;
  const failed =
    successfulPages.length === 0 ||
    configAnomaly ||
    errors.some((e) => e.includes("Claude") || e.includes("JSON") || e.includes("DB"));

  return {
    venueId: venue.id,
    venueName: venue.name,
    type: venue.type,
    pageReports,
    unreachableMonths,
    allEventsCount: allEvents.length,
    rows,
    newRows,
    matchedExisting,
    skippedAmbiguous,
    invalidDates,
    multiDayExpansions,
    saved,
    errors,
    failed,
    elapsedMs,
  };
}
