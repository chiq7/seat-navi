// Tier1: 汎用JSON API(サイト固有のAPI形式をSiteConfig.jsonApiのフィールドマッピングで吸収する)。
import { fetchWithTimeout, checkRobotsAllowed, stripHtml } from "../httpUtils";
import type { SiteConfig, ListFetchResult, CrawledArticle } from "../types";

function getByPath(obj: unknown, path: string | undefined): unknown {
  if (!path) return obj;
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

export async function fetchJsonApi(config: SiteConfig): Promise<ListFetchResult> {
  const cfg = config.jsonApi;
  if (!cfg) throw new Error("jsonApi config is required for strategy=json_api");

  const u = new URL(cfg.url);
  const robots = await checkRobotsAllowed(u.origin, u.pathname);
  if (!robots.allowed) throw new Error(`robots.txt disallow: ${robots.reason}`);

  const res = await fetchWithTimeout(cfg.url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const items = getByPath(json, cfg.itemsPath);
  if (!Array.isArray(items)) throw new Error(`itemsPath "${cfg.itemsPath ?? "(root)"}" did not resolve to an array`);

  const articles: CrawledArticle[] = items
    .map((item): CrawledArticle | null => {
      const record = item as Record<string, unknown>;
      const title = record[cfg.titleField];
      const url = record[cfg.urlField];
      if (typeof title !== "string" || typeof url !== "string") return null;
      const dateRaw = cfg.dateField ? record[cfg.dateField] : undefined;
      const bodyRaw = cfg.bodyField ? record[cfg.bodyField] : undefined;
      const thumbRaw = cfg.thumbnailField ? record[cfg.thumbnailField] : undefined;
      return {
        title: stripHtml(title) || title,
        published_date: typeof dateRaw === "string" ? dateRaw.slice(0, 10) : null,
        article_url: url,
        body: typeof bodyRaw === "string" ? stripHtml(bodyRaw) : null,
        thumbnail_url: typeof thumbRaw === "string" ? thumbRaw : null,
      };
    })
    .filter((a): a is CrawledArticle => a !== null);

  return { method: "json_api", robots, articles, needsDetailFetch: false };
}
