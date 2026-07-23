// official_news_candidates.json (Gemini分類済み) を official_news テーブルへ投入するスクリプト。
//
// 既定は --dry-run 相当(フラグなしでもドライラン)。実際にSupabaseへ書き込むには
// 明示的に --execute を渡し、OFFICIAL_NEWS_ALLOW_PRODUCTION_WRITE=true も設定する必要がある。
//
// 実行方法:
//   node scripts/import-official-news.mjs            (既定: ドライラン、Supabaseへは一切接続しない)
//   node scripts/import-official-news.mjs --dry-run  (明示的なドライラン)
//   node scripts/import-official-news.mjs --execute  (二重確認後にupsertする。今回は未実行)
//
// 対象: ai_status === "classified" の記事のみ。
// artist_slug + 正規化article_urlを一意キーとしてupsertする。同じ合同告知URLを
// 複数アーティストへ保存でき、同一アーティスト内では重複挿入されない。
//
// 必要な環境変数(--execute時のみ): OFFICIAL_NEWS_ALLOW_PRODUCTION_WRITE=true,
// NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import fs from "fs";
import { createHash } from "node:crypto";
import { loadEnvLocal } from "./loadEnvLocal.mjs";
import { normalizeOfficialNewsUrl } from "./officialNews/urlIdentity.mjs";

const CANDIDATES_PATH = "C:\\Users\\tcgea\\Documents\\tixrepo-data\\official_news_candidates.json";
const IMPORTER_USAGE = `Usage:
  node scripts/import-official-news.mjs [--dry-run | --execute]

Options:
  --dry-run   Validate the candidate file without connecting to Supabase (default).
  --execute   Enable Supabase writes. Also requires
              OFFICIAL_NEWS_ALLOW_PRODUCTION_WRITE=true.
  --help      Show this help and exit.

Safety:
  No arguments means dry-run. Unknown arguments fail. This importer never uses Gemini.`;

function parseArgs(argv) {
  let explicitDryRun = false;
  let execute = false;
  let help = false;
  for (const arg of argv) {
    if (arg === "--dry-run") explicitDryRun = true;
    else if (arg === "--execute") execute = true;
    else if (arg === "--help") help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (explicitDryRun && execute) throw new Error("--dry-run and --execute cannot be used together.");
  return { execute, help };
}

/** candidates.jsonの1レコード -> official_newsテーブルの1行 へ変換する。 */
function toRow(c) {
  return {
    artist_slug: c.artist_slug,
    article_title: c.article_title,
    article_url: c.article_url,
    published_date: c.published_date || null,
    article_body: c.article_body ?? null,
    thumbnail_url: c.thumbnail_url ?? null,
    category: c.category ?? null,
    is_event_candidate: c.is_event_candidate ?? null,
    event_name: c.event_name ?? null,
    tour_name: c.tour_name ?? null,
    event_dates: Array.isArray(c.event_dates) ? c.event_dates : [],
    venue_names: Array.isArray(c.venue_names) ? c.venue_names : [],
    ticket_sale_start: c.ticket_sale_start ?? null,
    ticket_sale_end: c.ticket_sale_end ?? null,
    confidence: c.confidence ?? null,
    needs_review: c.needs_review ?? true,
    review_reason: c.review_reason ?? null,
    fetched_at: c.fetched_at ?? null,
  };
}

const VALID_CATEGORIES = new Set(["live", "ticket", "release", "media", "goods", "fanclub", "other"]);
const VALID_CONFIDENCE = new Set(["high", "medium", "low", null]);

function validateRows(rows) {
  const issues = [];
  const seenUrls = new Set();
  let duplicateUrlCount = 0;

  for (const r of rows) {
    if (!r.article_url) issues.push(`article_urlが空: ${r.article_title}`);
    const identity = `${r.artist_slug}\u0000${normalizeOfficialNewsUrl(r.article_url)}`;
    if (seenUrls.has(identity)) {
      duplicateUrlCount++;
      issues.push(`artist_slug + 正規化article_url重複: ${r.artist_slug} / ${r.article_url}`);
    }
    seenUrls.add(identity);

    if (!r.artist_slug) issues.push(`artist_slugが空: ${r.article_url}`);
    if (r.category && !VALID_CATEGORIES.has(r.category)) {
      issues.push(`不正なcategory "${r.category}": ${r.article_url}`);
    }
    if (!VALID_CONFIDENCE.has(r.confidence)) {
      issues.push(`不正なconfidence "${r.confidence}": ${r.article_url}`);
    }
  }

  return { issues, duplicateUrlCount, uniqueUrlCount: seenUrls.size };
}

async function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`Argument error: ${error instanceof Error ? error.message : String(error)}\n\n${IMPORTER_USAGE}`);
    process.exitCode = 2;
    return;
  }
  if (args.help) {
    console.log(IMPORTER_USAGE);
    return;
  }

  loadEnvLocal();

  if (args.execute && process.env.OFFICIAL_NEWS_ALLOW_PRODUCTION_WRITE !== "true") {
    console.error(
      "--execute requires OFFICIAL_NEWS_ALLOW_PRODUCTION_WRITE=true. Supabase connection was not started.",
    );
    process.exitCode = 1;
    return;
  }

  if (!fs.existsSync(CANDIDATES_PATH)) {
    console.error(`${CANDIDATES_PATH} が見つかりません。`);
    process.exit(1);
  }
  const candidatesState = JSON.parse(fs.readFileSync(CANDIDATES_PATH, "utf-8"));
  const all = candidatesState.candidates;
  const classified = all.filter((c) => c.ai_status === "classified");
  const skipped = all.length - classified.length;

  const rows = classified.map(toRow);
  const { issues, duplicateUrlCount, uniqueUrlCount } = validateRows(rows);

  const byArtist = {};
  for (const r of rows) byArtist[r.artist_slug] = (byArtist[r.artist_slug] || 0) + 1;
  const byCategory = {};
  for (const r of rows) {
    const k = r.category ?? "(null)";
    byCategory[k] = (byCategory[k] || 0) + 1;
  }
  const needsReviewCount = rows.filter((r) => r.needs_review).length;

  console.log("=== import-official-news ===");
  console.log(`モード: ${args.execute ? "EXECUTE(実書き込み)" : "DRY-RUN(検証のみ、Supabaseへは接続しません)"}`);
  console.log(`candidates.json 総数: ${all.length}`);
  console.log(`classified対象: ${classified.length} (対象外スキップ: ${skipped})`);
  console.log(`artist_slug + 正規化article_url ユニーク数: ${uniqueUrlCount} / 重複: ${duplicateUrlCount}`);
  console.log(`needs_review=true: ${needsReviewCount}`);
  console.log(`アーティスト別件数:`, byArtist);
  console.log(`カテゴリ別件数:`, byCategory);
  if (issues.length > 0) {
    console.log(`\n検証で見つかった問題 (${issues.length}件):`);
    for (const i of issues.slice(0, 20)) console.log(`  - ${i}`);
    if (issues.length > 20) console.log(`  ...ほか${issues.length - 20}件`);
  } else {
    console.log("\n検証で問題は見つかりませんでした。");
  }

  console.log("\n=== upsert対象サンプル(先頭1件) ===");
  const sample = rows[0];
  console.log(
    sample
      ? {
          artist_slug: sample.artist_slug,
          article_url: sample.article_url,
          article_body_chars: sample.article_body?.length ?? 0,
          article_body_sha256: createHash("sha256").update(sample.article_body ?? "").digest("hex"),
        }
      : "(対象なし)",
  );

  if (!args.execute) {
    console.log("\n(ドライランのため、Supabaseへの書き込みは行っていません。実行するには --execute を付与してください。)");
    return;
  }

  // --execute時のみここから実際の書き込みを行う(今回のタスクでは到達させない)。
  const { createClient } = await import("@supabase/supabase-js");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!supabaseUrl || !serviceKey) {
    console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が未設定のため中止します。");
    process.exit(1);
  }
  const sb = createClient(supabaseUrl, serviceKey);

  let upserted = 0;
  let failedRows = 0;
  const BATCH_SIZE = 50;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await sb
      .from("official_news")
      .upsert(batch, { onConflict: "artist_slug,normalized_article_url" });
    if (error) {
      console.error(`バッチ ${i / BATCH_SIZE + 1} でエラー:`, error.message);
      failedRows += batch.length;
      continue;
    }
    upserted += batch.length;
  }
  console.log(`\nupsert完了: ${upserted} / ${rows.length} (失敗: ${failedRows})`);
  if (failedRows > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error(`FATAL: ${e instanceof Error ? e.message : String(e)}`);
  process.exitCode = 1;
});
