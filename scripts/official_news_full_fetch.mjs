// Independent dry-run script. Not integrated into eventCrawler.ts/Cron. No DB writes.
// Fetches full article bodies for the 87 articles in official_news_dry_run.json,
// reusing already-clean bodies where present and re-fetching detail pages for the
// three sites (exo-jp.net, fruitszipper.asobisystem.com, jo1.jp) whose bodies were
// missing or HTML-contaminated in the dry run. Classification happens in a
// separate pass (this script only outputs body_fetch_success/body_fetch_error and
// a raw cleaned body per article).

import fs from "fs/promises";

const SRC = "C:/Users/tcgea/Documents/tixrepo-data/official_news_dry_run.json";
const OUT = "C:/Users/tcgea/AppData/Local/Temp/claude/C--Users-tcgea-Documents-seat-navi/59698b1e-c44b-4107-9e2c-4e12c7d188f2/scratchpad/fetched_articles_raw.json";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 seat-navi-research-bot";

// artist_slug -> which sites need a fresh detail-page fetch (bodies in dry-run
// were null, or in EXO's case contaminated with raw HTML for the one article
// that had a body).
const NEEDS_FETCH = new Set(["exo", "fruits-zipper", "jo1"]);

const robotsCache = new Map();
async function checkRobotsAllowed(urlStr) {
  const u = new URL(urlStr);
  const key = u.origin;
  if (!robotsCache.has(key)) {
    let rules = { disallow: [], crawlDelay: 0 };
    try {
      const res = await fetch(key + "/robots.txt", { headers: { "User-Agent": UA } });
      if (res.ok) {
        const text = await res.text();
        rules = parseRobots(text);
      }
    } catch {
      // no robots.txt / network error -> treat as unrestricted
    }
    robotsCache.set(key, rules);
  }
  const rules = robotsCache.get(key);
  const path = u.pathname + u.search;
  const blocked = rules.disallow.some((d) => d && path.startsWith(d));
  return { allowed: !blocked, crawlDelay: rules.crawlDelay };
}

function parseRobots(text) {
  // Only scope enforcement to "*" and Claude/Anthropic-named agents, per the
  // rule established earlier in this project: other vendors' bot-specific
  // blocks (e.g. GPTBot-only disallow) do not apply to us.
  const RELEVANT_AGENTS = new Set(["*", "claudebot", "claude-web", "claude-searchbot", "anthropic-ai"]);
  const lines = text.split(/\r?\n/);

  // Group consecutive "User-agent:" lines into blocks; a block ends when a
  // non-user-agent directive is seen and the next User-agent line starts a new block.
  const groups = [];
  let cur = null;
  let sawDirectiveSinceLastUA = true;
  for (const raw of lines) {
    const line = raw.split("#")[0].trim();
    if (!line) continue;
    const [rawKey, ...rest] = line.split(":");
    const key = rawKey.trim().toLowerCase();
    const value = rest.join(":").trim();
    if (key === "user-agent") {
      if (!cur || sawDirectiveSinceLastUA) {
        cur = { agents: [], disallow: [], crawlDelay: 0 };
        groups.push(cur);
      }
      cur.agents.push(value.toLowerCase());
      sawDirectiveSinceLastUA = false;
    } else if (cur) {
      if (key === "disallow") {
        if (value) cur.disallow.push(value);
      } else if (key === "crawl-delay") {
        const n = parseFloat(value);
        if (!Number.isNaN(n)) cur.crawlDelay = Math.max(cur.crawlDelay, n);
      }
      sawDirectiveSinceLastUA = true;
    }
  }

  const disallow = [];
  let crawlDelay = 0;
  for (const g of groups) {
    if (g.agents.some((a) => RELEVANT_AGENTS.has(a))) {
      disallow.push(...g.disallow);
      crawlDelay = Math.max(crawlDelay, g.crawlDelay);
    }
  }
  return { disallow, crawlDelay };
}

function decodeEntities(s) {
  if (!s) return s;
  return s
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&yen;/g, "¥")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function stripTags(html) {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
      .replace(/<[^>]+>/g, "")
  )
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function parseExo(html) {
  const region = /<div class="grid-container">([\s\S]*?)<div class="section-nav/.exec(html);
  if (!region) return { error: "grid-container region not found" };
  let block = region[1];

  const titleM = /<h1 class="entry-title">([\s\S]*?)<\/h1>/.exec(block);
  const title = titleM ? decodeEntities(titleM[1]).trim() : null;

  const dateM = /<div class="entry-body">([\s\S]*?)<\/div>/.exec(block);
  let publishedDate = null;
  if (dateM) {
    const dm = /(\d{4})\/(\d{1,2})\/(\d{1,2})/.exec(dateM[1]);
    if (dm) publishedDate = `${dm[1]}-${dm[2].padStart(2, "0")}-${dm[3].padStart(2, "0")}`;
  }

  const imgM = /<img[^>]+src="([^"]+)"/.exec(block);
  const thumbnail = imgM ? imgM[1] : null;

  // Strip the known non-body chunks, keep whatever's left as the article body.
  block = block
    .replace(/<h1 class="entry-title">[\s\S]*?<\/h1>/, "")
    .replace(/<div class="social">[\s\S]*?<\/div>/, "")
    .replace(/<div class="entry-body">[\s\S]*?<\/div>/, "")
    .replace(/<div style="text-align: center;">[\s\S]*?<\/div>/, "");

  const body = stripTags(block);
  if (!body) return { error: "empty body after stripping" };

  return { title, publishedDate, thumbnail, body };
}

function parseOgDescriptionSite(html) {
  // FRUITS ZIPPER (asobisystem "KAWAII LAB." template) and JO1 (LAPONE template)
  // both embed the full article body inside <meta property="og:description">.
  // Attribute values are HTML-escaped, so the first raw quote after content="
  // always ends the value -- do not additionally require a following ">",
  // since some pages self-close these meta tags as ".../>" instead of  ...">.
  const descM = /<meta property="og:description" content="([\s\S]*?)"/.exec(html);
  if (!descM) return { error: "og:description not found" };
  const body = stripTags(decodeEntities(descM[1]));
  if (!body) return { error: "empty og:description" };

  const titleM = /<meta property="og:title" content="([\s\S]*?)"/.exec(html);
  let title = titleM ? decodeEntities(titleM[1]).trim() : null;
  if (!title) {
    const tM = /<title>([\s\S]*?)<\/title>/.exec(html);
    if (tM) title = decodeEntities(tM[1]).split("｜")[0].trim();
  }

  const imgM = /<meta property="og:image" content="([\s\S]*?)"/.exec(html);
  let thumbnail = imgM ? imgM[1] : null;
  // jo1.jp uses a generic site-wide OGP image on every page; not a real per-article thumbnail.
  if (thumbnail && /\/ogp\.jpg$/.test(thumbnail)) thumbnail = null;

  return { title, publishedDate: null, thumbnail, body };
}

// LAPONE Entertainment系と同一構造であることが official_news_crawl_analysis.md グループFで
// 確認できているホスト名のみを列挙する(推測でのドメイン追加はしない)。
const LAPONE_GROUP_HOSTS = new Set(["jo1.jp", "me-i.jp", "ini-official.com", "zerobaseone.jp"]);

export function detectSiteParser(articleUrl) {
  const u = new URL(articleUrl);
  if (u.hostname === "exo-jp.net") return { name: "exo", parse: parseExo };
  // ASOBISYSTEM「KAWAII LAB.」系はサブドメインのみが異なる同一テンプレート
  // (fruitszipper / cutiestreet / candytune で確認済み)。
  if (u.hostname.endsWith(".asobisystem.com")) return { name: "asobisystem", parse: parseOgDescriptionSite };
  if (LAPONE_GROUP_HOSTS.has(u.hostname)) return { name: "lapone", parse: parseOgDescriptionSite };
  return null;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function fetchDetail(articleUrl, site) {
  const robots = await checkRobotsAllowed(articleUrl);
  if (!robots.allowed) {
    return { success: false, error: "blocked by robots.txt" };
  }
  try {
    const res = await fetch(articleUrl, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20000) });
    if (!res.ok) {
      return { success: false, error: `HTTP ${res.status}` };
    }
    const html = await res.text();
    const parsed = site.parse(html);
    if (parsed.error) {
      return { success: false, error: parsed.error };
    }
    return { success: true, ...parsed, crawlDelay: robots.crawlDelay };
  } catch (e) {
    return { success: false, error: String(e && e.message ? e.message : e) };
  }
}

async function main() {
  const raw = await fs.readFile(SRC, "utf-8");
  const data = JSON.parse(raw);
  const articles = data.articles;

  const results = [];
  const lastRequestAt = new Map(); // origin -> timestamp, to honor crawl-delay

  for (const a of articles) {
    const site = detectSiteParser(a.article_url);
    const needsFetch = NEEDS_FETCH.has(a.artist_slug);

    if (!needsFetch) {
      // Reuse already-clean body captured during the original list/API fetch.
      results.push({
        ...a,
        article_body: a.body,
        body_fetch_success: !!a.body,
        body_fetch_error: a.body ? null : "no body captured in dry-run and not in re-fetch scope",
      });
      continue;
    }

    if (!site) {
      results.push({ ...a, article_body: null, body_fetch_success: false, body_fetch_error: "no parser for this domain" });
      continue;
    }

    const origin = new URL(a.article_url).origin;

    const r = await fetchDetail(a.article_url, site);
    lastRequestAt.set(origin, Date.now());

    if (r.success) {
      results.push({
        ...a,
        title: r.title || a.title,
        published_date: r.publishedDate || a.published_date,
        thumbnail_url: r.thumbnail || a.thumbnail_url,
        article_body: r.body,
        body_fetch_success: true,
        body_fetch_error: null,
      });
    } else {
      results.push({ ...a, article_body: null, body_fetch_success: false, body_fetch_error: r.error });
    }

    // Respect the site's robots.txt Crawl-delay (exo-jp.net specifies 30s) before
    // the next request to the same origin.
    const delayMs = (r.crawlDelay || 0) * 1000;
    if (delayMs > 0) {
      process.stderr.write(`[wait] ${delayMs / 1000}s crawl-delay for ${origin}\n`);
      await sleep(delayMs);
    }
    process.stderr.write(`[fetched] ${a.artist_slug} ${a.article_url} success=${r.success} ${r.error || ""}\n`);
  }

  await fs.writeFile(OUT, JSON.stringify({ articles: results }, null, 2), "utf-8");
  process.stderr.write(`\nWrote ${results.length} articles to ${OUT}\n`);
  const succ = results.filter((r) => r.body_fetch_success).length;
  process.stderr.write(`body_fetch_success: ${succ} / ${results.length}\n`);
}

import { fileURLToPath } from "url";
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
