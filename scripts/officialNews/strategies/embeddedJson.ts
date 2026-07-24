// Tier1: ページ内に埋め込まれたJSON(__NEXT_DATA__ / __NUXT__ / window.__INITIAL_STATE__ 等)。
// SPA/SSRサイトでよく見られる、HTML内<script>タグに初期state用JSONが埋め込まれるパターン。
import { applyUrlRules, fetchWithTimeout, checkRobotsAllowed, stripHtml } from "../httpUtils";
import type { SiteConfig, ListFetchResult, CrawledArticle } from "../types";

const KNOWN_PATTERNS: { name: string; re: RegExp }[] = [
  { name: "__NEXT_DATA__", re: /<script id="__NEXT_DATA__"[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/i },
  { name: "__NUXT_DATA__", re: /<script[^>]*id=["']__NUXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i },
  { name: "__NUXT__", re: /<script[^>]*>\s*window\.__NUXT__\s*=\s*([\s\S]*?);?\s*<\/script>/i },
  { name: "window.__INITIAL_STATE__", re: /window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\});?\s*<\/script>/i },
];

/** ページHTMLから埋め込みJSONを検出して返す(Discoveryツールと共通利用)。 */
export function detectEmbeddedJson(html: string): { name: string; json: unknown } | null {
  for (const p of KNOWN_PATTERNS) {
    const m = p.re.exec(html);
    if (!m) continue;
    try {
      return { name: p.name, json: JSON.parse(m[1]) };
    } catch {
      // JSONとして壊れている(NUXT等は関数呼び出し形式のことがあり、その場合は非対応)
      continue;
    }
  }
  return null;
}

export function getByPath(obj: unknown, path: string | undefined): unknown {
  if (!path) return obj;
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

export async function fetchEmbeddedJson(config: SiteConfig): Promise<ListFetchResult> {
  const u = new URL(config.newsListUrl);
  const robots = await checkRobotsAllowed(u.origin, u.pathname);
  if (!robots.allowed) throw new Error(`robots.txt disallow: ${robots.reason}`);

  const res = await fetchWithTimeout(config.newsListUrl);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();

  const detected = detectEmbeddedJson(html);
  if (!detected) throw new Error("no embedded JSON (__NEXT_DATA__/__NUXT__/__INITIAL_STATE__) found");

  const cfg = config.jsonApi; // itemsPath/フィールド名マッピングを流用する
  if (!cfg) throw new Error("jsonApi config (itemsPath/field mapping) is required for strategy=embedded_json");

  const items = getByPath(detected.json, cfg.itemsPath);
  if (!Array.isArray(items)) throw new Error(`itemsPath "${cfg.itemsPath ?? "(root)"}" did not resolve to an array within ${detected.name}`);

  const articles: CrawledArticle[] = items
    .map((item): CrawledArticle | null => {
      const record = item as Record<string, unknown>;
      const title = getByPath(record, cfg.titleField);
      const url = getByPath(record, cfg.urlField);
      if (typeof title !== "string" || typeof url !== "string") return null;
      const dateRaw = cfg.dateField ? getByPath(record, cfg.dateField) : undefined;
      const bodyRaw = cfg.bodyField ? getByPath(record, cfg.bodyField) : undefined;
      const thumbRaw = cfg.thumbnailField ? getByPath(record, cfg.thumbnailField) : undefined;
      const resolvedUrl = new URL(url, cfg.articleUrlBase ?? u.origin);
      if (!config.urlRules?.allow?.length && resolvedUrl.hostname.replace(/^www\./i, "") !== u.hostname.replace(/^www\./i, "")) return null;
      const articleUrl = applyUrlRules(resolvedUrl.toString(), config.urlRules);
      if (!articleUrl) return null;
      return {
        title: stripHtml(title) || title,
        published_date: typeof dateRaw === "string" ? dateRaw.slice(0, 10) : null,
        article_url: articleUrl,
        body: typeof bodyRaw === "string" ? stripHtml(bodyRaw) : null,
        thumbnail_url: typeof thumbRaw === "string" ? thumbRaw : null,
      };
    })
    .filter((a): a is CrawledArticle => a !== null);

  return { method: "embedded_json", robots, articles, needsDetailFetch: false };
}
