// SiteConfigのstrategyに応じて、一覧取得/詳細取得を適切なadapterへディスパッチする共通ヘルパー。
// crawlOfficialNews.mts と validateOfficialNewsConfig.mts の両方から使う(重複実装を避ける)。
import { LIST_FETCHERS as LEGACY_LIST_FETCHERS, fetchArticleDetail as legacyFetchDetail } from "./legacySites";
import { STRATEGY_REGISTRY, fetchGenericDetail } from "./strategies/index";
import { fetchJsonApiDetail } from "./strategies/jsonApi";
import type { SiteConfig, ListFetchResult, CrawledArticle } from "./types";

function matchesArticleRules(article: CrawledArticle, config: SiteConfig): boolean {
  const rules = config.articleRules;
  if (!rules) return true;
  const haystack = `${article.title}\n${article.body ?? ""}\n${article.article_url}`.toLocaleLowerCase("ja");
  if (rules.excludeAny?.some((word) => haystack.includes(word.toLocaleLowerCase("ja")))) return false;
  if (rules.includeAny?.length && !rules.includeAny.some((word) => haystack.includes(word.toLocaleLowerCase("ja")))) return false;
  return true;
}

export async function fetchListForConfig(config: SiteConfig): Promise<ListFetchResult> {
  if (config.strategy === "special") {
    if (!config.specialParserName) throw new Error("specialParserName is required for strategy=special");
    const fetcher = LEGACY_LIST_FETCHERS[config.specialParserName];
    return fetcher({
      artistName: config.artistName,
      artistSlug: config.artistSlug,
      newsUrl: config.newsListUrl,
      parserGroup: config.specialParserName,
      enabled: config.enabled,
      notes: config.notes ?? "",
    });
  }
  const fetcher = STRATEGY_REGISTRY[config.strategy as Exclude<SiteConfig["strategy"], "special" | "json_ld">];
  if (!fetcher) throw new Error(`no list fetcher registered for strategy "${config.strategy}"`);
  const result = await fetcher(config);
  return { ...result, articles: result.articles.filter((article) => matchesArticleRules(article, config)) };
}

export async function fetchDetailForConfig(config: SiteConfig, articleUrl: string) {
  if (config.strategy === "special") return legacyFetchDetail(articleUrl);
  if (config.jsonDetailApi) return fetchJsonApiDetail(config, articleUrl);
  return fetchGenericDetail(articleUrl, config.detailSelectors);
}
