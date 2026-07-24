// Tier2: CSSセレクタ設定で動く汎用静的HTMLパーサ。
// フルCSSセレクタ仕様には対応しない(../htmlSelect.tsのコメント参照)。単純な構造の
// 静的HTMLサイト向け。JS描画(SPA)前提のサイトはこの戦略では取得できない。
import { applyUrlRules, fetchWithTimeout, checkRobotsAllowed } from "../httpUtils";
import { selectAll, selectAllOuter, selectText, selectTextAt, selectAttr, removeSelectors } from "../htmlSelect";
import { extractArticleFromJsonLd, extractArticleFromOgp } from "./jsonLd";
import type { SiteConfig, ListFetchResult, CrawledArticle, DetailSelectors } from "../types";

function normalizeDateWithFormat(raw: string | null, format: string | undefined): string | null {
  if (!raw) return null;
  if (format?.startsWith("attr:")) return raw; // attr指定は呼び出し側でselectAttr済みの値をそのまま渡す想定
  // よくある区切り文字(. / 年月日)をISOへ寄せる。年が無い場合はそのまま返す(推測しない)。
  const m = /(\d{4})\s*[年/.\-]\s*(\d{1,2})\s*[月/.\-]\s*(\d{1,2})/.exec(raw);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  return raw.trim();
}

export async function fetchStaticHtmlList(config: SiteConfig): Promise<ListFetchResult> {
  const sel = config.listSelectors;
  if (!sel) throw new Error("listSelectors is required for strategy=static_html");

  const u = new URL(config.newsListUrl);
  const robots = await checkRobotsAllowed(u.origin, u.pathname);
  if (!robots.allowed) throw new Error(`robots.txt disallow: ${robots.reason}`);

  const res = await fetchWithTimeout(config.newsListUrl);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();

  const itemBlocks = selectAllOuter(html, sel.item);
  const articles: CrawledArticle[] = [];
  for (const block of itemBlocks) {
    const title = selectTextAt(block, sel.title, sel.titleIndex ?? 0);
    const rawLink = selectAttr(block, sel.link, sel.linkAttribute ?? "href");
    const href = rawLink && sel.linkValuePattern
      ? new RegExp(sel.linkValuePattern, "i").exec(rawLink)?.[1] ?? null
      : rawLink;
    if (!title || !href) continue;
    const dateRaw = sel.date ? selectText(block, sel.date) : null;

    const articleUrl = applyUrlRules(new URL(href, res.url || u.origin).toString(), config.urlRules);
    if (!articleUrl) continue;
    articles.push({
      title,
      published_date: normalizeDateWithFormat(dateRaw, sel.dateFormat),
      article_url: articleUrl,
      body: null,
      thumbnail_url: null,
    });
  }

  return { method: "static_html", robots, articles, needsDetailFetch: true };
}

export type GenericDetailResult =
  | { success: true; title: string | null; publishedDate: string | null; thumbnail: string | null; body: string; crawlDelay: number }
  | { success: false; error: string; crawlDelay?: number };

/** detailSelectors(Tier2)で詳細ページを解析する。selectorが空/失敗時はJSON-LD→OGPへ
 * 段階的にフォールバックする(汎用戦略のため、単一の抽出方法に依存しすぎないようにする)。 */
export async function fetchGenericDetail(articleUrl: string, detailSelectors: DetailSelectors | undefined): Promise<GenericDetailResult> {
  const u = new URL(articleUrl);
  const robots = await checkRobotsAllowed(u.origin, u.pathname);
  if (!robots.allowed) return { success: false, error: `blocked by robots.txt: ${robots.reason}` };

  try {
    const res = await fetchWithTimeout(articleUrl, 20000);
    if (!res.ok) return { success: false, error: `HTTP ${res.status}`, crawlDelay: robots.crawlDelay };
    const html = await res.text();

    let title: string | null = null;
    let body: string | null = null;
    let publishedDate: string | null = null;
    let thumbnail: string | null = null;

    if (detailSelectors) {
      title = detailSelectors.title ? selectText(html, detailSelectors.title) : null;
      const bodyHtml = selectAll(html, detailSelectors.body)[0];
      if (bodyHtml) {
        const cleaned = removeSelectors(bodyHtml, detailSelectors.exclude);
        body = cleaned
          .replace(/<br\s*\/?>/gi, "\n")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim() || null;
      }
      publishedDate = detailSelectors.date
        ? normalizeDateWithFormat(selectText(html, detailSelectors.date), detailSelectors.dateFormat)
        : null;
      const thumbnailSrc = detailSelectors.thumbnail ? selectAttr(html, detailSelectors.thumbnail, "src") : null;
      if (thumbnailSrc) {
        try {
          thumbnail = new URL(thumbnailSrc, res.url || articleUrl).toString();
        } catch {
          thumbnail = null;
        }
      }
    }

    if (!body) {
      const jsonLd = extractArticleFromJsonLd(html);
      if (jsonLd?.body) {
        title = title ?? jsonLd.title ?? null;
        body = jsonLd.body;
        publishedDate = publishedDate ?? jsonLd.published_date ?? null;
        thumbnail = thumbnail ?? jsonLd.thumbnail_url ?? null;
      }
    }
    if (!body) {
      const ogp = extractArticleFromOgp(html);
      if (ogp?.body) {
        title = title ?? ogp.title ?? null;
        body = ogp.body;
        thumbnail = thumbnail ?? ogp.thumbnail_url ?? null;
      }
    }

    if (!body) return { success: false, error: "no body extracted (selectors/JSON-LD/OGP all failed)", crawlDelay: robots.crawlDelay };
    return { success: true, title, publishedDate, thumbnail, body, crawlDelay: robots.crawlDelay };
  } catch (e) {
    return { success: false, error: String((e as Error)?.message ?? e) };
  }
}
