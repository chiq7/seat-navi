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
  if (typeof value === "number" && Number.isFinite(value)) {
    const millis = value < 10_000_000_000 ? value * 1000 : value;
    const date = new Date(millis);
    return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
  }
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

  return { method: "json_api", robots, articles, needsDetailFetch: Boolean(config.jsonDetailApi && !cfg.bodyField) };
}

export async function fetchJsonApiDetail(config: SiteConfig, articleUrl: string) {
  const cfg = config.jsonDetailApi;
  if (!cfg) throw new Error("jsonDetailApi config is required");

  const articlePath = new URL(articleUrl).pathname.split("/").filter(Boolean);
  const slug = articlePath.at(-1);
  if (!slug) return { success: false as const, error: "article URL has no slug" };

  const apiUrl = cfg.urlTemplate.replace("{slug}", encodeURIComponent(slug));
  const api = new URL(apiUrl);
  const robots = await checkRobotsAllowed(api.origin, api.pathname);
  if (!robots.allowed) return { success: false as const, error: `blocked by robots.txt: ${robots.reason}` };

  try {
    const res = await fetchWithTimeout(apiUrl);
    if (!res.ok) return { success: false as const, error: `HTTP ${res.status}`, crawlDelay: robots.crawlDelay };
    const payload = parseJsonApiPayload(await res.text(), cfg.responseFormat);
    const root = getByPath(payload, cfg.rootPath);
    const bodyRaw = getByPath(root, cfg.bodyField);
    const body = typeof bodyRaw === "string" ? stripHtml(bodyRaw) : "";
    if (!body) return { success: false as const, error: "detail API body was empty", crawlDelay: robots.crawlDelay };

    const titleRaw = cfg.titleField ? getByPath(root, cfg.titleField) : undefined;
    const thumbnailRaw = cfg.thumbnailField ? getByPath(root, cfg.thumbnailField) : undefined;
    let thumbnail: string | null = null;
    if (typeof thumbnailRaw === "string" && thumbnailRaw) {
      try {
        thumbnail = new URL(thumbnailRaw, config.officialUrl).toString();
      } catch {
        thumbnail = null;
      }
    }

    return {
      success: true as const,
      title: typeof titleRaw === "string" ? stripHtml(titleRaw) : null,
      publishedDate: normalizeDate(cfg.dateField ? getByPath(root, cfg.dateField) : undefined),
      thumbnail,
      body,
      crawlDelay: robots.crawlDelay,
    };
  } catch (error) {
    return { success: false as const, error: String((error as Error)?.message ?? error) };
  }
}
