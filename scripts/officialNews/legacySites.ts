// 公式NEWS取得ロジック: 取得確認済み13組の「special」パーサ群。
//
// 方針: この7パーサグループ(exo/generations/asobisystem/lapone/universal-music-wp/befirst/
// fujiikaze)は無理に汎用Tier1/Tier2ストラテジーへ統合しない。挙動を変えず、そのまま再利用する
// (旧 src/lib/officialNewsCrawler.ts から移設。Vercel Cronルート削除に伴い、表示専用となった
// src/lib からcrawler本体を分離し、GitHub Actions実行系のscripts/配下へ集約した)。
//
// crawlOfficialNews.ts からは LEGACY_SOURCES / LIST_FETCHERS / fetchArticleDetail を呼び出す。

import { ARTISTS } from "@/lib/artists";

export type OfficialNewsSource = {
  artistName: string;
  artistSlug: string;
  newsUrl: string;
  parserGroup: "exo" | "generations" | "asobisystem" | "lapone" | "universal-music-wp" | "befirst" | "fujiikaze";
  enabled: boolean;
  notes: string;
};

// 取得確認済み設定の正本は src/lib/artists.ts。表示側とcrawler側でslugを二重管理しない。
export const LEGACY_SOURCES: OfficialNewsSource[] = ARTISTS.flatMap((artist) =>
  artist.officialNews?.parserGroup
    ? [{
        artistName: artist.officialNews.artistName ?? artist.name,
        artistSlug: artist.slug,
        newsUrl: artist.officialNews.newsUrl,
        parserGroup: artist.officialNews.parserGroup,
        enabled: artist.officialNews.enabled,
        notes: artist.officialNews.notes,
      }]
    : [],
);

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const FETCH_TIMEOUT_MS = 15000;
const CLAUDE_RELATED_BOT_NAMES = ["claudebot", "claude-web", "claude-searchbot", "anthropic-ai"];

export type RawArticle = {
  title: string;
  published_date: string | null;
  article_url: string;
  body: string | null;
  thumbnail_url: string | null;
};

export type ListFetchResult = {
  method: "static_html" | "json_api";
  robots: { allowed: boolean; crawlDelay: number; reason: string };
  articles: RawArticle[];
  needsDetailFetch: boolean;
};

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow", signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

/** robots.txtをその場で取得し、ワイルドカード/主要AIクローラ名について許可されているか判定する。 */
export async function checkRobotsAllowed(
  origin: string,
  path: string,
): Promise<{ allowed: boolean; crawlDelay: number; reason: string }> {
  let robotsText: string;
  try {
    const res = await fetchWithTimeout(new URL("/robots.txt", origin).toString());
    if (!res.ok) {
      return { allowed: true, crawlDelay: 0, reason: `robots.txt HTTP ${res.status} (no explicit restriction found)` };
    }
    robotsText = await res.text();
  } catch (e) {
    return { allowed: true, crawlDelay: 0, reason: `robots.txt fetch failed (${(e as Error).message}); treated as no restriction` };
  }

  type Group = { agents: string[]; rules: { type: string; path: string }[]; crawlDelay: number };
  const groups: Group[] = [];
  let current: Group | null = null;
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
      let matched: { type: string; path: string } | null = null;
      for (const r of g.rules) {
        if (r.path === "") continue;
        if (path.startsWith(r.path)) {
          if (!matched || r.path.length > matched.path.length) matched = r;
        }
      }
      if (matched && matched.type === "disallow") {
        return { allowed: false, crawlDelay, reason: `robots.txt disallows agent "${agent}" for path prefix "${matched.path}"` };
      }
    }
  }
  return { allowed: true, crawlDelay, reason: "no matching Disallow rule for * or known AI crawler names" };
}

export function stripHtml(html: string | null | undefined): string {
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

function parseNewsUrl(newsUrl: string) {
  const u = new URL(newsUrl);
  return { origin: u.origin, path: u.pathname, fetchUrl: newsUrl };
}

async function fetchExoList(source: OfficialNewsSource): Promise<ListFetchResult> {
  const { origin, path, fetchUrl } = parseNewsUrl(source.newsUrl);
  const robots = await checkRobotsAllowed(origin, path);
  if (!robots.allowed) throw new Error(`robots.txt disallow: ${robots.reason}`);

  const res = await fetchWithTimeout(fetchUrl);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();

  const itemRe =
    /<time class="date"><span class="m">(\d{2})<\/span><span class="dot"><\/span><span class="d">(\d{2})<\/span><\/time>[\s\S]*?<a href="(detail\.php\?id=\d+)" class="link">([\s\S]*?)<\/a>/g;
  const year = new Date().getFullYear();
  const articles: RawArticle[] = [];
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(html)) !== null) {
    const [, mm, dd, href, rawTitleHtml] = m;
    const title = stripHtml(rawTitleHtml).replace(/\s+/g, " ").replace(/\bNEW\b\s*$/, "").trim();
    articles.push({
      title,
      published_date: `${year}-${mm}-${dd}`,
      article_url: new URL(href, origin + "/news/").toString(),
      body: null,
      thumbnail_url: null,
    });
  }
  return { method: "static_html", robots, articles, needsDetailFetch: true };
}

async function fetchGenerationsList(source: OfficialNewsSource): Promise<ListFetchResult> {
  const { origin, path, fetchUrl } = parseNewsUrl(source.newsUrl);
  const robots = await checkRobotsAllowed(origin, path);
  if (!robots.allowed) throw new Error(`robots.txt disallow: ${robots.reason}`);

  const res = await fetchWithTimeout(fetchUrl);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as { text?: string };
  const text = json.text || "";

  const boxRe =
    /<div id="(t\d+)" class="newsBox"><p class="day">([^<]+)<\/p><p class="title">([^<]*)<\/p><p class="txt">([\s\S]*?)<\/p><\/div>/g;
  const articles: RawArticle[] = [];
  let m: RegExpExecArray | null;
  while ((m = boxRe.exec(text)) !== null) {
    const [, id, day, title, bodyHtml] = m;
    const dm = /(\d{4})\s*(\d{1,2})\.(\d{1,2})/.exec(day);
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

async function fetchAsobisystemList(source: OfficialNewsSource): Promise<ListFetchResult> {
  const { origin, path, fetchUrl } = parseNewsUrl(source.newsUrl);
  const robots = await checkRobotsAllowed(origin, path);
  if (!robots.allowed) throw new Error(`robots.txt disallow: ${robots.reason}`);

  const res = await fetchWithTimeout(fetchUrl);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();

  const itemRe = /<a href="(\/news\/detail\/\d+)">\s*<div class="block--txt">\s*<p class="date">([^<]+)<\/p>\s*<p class="tit">([\s\S]*?)<\/p>/g;
  const articles: RawArticle[] = [];
  let m: RegExpExecArray | null;
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

async function fetchLaponeList(source: OfficialNewsSource): Promise<ListFetchResult> {
  const { origin, path, fetchUrl } = parseNewsUrl(source.newsUrl);
  const robots = await checkRobotsAllowed(origin, path);
  if (!robots.allowed) throw new Error(`robots.txt disallow: ${robots.reason}`);

  const res = await fetchWithTimeout(fetchUrl);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();

  const itemRe = /<a href="(\/news\/detail\/\d+)"[^>]*>([\s\S]*?)<p class="tit">([\s\S]*?)<\/p>/g;
  const articles: RawArticle[] = [];
  const seenHref = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(html)) !== null) {
    const [, href, middle, rawTitle] = m;
    if (seenHref.has(href)) continue;
    seenHref.add(href);
    const dateM = /datetime="([^"]+)"/.exec(middle) || /<p class="date">([^<]+)<\/p>/.exec(middle);
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

type WpPost = {
  title?: { rendered?: string };
  date?: string;
  link: string;
  content?: { rendered?: string };
  yoast_head_json?: { og_image?: { url?: string }[] };
};

async function fetchWordPressRestApiList(source: OfficialNewsSource): Promise<ListFetchResult> {
  const { origin, path, fetchUrl } = parseNewsUrl(source.newsUrl);
  const robots = await checkRobotsAllowed(origin, path);
  if (!robots.allowed) throw new Error(`robots.txt disallow: ${robots.reason}`);

  const res = await fetchWithTimeout(fetchUrl);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const posts = (await res.json()) as WpPost[];
  if (!Array.isArray(posts)) throw new Error("unexpected response shape (not an array)");

  const articles: RawArticle[] = posts.map((p) => ({
    title: stripHtml(p.title?.rendered ?? ""),
    published_date: (p.date || "").slice(0, 10) || null,
    article_url: p.link,
    body: stripHtml(p.content?.rendered ?? ""),
    thumbnail_url: p.yoast_head_json?.og_image?.[0]?.url ?? null,
  }));
  return { method: "json_api", robots, articles, needsDetailFetch: false };
}

async function fetchBefirstList(source: OfficialNewsSource): Promise<ListFetchResult> {
  const { origin, path, fetchUrl } = parseNewsUrl(source.newsUrl);
  const robots = await checkRobotsAllowed(origin, path);
  if (!robots.allowed) throw new Error(`robots.txt disallow: ${robots.reason}`);

  const res = await fetchWithTimeout(fetchUrl);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();

  const itemRe =
    /<article class="entry" id="(\d+)">\s*<header class="entry-head">\s*<div class="news_category">([^<]*)<\/div>\s*<div class="date">([^<:]+)[^<]*<\/div>\s*<h1 class="entry-title">([\s\S]*?)<\/h1>\s*<\/header>\s*<div class="entry-body">([\s\S]*?)<\/div>\s*(?=<article|<\/div>\s*<\/div>)/g;
  const articles: RawArticle[] = [];
  let m: RegExpExecArray | null;
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

export const LIST_FETCHERS: Record<OfficialNewsSource["parserGroup"], (source: OfficialNewsSource) => Promise<ListFetchResult>> = {
  exo: fetchExoList,
  generations: fetchGenerationsList,
  asobisystem: fetchAsobisystemList,
  lapone: fetchLaponeList,
  "universal-music-wp": fetchWordPressRestApiList,
  befirst: fetchBefirstList,
  fujiikaze: fetchWordPressRestApiList,
};

// ---------------------------------------------------------------------------
// 詳細ページ本文取得(exo / asobisystem / lapone の3グループのみ必要)
// ---------------------------------------------------------------------------

function decodeEntities(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&yen;/g, "¥")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function stripTags(html: string): string {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

type DetailParseResult =
  | { error: string }
  | { title: string | null; publishedDate: string | null; thumbnail: string | null; body: string };

function parseExoDetail(html: string): DetailParseResult {
  const region = /<div class="grid-container">([\s\S]*?)<div class="section-nav/.exec(html);
  if (!region) return { error: "grid-container region not found" };
  let block = region[1];

  const titleM = /<h1 class="entry-title">([\s\S]*?)<\/h1>/.exec(block);
  const title = titleM ? decodeEntities(titleM[1]).trim() : null;

  const dateM = /<div class="entry-body">([\s\S]*?)<\/div>/.exec(block);
  let publishedDate: string | null = null;
  if (dateM) {
    const dm = /(\d{4})\/(\d{1,2})\/(\d{1,2})/.exec(dateM[1]);
    if (dm) publishedDate = `${dm[1]}-${dm[2].padStart(2, "0")}-${dm[3].padStart(2, "0")}`;
  }

  const imgM = /<img[^>]+src="([^"]+)"/.exec(block);
  const thumbnail = imgM ? imgM[1] : null;

  block = block
    .replace(/<h1 class="entry-title">[\s\S]*?<\/h1>/, "")
    .replace(/<div class="social">[\s\S]*?<\/div>/, "")
    .replace(/<div class="entry-body">[\s\S]*?<\/div>/, "")
    .replace(/<div style="text-align: center;">[\s\S]*?<\/div>/, "");

  const body = stripTags(block);
  if (!body) return { error: "empty body after stripping" };

  return { title, publishedDate, thumbnail, body };
}

const LAPONE_GROUP_HOSTS = new Set(["jo1.jp", "me-i.jp", "ini-official.com", "zerobaseone.jp"]);

function parseOgDescriptionDetail(html: string): DetailParseResult {
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
  if (thumbnail && /\/ogp\.jpg$/.test(thumbnail)) thumbnail = null;

  return { title, publishedDate: null, thumbnail, body };
}

function detectDetailParser(articleUrl: string): ((html: string) => DetailParseResult) | null {
  const u = new URL(articleUrl);
  if (u.hostname === "exo-jp.net") return parseExoDetail;
  if (u.hostname.endsWith(".asobisystem.com")) return parseOgDescriptionDetail;
  if (LAPONE_GROUP_HOSTS.has(u.hostname)) return parseOgDescriptionDetail;
  return null;
}

export type DetailFetchResult =
  | { success: true; title: string | null; publishedDate: string | null; thumbnail: string | null; body: string; crawlDelay: number }
  | { success: false; error: string; crawlDelay?: number };

export async function fetchArticleDetail(articleUrl: string): Promise<DetailFetchResult> {
  const parse = detectDetailParser(articleUrl);
  if (!parse) return { success: false, error: "no detail parser for this domain" };

  const u = new URL(articleUrl);
  const robots = await checkRobotsAllowed(u.origin, u.pathname);
  if (!robots.allowed) return { success: false, error: `blocked by robots.txt: ${robots.reason}` };

  try {
    const res = await fetch(articleUrl, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20000) });
    if (!res.ok) return { success: false, error: `HTTP ${res.status}`, crawlDelay: robots.crawlDelay };
    const html = await res.text();
    const parsed = parse(html);
    if ("error" in parsed) return { success: false, error: parsed.error, crawlDelay: robots.crawlDelay };
    return { success: true, ...parsed, crawlDelay: robots.crawlDelay };
  } catch (e) {
    return { success: false, error: String((e as Error)?.message ?? e) };
  }
}
