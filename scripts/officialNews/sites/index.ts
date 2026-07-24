// サイト設定レジストリ。現時点では取得確認済みの既存13組(すべてstrategy:"special"、
// legacySites.tsのparserGroupをそのまま参照)のみを登録している。
//
// 新規アーティストを追加する手順:
//   1. node scripts/discoverOfficialNewsSite.mjs <公式NEWS URL> で調査
//   2. 出力されたJSONレポートの推奨strategy・セレクタ候補を確認
//   3. node --experimental-strip-types --import ./scripts/ts-loader.mjs
//        ./scripts/validateOfficialNewsConfig.mts <config> で検証(合格/要確認/不合格)
//   4. 合格したら、src/lib/artists.ts の対象artistへofficialNews設定を追加
//   5. 要確認/不合格の場合は enabled:false のまま、人間が内容を確認してから有効化する
import { ARTISTS, type Artist } from "@/lib/artists";
import type { SiteConfig } from "../types";

export function toSiteConfig(artist: Artist): SiteConfig | null {
  const news = artist.officialNews;
  if (!news) return null;
  const base = {
    artistSlug: artist.slug,
    artistName: news.artistName ?? artist.name,
    officialUrl: news.newsUrl,
    newsListUrl: news.newsUrl,
    enabled: news.enabled,
    notes: news.notes,
  };
  if (news.parserGroup) {
    return {
      ...base,
      strategy: "special",
      specialParserName: news.parserGroup,
      verificationStatus: "verified",
    };
  }
  return {
    ...base,
    strategy: news.strategy,
    verificationStatus: news.verificationStatus,
    strategyPriority: news.strategyPriority,
    crawlDelayMs: news.crawlDelayMs,
    rssUrl: news.rssUrl,
    wordpressApiUrl: news.wordpressApiUrl,
    jsonApi: news.jsonApi,
    jsonDetailApi: news.jsonDetailApi,
    listSelectors: news.listSelectors,
    detailSelectors: news.detailSelectors,
    pagination: news.pagination,
    urlRules: news.urlRules,
    articleRules: news.articleRules,
    cmsGroup: news.cmsGroup,
  };
}

export const SITE_CONFIGS: SiteConfig[] = ARTISTS
  .map(toSiteConfig)
  .filter((site): site is SiteConfig => site !== null);

export function getEnabledSiteConfigs(): SiteConfig[] {
  return SITE_CONFIGS.filter((s) => s.enabled);
}

export function getSiteConfigBySlug(slug: string): SiteConfig | undefined {
  return SITE_CONFIGS.find((s) => s.artistSlug === slug);
}
