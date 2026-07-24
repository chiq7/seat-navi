// 公式NEWS取得: サイト設定の型定義。
//
// 3層構成:
//   Tier1 (rss / wordpress / json_api / embedded_json / sitemap / json_ld):
//     設定(URL・パス)だけで動く汎用ストラテジー。巨大switch文にせず、
//     strategies/index.ts のレジストリ経由でstrategy名からadapter関数を引く。
//   Tier2 (static_html):
//     CSSセレクタ設定で動く汎用HTMLパーサ。
//   Tier3 (special):
//     既存13組の7パーサグループ(legacySites.ts)。無理に汎用化せずそのまま再利用する。
//
// 新規サイトは基本的にTier1→Tier2の順で追加し、どうしても合わない場合のみTier3(専用実装)を書く。

// 注: "json_ld" は一覧取得の主strategyとしては未サポート(strategies/index.tsの
// STRATEGY_REGISTRYに未登録)。JSON-LD/OGPは詳細ページの補完抽出
// (strategies/staticHtml.ts の fetchGenericDetail 内で自動フォールバック使用)としてのみ
// 現状使われる。sitemap等でURLのみ得た記事の本文補完に使う想定。
export type CrawlStrategy =
  | "rss"
  | "wordpress"
  | "json_api"
  | "embedded_json"
  | "sitemap"
  | "json_ld"
  | "static_html"
  | "auto_html"
  | "special";

/** Tier2 (static_html) の一覧ページ用CSSセレクタ設定。 */
export type ListSelectors = {
  /** 記事1件を表すコンテナ要素 */
  item: string;
  /** itemの中で詳細ページへのリンクを持つ要素(<a>のhref、または要素自体がaでも可) */
  link: string;
  /** href以外からリンクを取る場合の属性名(例: onclick)。既定はhref。 */
  linkAttribute?: string;
  /** 属性値からURL部分を取り出す正規表現。第1キャプチャをURLとして使用する。 */
  linkValuePattern?: string;
  /** タイトルを持つ要素 */
  title: string;
  /** titleに複数要素が一致する場合の0始まり位置。既定は先頭。 */
  titleIndex?: number;
  /** 公開日を持つ要素(省略時は日付なしで進める) */
  date?: string;
  /** 日付のフォーマット(例: "YYYY.MM.DD" 、datetime属性がある場合は "attr:datetime") */
  dateFormat?: string;
};

/** Tier2 (static_html) の詳細ページ用CSSセレクタ設定。 */
export type DetailSelectors = {
  title?: string;
  body: string;
  date?: string;
  dateFormat?: string;
  thumbnail?: string;
  /** 本文取得前に除去する要素(ナビ・フッター・SNSシェアボタン等) */
  exclude?: string[];
};

/** Tier1 (json_api) 向けの一般化されたJSON API設定。 */
export type JsonApiConfig = {
  url: string;
  /** APIレスポンス形式。Sony Music等のcallback({...})はjsonpを指定する。 */
  responseFormat?: "json" | "jsonp";
  /** レスポンス内の記事配列へのパス(ドット区切り、例: "data.posts") 。省略時はレスポンス自体が配列。 */
  itemsPath?: string;
  titleField: string;
  urlField: string;
  dateField?: string;
  bodyField?: string;
  thumbnailField?: string;
  /** urlFieldが相対URLを返す場合の解決基準。省略時はofficialUrlを使用する。 */
  articleUrlBase?: string;
};

/** 一覧APIとは別のJSON APIから記事本文を取得するサイト向け設定。 */
export type JsonDetailApiConfig = {
  /** 記事URL末尾のIDを {slug} に埋め込む。 */
  urlTemplate: string;
  responseFormat?: "json" | "jsonp";
  /** レスポンス内の記事オブジェクトへのパス。省略時はルート。 */
  rootPath?: string;
  titleField?: string;
  bodyField: string;
  dateField?: string;
  thumbnailField?: string;
};

export type PaginationConfig = {
  type: "query_param" | "path_segment" | "none";
  param?: string;
  maxPages?: number;
};

export type UrlRules = {
  /** 許可URLパターン(正規表現文字列)。1つ以上指定時、記事URLはいずれかにマッチが必要。 */
  allow?: string[];
  /** 除外URLパターン(正規表現文字列)。マッチしたら除外。 */
  deny?: string[];
  normalize?: {
    stripQuery?: boolean;
    /** 記事ID以外の追跡・セッション系queryだけを除去する。 */
    dropQueryParams?: string[];
    stripTrailingSlash?: boolean;
    forceHttps?: boolean;
  };
};

export type ArticleRules = {
  /** タイトル・本文・URLのいずれかに、少なくとも1語を含む記事だけを残す。 */
  includeAny?: string[];
  /** タイトル・本文・URLのいずれかに含まれる場合は除外する。 */
  excludeAny?: string[];
};

export type VerificationStatus = "unverified" | "candidate" | "verified" | "rejected";

export type SiteConfig = {
  artistSlug: string;
  artistName: string;
  officialUrl: string;
  newsListUrl: string;

  strategy: CrawlStrategy;
  /** 主strategyが失敗した場合に試す順序(将来の拡張用。未使用時は主strategyのみ)。 */
  strategyPriority?: CrawlStrategy[];

  /** robots.txtから動的に読み取るのが既定。明示指定時はそちらを優先する。 */
  crawlDelayMs?: number;

  rssUrl?: string;
  wordpressApiUrl?: string;
  jsonApi?: JsonApiConfig;
  jsonDetailApi?: JsonDetailApiConfig;
  listSelectors?: ListSelectors;
  detailSelectors?: DetailSelectors;
  /** 公式一覧のタイトル・日付だけで登録し、外部詳細ページの本文取得を省略する。 */
  skipDetailFetch?: boolean;
  pagination?: PaginationConfig;
  urlRules?: UrlRules;
  articleRules?: ArticleRules;

  enabled: boolean;
  /** strategy==="special" の場合のみ使用。legacySites.tsのparserGroup名。 */
  specialParserName?: "exo" | "generations" | "asobisystem" | "lapone" | "universal-music-wp" | "befirst" | "fujiikaze";
  /** 共通CMS設定を継承する場合のグループ名(CMS_GROUPSのキー)。 */
  cmsGroup?: string;
  verificationStatus: VerificationStatus;
  notes?: string;
};

/** 記事1件の共通形式(どのstrategyでも最終的にこの形へ正規化する)。 */
export type CrawledArticle = {
  title: string;
  published_date: string | null;
  article_url: string;
  body: string | null;
  thumbnail_url: string | null;
};

export type ListFetchResult = {
  method: CrawlStrategy;
  robots: { allowed: boolean; crawlDelay: number; reason: string };
  articles: CrawledArticle[];
  needsDetailFetch: boolean;
};

/** 共通CMSグループの既定値。個別サイト設定はcmsGroupを指定するとここから継承し、
 * 自身のフィールドで上書きできる(例: 同じCSSセレクタ構造を使う複数アーティスト)。 */
export const CMS_GROUPS: Record<string, Partial<SiteConfig>> = {
  // 例: 将来「XXXテンプレート系」が複数アーティストで見つかった場合にここへ追加する。
  // asobisystem/laponeは13組側で既にspecial扱いのため、ここでは新規サイト向けの
  // 汎用Tier1/Tier2グループのみを登録していく想定。
};

/** cmsGroupで指定された共通設定を継承し、サイト個別設定で上書きしたSiteConfigを返す。 */
export function resolveSiteConfig(raw: SiteConfig): SiteConfig {
  if (!raw.cmsGroup) return raw;
  const base = CMS_GROUPS[raw.cmsGroup];
  if (!base) return raw;
  return { ...base, ...raw };
}
