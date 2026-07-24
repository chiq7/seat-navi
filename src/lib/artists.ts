import type { CrawledEvent } from "./types";
import { keywordMatchesTitle } from "./keywordMatch";
import { DISCOVERED_OFFICIAL_NEWS_CONFIGS } from "./officialNewsRegistry";

export type Artist = {
  slug: string;
  name: string;
  genre: CrawledEvent["genre"];
  description: string;
  keywords: string[];
  initials: string;
  grad: string;
  accentColor: string;
  accentDark: string;
  /** public配下の画像パス。未設定・読込失敗時は共通ヒーローへフォールバックする。 */
  heroImage?: string;
  /** 公式NEWS crawler設定。未設定でもNEWS一覧ページ自体は利用できる。 */
  officialNews?: OfficialNewsConfig;
};

type OfficialNewsBaseConfig = {
  /** 公式サイト上の表記がページ表示名と異なる場合だけ指定する。 */
  artistName?: string;
  newsUrl: string;
  enabled: boolean;
  notes: string;
};

export type OfficialNewsConfig = OfficialNewsBaseConfig & (
  | {
      /** 取得確認済み13組など、共通strategyで扱えないサイトだけが使用する。 */
      parserGroup: "exo" | "generations" | "asobisystem" | "lapone" | "universal-music-wp" | "befirst" | "fujiikaze";
      strategy?: never;
    }
  | {
      /** 新規サイトは原則としてこちらの共通strategyを使用する。 */
      strategy: "rss" | "wordpress" | "json_api" | "embedded_json" | "sitemap" | "static_html" | "auto_html";
      parserGroup?: never;
      verificationStatus: "unverified" | "candidate" | "verified" | "rejected";
      strategyPriority?: Array<"rss" | "wordpress" | "json_api" | "embedded_json" | "sitemap" | "static_html" | "auto_html">;
      crawlDelayMs?: number;
      rssUrl?: string;
      wordpressApiUrl?: string;
      jsonApi?: {
        url: string;
        responseFormat?: "json" | "jsonp";
        itemsPath?: string;
        titleField: string;
        urlField: string;
        dateField?: string;
        bodyField?: string;
        thumbnailField?: string;
        articleUrlBase?: string;
      };
      listSelectors?: {
        item: string;
        link: string;
        linkAttribute?: string;
        linkValuePattern?: string;
        title: string;
        titleIndex?: number;
        date?: string;
        dateFormat?: string;
      };
      detailSelectors?: {
        title?: string;
        body: string;
        date?: string;
        dateFormat?: string;
        thumbnail?: string;
        exclude?: string[];
      };
      pagination?: {
        type: "query_param" | "path_segment" | "none";
        param?: string;
        maxPages?: number;
      };
      urlRules?: {
        allow?: string[];
        deny?: string[];
        normalize?: {
          stripQuery?: boolean;
          dropQueryParams?: string[];
          stripTrailingSlash?: boolean;
          forceHttps?: boolean;
        };
      };
      articleRules?: {
        includeAny?: string[];
        excludeAny?: string[];
      };
      cmsGroup?: string;
    }
);

const DESC = "\u5ea7\u5e2d\u4e88\u60f3\u3001\u5f53\u9078\u7387\u3001\u73fe\u5730\u30ec\u30dd\u3001\u30bb\u30c8\u30ea\u3092\u307e\u3068\u3081\u3066\u3044\u307e\u3059\u3002";

const ARTIST_DEFINITIONS: Artist[] = [
  {
    slug: "nogizaka46",
    name: "\u4e43\u6728\u574246",
    genre: "female_idol",
    description: `\u4e43\u6728\u574246\u306e${DESC}`,
    keywords: ["\u4e43\u6728\u574246", "\u4e43\u6728\u5742", "Nogizaka46", "Nogizaka"],
    initials: "\u4e43\u6728",
    grad: "from-violet-400 to-purple-600",
    accentColor: "#7c3aed",
    accentDark: "#5b21b6",
  },
  {
    slug: "sakurazaka46",
    name: "\u6afb\u574246",
    genre: "female_idol",
    description: `\u6afb\u574246\u306e${DESC}`,
    keywords: ["\u6afb\u574246", "\u6afb\u5742", "Sakurazaka46", "Sakurazaka"],
    initials: "\u6afb\u5742",
    grad: "from-pink-300 to-rose-500",
    accentColor: "#e11d48",
    accentDark: "#be123c",
  },
  {
    slug: "niziu",
    name: "NiziU",
    genre: "kpop",
    description: `NiziU\u306e${DESC}`,
    keywords: ["NiziU", "\u30cb\u30b8\u30e5\u30fc"],
    initials: "NZ",
    grad: "from-sky-300 to-cyan-500",
    accentColor: "#0891b2",
    accentDark: "#0e7490",
    officialNews: {
      newsUrl: "https://niziu.com/s/n123/page/news",
      enabled: false,
      notes: "NiziU公式サイトのデータ元Sony MusicがAI crawlerをrobots.txtで全域禁止しているため無効。ファンクラブNEWSは対象外。",
      strategy: "json_api",
      verificationStatus: "rejected",
      jsonApi: {
        url: "https://www.sonymusic.co.jp/json/v2/artist/niziu/information/start/0/count/30",
        responseFormat: "jsonp",
        itemsPath: "items",
        titleField: "title",
        urlField: "link",
        dateField: "date",
        bodyField: "article",
        thumbnailField: "images.image",
        articleUrlBase: "https://www.sonymusic.co.jp",
      },
      urlRules: {
        allow: ["^https://www\\.sonymusic\\.co\\.jp/artist/niziu/info/"],
        normalize: { stripQuery: true, forceHttps: true },
      },
    },
  },
  {
    slug: "hinatazaka46",
    name: "\u65e5\u5411\u574246",
    genre: "female_idol",
    description: `\u65e5\u5411\u574246\u306e${DESC}`,
    keywords: ["\u65e5\u5411\u574246", "\u65e5\u5411\u5742", "Hinatazaka46", "Hinatazaka"],
    initials: "\u65e5\u5411",
    grad: "from-sky-300 to-blue-500",
    accentColor: "#0284c7",
    accentDark: "#0369a1",
  },
  {
    slug: "snow-man",
    name: "Snow Man",
    genre: "johnnys",
    description: `Snow Man\u306e${DESC}`,
    keywords: ["Snow Man", "SnowMan", "\u30b9\u30ce\u30fc\u30de\u30f3"],
    initials: "SM",
    grad: "from-cyan-300 to-slate-500",
    accentColor: "#0f766e",
    accentDark: "#115e59",
  },
  {
    slug: "stray-kids",
    name: "Stray Kids",
    genre: "kpop",
    description: `Stray Kids\u306e${DESC}`,
    keywords: ["Stray Kids", "StrayKids", "\u30b9\u30ad\u30ba"],
    initials: "SK",
    grad: "from-red-400 to-rose-600",
    accentColor: "#dc2626",
    accentDark: "#991b1b",
  },
  {
    slug: "seventeen",
    name: "SEVENTEEN",
    genre: "kpop",
    description: `SEVENTEEN\u306e${DESC}`,
    keywords: ["SEVENTEEN", "\u30bb\u30d6\u30c1"],
    initials: "SE",
    grad: "from-violet-300 to-pink-400",
    accentColor: "#92A8D1",
    accentDark: "#6b7fb0",
  },
  {
    slug: "sixtones",
    name: "SixTONES",
    genre: "johnnys",
    description: `SixTONES\u306e${DESC}`,
    keywords: ["SixTONES", "\u30b9\u30c8\u30fc\u30f3\u30ba"],
    initials: "ST",
    grad: "from-slate-500 to-zinc-800",
    accentColor: "#334155",
    accentDark: "#1e293b",
  },
  {
    slug: "equal-love",
    name: "\uff1dLOVE",
    genre: "female_idol",
    description: `\uff1dLOVE\u306e${DESC}`,
    keywords: ["\uff1dLOVE", "=LOVE", "\u30a4\u30b3\u30fc\u30eb\u30e9\u30d6", "\u30a4\u30b3\u30e9\u30d6"],
    initials: "\uff1dL",
    grad: "from-pink-300 to-fuchsia-500",
    accentColor: "#db2777",
    accentDark: "#be185d",
  },
  {
    slug: "fruits-zipper",
    name: "FRUITS ZIPPER",
    genre: "female_idol",
    description: `FRUITS ZIPPER\u306e${DESC}`,
    keywords: ["FRUITS ZIPPER", "\u3075\u308b\u3063\u3071\u30fc", "\u30d5\u30eb\u30fc\u30c4\u30b8\u30c3\u30d1\u30fc"],
    initials: "FZ",
    grad: "from-amber-300 to-pink-500",
    accentColor: "#f59e0b",
    accentDark: "#d97706",
    officialNews: {
      newsUrl: "https://fruitszipper.asobisystem.com/news/1/",
      parserGroup: "asobisystem",
      enabled: true,
      notes: "ASOBISYSTEM「KAWAII LAB.」テンプレート。本文は詳細ページのog:descriptionに格納。",
    },
  },
  {
    slug: "acees",
    name: "ACEes",
    genre: "kpop",
    description: `ACEesの${DESC}`,
    keywords: ["ACEes"],
    initials: "AC",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
  },
  {
    slug: "fantastics",
    name: "FANTASTICS",
    genre: "male_idol",
    description: `FANTASTICSの${DESC}`,
    keywords: ["FANTASTICS"],
    initials: "FA",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
  },
  {
    slug: "me-i",
    name: "ME:I",
    genre: "kpop",
    description: `ME:Iの${DESC}`,
    keywords: ["ME:I"],
    initials: "ME",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
    officialNews: {
      newsUrl: "https://me-i.jp/news/1",
      parserGroup: "lapone",
      enabled: true,
      notes: "LAPONE系(JO1と同一構造)。一覧URL形式は/news/1。",
    },
  },
  {
    slug: "roselia",
    name: "Roselia",
    genre: "female_idol",
    description: `Roseliaの${DESC}`,
    keywords: ["Roselia"],
    initials: "Ro",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
  },
  {
    slug: "treasure",
    name: "TREASURE",
    genre: "kpop",
    description: `TREASUREの${DESC}`,
    keywords: ["TREASURE"],
    initials: "TR",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
  },
  {
    slug: "news",
    name: "NEWS",
    genre: "johnnys",
    description: `NEWSの${DESC}`,
    keywords: ["NEWS"],
    initials: "NE",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
  },
  {
    slug: "hiromitsu-kitayama",
    name: "北山宏光",
    genre: "johnnys",
    description: `北山宏光の${DESC}`,
    keywords: ["北山宏光", "Hiromitsu Kitayama"],
    initials: "北山",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
  },
  {
    slug: "cutie-street",
    name: "CUTIE STREET",
    genre: "female_idol",
    description: `CUTIE STREETの${DESC}`,
    keywords: ["CUTIE STREET"],
    initials: "CU",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
    officialNews: {
      newsUrl: "https://cutiestreet.asobisystem.com/news/1",
      parserGroup: "asobisystem",
      enabled: true,
      notes: "ASOBISYSTEM系(FRUITS ZIPPERと同一構造)。",
    },
  },
  {
    slug: "ballistik-boyz",
    name: "BALLISTIK BOYZ",
    genre: "male_idol",
    description: `BALLISTIK BOYZの${DESC}`,
    keywords: ["BALLISTIK BOYZ"],
    initials: "BA",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
  },
  {
    slug: "generations",
    name: "GENERATIONS",
    genre: "male_idol",
    description: `GENERATIONSの${DESC}`,
    keywords: ["GENERATIONS"],
    initials: "GE",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
    officialNews: {
      newsUrl: "https://www.generations-ldh.com/sys_inc/newsdat.php?p=0&y=",
      parserGroup: "generations",
      enabled: true,
      notes: "独自PHP+AJAX JSON API。一覧取得時点で本文が埋め込まれている。",
    },
  },
  {
    slug: "shinee",
    name: "SHINee",
    genre: "kpop",
    description: `SHINeeの${DESC}`,
    keywords: ["SHINee"],
    initials: "SH",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
  },
  {
    slug: "team",
    name: "&TEAM",
    genre: "male_idol",
    description: `&TEAMの${DESC}`,
    keywords: ["&TEAM"],
    initials: "&T",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
  },
  {
    slug: "shigure-ui",
    name: "時雨羽衣",
    genre: "other",
    description: `時雨羽衣の${DESC}`,
    keywords: ["時雨羽衣", "SHIGURE UI"],
    initials: "時雨",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
    officialNews: {
      artistName: "しぐれうい",
      newsUrl: "https://www.universal-music.co.jp/shigureui/wp-json/wp/v2/posts?per_page=20",
      parserGroup: "universal-music-wp",
      enabled: true,
      notes: "Universal Music Japan WordPress REST API。",
    },
  },
  {
    slug: "g-i-dle",
    name: "(G)I-DLE",
    genre: "kpop",
    description: `(G)I-DLEの${DESC}`,
    keywords: ["(G)I-DLE"],
    initials: "(G",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
  },
  {
    slug: "joy",
    name: "≒JOY",
    genre: "female_idol",
    description: `≒JOYの${DESC}`,
    keywords: ["≒JOY"],
    initials: "≒J",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
  },
  {
    slug: "le-sserafim",
    name: "LE SSERAFIM",
    genre: "kpop",
    description: `LE SSERAFIMの${DESC}`,
    keywords: ["LE SSERAFIM"],
    initials: "LE",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
  },
  {
    slug: "king-prince",
    name: "King & Prince",
    genre: "johnnys",
    description: `King & Princeの${DESC}`,
    keywords: ["King & Prince"],
    initials: "Ki",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
  },
  {
    slug: "arashi",
    name: "嵐",
    genre: "johnnys",
    description: `嵐の${DESC}`,
    keywords: ["嵐", "ARASHI"],
    initials: "嵐",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
  },
  {
    slug: "ryosuke-yamada",
    name: "山田涼介",
    genre: "johnnys",
    description: `山田涼介の${DESC}`,
    keywords: ["山田涼介", "Ryosuke Yamada"],
    initials: "山田",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
  },
  {
    slug: "j-soul-brothers",
    name: "三代目 J SOUL BROTHERS",
    genre: "male_idol",
    description: `三代目 J SOUL BROTHERSの${DESC}`,
    keywords: ["三代目 J SOUL BROTHERS"],
    initials: "三代",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
  },
  {
    slug: "buddiis",
    name: "BUDDiiS",
    genre: "female_idol",
    description: `BUDDiiSの${DESC}`,
    keywords: ["BUDDiiS"],
    initials: "BU",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
  },
  {
    slug: "the-rampage",
    name: "THE RAMPAGE",
    genre: "male_idol",
    description: `THE RAMPAGEの${DESC}`,
    keywords: ["THE RAMPAGE"],
    initials: "TH",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
  },
  {
    slug: "naniwa-danshi",
    name: "なにわ男子",
    genre: "johnnys",
    description: `なにわ男子の${DESC}`,
    keywords: ["なにわ男子", "Naniwa Danshi"],
    initials: "なに",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
  },
  {
    slug: "timelesz",
    name: "timelesz",
    genre: "johnnys",
    description: `timeleszの${DESC}`,
    keywords: ["timelesz"],
    initials: "ti",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
  },
  {
    slug: "kis-my-ft2",
    name: "Kis-My-Ft2",
    genre: "johnnys",
    description: `Kis-My-Ft2の${DESC}`,
    keywords: ["Kis-My-Ft2"],
    initials: "Ki",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
  },
  {
    slug: "ado",
    name: "Ado",
    genre: "other",
    description: `Adoの${DESC}`,
    keywords: ["Ado"],
    initials: "Ad",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
    officialNews: {
      newsUrl: "https://www.universal-music.co.jp/ado/wp-json/wp/v2/posts?per_page=20",
      parserGroup: "universal-music-wp",
      enabled: true,
      notes: "同上。",
    },
  },
  {
    slug: "aespa",
    name: "aespa",
    genre: "kpop",
    description: `aespaの${DESC}`,
    keywords: ["aespa"],
    initials: "ae",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
  },
  {
    slug: "exo",
    name: "EXO",
    genre: "kpop",
    description: `EXOの${DESC}`,
    keywords: ["EXO"],
    initials: "EX",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
    officialNews: {
      newsUrl: "https://exo-jp.net/news/index.php",
      parserGroup: "exo",
      enabled: true,
      notes: "PHP静的サイト。detail.php?id=形式。robots.txtにCrawl-delay:30あり(遵守要)。",
    },
  },
  {
    slug: "nexz",
    name: "NEXZ",
    genre: "kpop",
    description: `NEXZの${DESC}`,
    keywords: ["NEXZ"],
    initials: "NE",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
  },
  {
    slug: "strawberry-prince",
    name: "すとぷり",
    genre: "male_idol",
    description: `すとぷりの${DESC}`,
    keywords: ["すとぷり", "Strawberry Prince"],
    initials: "すと",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
  },
  {
    slug: "number-i",
    name: "Number_i",
    genre: "male_idol",
    description: `Number_iの${DESC}`,
    keywords: ["Number_i"],
    initials: "Nu",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
  },
  {
    slug: "yoasobi",
    name: "YOASOBI",
    genre: "other",
    description: `YOASOBIの${DESC}`,
    keywords: ["YOASOBI"],
    initials: "YO",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
  },
  {
    slug: "bigbang",
    name: "BIGBANG",
    genre: "kpop",
    description: `BIGBANGの${DESC}`,
    keywords: ["BIGBANG"],
    initials: "BI",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
  },
  {
    slug: "juice-juice",
    name: "Juice=Juice",
    genre: "female_idol",
    description: `Juice=Juiceの${DESC}`,
    keywords: ["Juice=Juice"],
    initials: "Ju",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
  },
  {
    slug: "alpha-drive-one",
    name: "ALPHA DRIVE ONE",
    genre: "male_idol",
    description: `ALPHA DRIVE ONEの${DESC}`,
    keywords: ["ALPHA DRIVE ONE"],
    initials: "AL",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
  },
  {
    slug: "lilas-ikuta",
    name: "幾田りら",
    genre: "other",
    description: `幾田りらの${DESC}`,
    keywords: ["幾田りら", "Lilas Ikuta"],
    initials: "幾田",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
  },
  {
    slug: "holox",
    name: "秘密結社holoX",
    genre: "female_idol",
    description: `秘密結社holoXの${DESC}`,
    keywords: ["秘密結社holoX"],
    initials: "秘密",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
  },
  {
    slug: "bts",
    name: "BTS",
    genre: "kpop",
    description: `BTSの${DESC}`,
    keywords: ["BTS"],
    initials: "BT",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
  },
  {
    slug: "ini",
    name: "INI",
    genre: "kpop",
    description: `INIの${DESC}`,
    keywords: ["INI"],
    initials: "IN",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
    officialNews: {
      newsUrl: "https://ini-official.com/news/1",
      parserGroup: "lapone",
      enabled: true,
      notes: "LAPONE系(JO1と同一構造)。一覧URL形式は/news/1。",
    },
  },
  {
    slug: "newjeans",
    name: "NewJeans",
    genre: "kpop",
    description: `NewJeansの${DESC}`,
    keywords: ["NewJeans"],
    initials: "Ne",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
  },
  {
    slug: "jo1",
    name: "JO1",
    genre: "male_idol",
    description: `JO1の${DESC}`,
    keywords: ["JO1", "JO1DER"],
    initials: "JO",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
    officialNews: {
      newsUrl: "https://jo1.jp/news/list/1/3/",
      parserGroup: "lapone",
      enabled: true,
      notes: "LAPONE Entertainmentテンプレート。本文は詳細ページのog:descriptionに格納。",
    },
  },
  {
    slug: "2pm",
    name: "2PM",
    genre: "kpop",
    description: `2PMの${DESC}`,
    keywords: ["2PM"],
    initials: "2P",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
  },
  {
    slug: "ive",
    name: "IVE",
    genre: "kpop",
    description: `IVEの${DESC}`,
    keywords: ["IVE"],
    initials: "IV",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
  },
  {
    slug: "bullet-train",
    name: "超特急",
    genre: "male_idol",
    description: `超特急の${DESC}`,
    keywords: ["超特急", "BULLET TRAIN"],
    initials: "超特",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
  },
  {
    slug: "enhypen",
    name: "ENHYPEN",
    genre: "kpop",
    description: `ENHYPENの${DESC}`,
    keywords: ["ENHYPEN"],
    initials: "EN",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
  },
  {
    slug: "be-first",
    name: "BE:FIRST",
    genre: "male_idol",
    description: `BE:FIRSTの${DESC}`,
    keywords: ["BE:FIRST"],
    initials: "BE",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
    officialNews: {
      newsUrl: "https://befirst.tokyo/news/",
      parserGroup: "befirst",
      enabled: false,
      notes: "GitHub hosted runnerからHTTP 403となるため、公式NEWS取得のみ一時停止。アーティストページは継続公開。",
    },
  },
  {
    slug: "da-ice",
    name: "Da-iCE",
    genre: "male_idol",
    description: `Da-iCEの${DESC}`,
    keywords: ["Da-iCE"],
    initials: "Da",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
  },
  {
    slug: "kento-nakajima",
    name: "中島健人",
    genre: "johnnys",
    description: `中島健人の${DESC}`,
    keywords: ["中島健人", "Kento Nakajima"],
    initials: "中島",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
  },
  {
    slug: "m-lk",
    name: "M!LK",
    genre: "male_idol",
    description: `M!LKの${DESC}`,
    keywords: ["M!LK"],
    initials: "M!",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
  },
  {
    slug: "momosuzu-nene",
    name: "桃鈴ねね",
    genre: "female_idol",
    description: `桃鈴ねねの${DESC}`,
    keywords: ["桃鈴ねね", "Momosuzu Nene"],
    initials: "桃鈴",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
  },
  {
    slug: "uratanuki",
    name: "うらたぬき",
    genre: "other",
    description: `うらたぬきの${DESC}`,
    keywords: ["うらたぬき", "Uratanuki"],
    initials: "うら",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
  },
  {
    slug: "doh-kyung-soo-d-o",
    name: "DOH KYUNG SOO",
    genre: "kpop",
    description: `DOH KYUNG SOOの${DESC}`,
    keywords: ["DOH KYUNG SOO", "D.O."],
    initials: "DO",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
  },
  {
    slug: "ano",
    name: "ano",
    genre: "other",
    description: `anoの${DESC}`,
    keywords: ["ano", "あの"],
    initials: "an",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
  },
  {
    slug: "candy-tune",
    name: "CANDY TUNE",
    genre: "female_idol",
    description: `CANDY TUNEの${DESC}`,
    keywords: ["CANDY TUNE"],
    initials: "CA",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
    officialNews: {
      newsUrl: "https://candytune.asobisystem.com/news/1",
      parserGroup: "asobisystem",
      enabled: true,
      notes: "ASOBISYSTEM系(FRUITS ZIPPERと同一構造)。",
    },
  },
  {
    slug: "beyooooonds",
    name: "BEYOOOOONDS",
    genre: "female_idol",
    description: `BEYOOOOONDSの${DESC}`,
    keywords: ["BEYOOOOONDS"],
    initials: "BE",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
  },
  {
    slug: "mazzel",
    name: "MAZZEL",
    genre: "male_idol",
    description: `MAZZELの${DESC}`,
    keywords: ["MAZZEL"],
    initials: "MA",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
  },
  {
    slug: "riize",
    name: "RIIZE",
    genre: "kpop",
    description: `RIIZEの${DESC}`,
    keywords: ["RIIZE"],
    initials: "RI",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
  },
  {
    slug: "kat-tun",
    name: "KAT-TUN",
    genre: "johnnys",
    description: `KAT-TUNの${DESC}`,
    keywords: ["KAT-TUN"],
    initials: "KA",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
  },
  {
    slug: "one-ok-rock",
    name: "ONE OK ROCK",
    genre: "other",
    description: `ONE OK ROCKの${DESC}`,
    keywords: ["ONE OK ROCK"],
    initials: "ON",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
    officialNews: {
      newsUrl: "https://www.oneokrock.com/jp/news/",
      enabled: true,
      notes: "日本語公式NEWSのWordPress RSSを取得。",
      strategy: "rss",
      verificationStatus: "verified",
      rssUrl: "https://www.oneokrock.com/jp/news/feed/",
      urlRules: {
        allow: ["^https://www\\.oneokrock\\.com/jp/news/"],
        normalize: { stripQuery: true, stripTrailingSlash: true, forceHttps: true },
      },
    },
  },
  {
    slug: "back-number",
    name: "back number",
    genre: "other",
    description: `back numberの${DESC}`,
    keywords: ["back number"],
    initials: "ba",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
    officialNews: {
      newsUrl: "https://backnumber.info/news/list/6",
      enabled: true,
      notes: "公開NEWS一覧と詳細本文を静的HTMLから取得。本文中の問い合わせ案内は正規記事内容。",
      strategy: "static_html",
      verificationStatus: "verified",
      listSelectors: {
        item: ".block--list .list--information li",
        link: "a",
        title: ".tit",
        date: ".date",
        dateFormat: "YYYY.MM.DD",
      },
      detailSelectors: {
        title: ".section--detail .tit",
        body: ".section--detail .txt",
        date: ".section--detail .date",
        dateFormat: "YYYY.MM.DD",
        exclude: [".block--share", ".detail__btn"],
      },
      urlRules: {
        allow: ["^https://backnumber\\.info/news/detail/"],
        normalize: { stripQuery: true, forceHttps: true },
      },
    },
  },
  {
    slug: "mrs-green-apple",
    name: "Mrs. GREEN APPLE",
    genre: "other",
    description: `Mrs. GREEN APPLEの${DESC}`,
    keywords: ["Mrs. GREEN APPLE"],
    initials: "Mr",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
    officialNews: {
      newsUrl: "https://mrsgreenapple.com/news/1/",
      enabled: true,
      notes: "公開NEWS一覧と詳細本文を静的HTMLから取得。一覧日付は月日のみのため詳細日付で補完する。",
      strategy: "static_html",
      verificationStatus: "verified",
      listSelectors: {
        item: ".block--list .list--information li",
        link: "a",
        title: ".tit",
      },
      detailSelectors: {
        title: ".section--detail .tit",
        body: ".section--detail .txt",
        date: ".section--detail .date",
        dateFormat: "YYYY.MM.DD",
        exclude: [".block--share", ".detail__btn"],
      },
      urlRules: {
        allow: ["^https://mrsgreenapple\\.com/news/detail/"],
        normalize: { stripQuery: true, forceHttps: true },
      },
    },
  },
  {
    slug: "yuzu",
    name: "ゆず",
    genre: "other",
    description: `ゆずの${DESC}`,
    keywords: ["ゆず", "Yuzu"],
    initials: "ゆず",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
  },
  {
    slug: "officialdism",
    name: "Official髭男dism",
    genre: "other",
    description: `Official髭男dismの${DESC}`,
    keywords: ["Official髭男dism"],
    initials: "Of",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
  },
  {
    slug: "aimyon",
    name: "あいみょん",
    genre: "other",
    description: `あいみょんの${DESC}`,
    keywords: ["あいみょん", "AIMYON"],
    initials: "あい",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
    officialNews: {
      newsUrl: "https://www.aimyong.net/news/1/",
      enabled: true,
      notes: "公開NEWS一覧と詳細本文を静的HTMLから取得。",
      strategy: "static_html",
      verificationStatus: "verified",
      listSelectors: {
        item: ".section--list .list--information li",
        link: "a",
        title: ".tit",
        date: ".date",
        dateFormat: "YYYY.MM.DD",
      },
      detailSelectors: {
        title: ".section--detail .tit",
        body: ".section--detail .txt",
        date: ".section--detail .date",
        dateFormat: "YYYY.MM.DD",
        exclude: [".block--share", ".detail__btn"],
      },
      urlRules: {
        allow: ["^https://www\\.aimyong\\.net/news/detail/"],
        normalize: { stripQuery: true, forceHttps: true },
      },
    },
  },
  {
    slug: "and2ble",
    name: "AND2BLE",
    genre: "other",
    description: `AND2BLEの${DESC}`,
    keywords: ["AND2BLE"],
    initials: "AN",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
  },
  {
    slug: "chanmina",
    name: "CHANMINA",
    genre: "other",
    description: `CHANMINAの${DESC}`,
    keywords: ["CHANMINA", "ちゃんみな"],
    initials: "CH",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
  },
  {
    slug: "fujii-kaze",
    name: "藤井風",
    genre: "other",
    description: `藤井風の${DESC}`,
    keywords: ["藤井風", "Fujii Kaze"],
    initials: "藤井",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
    officialNews: {
      newsUrl: "https://fujiikaze.com/wp-json/wp/v2/posts?per_page=20",
      parserGroup: "fujiikaze",
      enabled: true,
      notes: "藤井風独自WordPress REST API。",
    },
  },
  {
    slug: "ateez",
    name: "ATEEZ",
    genre: "kpop",
    description: `ATEEZの${DESC}`,
    keywords: ["ATEEZ"],
    initials: "AT",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
  },
  {
    slug: "nct-wish",
    name: "NCT WISH",
    genre: "kpop",
    description: `NCT WISHの${DESC}`,
    keywords: ["NCT WISH"],
    initials: "NC",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
  },
  {
    slug: "nmixx",
    name: "NMIXX",
    genre: "kpop",
    description: `NMIXXの${DESC}`,
    keywords: ["NMIXX"],
    initials: "NM",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
  },
  {
    slug: "babymonster",
    name: "BABYMONSTER",
    genre: "kpop",
    description: `BABYMONSTERの${DESC}`,
    keywords: ["BABYMONSTER"],
    initials: "BA",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
  },
  {
    slug: "tws",
    name: "TWS",
    genre: "kpop",
    description: `TWSの${DESC}`,
    keywords: ["TWS"],
    initials: "TW",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
  },
  {
    slug: "illit",
    name: "ILLIT",
    genre: "kpop",
    description: `ILLITの${DESC}`,
    keywords: ["ILLIT"],
    initials: "IL",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
  },
  {
    slug: "zerobaseone",
    name: "ZEROBASEONE",
    genre: "kpop",
    description: `ZEROBASEONEの${DESC}`,
    keywords: ["ZEROBASEONE", "ZB1"],
    initials: "ZE",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
    officialNews: {
      newsUrl: "https://zerobaseone.jp/news/list/1/3/",
      parserGroup: "lapone",
      enabled: true,
      notes: "LAPONE系と同一URL構造。運営はWAKEONE/ソニーミュージック系。",
    },
  },
  {
    slug: "itzy",
    name: "ITZY",
    genre: "kpop",
    description: `ITZYの${DESC}`,
    keywords: ["ITZY"],
    initials: "IT",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
  },
  {
    slug: "tomorrow-x-together",
    name: "TOMORROW X TOGETHER",
    genre: "kpop",
    description: `TOMORROW X TOGETHERの${DESC}`,
    keywords: ["TOMORROW X TOGETHER", "TXT"],
    initials: "TO",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
  },
  {
    slug: "nct-dream",
    name: "NCT DREAM",
    genre: "kpop",
    description: `NCT DREAMの${DESC}`,
    keywords: ["NCT DREAM"],
    initials: "NC",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
  },
  {
    slug: "blackpink",
    name: "BLACKPINK",
    genre: "kpop",
    description: `BLACKPINKの${DESC}`,
    keywords: ["BLACKPINK"],
    initials: "BL",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
  },
  {
    slug: "twice",
    name: "TWICE",
    genre: "kpop",
    description: `TWICEの${DESC}`,
    keywords: ["TWICE"],
    initials: "TW",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
  },
  {
    slug: "boynextdoor",
    name: "BOYNEXTDOOR",
    genre: "kpop",
    description: `BOYNEXTDOORの${DESC}`,
    keywords: ["BOYNEXTDOOR"],
    initials: "BO",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
  },
  {
    slug: "ikon",
    name: "iKON",
    genre: "kpop",
    description: `iKONの${DESC}`,
    keywords: ["iKON"],
    initials: "iK",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
  },
  {
    slug: "travis-japan",
    name: "Travis Japan",
    genre: "johnnys",
    description: `Travis Japanの${DESC}`,
    keywords: ["Travis Japan"],
    initials: "Tr",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
  },
  {
    slug: "imp",
    name: "IMP.",
    genre: "johnnys",
    description: `IMP.の${DESC}`,
    keywords: ["IMP."],
    initials: "IM",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
  },
  {
    slug: "domoto",
    name: "DOMOTO",
    genre: "johnnys",
    description: `DOMOTOの${DESC}`,
    keywords: ["DOMOTO", "堂本"],
    initials: "DO",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
  },
  {
    slug: "roirom",
    name: "ROIROM",
    genre: "other",
    description: `ROIROMの${DESC}`,
    keywords: ["ROIROM"],
    initials: "RO",
    grad: "from-slate-300 to-slate-500",
    accentColor: "#64748b",
    accentDark: "#475569",
  },
  {
    slug: "test",
    name: "\u30c6\u30b9\u30c8\u7528\u30a2\u30fc\u30c6\u30a3\u30b9\u30c8",
    genre: "other",
    description: "\u30c6\u30b9\u30c8\u7528\u30a2\u30fc\u30c6\u30a3\u30b9\u30c8\u306e\u5ea7\u5e2d\u4e88\u60f3\u3001\u5f53\u9078\u7387\u3001\u73fe\u5730\u30ec\u30dd\u3001\u30bb\u30c8\u30ea\u3092\u307e\u3068\u3081\u3066\u3044\u307e\u3059\u3002",
    keywords: ["\u30c6\u30b9\u30c8\u7528\u30a2\u30fc\u30c6\u30a3\u30b9\u30c8", "TestArtist"],
    initials: "TE",
    grad: "from-gray-300 to-gray-500",
    accentColor: "#6b7280",
    accentDark: "#4b5563",
  },
];

/** 個別に手書き済みの設定を優先し、全件監査レジストリを未設定アーティストへ統合する。 */
export const ARTISTS: Artist[] = ARTIST_DEFINITIONS.map((artist) => ({
  ...artist,
  officialNews: artist.officialNews ?? DISCOVERED_OFFICIAL_NEWS_CONFIGS[artist.slug],
}));

export function findArtistBySlug(slug: string): Artist | undefined {
  return ARTISTS.find((a) => a.slug === slug);
}

export type ArtistMatch = {
  artist: Artist;
  matchedTerms: string[];
};

export type ArtistMatchResult =
  | { status: "explicit" | "matched"; artist: Artist; candidateSlugs: string[]; reason: string }
  | { status: "none" | "ambiguous"; artist: null; candidateSlugs: string[]; reason: string };

/** nameとkeywordsを同じ正規化・境界判定で照合し、全候補を返す。 */
export function findArtistMatches(query: string, artists: readonly Artist[] = ARTISTS): ArtistMatch[] {
  if (query.trim().length < 2) return [];
  return artists.flatMap((artist) => {
    const terms = [...new Set([artist.name, ...artist.keywords])];
    const matchedTerms = terms.filter((term) => keywordMatchesTitle(term, query));
    return matchedTerms.length > 0 ? [{ artist, matchedTerms }] : [];
  });
}

/** 1組だけに一致した場合だけ採用し、曖昧一致を先頭候補で決めない。 */
export function resolveUniqueArtistMatch(
  query: string,
  artists: readonly Artist[] = ARTISTS,
): ArtistMatchResult {
  const matches = findArtistMatches(query, artists);
  if (matches.length === 0) {
    return { status: "none", artist: null, candidateSlugs: [], reason: "name/keywords一致なし" };
  }
  if (matches.length > 1) {
    return {
      status: "ambiguous",
      artist: null,
      candidateSlugs: matches.map(({ artist }) => artist.slug),
      reason: `複数候補: ${matches.map(({ artist }) => artist.slug).join(", ")}`,
    };
  }
  const [{ artist, matchedTerms }] = matches;
  return {
    status: "matched",
    artist,
    candidateSlugs: [artist.slug],
    reason: `一致語: ${matchedTerms.join(", ")}`,
  };
}

export function findArtistByKeyword(query: string): Artist | undefined {
  const result = resolveUniqueArtistMatch(query);
  return result.artist ?? undefined;
}

/** 既存の明示slugを保持し、未設定時だけ一意なname/keywords一致を補完する。 */
export function assignArtistSlug<T extends { artist_slug?: string | null; title: string }>(
  event: T,
  artists: readonly Artist[] = ARTISTS,
): { event: T & { artist_slug: string | null }; match: ArtistMatchResult } {
  if (event.artist_slug) {
    const explicit = artists.find((artist) => artist.slug === event.artist_slug);
    return {
      event: { ...event, artist_slug: event.artist_slug },
      match: explicit
        ? { status: "explicit", artist: explicit, candidateSlugs: [explicit.slug], reason: "既存artist_slugを保持" }
        : { status: "none", artist: null, candidateSlugs: [], reason: `未登録の既存artist_slug: ${event.artist_slug}` },
    };
  }
  const match = resolveUniqueArtistMatch(event.title, artists);
  return {
    event: { ...event, artist_slug: match.artist?.slug ?? null },
    match,
  };
}

/** event.artist_slug があれば優先、無ければ従来通りタイトルのkeyword一致にフォールバック */
export function resolveArtist(event: { artist_slug?: string | null; title: string }): Artist | undefined {
  if (event.artist_slug) {
    const bySlug = findArtistBySlug(event.artist_slug);
    if (bySlug) return bySlug;
  }
  return findArtistByKeyword(event.title);
}
