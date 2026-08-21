import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import type { SupabaseClient } from "@supabase/supabase-js";
import { runCrawler, type CrawlerDependencies } from "../crawlOfficialNews.mts";
import { OFFICIAL_NEWS_SOURCES } from "../officialNewsConfig.mjs";
import {
  CliArgumentError,
  parseCrawlerArgs,
  validateExecutionSafety,
} from "./cliArgs";
import {
  articleIdentityKey,
  countExistingArticlesByArtist,
  isPersistableAiStatus,
  loadExistingArticleKeys,
  sanitizePostgresText,
  upsertOfficialNewsArticle,
} from "./db";
import { classifyArticleWithGemini } from "./gemini";
import { applyUrlRules } from "./httpUtils";
import { mapJsonApiArticles, parseJsonApiPayload } from "./strategies/jsonApi";
import { extractAutoHtmlArticles } from "./strategies/autoHtml";
import { LEGACY_SOURCES } from "./legacySites";
import { selectRoundRobin } from "./roundRobin";
import type { CrawledArticle, SiteConfig } from "./types";
import { normalizeOfficialNewsUrl } from "./urlIdentity.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("auto HTML strategy keeps same-site article links and rejects navigation or external links", () => {
  const config: SiteConfig = {
    artistSlug: "sample",
    artistName: "Sample",
    officialUrl: "https://www.example.com/news/",
    newsListUrl: "https://www.example.com/news/",
    strategy: "auto_html",
    enabled: true,
    verificationStatus: "verified",
  };
  const articles = extractAutoHtmlArticles(`
    <a href="/news/">NEWS</a>
    <a href="/news/detail/123">2026&#x5E74;7&#x6708;24&#x65E5; 新しい公演のお知らせ</a>
    <a href="https://example.com/information/456?ref=list">追加公演のチケット受付を開始します</a>
    <a href="https://outside.example/news/789">外部サイトの長いニュースタイトル</a>
    <a href="/profile">プロフィールを見る</a>
    <a href="/news/archive">view all</a>
    <a href="/contents/member_blog">PREMIUM BLOG</a>
    <a href="/news/membership">MEMBERSHIP</a>
    <a href="/news/category/live">ライブ・イベント</a>
    <a href="/common/info/list">LDH Information</a>
    <a href="/static/topics/special_and_more">SPECIAL and MORE</a>
  `, "https://www.example.com/news/", config);

  assert.deepEqual(articles.map((article) => article.article_url), [
    "https://www.example.com/news/detail/123",
    "https://example.com/information/456?ref=list",
  ]);
  assert.equal(articles[0].published_date, "2026-07-24");
  assert.equal(articles[0].title, "2026年7月24日 新しい公演のお知らせ");
});

test("JSON API strategy parses JSONP and maps nested fields with relative URLs", () => {
  const payload = parseJsonApiPayload(
    'callback({"items":[{"title":"<b>NEWS</b>","date":"2026.7.3","link":"/artist/sample/info/1","article":"<p>本文</p>","images":{"image":"/images/1.jpg"}}]});',
    "jsonp",
  );
  const articles = mapJsonApiArticles(
    payload,
    {
      url: "https://api.example.com/news",
      responseFormat: "jsonp",
      itemsPath: "items",
      titleField: "title",
      urlField: "link",
      dateField: "date",
      bodyField: "article",
      thumbnailField: "images.image",
      articleUrlBase: "https://www.example.com",
    },
    "https://official.example.com/news",
    { allow: ["^https://www\\.example\\.com/artist/sample/info/"] },
  );

  assert.deepEqual(articles, [{
    title: "NEWS",
    published_date: "2026-07-03",
    article_url: "https://www.example.com/artist/sample/info/1",
    body: "本文",
    thumbnail_url: "https://www.example.com/images/1.jpg",
  }]);
});

test("URL rules remove volatile query parameters without removing article identity", () => {
  assert.equal(
    applyUrlRules(
      "https://ive-official.jp/mob/news/newsShw.php?site=DIVE&ima=5426&cd=OF10423",
      { normalize: { dropQueryParams: ["ima", "aff"] } },
    ),
    "https://ive-official.jp/mob/news/newsShw.php?site=DIVE&cd=OF10423",
  );
});

test("no arguments is dry-run with Gemini disabled", () => {
  const args = parseCrawlerArgs([]);
  assert.equal(args.dryRun, true);
  assert.equal(args.execute, false);
  assert.equal(args.classify, false);
});

const fixtureSite = (slug: string): SiteConfig => ({
  artistSlug: slug,
  artistName: `Fixture ${slug}`,
  officialUrl: `https://example.com/${slug}`,
  newsListUrl: `https://example.com/${slug}/news`,
  strategy: "special",
  specialParserName: "exo",
  enabled: true,
  verificationStatus: "verified",
});

const fixtureArticle = (slug: string, index = 1): CrawledArticle => ({
  title: `Fixture ${slug} ${index}`,
  published_date: "2026-01-01",
  article_url: `https://example.com/${slug}/news/${index}`,
  body: "fixture body",
  thumbnail_url: null,
});

const classifiedResult = {
  ai_status: "classified" as const,
  category: "other" as const,
  is_event_candidate: false,
  event_name: null,
  tour_name: null,
  event_dates: [],
  venue_names: [],
  ticket_sale_start: null,
  ticket_sale_end: null,
  confidence: "high" as const,
  needs_review: false,
  review_reason: "fixture",
  usage: null,
  quota_error: null,
};

function offlineCrawlerDeps(
  counters: { gemini: number; supabase: number },
): Partial<CrawlerDependencies> {
  const site = fixtureSite("artist-a");
  return {
    env: {},
    loadEnvironment: () => ({ loaded: false, setCount: 0 }),
    getSites: () => [site],
    fetchList: async () => ({
      method: "special" as const,
      robots: { allowed: true, crawlDelay: 0, reason: "fixture" },
      articles: [fixtureArticle(site.artistSlug)],
      needsDetailFetch: false,
    }),
    classify: async () => {
      counters.gemini++;
      return classifiedResult;
    },
    createSupabase: async () => {
      counters.supabase++;
      return {} as SupabaseClient;
    },
    sleep: async () => {},
    createReport: () => ({ reportPath: "fixture-report.json", save: () => {} }),
    log: { log: () => {}, error: () => {} },
  };
}

test("crawler mode matrix controls Gemini and Supabase calls", async () => {
  for (const argv of [[], ["--dry-run"]]) {
    const counters = { gemini: 0, supabase: 0 };
    assert.equal(await runCrawler(argv, offlineCrawlerDeps(counters)), 0);
    assert.deepEqual(counters, { gemini: 0, supabase: 0 });
  }

  const previewCounters = { gemini: 0, supabase: 0 };
  assert.equal(
    await runCrawler(["--dry-run", "--classify"], offlineCrawlerDeps(previewCounters)),
    0,
  );
  assert.deepEqual(previewCounters, { gemini: 1, supabase: 0 });

  const executeOnlyCounters = { gemini: 0, supabase: 0 };
  const executeOnlyDeps = offlineCrawlerDeps(executeOnlyCounters);
  executeOnlyDeps.env = {
    OFFICIAL_NEWS_ALLOW_PRODUCTION_WRITE: "true",
    SUPABASE_URL: "fixture",
    SUPABASE_SERVICE_ROLE_KEY: "fixture",
  };
  assert.equal(await runCrawler(["--execute"], executeOnlyDeps), 1);
  assert.deepEqual(executeOnlyCounters, { gemini: 0, supabase: 0 });

  const missingEnvCounters = { gemini: 0, supabase: 0 };
  assert.equal(
    await runCrawler(["--execute", "--classify"], offlineCrawlerDeps(missingEnvCounters)),
    1,
  );
  assert.deepEqual(missingEnvCounters, { gemini: 0, supabase: 0 });
});

test("detail page date fills a missing list date before classification", async () => {
  const capturedDates: Array<string | null> = [];
  const deps = offlineCrawlerDeps({ gemini: 0, supabase: 0 });
  deps.fetchList = async () => ({
    method: "static_html",
    robots: { allowed: true, crawlDelay: 0, reason: "fixture" },
    articles: [{ ...fixtureArticle("artist-a"), published_date: null, body: null }],
    needsDetailFetch: true,
  });
  deps.fetchDetail = async () => ({
    success: true,
    title: "Fixture detail",
    publishedDate: "2026-07-24",
    thumbnail: null,
    body: "fixture detail body",
    crawlDelay: 0,
  });
  deps.classify = async (input) => {
    capturedDates.push(input.published_date);
    return classifiedResult;
  };

  assert.equal(await runCrawler(["--dry-run", "--classify"], deps), 0);
  assert.deepEqual(capturedDates, ["2026-07-24"]);
});

test("round-robin gives every site a turn before second items and reallocates empty capacity", () => {
  const buckets = [["a1", "a2", "a3"], ["b1"], ["c1", "c2"]];
  const result = selectRoundRobin(buckets, 5);
  assert.deepEqual(
    result.selected.map(({ item }) => item),
    ["a1", "b1", "c1", "a2", "c2"],
  );
  assert.deepEqual(result.deferred, [["a3"], [], []]);
});

test("classification failure does not prevent later round-robin sites from running", async () => {
  const sites = [fixtureSite("artist-a"), fixtureSite("artist-b"), fixtureSite("artist-c")];
  const attempted: string[] = [];
  type FinalizedReport = {
    failed_site_count: number;
    total_gemini_error: number;
    sites: Array<{ artist_slug: string; status: string; reason?: string }>;
  };
  const captured: { current: FinalizedReport | null } = { current: null };
  const deps = offlineCrawlerDeps({ gemini: 0, supabase: 0 });
  deps.getSites = () => sites;
  deps.fetchList = async (site) => ({
    method: "special",
    robots: { allowed: true, crawlDelay: 0, reason: "fixture" },
    articles: [fixtureArticle(site.artistSlug, 1), fixtureArticle(site.artistSlug, 2)],
    needsDetailFetch: false,
  });
  deps.classify = async (input) => {
    attempted.push(input.artist_name);
    if (input.artist_name.endsWith("artist-a")) throw new Error("fixture classification failure");
    return classifiedResult;
  };
  deps.createReport = (report) => ({
    reportPath: "fixture-report.json",
    save: () => {
      captured.current = JSON.parse(JSON.stringify(report));
    },
  });
  assert.equal(await runCrawler(["--dry-run", "--classify"], deps), 0);
  assert.deepEqual(attempted, [
    "Fixture artist-a",
    "Fixture artist-b",
    "Fixture artist-c",
    "Fixture artist-a",
    "Fixture artist-b",
    "Fixture artist-c",
  ]);
  const finalizedReport = captured.current;
  assert.ok(finalizedReport);
  assert.equal(finalizedReport.failed_site_count, 0);
  assert.equal(finalizedReport.total_gemini_error, 2);
  assert.equal(
    finalizedReport.sites.find((site) => site.artist_slug === "artist-a")?.status,
    "success",
  );
  assert.match(
    finalizedReport.sites.find((site) => site.artist_slug === "artist-a")?.reason ?? "",
    /Gemini classification/,
  );
});

test("one site failure does not stop later sites and limit-deferred articles are reported", async () => {
  const sites = Array.from({ length: 17 }, (_, index) => fixtureSite(`artist-${index}`));
  type FinalizedReport = {
    selected_article_count: number;
    limit_deferred_count: number;
    sites: Array<{
      artist_slug: string;
      status: string;
      limit_deferred_count?: number;
      limit_deferred_articles?: string[];
    }>;
  };
  const captured: { current: FinalizedReport | null } = { current: null };
  const deps = offlineCrawlerDeps({ gemini: 0, supabase: 0 });
  deps.getSites = () => sites;
  deps.fetchList = async (site) => {
    if (site.artistSlug === "artist-1") throw new Error("fixture list failure");
    return {
      method: "special",
      robots: { allowed: true, crawlDelay: 0, reason: "fixture" },
      articles: [fixtureArticle(site.artistSlug)],
      needsDetailFetch: false,
    };
  };
  deps.createReport = (report) => ({
    reportPath: "fixture-report.json",
    save: () => {
      captured.current = JSON.parse(JSON.stringify(report));
    },
  });

  assert.equal(await runCrawler(["--dry-run"], deps), 1);
  const finalizedReport = captured.current;
  assert.ok(finalizedReport);
  assert.equal(finalizedReport.selected_article_count, 15);
  assert.equal(finalizedReport.limit_deferred_count, 1);
  assert.equal(finalizedReport.sites.length, 17);
  assert.equal(
    finalizedReport.sites.find((site) => site.artist_slug === "artist-1")?.status,
    "failed",
  );
  const deferredSite = finalizedReport.sites.find((site) => site.artist_slug === "artist-16");
  assert.equal(deferredSite?.limit_deferred_count, 1);
  assert.deepEqual(deferredSite?.limit_deferred_articles, [
    "https://example.com/artist-16/news/1",
  ]);
});

test("dry-run and execute are mutually exclusive and unknown arguments fail", () => {
  assert.throws(() => parseCrawlerArgs(["--dry-run", "--execute"]), CliArgumentError);
  assert.throws(() => parseCrawlerArgs(["--unknown"]), CliArgumentError);
});

test("filter values reject shell metacharacters before crawling", () => {
  assert.throws(() => parseCrawlerArgs(["--artist=$(touch-pwned)"]), CliArgumentError);
  assert.throws(() => parseCrawlerArgs(["--group=x;curl_bad"]), CliArgumentError);
  assert.equal(parseCrawlerArgs(["--group=universal-music-wp"]).group, "universal-music-wp");
  assert.deepEqual(parseCrawlerArgs(["--shard=0/7"]).shard, { index: 0, total: 7 });
  assert.throws(() => parseCrawlerArgs(["--shard=7/7"]), CliArgumentError);
});

test("Gemini quota exhaustion stops the run and makes the report actionable", async () => {
  const sites = [fixtureSite("artist-a"), fixtureSite("artist-b")];
  const attempted: string[] = [];
  const captured: { current: {
    quota_stopped: boolean;
    fatal_error: string | null;
    sites: Array<{ artist_slug: string; status: string; quota_stopped?: boolean }>;
  } | null } = { current: null };
  const deps = offlineCrawlerDeps({ gemini: 0, supabase: 0 });
  deps.getSites = () => sites;
  deps.fetchList = async (site) => ({
    method: "special",
    robots: { allowed: true, crawlDelay: 0, reason: "fixture" },
    articles: [fixtureArticle(site.artistSlug)],
    needsDetailFetch: false,
  });
  deps.classify = async (input) => {
    attempted.push(input.artist_name);
    return { ...classifiedResult, ai_status: "quota_exhausted", review_reason: "fixture quota" };
  };
  deps.createReport = (report) => ({
    reportPath: "fixture-report.json",
    save: () => { captured.current = JSON.parse(JSON.stringify(report)); },
  });

  assert.equal(await runCrawler(["--dry-run", "--classify"], deps), 1);
  assert.deepEqual(attempted, ["Fixture artist-a"]);
  assert.equal(captured.current?.quota_stopped, true);
  assert.match(captured.current?.fatal_error ?? "", /free-tier or rate limit/);
  assert.equal(captured.current?.sites.find((site) => site.artist_slug === "artist-a")?.status, "failed");
  assert.equal(captured.current?.sites.find((site) => site.artist_slug === "artist-a")?.quota_stopped, true);
});

test("execute requires both classification and the production confirmation environment", () => {
  const execute = parseCrawlerArgs(["--execute", "--classify"]);
  assert.throws(() => validateExecutionSafety(execute, {}), /ALLOW_PRODUCTION_WRITE/);
  assert.doesNotThrow(() =>
    validateExecutionSafety(execute, { OFFICIAL_NEWS_ALLOW_PRODUCTION_WRITE: "true" }),
  );
  assert.throws(
    () =>
      validateExecutionSafety(parseCrawlerArgs(["--execute"]), {
        OFFICIAL_NEWS_ALLOW_PRODUCTION_WRITE: "true",
      }),
    /requires --classify/,
  );
});

test("database SELECT and upsert errors cannot be reported as success", async () => {
  const selectFailure = {
    from: () => ({
      select: async () => ({ data: null, error: { code: "42501", message: "permission denied" } }),
    }),
  } as unknown as SupabaseClient;
  await assert.rejects(() => loadExistingArticleKeys(selectFailure), /42501.*permission denied/);

  const upsertFailure = {
    from: () => ({
      upsert: async () => ({ data: null, error: { code: "23505", message: "unique violation" } }),
    }),
  } as unknown as SupabaseClient;
  const result = await upsertOfficialNewsArticle(upsertFailure, {
    artist_slug: "artist-a",
    article_url: "https://example.com/news/1",
  });
  assert.deepEqual(result, { ok: false, error: "23505 | unique violation" });

  const thrownFailure = {
    from: () => ({
      upsert: async () => {
        throw new Error("network fixture failure");
      },
    }),
  } as unknown as SupabaseClient;
  const thrownResult = await upsertOfficialNewsArticle(thrownFailure, {
    artist_slug: "artist-a",
    article_url: "https://example.com/news/2",
  });
  assert.deepEqual(thrownResult, { ok: false, error: "upsert threw: network fixture failure" });
});

test("only classified Gemini results are persistable", () => {
  assert.equal(isPersistableAiStatus("classified"), true);
  for (const status of [
    "not_configured",
    "quota_exhausted",
    "error",
    "max_output_tokens",
    "json_parse_error",
    "timeout",
  ]) {
    assert.equal(isPersistableAiStatus(status), false);
  }
});

test("missing Gemini key performs no API request and remains retryable", async () => {
  const previous = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  try {
    const result = await classifyArticleWithGemini(
      {
        artist_name: "Fixture Artist",
        article_title: "Fixture",
        published_date: null,
        article_body: "fixture body",
        article_url: "https://example.com/news/fixture",
      },
      { fetchImpl: async () => assert.fail("fetch must not be called without an API key") },
    );
    assert.equal(result.ai_status, "not_configured");
    assert.equal(isPersistableAiStatus(result.ai_status), false);
  } finally {
    if (previous === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previous;
  }
});

test("Gemini quota, max-token, API, JSON, and timeout failures remain retryable", async () => {
  const previous = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "fixture-key-never-sent-to-network";
  const input = {
    artist_name: "Fixture Artist",
    article_title: "Fixture",
    published_date: null,
    article_body: "fixture body",
    article_url: "https://example.com/news/fixture",
  };
  const jsonResponse = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });

  try {
    const fixtures: Array<{ name: string; fetchImpl: typeof fetch; expected: string; timeoutMs?: number }> = [
      {
        name: "quota",
        fetchImpl: async () => jsonResponse({ error: { details: [] } }, 429),
        expected: "quota_exhausted",
      },
      {
        name: "max tokens",
        fetchImpl: async () => jsonResponse({ candidates: [{ finishReason: "MAX_TOKENS" }] }),
        expected: "error",
      },
      {
        name: "API error",
        fetchImpl: async () => jsonResponse({ error: "fixture" }, 500),
        expected: "error",
      },
      {
        name: "JSON parse",
        fetchImpl: async () =>
          jsonResponse({ candidates: [{ content: { parts: [{ text: "not-json" }] } }] }),
        expected: "error",
      },
      {
        name: "timeout",
        fetchImpl: ((_url: string | URL | Request, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => {
              const error = new Error("aborted");
              error.name = "AbortError";
              reject(error);
            });
          })) as typeof fetch,
        expected: "error",
        timeoutMs: 1,
      },
    ];

    for (const fixture of fixtures) {
      const result = await classifyArticleWithGemini(input, {
        fetchImpl: fixture.fetchImpl,
        timeoutMs: fixture.timeoutMs,
      });
      assert.equal(result.ai_status, fixture.expected, fixture.name);
      assert.equal(isPersistableAiStatus(result.ai_status), false, fixture.name);
    }
  } finally {
    if (previous === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previous;
  }
});

test("URL identity keeps shared URLs separate by artist and matches documented normalization", () => {
  assert.equal(
    normalizeOfficialNewsUrl(" HTTPS://EXAMPLE.COM/news/ "),
    "https://example.com/news",
  );
  assert.equal(
    normalizeOfficialNewsUrl("https://example.com/news.php#article-2"),
    "https://example.com/news.php#article-2",
  );
  assert.notEqual(
    articleIdentityKey("artist-a", "https://example.com/shared"),
    articleIdentityKey("artist-b", "https://example.com/shared"),
  );
});

test("existing article counts support fair backfill ordering", () => {
  const counts = countExistingArticlesByArtist(new Set([
    articleIdentityKey("artist-a", "https://example.com/news/1"),
    articleIdentityKey("artist-a", "https://example.com/news/2"),
    articleIdentityKey("artist-b", "https://example.com/news/1"),
    "invalid-key-without-separator",
  ]));
  assert.deepEqual(Object.fromEntries(counts), { "artist-a": 2, "artist-b": 1 });
});

test("database text sanitizer removes PostgreSQL-incompatible NUL characters", () => {
  assert.equal(sanitizePostgresText("本文\u0000続き"), "本文続き");
  assert.equal(sanitizePostgresText(null), null);
});

test("public view excludes article_body and base table grants are revoked", () => {
  const migration = fs.readFileSync(
    path.join(projectRoot, "supabase/migrations/031_official_news.sql"),
    "utf8",
  );
  const afterView = migration.split("create view public.official_news_public", 2)[1] ?? "";
  const publicProjection = afterView.split(
    "revoke all on table public.official_news_public",
    1,
  )[0] ?? "";
  assert.ok(publicProjection);
  assert.doesNotMatch(publicProjection, /article_body/);
  assert.match(
    migration,
    /revoke all on table public\.official_news from public, anon, authenticated/,
  );
  assert.match(migration, /unique \(artist_slug, normalized_article_url\)/);
});

test("workflow keeps inputs out of the shell program and uses validation plus Bash arrays", () => {
  const workflow = fs.readFileSync(
    path.join(projectRoot, ".github/workflows/official-news.yml"),
    "utf8",
  );
  const afterCrawlerStep = workflow.split("- name: Run official news crawler", 2)[1] ?? "";
  const crawlerStep = afterCrawlerStep.split("- name: Ensure artifact fallback report exists", 1)[0] ?? "";
  assert.ok(crawlerStep);
  assert.doesNotMatch(crawlerStep, /\$\{\{\s*inputs\./);
  assert.match(workflow, /allowed='\^\[A-Za-z0-9\]/);
  assert.match(crawlerStep, /ARGS=\(\)/);
  assert.match(crawlerStep, /ARGS\+=\(--execute --classify "--shard=\$\{SHARD_INDEX\}\/7"\)/);
  assert.match(workflow, /- cron: "0 19 \* \* \*"/);
  assert.match(workflow, /Report Gemini free-tier stop/);
  assert.match(workflow, /issues: write/);
  assert.match(workflow, /gh issue create/);
  assert.match(workflow, /- name: Ensure artifact fallback report exists[\s\S]*if: always\(\)/);
  assert.match(workflow, /workflow-fallback\.txt/);
  assert.match(workflow, /- name: Upload crawl report[\s\S]*if: always\(\)/);
  assert.match(workflow, /if-no-files-found: error/);
});

test("crawl-run schema remains an unnumbered draft outside pending migrations", () => {
  const pendingMigrations = fs.readdirSync(path.join(projectRoot, "supabase/migrations"));
  assert.equal(pendingMigrations.some((name) => name.includes("official_news_crawl_runs")), false);
  const draftPath = path.join(
    projectRoot,
    "supabase/migration-drafts/official_news_crawl_runs.sql",
  );
  assert.equal(fs.existsSync(draftPath), true);
  assert.match(fs.readFileSync(draftPath, "utf8"), /その時点の次番号/);
});

test("the existing 13 site settings exactly match the preserved legacy configuration", () => {
  assert.equal(LEGACY_SOURCES.length, 13);
  assert.equal(OFFICIAL_NEWS_SOURCES.length, 13);
  const pick = (site: {
    artistSlug: string;
    newsUrl: string;
    parserGroup: string;
    enabled: boolean;
  }) => ({
    artistSlug: site.artistSlug,
    newsUrl: site.newsUrl,
    parserGroup: site.parserGroup,
    enabled: site.enabled,
  });
  assert.deepEqual(OFFICIAL_NEWS_SOURCES.map(pick), LEGACY_SOURCES.map(pick));
});

test("public NEWS queries check Supabase errors and retain safe diagnostics", () => {
  const source = fs.readFileSync(path.join(projectRoot, "src/lib/officialNews.ts"), "utf8");
  assert.equal((source.match(/const \{ data, error \}/g) ?? []).length, 2);
  assert.match(source, /check migration 031 and view grants/);
  assert.match(source, /if \(error\)[\s\S]*return \{ data: \[\], error: true \}/);
  assert.doesNotMatch(source, /JSON\.stringify\(error\)/);
});

test("import dry-run sample does not print article_body contents", () => {
  const importer = fs.readFileSync(
    path.join(projectRoot, "scripts/import-official-news.mjs"),
    "utf8",
  );
  assert.doesNotMatch(importer, /JSON\.stringify\(rows\[0\]/);
  assert.match(importer, /article_body_chars/);
  assert.match(importer, /article_body_sha256/);
  assert.match(importer, /OFFICIAL_NEWS_ALLOW_PRODUCTION_WRITE=true/);
  assert.match(importer, /Unknown argument/);
});
