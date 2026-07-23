/**
 * Official NEWS crawler entry point.
 *
 * No arguments is an offline-to-DB dry-run. Gemini is called only with --classify.
 * Supabase is touched only with --execute --classify after all required environment checks pass.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "./loadEnvLocal.mjs";
import {
  CRAWLER_USAGE,
  CliArgumentError,
  parseCrawlerArgs,
  validateExecutionSafety,
} from "./officialNews/cliArgs";
import {
  articleIdentityKey,
  isPersistableAiStatus,
  loadExistingArticleKeys,
  upsertOfficialNewsArticle,
  type OfficialNewsWriteRow,
} from "./officialNews/db";
import {
  classifyArticleWithGemini,
  type GeminiClassifyResult,
} from "./officialNews/gemini";
import { selectRoundRobin } from "./officialNews/roundRobin";
import { fetchDetailForConfig, fetchListForConfig } from "./officialNews/runStrategy";
import { getEnabledSiteConfigs } from "./officialNews/sites/index";
import type { CrawledArticle, ListFetchResult, SiteConfig } from "./officialNews/types";
import { normalizeOfficialNewsUrl } from "./officialNews/urlIdentity.mjs";

const GEMINI_WAIT_BETWEEN_MS = 5000;
const MAX_SLOW_SITE_NEW = 3;
export const MAX_TOTAL_NEW_PER_RUN = 15;

type AiReportStatus =
  | "not_requested"
  | "not_configured"
  | "classified"
  | "error"
  | "quota_exhausted"
  | "deferred_after_quota"
  | "deferred_detail_error";

type ArticleReport = {
  article_url: string;
  normalized_article_url: string;
  ai_status: AiReportStatus;
  ai_error?: string;
  db_status: "success" | "failed" | "skipped";
  db_error?: string;
};

type SiteReport = {
  artist_slug: string;
  strategy: string;
  status: "success" | "failed" | "skipped";
  list_item_count?: number;
  candidate_article_count?: number;
  new_article_count?: number;
  limit_deferred_count?: number;
  limit_deferred_articles?: string[];
  body_success?: number;
  body_fail?: number;
  gemini_classified?: number;
  gemini_error?: number;
  db_success?: number;
  db_fail?: number;
  quota_stopped?: boolean;
  articles?: ArticleReport[];
  reason?: string;
  duration_ms: number;
};

type CrawlReport = {
  generated_at: string;
  completed_at: string | null;
  mode: "dry_run" | "execute";
  gemini_enabled: boolean;
  filter: { artist: string | null; group: string | null };
  target_site_count: number;
  failed_site_count: number;
  selected_article_count: number;
  limit_deferred_count: number;
  limit_reached: boolean;
  db_success_count: number;
  db_failure_count: number;
  database_errors: Array<{
    operation: "select_existing_urls" | "upsert_article";
    artist_slug?: string;
    article_url?: string;
    reason: string;
  }>;
  quota_stopped: boolean;
  total_gemini_classified: number;
  total_gemini_error: number;
  fatal_error: string | null;
  sites: SiteReport[];
};

type ReportHandle = { reportPath: string; save: () => void };

export type CrawlerDependencies = {
  env: NodeJS.ProcessEnv;
  loadEnvironment: () => { loaded: boolean; setCount: number };
  getSites: () => SiteConfig[];
  fetchList: (config: SiteConfig) => Promise<ListFetchResult>;
  fetchDetail: typeof fetchDetailForConfig;
  classify: (input: Parameters<typeof classifyArticleWithGemini>[0]) => Promise<GeminiClassifyResult>;
  createSupabase: (url: string, serviceKey: string) => Promise<SupabaseClient>;
  loadExistingKeys: typeof loadExistingArticleKeys;
  upsert: typeof upsertOfficialNewsArticle;
  sleep: (ms: number) => Promise<void>;
  createReport: (report: CrawlReport) => ReportHandle;
  log: Pick<Console, "log" | "error">;
};

type CandidateSite = {
  config: SiteConfig;
  startedAt: number;
  listItemCount: number;
  needsDetailFetch: boolean;
  candidates: CrawledArticle[];
};

type SiteAccumulator = {
  site: CandidateSite;
  selectedCount: number;
  deferredUrls: string[];
  bodySuccess: number;
  bodyFail: number;
  geminiClassified: number;
  geminiError: number;
  dbSuccess: number;
  dbFail: number;
  articles: ArticleReport[];
  reasons: string[];
};

function defaultCreateReport(report: CrawlReport): ReportHandle {
  const reportDir = path.resolve(process.cwd(), "official-news-reports");
  fs.mkdirSync(reportDir, { recursive: true });
  const reportPath = path.join(
    reportDir,
    `crawl-report-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
  );
  const save = () => fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf-8");
  save();
  return { reportPath, save };
}

function defaultDependencies(): CrawlerDependencies {
  return {
    env: process.env,
    loadEnvironment: loadEnvLocal,
    getSites: getEnabledSiteConfigs,
    fetchList: fetchListForConfig,
    fetchDetail: fetchDetailForConfig,
    classify: (input) => classifyArticleWithGemini(input, { retryOn429: false }),
    createSupabase: async (url, serviceKey) => {
      const { createClient } = await import("@supabase/supabase-js");
      return createClient(url, serviceKey);
    },
    loadExistingKeys: loadExistingArticleKeys,
    upsert: upsertOfficialNewsArticle,
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    createReport: defaultCreateReport,
    log: console,
  };
}

function toWriteRow(
  artistSlug: string,
  article: CrawledArticle,
  body: string | null,
  thumbnail: string | null,
  ai: GeminiClassifyResult,
): OfficialNewsWriteRow {
  return {
    artist_slug: artistSlug,
    article_title: article.title,
    article_url: article.article_url,
    published_date: article.published_date,
    article_body: body,
    thumbnail_url: thumbnail,
    category: ai.category,
    is_event_candidate: ai.is_event_candidate,
    event_name: ai.event_name,
    tour_name: ai.tour_name,
    event_dates: ai.event_dates ?? [],
    venue_names: ai.venue_names ?? [],
    ticket_sale_start: ai.ticket_sale_start,
    ticket_sale_end: ai.ticket_sale_end,
    confidence: ai.confidence,
    needs_review: ai.needs_review,
    review_reason: ai.review_reason,
    fetched_at: new Date().toISOString(),
  };
}

function newReport(argv: ReturnType<typeof parseCrawlerArgs>): CrawlReport {
  return {
    generated_at: new Date().toISOString(),
    completed_at: null,
    mode: argv.execute ? "execute" : "dry_run",
    gemini_enabled: argv.classify,
    filter: { artist: argv.artist ?? null, group: argv.group ?? null },
    target_site_count: 0,
    failed_site_count: 0,
    selected_article_count: 0,
    limit_deferred_count: 0,
    limit_reached: false,
    db_success_count: 0,
    db_failure_count: 0,
    database_errors: [],
    quota_stopped: false,
    total_gemini_classified: 0,
    total_gemini_error: 0,
    fatal_error: null,
    sites: [],
  };
}

function safeReason(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function runCrawler(
  argv: string[],
  overrides: Partial<CrawlerDependencies> = {},
): Promise<number> {
  const deps = { ...defaultDependencies(), ...overrides };
  let args: ReturnType<typeof parseCrawlerArgs>;
  try {
    args = parseCrawlerArgs(argv);
  } catch (error) {
    deps.log.error(`Argument error: ${safeReason(error)}\n\n${CRAWLER_USAGE}`);
    return error instanceof CliArgumentError ? 2 : 1;
  }
  if (args.help) {
    deps.log.log(CRAWLER_USAGE);
    return 0;
  }

  const report = newReport(args);
  const { reportPath, save } = deps.createReport(report);
  let exitCode = 0;

  try {
    const envInfo = deps.loadEnvironment();
    deps.log.log(
      `.env.local: ${envInfo.loaded ? `loaded (${envInfo.setCount} new variables)` : "not found"}`,
    );
    deps.log.log(`Mode: ${args.execute ? "EXECUTE" : "DRY-RUN (no Supabase connection)"}`);
    deps.log.log(
      `Gemini: ${args.classify ? "enabled explicitly (API usage applies)" : "disabled"}`,
    );

    validateExecutionSafety(args, deps.env);

    let sites = deps.getSites();
    if (args.artist) sites = sites.filter((site) => site.artistSlug === args.artist);
    if (args.group) {
      sites = sites.filter(
        (site) => site.specialParserName === args.group || site.cmsGroup === args.group,
      );
    }
    report.target_site_count = sites.length;
    if (sites.length === 0) throw new Error("No sites matched the supplied filter.");

    let supabase: SupabaseClient | null = null;
    let existingArticleKeys = new Set<string>();
    if (args.execute) {
      const supabaseUrl = deps.env.SUPABASE_URL ?? "";
      const serviceKey = deps.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
      if (!supabaseUrl || !serviceKey) {
        throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY is not configured.");
      }
      supabase = await deps.createSupabase(supabaseUrl, serviceKey);
      try {
        existingArticleKeys = await deps.loadExistingKeys(supabase);
      } catch (error) {
        report.database_errors.push({ operation: "select_existing_urls", reason: safeReason(error) });
        report.db_failure_count++;
        throw error;
      }
    }

    const candidatesBySlug = new Map<string, CandidateSite>();
    const reportsBySlug = new Map<string, SiteReport>();

    // Fetch every enabled site's list before allocating the shared limit. One site's failure does
    // not prevent later sites from receiving a round-robin turn.
    for (const config of sites) {
      const startedAt = Date.now();
      try {
        const { articles, needsDetailFetch, robots } = await deps.fetchList(config);
        const seen = new Set<string>();
        let candidates = articles
          .map((article) => ({
            ...article,
            article_url: normalizeOfficialNewsUrl(article.article_url),
          }))
          .filter((article) => {
            if (!article.article_url) return false;
            const key = articleIdentityKey(config.artistSlug, article.article_url);
            if (seen.has(key)) return false;
            seen.add(key);
            return !args.execute || !existingArticleKeys.has(key);
          });
        if (robots.crawlDelay > 0) candidates = candidates.slice(0, MAX_SLOW_SITE_NEW);
        candidatesBySlug.set(config.artistSlug, {
          config,
          startedAt,
          listItemCount: articles.length,
          needsDetailFetch,
          candidates,
        });
      } catch (error) {
        const reason = safeReason(error);
        reportsBySlug.set(config.artistSlug, {
          artist_slug: config.artistSlug,
          strategy: config.strategy,
          status: "failed",
          reason,
          duration_ms: Date.now() - startedAt,
        });
        deps.log.error(`[FAILED] ${config.artistSlug}: ${reason}`);
      }
    }

    const candidateSites = sites
      .map((site) => candidatesBySlug.get(site.artistSlug))
      .filter((site): site is CandidateSite => site !== undefined);
    const allocation = selectRoundRobin(
      candidateSites.map((site) => site.candidates),
      MAX_TOTAL_NEW_PER_RUN,
    );
    report.selected_article_count = allocation.selected.length;
    report.limit_deferred_count = allocation.deferred.reduce((sum, items) => sum + items.length, 0);
    report.limit_reached = report.limit_deferred_count > 0;

    const accumulators = candidateSites.map<SiteAccumulator>((site, index) => ({
      site,
      selectedCount: allocation.selected.filter((entry) => entry.bucketIndex === index).length,
      deferredUrls: allocation.deferred[index].map((article) => article.article_url),
      bodySuccess: 0,
      bodyFail: 0,
      geminiClassified: 0,
      geminiError: 0,
      dbSuccess: 0,
      dbFail: 0,
      articles: [],
      reasons: [],
    }));

    let geminiQuotaExhausted = false;
    for (let selectionIndex = 0; selectionIndex < allocation.selected.length; selectionIndex++) {
      const { bucketIndex, item: article } = allocation.selected[selectionIndex];
      const state = accumulators[bucketIndex];
      const { config, needsDetailFetch } = state.site;
      let body = article.body;
      let thumbnail = article.thumbnail_url;
      let detailFetchFailed = false;

      if (needsDetailFetch) {
        try {
          const detail = await deps.fetchDetail(config, article.article_url);
          if (detail.success) {
            body = detail.body;
            thumbnail = detail.thumbnail ?? thumbnail;
          } else {
            body = null;
            detailFetchFailed = true;
          }
          const delayMs = ("crawlDelay" in detail ? detail.crawlDelay ?? 0 : 0) * 1000;
          if (delayMs > 0) await deps.sleep(delayMs);
        } catch (error) {
          body = null;
          detailFetchFailed = true;
          state.reasons.push(`Detail fetch failed: ${safeReason(error)}`);
        }
      }
      if (body != null && body !== "") state.bodySuccess++;
      else state.bodyFail++;

      const articleReport: ArticleReport = {
        article_url: article.article_url,
        normalized_article_url: normalizeOfficialNewsUrl(article.article_url),
        ai_status: "not_requested",
        db_status: "skipped",
      };

      if (!args.classify) {
        articleReport.ai_status = "not_requested";
      } else if (detailFetchFailed) {
        articleReport.ai_status = "deferred_detail_error";
        articleReport.ai_error = "Detail fetch failed; classification and persistence deferred.";
        state.geminiError++;
      } else if (geminiQuotaExhausted) {
        articleReport.ai_status = "deferred_after_quota";
        articleReport.ai_error = "Deferred without an API call after quota exhaustion.";
        state.geminiError++;
      } else {
        try {
          const ai = await deps.classify({
            artist_name: config.artistName,
            article_title: article.title,
            published_date: article.published_date,
            article_body: body,
            article_url: article.article_url,
          });
          articleReport.ai_status = ai.ai_status;
          if (isPersistableAiStatus(ai.ai_status)) {
            state.geminiClassified++;
            if (args.execute && supabase) {
              const dbResult = await deps.upsert(
                supabase,
                toWriteRow(config.artistSlug, article, body, thumbnail, ai),
              );
              if (dbResult.ok) {
                articleReport.db_status = "success";
                state.dbSuccess++;
                existingArticleKeys.add(articleIdentityKey(config.artistSlug, article.article_url));
              } else {
                articleReport.db_status = "failed";
                articleReport.db_error = dbResult.error;
                state.dbFail++;
                report.database_errors.push({
                  operation: "upsert_article",
                  artist_slug: config.artistSlug,
                  article_url: article.article_url,
                  reason: dbResult.error,
                });
              }
            }
          } else {
            state.geminiError++;
            articleReport.ai_error = ai.review_reason;
            if (ai.ai_status === "quota_exhausted") {
              geminiQuotaExhausted = true;
              report.quota_stopped = true;
            }
          }
          if (
            selectionIndex < allocation.selected.length - 1 &&
            ai.ai_status !== "not_configured" &&
            ai.ai_status !== "quota_exhausted"
          ) {
            await deps.sleep(GEMINI_WAIT_BETWEEN_MS);
          }
        } catch (error) {
          state.geminiError++;
          articleReport.ai_status = "error";
          articleReport.ai_error = `Gemini classification failed: ${safeReason(error)}`;
        }
      }
      state.articles.push(articleReport);
    }

    for (const state of accumulators) {
      if (state.bodyFail > 0) state.reasons.push(`${state.bodyFail} detail/body fetch(es) failed`);
      if (state.geminiError > 0) {
        state.reasons.push(`${state.geminiError} Gemini classification(s) deferred/failed`);
      }
      if (state.dbFail > 0) state.reasons.push(`${state.dbFail} database write(s) failed`);
      const failed = state.bodyFail > 0 || state.geminiError > 0 || state.dbFail > 0;
      reportsBySlug.set(state.site.config.artistSlug, {
        artist_slug: state.site.config.artistSlug,
        strategy: state.site.config.strategy,
        status: failed ? "failed" : "success",
        list_item_count: state.site.listItemCount,
        candidate_article_count: state.site.candidates.length,
        new_article_count: state.selectedCount,
        limit_deferred_count: state.deferredUrls.length,
        limit_deferred_articles: state.deferredUrls,
        body_success: state.bodySuccess,
        body_fail: state.bodyFail,
        gemini_classified: state.geminiClassified,
        gemini_error: state.geminiError,
        db_success: state.dbSuccess,
        db_fail: state.dbFail,
        quota_stopped: geminiQuotaExhausted,
        articles: state.articles,
        reason: state.reasons.length > 0 ? state.reasons.join("; ") : undefined,
        duration_ms: Date.now() - state.site.startedAt,
      });
      report.total_gemini_classified += state.geminiClassified;
      report.total_gemini_error += state.geminiError;
      report.db_success_count += state.dbSuccess;
      report.db_failure_count += state.dbFail;
      deps.log.log(
        `[${failed ? "FAILED" : "OK"}] ${state.site.config.artistSlug}: candidates=${state.site.candidates.length} selected=${state.selectedCount} deferred=${state.deferredUrls.length} gemini_ok=${state.geminiClassified} db_ok=${state.dbSuccess}`,
      );
    }

    report.sites = sites
      .map((site) => reportsBySlug.get(site.artistSlug))
      .filter((site): site is SiteReport => site !== undefined);
    report.failed_site_count = report.sites.filter((site) => site.status === "failed").length;
    if (report.failed_site_count > 0 || report.db_failure_count > 0) exitCode = 1;
  } catch (error) {
    report.fatal_error = safeReason(error);
    deps.log.error(`FATAL: ${report.fatal_error}`);
    exitCode = 1;
  } finally {
    report.failed_site_count = report.sites.filter((site) => site.status === "failed").length;
    report.completed_at = new Date().toISOString();
    save();
    deps.log.log(`Report: ${reportPath}`);
    deps.log.log(
      `Summary: sites=${report.target_site_count}, failed_sites=${report.failed_site_count}, selected=${report.selected_article_count}, limit_deferred=${report.limit_deferred_count}, db_ok=${report.db_success_count}, db_failed=${report.db_failure_count}, gemini_ok=${report.total_gemini_classified}, gemini_failed=${report.total_gemini_error}`,
    );
  }
  return exitCode;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  runCrawler(process.argv.slice(2))
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error) => {
      console.error(`FATAL before report initialization: ${safeReason(error)}`);
      process.exitCode = 1;
    });
}
