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
    "date": "YYYY-MM-DD（複数日程なら初日。不明なら null）",
    "genre": "kpop | johnnys | female_idol | male_idol | other"
  }
]

ジャンル分類:
- kpop: 韓国K-POPアーティスト（BTS, TWICE, aespa, SEVENTEEN 等）
- johnnys: ジャニーズ/STARTO系（Snow Man, SixTONES, King & Prince 等）
- female_idol: 日本女性アイドル（乃木坂46, AKB48, NiziU 等）
- male_idol: 日本男性アイドル（BE:FIRST, JO1, BOYS AND MEN 等）
- other: バンド, 演歌, クラシック, スポーツイベント, 展示会, 会議 等

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

export type DuplicateCandidate = {
  extracted: { title: string; date: string | null };
  existing: { id: string; title: string; date: string | null; venue_id: string };
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

export function toEventRows(events: ExtractedEvent[], venue: { id: string; name: string }): EventRow[] {
  return events
    .filter((ev) => ev.title?.trim())
    .map((ev) => {
      const title = ev.title.trim();
      const date = /^\d{4}-\d{2}-\d{2}$/.test(ev.date ?? "") ? ev.date : null;
      const genre = VALID_GENRES.has(ev.genre) ? ev.genre : "other";
      return {
        id: makeEventId(venue.id, date, title),
        title,
        venue: venue.name,
        venue_id: venue.id,
        date,
        genre,
      };
    });
}

export function normalizeTitle(title: string): string {
  return title
    .normalize("NFKC")
    .trim()
    .replace(/[「」『』“”‘’\"']/g, "")
    .replace(/\s+/g, " ");
}

export function dedupeRows(rows: EventRow[]): EventRow[] {
  // 同一 venue_id / date / 正規化title の完全一致のみを重複とみなす
  const seen = new Set<string>();
  const result: EventRow[] = [];
  for (const row of rows) {
    const key = `${row.venue_id}::${row.date ?? ""}::${normalizeTitle(row.title)}`;
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

export async function findDuplicateCandidates(
  rows: EventRow[],
  venueId: string,
  sb: AnySupabaseClient
): Promise<{ candidates: DuplicateCandidate[]; error: string | null }> {
  if (rows.length === 0) return { candidates: [], error: null };

  // 重複判定のみ、本番DBに残る旧venue_idエイリアスも含めて既存レコードを見る。
  // 新規保存(upsertEvents)は常に正式ID(venueId)で行われ、ここでは変更しない。
  const aliasIds = getVenueIdAliases(venueId);
  const { data, error } = await sb
    .from("events")
    .select("id,title,date,venue_id")
    .in("venue_id", aliasIds);
  if (error) return { candidates: [], error: `重複候補取得エラー: ${error.message}` };

  const existing = (data ?? []) as Array<{ id: string; title: string; date: string | null; venue_id: string }>;
  const candidates = rows.flatMap((row) => {
    const normalized = normalizeTitle(row.title);
    const match = existing.find(
      (event) => event.date === row.date && normalizeTitle(event.title) === normalized
    );
    return match
      ? [{ extracted: { title: row.title, date: row.date }, existing: match }]
      : [];
  });
  return { candidates, error: null };
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
  duplicates: DuplicateCandidate[];
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
  let rows = toEventRows(allEvents, venue);
  rows = dedupeRows(rows);

  let duplicates: DuplicateCandidate[] = [];
  let saved = 0;
  if (dryRun) {
    const dup = await findDuplicateCandidates(rows, venue.id, sb);
    duplicates = dup.candidates;
    if (dup.error) errors.push(dup.error);
  } else {
    const saveResult = await upsertEvents(rows, sb);
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
    duplicates,
    saved,
    errors,
    failed,
    elapsedMs,
  };
}
