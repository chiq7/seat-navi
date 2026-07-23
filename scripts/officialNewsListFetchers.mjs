// サイトごとのNEWS一覧取得。scripts/official_news_dry_run.mjs で検証済みのロジックを
// 流用している(list取得部分のみ切り出し、詳細本文取得は呼び出し側で新着記事のみ行う)。

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const FETCH_TIMEOUT_MS = 15000;
const CLAUDE_RELATED_BOT_NAMES = ["claudebot", "claude-web", "claude-searchbot", "anthropic-ai"];

export async function fetchWithTimeout(url, opts = {}) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      headers: { "User-Agent": UA, ...(opts.headers || {}) },
      redirect: "follow",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(t);
  }
}

/** robots.txtをその場で取得し、ワイルドカード/主要AIクローラ名について許可されているか判定する。 */
export async function checkRobotsAllowed(origin, path) {
  let robotsText;
  try {
    const res = await fetchWithTimeout(new URL("/robots.txt", origin).toString());
    if (!res.ok) {
      return { allowed: true, crawlDelay: 0, reason: `robots.txt HTTP ${res.status} (no explicit restriction found)` };
    }
    robotsText = await res.text();
  } catch (e) {
    return { allowed: true, crawlDelay: 0, reason: `robots.txt fetch failed (${e.message}); treated as no restriction` };
  }

  const groups = [];
  let current = null;
  let ruleSeenSinceUA = false;
  for (const raw of robotsText.split(/\r?\n/)) {
    const line = raw.split("#")[0].trim();
    if (!line) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    if (key === "user-agent") {
      if (!current || ruleSeenSinceUA) {
        current = { agents: [], rules: [], crawlDelay: 0 };
        groups.push(current);
        ruleSeenSinceUA = false;
      }
      current.agents.push(value.toLowerCase());
    } else if (key === "disallow" || key === "allow") {
      if (current) {
        current.rules.push({ type: key, path: value });
        ruleSeenSinceUA = true;
      }
    } else if (key === "crawl-delay") {
      if (current) {
        const n = parseFloat(value);
        if (!Number.isNaN(n)) current.crawlDelay = Math.max(current.crawlDelay, n);
        ruleSeenSinceUA = true;
      }
    }
  }

  const agentsToCheck = ["*", ...CLAUDE_RELATED_BOT_NAMES];
  let crawlDelay = 0;
  for (const agent of agentsToCheck) {
    for (const g of groups) {
      if (!g.agents.includes(agent)) continue;
      crawlDelay = Math.max(crawlDelay, g.crawlDelay || 0);
      let matched = null;
      for (const r of g.rules) {
        if (r.path === "") continue;
        if (path.startsWith(r.path)) {
          if (!matched || r.path.length > matched.path.length) matched = r;
        }
      }
      if (matched && matched.type === "disallow") {
        return {
          allowed: false,
          crawlDelay,
          reason: `robots.txt disallows agent "${agent}" for path prefix "${matched.path}"`,
        };
      }
    }
  }
  return { allowed: true, crawlDelay, reason: "no matching Disallow rule for * or known AI crawler names" };
}

export function stripHtml(html) {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// configのnewsUrlを唯一の情報源として origin/path に分解する。
// (以前はfetcherごとにドメインをハードコードしていたが、それだと同一parserGroup内で
//  他アーティストのURLを流用する際にバグる。newsUrl起点に統一して解消する。)
function parseNewsUrl(newsUrl) {
  const u = new URL(newsUrl);
  return { origin: u.origin, path: u.pathname, fetchUrl: newsUrl };
}

async function fetchExoList(source) {
  const { origin, path, fetchUrl } = parseNewsUrl(source.newsUrl);
  const robots = await checkRobotsAllowed(origin, path);
  if (!robots.allowed) throw new Error(`robots.txt disallow: ${robots.reason}`);

  const res = await fetchWithTimeout(fetchUrl);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();

  const itemRe =
    /<time class="date"><span class="m">(\d{2})<\/span><span class="dot"><\/span><span class="d">(\d{2})<\/span><\/time>[\s\S]*?<a href="(detail\.php\?id=\d+)" class="link">([\s\S]*?)<\/a>/g;
  const year = new Date().getFullYear();
  const articles = [];
  let m;
  while ((m = itemRe.exec(html)) !== null) {
    const [, mm, dd, href, rawTitleHtml] = m;
    const title = stripHtml(rawTitleHtml).replace(/\s+/g, " ").replace(/\bNEW\b\s*$/, "").trim();
    articles.push({
      title,
      published_date: `${year}-${mm}-${dd}`,
      article_url: new URL(href, origin + "/news/").toString(),
      body: null, // 詳細ページ側で取得
      thumbnail_url: null,
    });
  }
  return { method: "static_html", robots, articles, needsDetailFetch: true };
}

async function fetchGenerationsList(source) {
  const { origin, path, fetchUrl } = parseNewsUrl(source.newsUrl);
  const robots = await checkRobotsAllowed(origin, path);
  if (!robots.allowed) throw new Error(`robots.txt disallow: ${robots.reason}`);

  const res = await fetchWithTimeout(fetchUrl);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const text = json.text || "";

  const boxRe =
    /<div id="(t\d+)" class="newsBox"><p class="day">([^<]+)<\/p><p class="title">([^<]*)<\/p><p class="txt">([\s\S]*?)<\/p><\/div>/g;
  const articles = [];
  let m;
  while ((m = boxRe.exec(text)) !== null) {
    const [, id, day, title, bodyHtml] = m;
    const dm = day.match(/(\d{4})\s*(\d{1,2})\.(\d{1,2})/);
    articles.push({
      title: title.trim(),
      published_date: dm ? `${dm[1]}-${String(dm[2]).padStart(2, "0")}-${String(dm[3]).padStart(2, "0")}` : null,
      article_url: `${origin}/news.php#${id}`,
      body: stripHtml(bodyHtml),
      thumbnail_url: null,
    });
  }
  return { method: "json_api", robots, articles, needsDetailFetch: false };
}

// ASOBISYSTEM「KAWAII LAB.」系: FRUITS ZIPPER / CUTIE STREET / CANDY TUNE で同一テンプレート確認済み。
async function fetchAsobisystemList(source) {
  const { origin, path, fetchUrl } = parseNewsUrl(source.newsUrl);
  const robots = await checkRobotsAllowed(origin, path);
  if (!robots.allowed) throw new Error(`robots.txt disallow: ${robots.reason}`);

  const res = await fetchWithTimeout(fetchUrl);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();

  const itemRe = /<a href="(\/news\/detail\/\d+)">\s*<div class="block--txt">\s*<p class="date">([^<]+)<\/p>\s*<p class="tit">([\s\S]*?)<\/p>/g;
  const articles = [];
  let m;
  while ((m = itemRe.exec(html)) !== null) {
    const [, href, dateStr, rawTitle] = m;
    articles.push({
      title: rawTitle.replace(/\s+/g, " ").trim(),
      published_date: dateStr.trim().replace(/\./g, "-"),
      article_url: new URL(href, origin).toString(),
      body: null,
      thumbnail_url: null,
    });
  }
  return { method: "static_html", robots, articles, needsDetailFetch: true };
}

// LAPONE Entertainment系: JO1 / INI / ME:I / ZEROBASEONE で同一テンプレート確認済み
// (official_news_crawl_analysis.md グループF)。一覧のURL形式は「/news/1」「/news/list/1/3/」の
// 2バリエーションがあり、日付表記も
//   JO1:         <p class="date">2026.07.21</p>
//   ME:I/ZB1:    <time class="date" datetime="2026.07.21">2026.07.21</time>
//   INI:         <div class="block--data"><p class="date">2026.07.20</p>...</div>
// と細部が異なるため、アンカー〜タイトルの間の任意コンテンツから日付を後から拾う形にして
// 4サイトすべてに対応する(実機で4サイトとも動作確認済み)。
async function fetchLaponeList(source) {
  const { origin, path, fetchUrl } = parseNewsUrl(source.newsUrl);
  const robots = await checkRobotsAllowed(origin, path);
  if (!robots.allowed) throw new Error(`robots.txt disallow: ${robots.reason}`);

  const res = await fetchWithTimeout(fetchUrl);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();

  const itemRe = /<a href="(\/news\/detail\/\d+)"[^>]*>([\s\S]*?)<p class="tit">([\s\S]*?)<\/p>/g;
  const articles = [];
  const seenHref = new Set();
  let m;
  while ((m = itemRe.exec(html)) !== null) {
    const [, href, middle, rawTitle] = m;
    if (seenHref.has(href)) continue;
    seenHref.add(href);
    const dateM = middle.match(/datetime="([^"]+)"/) || middle.match(/<p class="date">([^<]+)<\/p>/);
    const title = rawTitle.replace(/&#039;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
    articles.push({
      title,
      published_date: dateM ? dateM[1].trim().replace(/\./g, "-") : null,
      article_url: new URL(href, origin).toString(),
      body: null,
      thumbnail_url: null,
    });
  }
  return { method: "static_html", robots, articles, needsDetailFetch: true };
}

async function fetchWordPressRestApiList(source) {
  const { origin, path, fetchUrl } = parseNewsUrl(source.newsUrl);
  const robots = await checkRobotsAllowed(origin, path);
  if (!robots.allowed) throw new Error(`robots.txt disallow: ${robots.reason}`);

  const res = await fetchWithTimeout(fetchUrl);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const posts = await res.json();
  if (!Array.isArray(posts)) throw new Error("unexpected response shape (not an array)");

  const articles = posts.map((p) => ({
    title: stripHtml(p.title?.rendered ?? ""),
    published_date: (p.date || "").slice(0, 10) || null,
    article_url: p.link,
    body: stripHtml(p.content?.rendered ?? ""),
    thumbnail_url: p.yoast_head_json?.og_image?.[0]?.url ?? null,
  }));
  return { method: "json_api", robots, articles, needsDetailFetch: false };
}

async function fetchBefirstList(source) {
  const { origin, path, fetchUrl } = parseNewsUrl(source.newsUrl);
  const robots = await checkRobotsAllowed(origin, path);
  if (!robots.allowed) throw new Error(`robots.txt disallow: ${robots.reason}`);

  const res = await fetchWithTimeout(fetchUrl);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();

  const itemRe =
    /<article class="entry" id="(\d+)">\s*<header class="entry-head">\s*<div class="news_category">([^<]*)<\/div>\s*<div class="date">([^<:]+)[^<]*<\/div>\s*<h1 class="entry-title">([\s\S]*?)<\/h1>\s*<\/header>\s*<div class="entry-body">([\s\S]*?)<\/div>\s*(?=<article|<\/div>\s*<\/div>)/g;
  const articles = [];
  let m;
  while ((m = itemRe.exec(html)) !== null && articles.length < 20) {
    const [, id, , dateStr, rawTitle, bodyHtml] = m;
    articles.push({
      title: stripHtml(rawTitle),
      published_date: dateStr.trim().replace(/\./g, "-"),
      article_url: `${origin}/?p=${id}`,
      body: stripHtml(bodyHtml),
      thumbnail_url: null,
    });
  }
  return { method: "static_html", robots, articles, needsDetailFetch: false };
}

// parserGroup -> 一覧取得関数。すべてsource.newsUrlを起点に取得するため、
// 同一parserGroup内であれば新しいアーティストをconfigに追加するだけで動作する。
export const LIST_FETCHERS = {
  exo: (source) => fetchExoList(source),
  generations: (source) => fetchGenerationsList(source),
  asobisystem: (source) => fetchAsobisystemList(source),
  lapone: (source) => fetchLaponeList(source),
  "universal-music-wp": (source) => fetchWordPressRestApiList(source),
  befirst: (source) => fetchBefirstList(source),
  fujiikaze: (source) => fetchWordPressRestApiList(source),
};
