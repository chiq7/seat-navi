// Tier1: RSS / Atom フィード。
import { applyUrlRules, fetchWithTimeout, checkRobotsAllowed, stripHtml } from "../httpUtils";
import type { SiteConfig, ListFetchResult, CrawledArticle } from "../types";

function extractTag(xml: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const m = re.exec(xml);
  if (!m) return null;
  return m[1]
    .replace(/^<!\[CDATA\[/, "")
    .replace(/\]\]>$/, "")
    .trim();
}

function extractAttr(xml: string, tag: string, attr: string): string | null {
  const re = new RegExp(`<${tag}[^>]*\\b${attr}="([^"]*)"`, "i");
  const m = re.exec(xml);
  return m ? m[1] : null;
}

function normalizeDate(raw: string | null): string | null {
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

export async function fetchRss(config: SiteConfig): Promise<ListFetchResult> {
  const feedUrl = config.rssUrl ?? config.newsListUrl;
  const u = new URL(feedUrl);
  const robots = await checkRobotsAllowed(u.origin, u.pathname);
  if (!robots.allowed) throw new Error(`robots.txt disallow: ${robots.reason}`);

  const res = await fetchWithTimeout(feedUrl);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const xml = await res.text();

  // RSS <item>...</item> と Atom <entry>...</entry> の両方に対応する。
  const isAtom = /<feed[\s>]/i.test(xml) && !/<rss[\s>]/i.test(xml);
  const itemTag = isAtom ? "entry" : "item";
  const itemRe = new RegExp(`<${itemTag}[^>]*>([\\s\\S]*?)</${itemTag}>`, "gi");

  const articles: CrawledArticle[] = [];
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(xml)) !== null) {
    const block = m[1];
    const title = extractTag(block, "title");
    let link: string | null;
    if (isAtom) {
      link = extractAttr(block, "link", "href");
    } else {
      link = extractTag(block, "link");
    }
    if (!title || !link) continue;

    const rawDate = extractTag(block, "pubDate") ?? extractTag(block, "published") ?? extractTag(block, "updated") ?? extractTag(block, "dc:date");
    const description = extractTag(block, "description") ?? extractTag(block, "content") ?? extractTag(block, "summary");
    const enclosureUrl = extractAttr(block, "enclosure", "url") ?? extractAttr(block, "media:content", "url");

    let resolvedLink: string;
    try {
      resolvedLink = new URL(link.trim(), feedUrl).toString();
    } catch {
      continue;
    }
    const articleUrl = applyUrlRules(resolvedLink, config.urlRules);
    if (!articleUrl) continue;

    articles.push({
      title: stripHtml(title) || title.trim(),
      published_date: normalizeDate(rawDate),
      article_url: articleUrl,
      body: description ? stripHtml(description) : null,
      thumbnail_url: enclosureUrl,
    });
  }

  return { method: "rss", robots, articles, needsDetailFetch: false };
}
