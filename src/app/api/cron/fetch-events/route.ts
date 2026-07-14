/**
 * /api/cron/fetch-events
 * Vercel Cron Job から週1回呼ばれるハンドラー。
 * 各会場スケジュールページをフェッチ → Claude API でコンサート/ライブを抽出 → Supabase upsert。
 *
 * 必要な環境変数:
 *   ANTHROPIC_API_KEY
 *   SUPABASE_SERVICE_ROLE_KEY
 *   NEXT_PUBLIC_SUPABASE_URL
 *   CRON_SECRET  (Vercel Cron が自動で Authorization: Bearer <secret> を付与)
 *
 * Pro プランで maxDuration=300 が有効になります。Hobby プランでは 60 秒制限あり。
 */

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { generateVenueUrls, VENUES } from "@/lib/eventCrawlerConfig";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>;

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
];

const MAX_TEXT_CHARS = 80_000;
const CLAUDE_MODEL = "claude-haiku-4-5-20251001";

const EXTRACT_PROMPT = (venueName: string, text: string) => `\
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

function makeEventId(venueId: string, date: string | null, title: string): string {
  const raw = `${venueId}::${date ?? ""}::${title}`;
  return crypto.createHash("sha256").update(raw, "utf8").digest("hex").slice(0, 20);
}

function stripHtml(html: string): string {
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

type FetchResult = {
  url: string;
  status: number | "ERROR";
  html: string | null;
  chars: number;
  error: string | null;
};

type EventRow = {
  id: string;
  title: string;
  venue: string;
  venue_id: string;
  date: string | null;
  genre: string;
};

type DuplicateCandidate = {
  extracted: { title: string; date: string | null };
  existing: { id: string; title: string; date: string | null };
};

async function fetchPage(url: string): Promise<FetchResult> {
  const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
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
    if (!res.ok) {
      return { url, status: res.status, html: null, chars: 0, error: `HTTP ${res.status}` };
    }
    const html = await res.text();
    return { url, status: res.status, html, chars: html.length, error: null };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return { url, status: "ERROR", html: null, chars: 0, error };
  }
}

type ExtractedEvent = {
  title: string;
  date: string | null;
  genre: string;
};

async function extractEvents(
  html: string,
  venue: { id: string; name: string },
  claude: Anthropic
): Promise<{ events: ExtractedEvent[]; error: string | null }> {
  const text = stripHtml(html).slice(0, MAX_TEXT_CHARS);
  const prompt = EXTRACT_PROMPT(venue.name, text);

  try {
    const msg = await claude.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });

    let raw = (msg.content[0] as { type: string; text: string }).text.trim();

    // コードブロック除去
    raw = raw.replace(/^```[a-z]*\s*/m, "").replace(/\s*```$/m, "").trim();

    // JSON配列だけ抽出（前後にテキストが混じっていた場合）
    const match = raw.match(/\[[\s\S]*\]/);
    if (match) raw = match[0];

    const events = JSON.parse(raw);
    if (!Array.isArray(events)) throw new Error("配列ではありません");

    return { events: events as ExtractedEvent[], error: null };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return { events: [], error: `Claude抽出エラー: ${error}` };
  }
}

const VALID_GENRES = new Set(["kpop", "johnnys", "female_idol", "male_idol", "other"]);

function toEventRows(
  events: ExtractedEvent[],
  venue: { id: string; name: string }
): EventRow[] {
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

async function upsertEvents(rows: EventRow[], sb: AnySupabaseClient): Promise<{ saved: number; error: string | null }> {
  if (rows.length === 0) return { saved: 0, error: null };

  const { error } = await sb.from("events").upsert(rows, { onConflict: "id" });
  return error
    ? { saved: 0, error: `DB保存エラー: ${error.message}` }
    : { saved: rows.length, error: null };
}

function normalizeTitle(title: string): string {
  return title
    .normalize("NFKC")
    .trim()
    .replace(/[「」『』“”‘’\"']/g, "")
    .replace(/\s+/g, " ");
}

async function findDuplicateCandidates(
  rows: EventRow[],
  venueId: string,
  sb: AnySupabaseClient
): Promise<{ candidates: DuplicateCandidate[]; error: string | null }> {
  if (rows.length === 0) return { candidates: [], error: null };

  const { data, error } = await sb
    .from("events")
    .select("id,title,date")
    .eq("venue_id", venueId);
  if (error) return { candidates: [], error: `重複候補取得エラー: ${error.message}` };

  const existing = (data ?? []) as Array<{ id: string; title: string; date: string | null }>;
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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// メインハンドラー
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  // Vercel Cron の認証チェック
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const anthropicKey = process.env.ANTHROPIC_API_KEY ?? "";
  const dryRun = ["1", "true"].includes(req.nextUrl.searchParams.get("dryRun")?.toLowerCase() ?? "");

  if (!supabaseUrl || !serviceKey || !anthropicKey) {
    return NextResponse.json({ error: "必要な環境変数が未設定です" }, { status: 500 });
  }

  const sb = createClient(supabaseUrl, serviceKey);
  const claude = new Anthropic({ apiKey: anthropicKey });

  let totalSaved = 0;
  const failed: string[] = [];
  const reports: Array<Record<string, unknown>> = [];

  console.log(`=== fetch-events cron 開始: ${new Date().toISOString()} / dry-run=${dryRun} ===`);

  for (const venue of VENUES) {
    if (venue.type === "disabled") {
      const report = {
        venueId: venue.id,
        venueName: venue.name,
        type: venue.type,
        skipped: true,
        error: venue.reason,
      };
      reports.push(report);
      console.log(`[${venue.name}] disabled / 理由=${venue.reason}`);
      continue;
    }

    const urls = [...new Set(generateVenueUrls(venue))];
    const pages = await Promise.all(urls.map(fetchPage));
    const successfulPages = pages.filter((page) => page.html !== null);
    const html = successfulPages.map((page) => page.html).join("\n\n");
    const errors = pages.flatMap((page) => page.error ? [`${page.url}: ${page.error}`] : []);

    let events: ExtractedEvent[] = [];
    let rows: EventRow[] = [];
    let duplicates: DuplicateCandidate[] = [];
    let saved = 0;

    if (html) {
      const extracted = await extractEvents(html, venue, claude);
      events = extracted.events;
      if (extracted.error) errors.push(extracted.error);
      rows = toEventRows(events, venue);

      if (dryRun) {
        const duplicateResult = await findDuplicateCandidates(rows, venue.id, sb);
        duplicates = duplicateResult.candidates;
        if (duplicateResult.error) errors.push(duplicateResult.error);
      } else {
        const saveResult = await upsertEvents(rows, sb);
        saved = saveResult.saved;
        if (saveResult.error) errors.push(saveResult.error);
      }
    }

    if (successfulPages.length === 0 || errors.some((error) => error.startsWith("Claude") || error.startsWith("DB"))) {
      failed.push(venue.name);
    }
    totalSaved += saved;

    const report = {
      venueId: venue.id,
      venueName: venue.name,
      type: venue.type,
      pageCount: successfulPages.length,
      requestedPageCount: urls.length,
      httpStatuses: pages.map(({ url, status }) => ({ url, status })),
      fetchedChars: pages.reduce((total, page) => total + page.chars, 0),
      claudeExtracted: events.length,
      titles: events.map((event) => event.title).filter(Boolean),
      duplicateCandidates: dryRun ? duplicates : undefined,
      plannedSaves: dryRun ? rows.length : undefined,
      dbSaved: saved,
      errors,
    };
    reports.push(report);
    console.log(
      `[${venue.name}] HTTP=${pages.map((page) => page.status).join(",")} / ` +
      `取得ページ=${successfulPages.length}/${urls.length} / 文字数=${report.fetchedChars} / Claude抽出=${events.length} / ` +
      `DB保存=${saved} / エラー=${errors.join(" | ") || "なし"}`
    );

    await sleep(2500 + Math.random() * 2000);
  }

  console.log(`=== 完了: ${totalSaved} 件保存, 失敗: ${failed.join(", ") || "なし"} ===`);

  return NextResponse.json({
    ok: true,
    dryRun,
    totalSaved,
    failed,
    reports,
    processedAt: new Date().toISOString(),
  });
}
