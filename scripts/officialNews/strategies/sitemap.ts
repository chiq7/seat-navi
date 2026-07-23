// Tier1: sitemap.xml / news-sitemap.xml。
// 通常のsitemapは<loc>のみ、news sitemap拡張は<news:title>/<news:publication_date>も持つ。
// 本文は含まれないため、常にneedsDetailFetch:trueとし、詳細ページはdetailSelectors
// (htmlSelect.ts、Tier2と共通)で取得する想定。
import { fetchWithTimeout, checkRobotsAllowed } from "../httpUtils";
import type { SiteConfig, ListFetchResult, CrawledArticle } from "../types";

export async function fetchSitemap(config: SiteConfig): Promise<ListFetchResult> {
  const sitemapUrl = config.newsListUrl;
  const u = new URL(sitemapUrl);
  const robots = await checkRobotsAllowed(u.origin, u.pathname);
  if (!robots.allowed) throw new Error(`robots.txt disallow: ${robots.reason}`);

  const res = await fetchWithTimeout(sitemapUrl);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const xml = await res.text();

  const urlBlockRe = /<url>([\s\S]*?)<\/url>/g;
  const articles: CrawledArticle[] = [];
  let m: RegExpExecArray | null;
  while ((m = urlBlockRe.exec(xml)) !== null) {
    const block = m[1];
    const loc = /<loc>([\s\S]*?)<\/loc>/.exec(block)?.[1]?.trim();
    if (!loc) continue;
    const newsTitle = /<news:title>([\s\S]*?)<\/news:title>/.exec(block)?.[1]?.trim();
    const pubDate =
      /<news:publication_date>([\s\S]*?)<\/news:publication_date>/.exec(block)?.[1]?.trim() ??
      /<lastmod>([\s\S]*?)<\/lastmod>/.exec(block)?.[1]?.trim();

    articles.push({
      title: newsTitle ?? "",
      published_date: pubDate ? pubDate.slice(0, 10) : null,
      article_url: loc,
      body: null,
      thumbnail_url: null,
    });
  }

  return { method: "sitemap", robots, articles, needsDetailFetch: true };
}
