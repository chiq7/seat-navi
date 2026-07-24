// Tier1: 汎用JSON API(サイト固有のAPI形式をSiteConfig.jsonApiのフィールドマッピングで吸収する)。
import { applyUrlRules, fetchWithTimeout, checkRobotsAllowed, stripHtml } from "../httpUtils";
import type { SiteConfig, ListFetchResult, CrawledArticle, JsonApiConfig } from "../types";

function getByPath(obj: unknown, path: string | undefined): unknown {
  if (!path) return obj;
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

export function parseJsonApiPayload(text: string, format: "json" | "jsonp" = "json"): unknown {
  if (format === "json") return JSON.parse(text);
  const match = text.trim().match(/^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*\s*\(([\s\S]*)\)\s*;?$/);
  if (!match) throw new Error("JSONP response did not match callback(payload)");
  return JSON.parse(match[1]);
}

function normalizeDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = value.match(/(\d{4})[.\/-](\d{1,2})[.\/-](\d{1,2})/);
  if (!match) return value.slice(0, 10);
  return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
}

export function mapJsonApiArticles(
  payload: unknown,
  cfg: JsonApiConfig,
  officialUrl: string,
  urlRules?: SiteConfig["urlRules"],
): CrawledArticle[] {
  const items = getByPath(payload, cfg.itemsPath);
  if (!Array.isArray(items)) throw new Error(`itemsPath "${cfg.itemsPath ?? "(root)"}" did not resolve to an array`);

  return items
    .map((item): CrawledArticle | null => {
      const title = getByPath(item, cfg.titleField);
      const rawUrl = getByPath(item, cfg.urlField);
      if (typeof title !== "string" || typeof rawUrl !== "string") return null;

      let resolvedUrl: string;
      try {
        resolvedUrl = new URL(rawUrl, cfg.articleUrlBase ?? officialUrl).toString();
      } catch {
        return null;
      }
      const articleUrl = applyUrlRules(resolvedUrl, urlRules);
      if (!articleUrl) return null;

      const bodyRaw = cfg.bodyField ? getByPath(item, cfg.bodyField) : undefined;
      const thumbRaw = cfg.thumbnailField ? getByPath(item, cfg.thumbnailField) : undefined;
      let thumbnailUrl: string | null = null;
      if (typeof thumbRaw === "string" && thumbRaw) {
        try {
          thumbnailUrl = new URL(thumbRaw, cfg.articleUrlBase ?? officialUrl).toString();
        } catch {
          thumbnailUrl = null;
        }
      }
      return {
        title: stripHtml(title) || title,
        published_date: normalizeDate(cfg.dateField ? getByPath(item, cfg.dateField) : undefined),
        article_url: articleUrl,
        body: typeof bodyRaw === "string" ? stripHtml(bodyRaw) : null,
        thumbnail_url: thumbnailUrl,
      };
    })
    .filter((article): article is CrawledArticle => article !== null);
}

export async function fetchJsonApi(config: SiteConfig): Promise<ListFetchResult> {
  const cfg = config.jsonApi;
  if (!cfg) throw new Error("jsonApi config is required for strategy=json_api");

  const u = new URL(cfg.url);
  const robots = await checkRobotsAllowed(u.origin, u.pathname);
  if (!robots.allowed) throw new Error(`robots.txt disallow: ${robots.reason}`);

  const res = await fetchWithTimeout(cfg.url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const payload = parseJsonApiPayload(await res.text(), cfg.responseFormat);
  const articles = mapJsonApiArticles(payload, cfg, config.officialUrl, config.urlRules);

  return { method: "json_api", robots, articles, needsDetailFetch: false };
}
