// Tier1: WordPress REST API (/wp-json/wp/v2/posts)。
// 既存13組のうち universal-music-wp / fujiikaze も実質同じ仕組みだが、それらは
// legacySites.ts側でspecial扱いのまま維持する(このファイルは新規サイト向けの汎用版)。
import { fetchWithTimeout, checkRobotsAllowed, stripHtml } from "../httpUtils";
import type { SiteConfig, ListFetchResult, CrawledArticle } from "../types";

type WpPost = {
  title?: { rendered?: string };
  date?: string;
  link: string;
  content?: { rendered?: string };
  yoast_head_json?: { og_image?: { url?: string }[] };
};

export async function fetchWordpress(config: SiteConfig): Promise<ListFetchResult> {
  const apiUrl = config.wordpressApiUrl ?? config.newsListUrl;
  const u = new URL(apiUrl);
  const robots = await checkRobotsAllowed(u.origin, u.pathname);
  if (!robots.allowed) throw new Error(`robots.txt disallow: ${robots.reason}`);

  const res = await fetchWithTimeout(apiUrl);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const posts = (await res.json()) as WpPost[];
  if (!Array.isArray(posts)) throw new Error("unexpected response shape (not an array)");

  const articles: CrawledArticle[] = posts.map((p) => ({
    title: stripHtml(p.title?.rendered ?? ""),
    published_date: (p.date || "").slice(0, 10) || null,
    article_url: p.link,
    body: stripHtml(p.content?.rendered ?? ""),
    thumbnail_url: p.yoast_head_json?.og_image?.[0]?.url ?? null,
  }));

  return { method: "wordpress", robots, articles, needsDetailFetch: false };
}
