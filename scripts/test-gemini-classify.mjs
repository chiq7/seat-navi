// Gemini分類の動作テスト(無料枠での継続処理に対応)。
// 独立した確認用スクリプトであり、official_news_candidates.json 本体は書き換えない
// (結果は official_news_gemini_test_results.json のみに保存する)。
//
// 実行方法: node scripts/test-gemini-classify.mjs [件数]
//   例: node scripts/test-gemini-classify.mjs 10
//
// 呼び出し制御:
//   - 1件ずつ逐次呼び出し(並列送信は行わない)
//   - 1件ごとに15秒待機
//   - maxOutputTokens=512 (geminiClassifier.mjs側で固定)
//   - 429時はquota詳細を記録し、retryDelay分だけ待って1回だけ再試行。
//     再度429ならその時点で処理を打ち切り、位置を保存して正常終了する(次回はそこから再開)。
//   - 既に ai_status:"classified" 済みの記事は再送しない(未処理分のみ処理する)。
//
// 制約: DB保存・Cron接続・commit/push/deployは行わない。APIキー・記事本文はログに出さない。

import fs from "fs";
import { loadEnvLocal } from "./loadEnvLocal.mjs";
import { classifyArticleWithGemini } from "./geminiClassifier.mjs";

const CANDIDATES_PATH = "C:\\Users\\tcgea\\Documents\\tixrepo-data\\official_news_candidates.json";
const OUT_PATH = "C:\\Users\\tcgea\\Documents\\tixrepo-data\\official_news_gemini_test_results.json";
const SAMPLE_SIZE = Number(process.argv[2]) > 0 ? Number(process.argv[2]) : 10;
const WAIT_BETWEEN_MS = 15000;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const envInfo = loadEnvLocal();
  console.log(`.env.local: ${envInfo.loaded ? `読み込み済み(${envInfo.setCount}件の新規変数を設定)` : "見つかりません"}`);
  console.log(`GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? "設定されています" : "未設定"}`);
  console.log(`GEMINI_MODEL: ${process.env.GEMINI_MODEL || "(デフォルト値を使用)"}`);

  if (!process.env.GEMINI_API_KEY) {
    console.log("\nGEMINI_API_KEYが未設定のため、テストを実行できません。");
    return;
  }

  const candidatesState = JSON.parse(fs.readFileSync(CANDIDATES_PATH, "utf-8"));
  const pool = candidatesState.candidates.filter((c) => c.ai_status === "not_configured");
  const sample = pool.slice(0, SAMPLE_SIZE);

  // 既存の結果ファイルを読み込み、成功済み(classified)の記事はスキップする。
  let existing = { results: [] };
  if (fs.existsSync(OUT_PATH)) {
    existing = JSON.parse(fs.readFileSync(OUT_PATH, "utf-8"));
  }
  const existingByUrl = new Map(existing.results.map((r) => [r.article_url, r]));
  const alreadyDone = new Set(
    existing.results.filter((r) => r.ai_status === "classified").map((r) => r.article_url)
  );

  const pending = sample.filter((c) => !alreadyDone.has(c.article_url));
  console.log(`\ncandidates.json: ${candidatesState.candidates.length}件中、未分類(not_configured) ${pool.length}件`);
  console.log(`サンプル${sample.length}件中、処理済み(classified) ${sample.length - pending.length}件・未処理 ${pending.length}件\n`);

  const newResults = [];
  let stoppedEarly = null;

  for (let i = 0; i < pending.length; i++) {
    const c = pending[i];
    process.stdout.write(`[${c.artist_slug}] ${c.article_title.slice(0, 40)}... `);

    const ai = await classifyArticleWithGemini(
      {
        artist_name: c.artist_name,
        article_title: c.article_title,
        published_date: c.published_date,
        article_body: c.article_body,
        article_url: c.article_url,
      },
      { retryOn429: false }
    );

    console.log(
      `-> ${ai.ai_status}` +
        (ai.ai_status === "classified" ? ` / category=${ai.category} / is_event_candidate=${ai.is_event_candidate}` : "") +
        (ai.usage ? ` / tokens(total=${ai.usage.totalTokenCount})` : "")
    );

    const record = {
      artist_name: c.artist_name,
      artist_slug: c.artist_slug,
      article_title: c.article_title,
      article_url: c.article_url,
      published_date: c.published_date,
      ai_status: ai.ai_status,
      category: ai.category,
      is_event_candidate: ai.is_event_candidate,
      event_name: ai.event_name,
      tour_name: ai.tour_name,
      event_dates: ai.event_dates,
      venue_names: ai.venue_names,
      ticket_sale_start: ai.ticket_sale_start,
      ticket_sale_end: ai.ticket_sale_end,
      confidence: ai.confidence,
      needs_review: ai.needs_review,
      review_reason: ai.review_reason,
      usage: ai.usage,
      quota_error: ai.quota_error,
      rate_limit_headers: ai.rate_limit_headers ?? null,
    };

    if (ai.ai_status === "quota_exhausted") {
      // このquota_exhausted結果自体は保存するが(quota詳細を記録するため)、
      // "処理済み(classified)"扱いにはしないため次回もこの記事は再度対象になる。
      newResults.push(record);
      stoppedEarly = "quotaを使い切ったため打ち切り(次回、この記事から再開)";
      console.log(`\n[停止] ${stoppedEarly}`);
      break;
    }

    newResults.push(record);

    // 最後の1件の後は待つ必要がないため、次がある場合のみ待機する。
    if (i < pending.length - 1) {
      await sleep(WAIT_BETWEEN_MS);
    }
  }

  // 既存の成功済み結果は保持し、今回処理した分だけ上書き/追加する(article_urlで一意化)。
  for (const r of newResults) {
    existingByUrl.set(r.article_url, r);
  }
  const mergedResults = sample.map((c) => existingByUrl.get(c.article_url)).filter(Boolean);

  const succ = mergedResults.filter((r) => r.ai_status === "classified").length;
  const err = mergedResults.filter((r) => r.ai_status === "error").length;
  const quotaBlocked = mergedResults.filter((r) => r.ai_status === "quota_exhausted").length;

  fs.writeFileSync(
    OUT_PATH,
    JSON.stringify(
      {
        tested_at: new Date().toISOString(),
        model: process.env.GEMINI_MODEL || "gemini-flash-latest (default)",
        sample_size: mergedResults.length,
        classified_count: succ,
        error_count: err,
        quota_exhausted_count: quotaBlocked,
        note: "動作テストのみ。official_news_candidates.json本体は未更新。DB未保存。",
        stopped_early_reason: stoppedEarly,
        results: mergedResults,
      },
      null,
      2
    ),
    "utf-8"
  );

  console.log(`\n=== 結果 ===`);
  console.log(`今回処理: ${newResults.length}件`);
  console.log(`累計(サンプル${sample.length}件中): 分類成功 ${succ} / エラー ${err} / quota打ち切り ${quotaBlocked}`);
  console.log(`出力先: ${OUT_PATH}`);
}

main().catch((e) => {
  console.error("FATAL:", e && e.message ? e.message : e);
  process.exit(1);
});
