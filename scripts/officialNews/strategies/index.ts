// ストラテジーレジストリ: strategy名 -> 一覧取得adapter関数。
// 巨大switch文にしない。新しいTier1/Tier2ストラテジーを追加する場合は、
// 1) strategies/xxx.ts に adapter を実装
// 2) ここにエントリを1行追加
// だけで済むようにする(special=Tier3は別途 legacySites.ts 側で処理する)。

import type { SiteConfig, ListFetchResult } from "../types";
import { fetchRss } from "./rss";
import { fetchWordpress } from "./wordpress";
import { fetchJsonApi } from "./jsonApi";
import { fetchEmbeddedJson } from "./embeddedJson";
import { fetchSitemap } from "./sitemap";
import { fetchStaticHtmlList } from "./staticHtml";
import { fetchAutoHtmlList } from "./autoHtml";

export type ListFetcher = (config: SiteConfig) => Promise<ListFetchResult>;

// "special"(Tier3, 既存13組)はここには含めない。crawlOfficialNews.ts側で
// legacySites.tsのLIST_FETCHERSを直接使い分ける(strategy名の重複を避けるため)。
export const STRATEGY_REGISTRY: Record<Exclude<SiteConfig["strategy"], "special" | "json_ld">, ListFetcher> = {
  rss: fetchRss,
  wordpress: fetchWordpress,
  json_api: fetchJsonApi,
  embedded_json: fetchEmbeddedJson,
  sitemap: fetchSitemap,
  static_html: fetchStaticHtmlList,
  auto_html: fetchAutoHtmlList,
};

export { fetchGenericDetail } from "./staticHtml";
export { extractArticleFromJsonLd, extractArticleFromOgp } from "./jsonLd";
export { detectEmbeddedJson } from "./embeddedJson";
