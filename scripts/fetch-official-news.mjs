// 公式NEWS 週次差分取得スクリプト(独立検証用、手動実行)。
//
// 実行方法: node scripts/fetch-official-news.mjs
//
// 処理は2段階:
//   Phase 1: 各サイトのNEWS一覧を取得し、新着記事だけ詳細本文を取得してlatest.jsonへ保存する。
//   Phase 2: latest.json内でまだcandidates.jsonに結果が無い記事(=新着 + 過去の未処理分)だけを
//            対象に、Geminiで1件ずつ逐次分類する(15秒間隔・thinkingBudget:0・maxOutputTokens:512・
//            429時は自動再試行せず、その時点で処理を打ち切って正常終了する)。
//
// 重要な制約(今回のタスク範囲):
//   - DBへは保存しない。出力はローカルJSON 3ファイルのみ。
//   - eventsテーブル登録・venues新規作成・eventCrawler.ts統合・本番Cron接続は行わない。
//   - Gemini APIキー未設定時は呼び出さず、not_configuredの候補として保存する(従来通り)。
//   - 有料モデル・別モデルへの自動フォールバックはしない。
//   - 1サイトの失敗・1記事の失敗で全体を止めない。
//   - article_urlを一意キーとして重複取得・重複保存・重複分類をしない。
//   - exo-jp.netのrobots.txt Crawl-delay(30秒)を遵守する。
//
// 速報性は不要(週1回の手動実行を想定)。今回はCron接続を行わない。

import fs from "fs";
import { OFFICIAL_NEWS_SOURCES } from "./officialNewsConfig.mjs";
import { LIST_FETCHERS } from "./officialNewsListFetchers.mjs";
import { fetchDetail, detectSiteParser } from "./official_news_full_fetch.mjs";
import { classifyArticleWithGemini } from "./geminiClassifier.mjs";
import { loadEnvLocal } from "./loadEnvLocal.mjs";

const DATA_DIR = "C:\\Users\\tcgea\\Documents\\tixrepo-data";
const SEEN_URLS_PATH = `${DATA_DIR}\\official_news_seen_urls.json`;
const LATEST_PATH = `${DATA_DIR}\\official_news_latest.json`;
const CANDIDATES_PATH = `${DATA_DIR}\\official_news_candidates.json`;

const FIRST_RUN_LIMIT = 20;
const GEMINI_WAIT_BETWEEN_MS = 5000;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function readJsonSafe(path, fallback) {
  try {
    if (!fs.existsSync(path)) return fallback;
    return JSON.parse(fs.readFileSync(path, "utf-8"));
  } catch {
    return fallback;
  }
}

function writeJson(path, data) {
  fs.writeFileSync(path, JSON.stringify(data, null, 2), "utf-8");
}

async function main() {
  const seenState = readJsonSafe(SEEN_URLS_PATH, {});
  const latestState = readJsonSafe(LATEST_PATH, { articles: [] });
  const candidatesState = readJsonSafe(CANDIDATES_PATH, { candidates: [] });

  const latestUrlSet = new Set(latestState.articles.map((a) => a.article_url));
  const candidateUrlSet = new Set(candidatesState.candidates.map((c) => c.article_url));

  const lastRequestAt = new Map(); // origin -> timestamp, exo-jp.netのCrawl-delay遵守用
  const runSummary = [];
  const newlyDiscovered = [];

  for (const source of OFFICIAL_NEWS_SOURCES) {
    if (!source.enabled) continue;

    const slugState = seenState[source.artistSlug] || { seen_urls: [], run_count: 0, last_run_at: null };
    const isFirstRun = slugState.seen_urls.length === 0;
    const seenSet = new Set(slugState.seen_urls);

    try {
      const fetcher = LIST_FETCHERS[source.parserGroup];
      if (!fetcher) throw new Error(`no list fetcher for parserGroup "${source.parserGroup}"`);

      const { method, robots, articles, needsDetailFetch } = await fetcher(source);

      // article_urlで重複排除した上で、未取得(未seen)のものだけを新着候補とする。
      const seenInThisList = new Set();
      let candidatesList = [];
      for (const a of articles) {
        if (!a.article_url || seenInThisList.has(a.article_url)) continue;
        seenInThisList.add(a.article_url);
        if (!seenSet.has(a.article_url)) candidatesList.push(a);
      }
      if (isFirstRun) candidatesList = candidatesList.slice(0, FIRST_RUN_LIMIT);

      let bodySuccess = 0;
      let bodyFail = 0;
      const newArticlesForSource = [];

      for (const a of candidatesList) {
        let body = a.body;
        let bodyFetchSuccess = body != null && body !== "";
        let bodyFetchError = bodyFetchSuccess ? null : "list-level body missing";

        if (needsDetailFetch) {
          try {
            const origin = new URL(a.article_url).origin;
            const site = detectSiteParser(a.article_url);
            if (!site) throw new Error("no detail parser for this domain");

            const r = await fetchDetail(a.article_url, site);
            lastRequestAt.set(origin, Date.now());

            if (r.success) {
              body = r.body;
              bodyFetchSuccess = true;
              bodyFetchError = null;
              if (r.thumbnail) a.thumbnail_url = r.thumbnail;
            } else {
              body = null;
              bodyFetchSuccess = false;
              bodyFetchError = r.error;
            }

            // exo-jp.net はCrawl-delay:30を robots.txt で指定しているため遵守する。
            const delayMs = (r.crawlDelay || 0) * 1000;
            if (delayMs > 0) await sleep(delayMs);
          } catch (e) {
            body = null;
            bodyFetchSuccess = false;
            bodyFetchError = String(e && e.message ? e.message : e);
          }
        }

        if (bodyFetchSuccess) bodySuccess++;
        else bodyFail++;

        const fetchedAt = new Date().toISOString();
        const articleRecord = {
          artist_name: source.artistName,
          artist_slug: source.artistSlug,
          article_title: a.title,
          published_date: a.published_date,
          article_url: a.article_url,
          thumbnail_url: a.thumbnail_url ?? null,
          article_body: body,
          body_fetch_success: bodyFetchSuccess,
          body_fetch_error: bodyFetchError,
          fetched_at: fetchedAt,
        };

        newArticlesForSource.push(articleRecord);

        if (!latestUrlSet.has(a.article_url)) {
          latestUrlSet.add(a.article_url);
          latestState.articles.push(articleRecord);
        }

        // Gemini分類はPhase 2でまとめて行う(ここでは本文取得・latest.json保存のみ)。
        seenSet.add(a.article_url);
      }

      seenState[source.artistSlug] = {
        seen_urls: Array.from(seenSet),
        run_count: (slugState.run_count || 0) + 1,
        last_run_at: new Date().toISOString(),
      };

      newlyDiscovered.push(...newArticlesForSource);
      runSummary.push({
        artist_slug: source.artistSlug,
        artist_name: source.artistName,
        parser_group: source.parserGroup,
        method,
        status: "success",
        is_first_run: isFirstRun,
        list_article_count: articles.length,
        new_article_count: newArticlesForSource.length,
        body_fetch_success: bodySuccess,
        body_fetch_failure: bodyFail,
        robots_allowed: robots.allowed,
      });
      console.log(
        `[OK] ${source.artistSlug}: list=${articles.length} new=${newArticlesForSource.length} body_ok=${bodySuccess} body_fail=${bodyFail}${isFirstRun ? " (first run)" : ""}`
      );
    } catch (e) {
      runSummary.push({
        artist_slug: source.artistSlug,
        artist_name: source.artistName,
        parser_group: source.parserGroup,
        status: "failed",
        reason: String(e && e.message ? e.message : e),
      });
      console.log(`[FAILED] ${source.artistSlug}: ${e && e.message ? e.message : e}`);
      // このサイトの失敗のみを記録し、他サイトの処理は継続する。
    }
  }

  writeJson(SEEN_URLS_PATH, seenState);
  latestState.last_run_at = new Date().toISOString();
  writeJson(LATEST_PATH, latestState);

  const totalNew = newlyDiscovered.length;
  const totalBodySuccess = newlyDiscovered.filter((a) => a.body_fetch_success).length;
  const totalBodyFail = totalNew - totalBodySuccess;

  // ---------------------------------------------------------------------
  // Phase 2: Gemini分類。latest.json内でまだcandidates.jsonに結果が無い記事だけを対象にする。
  // これにより「今回の新着」だけでなく、前回quota超過等で未処理のまま残った記事も自然に対象になる。
  // ---------------------------------------------------------------------
  loadEnvLocal();
  const pendingForGemini = latestState.articles.filter((a) => !candidateUrlSet.has(a.article_url));

  let geminiClassified = 0;
  let geminiErrors = 0;
  let geminiQuotaStopped = false;
  let geminiQuotaDetail = null;

  if (pendingForGemini.length === 0) {
    console.log("\nGemini分類対象の新着記事が無いため、Geminiは呼び出しません。");
  } else {
    console.log(`\nGemini分類対象: ${pendingForGemini.length}件`);
    for (let i = 0; i < pendingForGemini.length; i++) {
      const a = pendingForGemini[i];
      process.stdout.write(`[Gemini] ${a.artist_slug} ${a.article_title.slice(0, 40)}... `);

      let aiResult;
      try {
        aiResult = await classifyArticleWithGemini(
          {
            artist_name: a.artist_name,
            article_title: a.article_title,
            published_date: a.published_date,
            article_body: a.article_body,
            article_url: a.article_url,
          },
          { retryOn429: false }
        );
      } catch (e) {
        aiResult = {
          ai_status: "error",
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
          review_reason: `Gemini呼び出し中にエラー: ${e && e.message ? e.message : e}`,
          usage: null,
          quota_error: null,
        };
      }

      console.log(
        `-> ${aiResult.ai_status}${aiResult.ai_status === "classified" ? ` / category=${aiResult.category}` : ""}`
      );

      candidateUrlSet.add(a.article_url);
      candidatesState.candidates.push({
        artist_name: a.artist_name,
        artist_slug: a.artist_slug,
        article_title: a.article_title,
        published_date: a.published_date,
        article_url: a.article_url,
        article_body: a.article_body,
        thumbnail_url: a.thumbnail_url ?? null,
        fetched_at: a.fetched_at,
        ...aiResult,
      });

      if (aiResult.ai_status === "classified") geminiClassified++;
      else if (aiResult.ai_status === "error") geminiErrors++;

      if (aiResult.ai_status === "quota_exhausted") {
        geminiQuotaStopped = true;
        geminiQuotaDetail = aiResult.quota_error;
        console.log(`[停止] Geminiのクォータ上限に達したため処理を打ち切り、未処理分は次回に持ち越します。`);
        break;
      }

      if (i < pendingForGemini.length - 1) {
        await sleep(GEMINI_WAIT_BETWEEN_MS);
      }
    }
  }

  writeJson(CANDIDATES_PATH, candidatesState);

  console.log("\n=== 実行サマリ ===");
  for (const s of runSummary) {
    if (s.status === "failed") {
      console.log(`- ${s.artist_slug}: FAILED (${s.reason})`);
    } else {
      console.log(
        `- ${s.artist_slug}: 新着${s.new_article_count}件 / 本文成功${s.body_fetch_success}・失敗${s.body_fetch_failure}${s.is_first_run ? " [初回]" : ""}`
      );
    }
  }
  console.log(`\n新着記事合計: ${totalNew}件 (本文成功 ${totalBodySuccess} / 失敗 ${totalBodyFail})`);
  console.log(
    `Gemini分類: 成功${geminiClassified}件 / エラー${geminiErrors}件${geminiQuotaStopped ? ` / quota打ち切り(${geminiQuotaDetail?.quotaId ?? "不明"})` : ""}`
  );
  console.log(`latest.json 累計件数: ${latestState.articles.length}`);
  console.log(`candidates.json 累計件数: ${candidatesState.candidates.length}`);
  console.log(`出力先:\n  ${SEEN_URLS_PATH}\n  ${LATEST_PATH}\n  ${CANDIDATES_PATH}`);
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
