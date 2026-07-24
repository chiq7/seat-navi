// Tier2: 公式NEWS一覧から記事リンクを保守的に自動抽出する汎用HTMLパーサ。
// 個別CSSセレクタが判明していないサイトの初期導入用。robots.txt、同一origin、
// URLルール、リンク文言の品質条件をすべて満たしたリンクだけを記事候補にする。
import { applyUrlRules, checkRobotsAllowed, fetchWithTimeout, stripHtml } from "../httpUtils";
import type { CrawledArticle, ListFetchResult, SiteConfig } from "../types";

const ARTICLE_PATH_HINT = /(?:news|info(?:rmation)?|notice|topics?|posts?|contents?|article|detail)/i;
const NAV_LABEL = /^(?:news|info(?:rmation)?|お知らせ|ニュース|一覧|view\s*more|more|next|prev|次へ|前へ|schedule|discography|profile|live|media|movie|video|release|topics|goods|blog|report|ticket|archive|contents|special|event\s*(?:&|\/)?\s*live|live\s*(?:&|\/)?\s*event)$/i;

function decodeAttribute(value: string): string {
  return value.replace(/&amp;/gi, "&").replace(/&#0?39;/gi, "'").replace(/&quot;/gi, '"');
}

function sameSite(a: URL, b: URL): boolean {
  return a.hostname.replace(/^www\./i, "") === b.hostname.replace(/^www\./i, "");
}

function dateNear(html: string, index: number): string | null {
  const near = stripHtml(html.slice(Math.max(0, index - 220), Math.min(html.length, index + 220)));
  const match = near.match(/(20\d{2})\s*[年./-]\s*(\d{1,2})\s*[月./-]\s*(\d{1,2})/);
  return match ? `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}` : null;
}

export function extractAutoHtmlArticles(html: string, effectiveUrl: string, config: SiteConfig): CrawledArticle[] {
  const effectiveList = new URL(effectiveUrl);
  const anchors = /<a\b([^>]*?)href\s*=\s*["']([^"']+)["']([^>]*)>([\s\S]*?)<\/a>/gi;
  const seen = new Set<string>();
  const articles: CrawledArticle[] = [];
  let match: RegExpExecArray | null;

  while ((match = anchors.exec(html)) !== null) {
    const rawHref = decodeAttribute(match[2].trim());
    if (!rawHref || /^(?:#|javascript:|mailto:|tel:)/i.test(rawHref)) continue;
    let resolved: URL;
    try {
      resolved = new URL(rawHref, effectiveList);
    } catch {
      continue;
    }
    if (!/^https?:$/.test(resolved.protocol) || !sameSite(resolved, effectiveList)) continue;
    if (!ARTICLE_PATH_HINT.test(resolved.pathname) && !config.urlRules?.allow?.length) continue;

    const normalized = applyUrlRules(resolved.toString(), config.urlRules);
    if (!normalized || seen.has(normalized)) continue;
    const title = stripHtml(match[4]).replace(/\s+/g, " ").trim();
    if (title.length < 8 || NAV_LABEL.test(title) || title.length > 300) continue;
    const comparableList = effectiveList.toString().replace(/[?#].*$/, "").replace(/\/$/, "");
    if (normalized.replace(/[?#].*$/, "").replace(/\/$/, "") === comparableList) continue;

    seen.add(normalized);
    articles.push({
      title,
      published_date: dateNear(html, match.index),
      article_url: normalized,
      body: null,
      thumbnail_url: null,
    });
  }

  return articles.slice(0, 60);
}

export async function fetchAutoHtmlList(config: SiteConfig): Promise<ListFetchResult> {
  const list = new URL(config.newsListUrl);
  const robots = await checkRobotsAllowed(list.origin, list.pathname);
  if (!robots.allowed) throw new Error(`robots.txt disallow: ${robots.reason}`);

  const response = await fetchWithTimeout(config.newsListUrl, 20000);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const html = await response.text();
  const articles = extractAutoHtmlArticles(html, response.url || config.newsListUrl, config);
  return { method: "auto_html", robots, articles, needsDetailFetch: true };
}
