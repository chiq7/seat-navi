// 公式NEWS Gemini分類 初回バックフィルスクリプト(独立・手動実行、1回だけ実行するものではなく
// 全件終わるまで複数回実行することを想定)。
//
// 目的: official_news_candidates.json のうち ai_status が
//   not_configured / error / quota_exhausted の記事(=まだ正しく分類できていない記事)を、
//   1回の実行につき最大15件だけGeminiで分類する。classified済みの記事は再処理しない。
//   全件のバックフィルが終わったあとは、通常運用は fetch-official-news.mjs 側の
//   「新着記事だけ分類する」フローに戻る(このスクリプトは新着検知は行わない)。
//
// 実行方法: node scripts/backfill-official-news-gemini.mjs
//
// 呼び出し制御(fetch-official-news.mjs / test-gemini-classify.mjsと同じ方針):
//   - 1件ずつ逐次処理、15秒間隔、並列送信なし
//   - thinkingBudget:0, maxOutputTokens:512, JSON出力のみ(geminiClassifier.mjs側で固定)
//   - 429時は自動再試行せず(retryOn429:false)、その時点で処理を打ち切り正常終了する
//   - 有料モデル・別モデルへの自動フォールバックはしない
//   - GEMINI_API_KEY未設定の場合は何も呼び出さず、正常終了する
//
// 保存先:
//   - official_news_candidates.json: 処理した記事のエントリをその場で更新(既存ファイルのまま)
//   - official_news_backfill_progress.json: total/classified/remaining/error/quota_exhausted/
//     last_processed_url を記録(次回実行時の状況確認・引き継ぎ用)
//
// 今回のタスク範囲外: DB保存・events登録・Cron接続・commit/push/deploy。

import fs from "fs";
import { loadEnvLocal } from "./loadEnvLocal.mjs";
import { classifyArticleWithGemini } from "./geminiClassifier.mjs";

const DATA_DIR = "C:\\Users\\tcgea\\Documents\\tixrepo-data";
const CANDIDATES_PATH = `${DATA_DIR}\\official_news_candidates.json`;
const PROGRESS_PATH = `${DATA_DIR}\\official_news_backfill_progress.json`;

// 既定は1回15件までの安全な上限。--all を渡した場合のみ、その回に限り上限を外す
// (例: node scripts/backfill-official-news-gemini.mjs --all)。
const MAX_PER_RUN = process.argv.includes("--all") ? Infinity : 15;
// 待機間隔はBACKFILL_WAIT_MS環境変数で上書き可能(既定15秒)。
const WAIT_BETWEEN_MS = Number(process.env.BACKFILL_WAIT_MS) > 0 ? Number(process.env.BACKFILL_WAIT_MS) : 15000;
const PENDING_STATUSES = new Set(["not_configured", "error", "quota_exhausted"]);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function writeJson(path, data) {
  fs.writeFileSync(path, JSON.stringify(data, null, 2), "utf-8");
}

function computeProgress(candidates, lastProcessedUrl) {
  const total = candidates.length;
  const classified = candidates.filter((c) => c.ai_status === "classified").length;
  const error = candidates.filter((c) => c.ai_status === "error").length;
  const quotaExhausted = candidates.filter((c) => c.ai_status === "quota_exhausted").length;
  const remaining = total - classified;
  return {
    total,
    classified,
    remaining,
    error,
    quota_exhausted: quotaExhausted,
    last_processed_url: lastProcessedUrl,
    updated_at: new Date().toISOString(),
  };
}

async function main() {
  const envInfo = loadEnvLocal();
  console.log(`.env.local: ${envInfo.loaded ? `読み込み済み(${envInfo.setCount}件の新規変数を設定)` : "見つかりません"}`);

  if (!fs.existsSync(CANDIDATES_PATH)) {
    console.log(`${CANDIDATES_PATH} が見つかりません。処理を終了します。`);
    return;
  }
  const candidatesState = JSON.parse(fs.readFileSync(CANDIDATES_PATH, "utf-8"));
  const candidates = candidatesState.candidates;

  if (!process.env.GEMINI_API_KEY) {
    console.log("GEMINI_API_KEY未設定のため、Gemini呼び出しは行わずに正常終了します。");
    writeJson(PROGRESS_PATH, computeProgress(candidates, null));
    return;
  }

  const pendingIndexes = [];
  for (let i = 0; i < candidates.length; i++) {
    if (PENDING_STATUSES.has(candidates[i].ai_status)) pendingIndexes.push(i);
  }

  console.log(`candidates.json: 全${candidates.length}件 / 未分類(backfill対象) ${pendingIndexes.length}件`);

  if (pendingIndexes.length === 0) {
    console.log("バックフィル対象の記事はありません。全件classified済みです。");
    writeJson(PROGRESS_PATH, computeProgress(candidates, null));
    return;
  }

  const targetIndexes = pendingIndexes.slice(0, MAX_PER_RUN);
  console.log(`今回処理: ${targetIndexes.length}件(1回の実行上限${Number.isFinite(MAX_PER_RUN) ? MAX_PER_RUN + "件" : "なし"})\n`);

  let lastProcessedUrl = null;
  let stoppedByQuota = false;

  for (let i = 0; i < targetIndexes.length; i++) {
    const idx = targetIndexes[i];
    const c = candidates[idx];
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
      `-> ${ai.ai_status}` + (ai.ai_status === "classified" ? ` / category=${ai.category}` : "")
    );

    candidates[idx] = {
      ...c,
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
    lastProcessedUrl = c.article_url;

    // 長時間実行中に中断されても進捗を失わないよう、5件ごとにディスクへ書き出す。
    if ((i + 1) % 5 === 0) {
      writeJson(CANDIDATES_PATH, candidatesState);
      writeJson(PROGRESS_PATH, computeProgress(candidates, lastProcessedUrl));
    }

    if (ai.ai_status === "quota_exhausted") {
      stoppedByQuota = true;
      console.log(`\n[停止] Geminiのクォータ上限に達したため処理を打ち切ります。次回この記事から再開します。`);
      break;
    }

    if (i < targetIndexes.length - 1) {
      await sleep(WAIT_BETWEEN_MS);
    }
  }

  writeJson(CANDIDATES_PATH, candidatesState);
  const progress = computeProgress(candidates, lastProcessedUrl);
  writeJson(PROGRESS_PATH, progress);

  console.log("\n=== バックフィル進捗 ===");
  console.log(`total: ${progress.total}`);
  console.log(`classified: ${progress.classified}`);
  console.log(`remaining: ${progress.remaining}`);
  console.log(`error: ${progress.error}`);
  console.log(`quota_exhausted: ${progress.quota_exhausted}`);
  console.log(`last_processed_url: ${progress.last_processed_url}`);
  if (stoppedByQuota) {
    console.log("\n(quota到達により今回は途中で終了しました。次回実行時に続きから再開します。)");
  } else if (progress.remaining > 0) {
    console.log(`\n(残り${progress.remaining}件。次回実行でさらに最大${MAX_PER_RUN}件処理します。)`);
  } else {
    console.log("\n全件のバックフィルが完了しました。");
  }
  console.log(`\n出力先:\n  ${CANDIDATES_PATH}\n  ${PROGRESS_PATH}`);
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
