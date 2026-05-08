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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>;

export const maxDuration = 300;
export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// 会場リスト
// ---------------------------------------------------------------------------
const PAYPAY_DOME_YEAR = new Date().getFullYear();

const VENUES = [
  // ドーム
  { id: "tokyo-dome",    name: "東京ドーム",             url: "https://www.tokyo-dome.co.jp/en/dome/event/schedule.html" },
  { id: "kyocera-dome",  name: "京セラドーム大阪",       url: "https://www.kyoceradome-osaka.jp/schedule/" },
  { id: "vantelin-dome", name: "バンテリンドームナゴヤ", url: "https://www.nagoya-dome.co.jp/sp/eventcalen.php" },
  { id: "paypay-dome",   name: "福岡PayPayドーム",       url: `https://www.softbankhawks.co.jp/stadium/event_schedule/${PAYPAY_DOME_YEAR}/` },
  { id: "sapporo-dome",  name: "札幌ドーム",             url: "https://www.sapporo-dome.co.jp/schedule/" },
  { id: "belluna-dome",  name: "ベルーナドーム",         url: "https://bellunadome.seibulions.co.jp/schedule/" },
  { id: "zozo-marine",   name: "ZOZOマリンスタジアム",   url: "https://www.marines.co.jp/stadium/schedule/" },
  { id: "koshien",       name: "阪神甲子園球場",         url: "https://koshien.hanshin.co.jp/event/" },
  // アリーナ（関東）
  { id: "saitama-super-arena", name: "さいたまスーパーアリーナ", url: "https://www.saitama-arena.co.jp/schedule/" },
  { id: "yokohama-arena",      name: "横浜アリーナ",             url: "https://www.yokohama-arena.co.jp/event" },
  { id: "pia-arena-mm",        name: "ぴあアリーナMM",           url: "https://pia-arena-mm.jp/" },
  { id: "ariake-arena",        name: "有明アリーナ",             url: "https://ariake-arena.com/schedule/" },
  { id: "budokan",             name: "日本武道館",               url: "https://www.nipponbudokan.or.jp/schedule/" },
  { id: "yoyogi",              name: "代々木第一体育館",         url: "https://www.jpnsport.go.jp/yoyogi/event/tabid/59/default.aspx" },
  { id: "makuhari-messe",      name: "幕張メッセ",               url: "https://www.m-messe.co.jp/event/" },
  { id: "k-arena",             name: "Kアリーナ横浜",            url: "https://k-arena.com/en/schedule/" },
  // アリーナ（関西・地方）
  { id: "osaka-jo-hall",   name: "大阪城ホール",               url: "https://www.osaka-johall.com/event/" },
  { id: "edion-arena",     name: "大阪エディオンアリーナ",     url: "https://www.furitutaiikukaikan.ne.jp/" },
  { id: "marine-messe",    name: "マリンメッセ福岡",           url: "https://www.marinemesse.or.jp/messe/" },
  { id: "miyagi-arena",    name: "セキスイハイムスーパーアリーナ", url: "https://www.mspf.jp/grande21/" },
  { id: "hiroshima-arena", name: "広島グリーンアリーナ",       url: "https://h-jigyoudan.or.jp/sports-center/center-events/" },
  { id: "gaishi-hall",     name: "名古屋ガイシホール",         url: "https://www.nespa.or.jp/hall/" },
  { id: "toki-messe",      name: "朱鷺メッセ",                 url: "https://www.tokimesse.com/sp/visitor/event/index" },
] as const;

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

async function fetchHtml(venue: { id: string; name: string; url: string }): Promise<string | null> {
  const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  try {
    const res = await fetch(venue.url, {
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
      console.warn(`[${venue.name}] HTTP ${res.status}`);
      return null;
    }
    return await res.text();
  } catch (err) {
    console.warn(`[${venue.name}] 取得失敗:`, err instanceof Error ? err.message : err);
    return null;
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
): Promise<ExtractedEvent[]> {
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

    console.log(`[${venue.name}] 抽出: ${events.length} 件`);
    return events as ExtractedEvent[];
  } catch (err) {
    console.warn(`[${venue.name}] 抽出エラー:`, err instanceof Error ? err.message : err);
    return [];
  }
}

const VALID_GENRES = new Set(["kpop", "johnnys", "female_idol", "male_idol", "other"]);

async function upsertEvents(
  events: ExtractedEvent[],
  venue: { id: string; name: string },
  sb: AnySupabaseClient
): Promise<number> {
  if (events.length === 0) return 0;

  const rows = events
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

  if (rows.length === 0) return 0;

  try {
    await sb.from("events").upsert(rows, { onConflict: "id" });
    console.log(`[${venue.name}] upsert: ${rows.length} 件`);
    return rows.length;
  } catch (err) {
    console.error(`[${venue.name}] upsertエラー:`, err);
    return 0;
  }
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

  if (!supabaseUrl || !serviceKey || !anthropicKey) {
    return NextResponse.json({ error: "必要な環境変数が未設定です" }, { status: 500 });
  }

  const sb = createClient(supabaseUrl, serviceKey);
  const claude = new Anthropic({ apiKey: anthropicKey });

  let totalSaved = 0;
  const failed: string[] = [];

  console.log(`=== fetch-events cron 開始: ${new Date().toISOString()} ===`);

  for (const venue of VENUES) {
    console.log(`処理中: ${venue.name}`);

    const html = await fetchHtml(venue);
    if (!html) {
      failed.push(venue.name);
      await sleep(2000);
      continue;
    }

    const events = await extractEvents(html, venue, claude);
    const saved = await upsertEvents(events, venue, sb);
    totalSaved += saved;

    await sleep(2500 + Math.random() * 2000);
  }

  console.log(`=== 完了: ${totalSaved} 件保存, 失敗: ${failed.join(", ") || "なし"} ===`);

  return NextResponse.json({
    ok: true,
    totalSaved,
    failed,
    processedAt: new Date().toISOString(),
  });
}
