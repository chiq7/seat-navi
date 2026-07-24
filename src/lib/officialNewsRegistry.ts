import type { OfficialNewsConfig } from "./artists";

/**
 * 2026-07-24に全未調査アーティストを公式サイトまで確認した結果。
 * enabledはrobots.txt確認と実記事抽出の両方に合格したサイトだけtrueにする。
 * 禁止・記事0件も調査をやり直さないよう設定と理由を残す。
 */
const SOURCES: Record<string, string> = {
  "nogizaka46": "https://www.nogizaka46.com/news/",
  "snow-man": "https://mentrecording.jp/snowman/news/",
  "stray-kids": "https://www.straykidsjapan.com/info/",
  "seventeen": "https://www.seventeen-17.jp/posts/information?page=1",
  "sixtones": "https://www.sixtones.jp/news/",
  "equal-love": "https://equal-love.jp/news/",
  "acees": "https://starto.jp/s/p/artist/105",
  "fantastics": "https://m.tribe-m.jp/news/?group_id=168",
  "roselia": "https://bang-dream.com/news",
  "treasure": "https://ygex.jp/treasure/news/",
  "news": "https://starto.jp/s/p/artist/12",
  "hiromitsu-kitayama": "https://redon-official.jp/artist/kitayama/news/",
  "ballistik-boyz": "https://ballistikboyz.com/",
  "shinee": "https://shinee.jp/news/",
  "team": "https://www.andteam-official.jp/news/",
  "g-i-dle": "https://gidle.cubeent.jp/news",
  "joy": "https://nearly-equal-joy.jp/",
  "le-sserafim": "https://www.le-sserafim.jp/news",
  "king-prince": "https://www.universal-music.co.jp/king-and-prince/news/",
  "arashi": "https://starto.jp/s/p/artist/10",
  "ryosuke-yamada": "https://ryosukeyamada.com/news/",
  "j-soul-brothers": "https://www.jsoulb.jp/news/",
  "buddiis": "https://buddiis.com/contents/news",
  "the-rampage": "https://therampage-ldh.jp/news/",
  "naniwa-danshi": "https://www.storm-labels.co.jp/s/js/artist/J0011",
  "timelesz": "https://ovtp.jp/news/",
  "kis-my-ft2": "https://mentrecording.jp/kismyft2/news/",
  "aespa": "https://aespa-official.jp/news/",
  "nexz": "https://nexz-official.com/news/",
  "strawberry-prince": "https://www.stpr.com/news/1/",
  "number-i": "https://wmg.jp/number-i/news/",
  "yoasobi": "https://www.yoasobi-music.jp/news",
  "bigbang": "https://ygex.jp/bigbang/news/",
  "juice-juice": "https://www.helloproject.com/juicejuice/news/",
  "alpha-drive-one": "https://alphadriveone.com/news/",
  "lilas-ikuta": "https://www.lilasikuta.jp/news",
  "holox": "https://hololive.hololivepro.com/news/",
  "bts": "https://bts-official.jp/news/",
  "newjeans": "https://www.newjeans.jp/news",
  "2pm": "https://www.2pmjapan.com/info/",
  "ive": "https://ive-official.jp/mob/news/newsLis.php?site=DIVE&aff=ROBO004",
  "bullet-train": "https://bullettrain.jp/news/",
  "enhypen": "https://enhypen-jp.weverse.io/news/",
  "da-ice": "https://da-ice.jp/news/",
  "kento-nakajima": "https://www.sonymusic.co.jp/artist/KentoNakajima/info/",
  "m-lk": "https://sd-milk.com/contents/news",
  "momosuzu-nene": "https://hololive.hololivepro.com/news/",
  "uratanuki": "https://wmg.jp/usss/news/",
  "doh-kyung-soo-d-o": "https://dohkyungsoo.jp/",
  "ano": "https://ano-official.com/news/1/",
  "beyooooonds": "https://www.helloproject.com/beyooooonds/news/",
  "mazzel": "https://mazzel.tokyo/news/",
  "riize": "https://riizeofficial.jp/news/",
  "kat-tun": "https://starto.jp/s/p/artist/14",
  "yuzu": "https://yuzu-official.com/contents/information",
  "officialdism": "https://higedan.com/",
  "and2ble": "https://www.and2ble-jp.com/",
  "chanmina": "https://wmg.jp/chanmina/news/",
  "ateez": "https://ateez-official.jp/contents/news",
  "nct-wish": "https://nct-jp.net/news/",
  "nmixx": "https://nmixx.jype.com/Default/NoticeList",
  "babymonster": "https://yg-babymonster-official.jp/news/",
  "tws": "https://tws-official.jp/news",
  "illit": "https://illit-official.jp/news",
  "itzy": "https://www.itzyjapan.com/news/1/?page=1",
  "tomorrow-x-together": "https://txt-official.jp/news/",
  "nct-dream": "https://nct-jp.net/news/",
  "blackpink": "https://ygex.jp/blackpink/news/",
  "twice": "https://www.twicejapan.com/news/",
  "boynextdoor": "https://boynextdoor-official.jp/News",
  "ikon": "https://ygex.jp/ikon/news/",
  "travis-japan": "https://www.universal-music.co.jp/travisjapan/news/",
  "imp": "https://tobe-official.jp/artists/imp",
  "domoto": "https://domotofc.jp/news",
  "roirom": "https://roirom.com/news/",
};

const VERIFIED = new Set([
  "seventeen", "doh-kyung-soo-d-o", "ive",
  "sixtones", "equal-love", "fantastics", "treasure", "hiromitsu-kitayama", "ballistik-boyz", "shinee", "team",
  "g-i-dle", "joy", "le-sserafim", "king-prince", "j-soul-brothers", "buddiis", "timelesz", "aespa",
  "strawberry-prince", "number-i", "bigbang", "bts", "newjeans", "bullet-train", "enhypen", "da-ice", "m-lk",
  "ano", "mazzel", "riize", "yuzu", "officialdism", "and2ble", "chanmina", "ateez", "nct-wish", "nmixx",
  "babymonster", "tws", "illit", "itzy", "tomorrow-x-together", "nct-dream", "blackpink", "twice",
  "boynextdoor", "ikon", "travis-japan", "domoto",
]);

const ROBOTS_BLOCKED = new Set([
  "nogizaka46", "snow-man", "acees", "news", "arashi", "the-rampage", "naniwa-danshi", "kis-my-ft2", "nexz",
  "alpha-drive-one", "kento-nakajima", "kat-tun",
]);

const ARTICLE_FILTERS: Record<string, string[]> = {
  "strawberry-prince": ["すとぷり"],
  "nct-wish": ["NCT WISH"],
  "nct-dream": ["NCT DREAM"],
  "roselia": ["Roselia", "ロゼリア"],
  "holox": ["holoX", "秘密結社holoX"],
  "momosuzu-nene": ["桃鈴ねね", "Momosuzu Nene"],
  "uratanuki": ["うらたぬき", "浦田わたる"],
};

type GenericOfficialNewsConfig = Extract<OfficialNewsConfig, { strategy: string }>;

/** Discovery後に共通strategyで実URL・構造まで確認できたサイトの上書き設定。 */
const DEDICATED_CONFIGS: Record<string, Partial<GenericOfficialNewsConfig>> = {
  "equal-love": {
    urlRules: { allow: ["^https://equal-love\\.jp/news/detail/\\d+(?:[/?#]|$)"] },
    notes: "2026-07-24 公開NEWSから記事詳細URLのみを取得するよう安全フィルターを確認済み。",
  },
  "timelesz": {
    strategy: "wordpress",
    verificationStatus: "verified",
    wordpressApiUrl: "https://ovtp.jp/wp-json/wp/v2/posts?per_page=10&_fields=id,date,link,title,content,featured_media",
    notes: "2026-07-24 公式WordPress APIを10件検証。タイトル・日付・記事URLを安定取得し、アプリ運用情報ページは除外。",
    urlRules: { allow: ["^https://ovtp\\.jp/\\d+(?:[/?#]|$)"] },
  },
  "mazzel": {
    strategy: "rss",
    verificationStatus: "verified",
    rssUrl: "https://mazzel.tokyo/news/feed/",
    notes: "2026-07-24 公式NEWS RSSを10件検証し、安全ゲート全項目合格。",
    urlRules: { allow: ["^https://mazzel\\.tokyo/news/\\d+(?:[/?#]|$)"] },
  },
  "domoto": {
    strategy: "json_api",
    verificationStatus: "verified",
    notes: "2026-07-24 公式公開APIの一覧12件と詳細本文を検証。会員限定記事は含めない。",
    jsonApi: {
      url: "https://domotofc.jp/api/content/news?limit=12",
      itemsPath: "data",
      titleField: "attributes.title",
      urlField: "attributes.slug",
      dateField: "attributes.releasedAt",
      articleUrlBase: "https://domotofc.jp/news/detail/",
    },
    jsonDetailApi: {
      urlTemplate: "https://domotofc.jp/api/content/news/{slug}",
      rootPath: "data.attributes",
      titleField: "title",
      bodyField: "bodyText",
      dateField: "releasedAt",
    },
    urlRules: { allow: ["^https://domotofc\\.jp/news/detail/[A-Za-z0-9]+(?:[/?#]|$)"] },
  },
  "stray-kids": {
    notes: "2026-07-24 一覧HTMLは空で、Sony Music共通JSによる描画を確認。公式側の安定した記事URL/APIを確定できるまで無効。",
  },
  "ryosuke-yamada": {
    notes: "2026-07-24 公式JSON assets/data/news.jsonを発見し48件・date/title/categoryを確認。ただし記事ごとの安定URLが存在しないため無効。",
  },
  "juice-juice": {
    notes: "2026-07-24 静的HTML・公式JS・公開GET候補を再調査したが、サーバー取得できる実記事一覧を確定できず無効。",
  },
  "lilas-ikuta": {
    notes: "2026-07-24 公式JSがSony Music JSONを参照する構成を確認。外部API側robots.txt禁止と安定URL未確定のため無効。",
  },
  "2pm": {
    notes: "2026-07-24 一覧HTMLは空で、Sony Music共通JSによる描画を確認。公式側の安定した記事URL/APIを確定できるまで無効。",
  },
  "ive": {
    strategy: "static_html",
    verificationStatus: "verified",
    notes: "2026-07-24 公開NEWS一覧と個別記事をログインなしで再確認。10件を検証し、安全ゲート全項目合格。",
    listSelectors: {
      item: ".entry_panel",
      link: "a",
      title: "p",
      titleIndex: 1,
      date: ".date",
      dateFormat: "YYYY.MM.DD",
    },
    detailSelectors: {
      title: ".entry_detail h3",
      body: ".entry_detail",
      date: ".entry_detail .date",
      dateFormat: "YYYY.MM.DD",
      thumbnail: ".entry_detail img",
      exclude: [".category_label", ".date", "h3"],
    },
    urlRules: {
      allow: ["^https://ive-official\\.jp/mob/news/newsShw\\.php\\?(?=[^#]*\\bsite=DIVE\\b)(?=[^#]*\\bcd=OF[0-9]+\\b)[^#]+$"],
      normalize: { dropQueryParams: ["ima", "aff"], forceHttps: true },
    },
  },
  "uratanuki": {
    strategy: "static_html",
    verificationStatus: "candidate",
    notes: "2026-07-24 公式共有NEWSのHTML構造を確認。直近11件にうらたぬき該当記事がないため、名前フィルター付き・無効のまま待機。",
    listSelectors: {
      item: ".news__item",
      link: "a",
      title: ".news__title",
      date: ".news__date",
      dateFormat: "YYYY.MM.DD",
    },
    urlRules: { allow: ["^https://wmg\\.jp/usss/news/\\d+(?:[/?#]|$)"] },
  },
  "beyooooonds": {
    notes: "2026-07-24 静的HTML・公式JS・公開GET候補を再調査したが、サーバー取得できる実記事一覧を確定できず無効。",
  },
  "imp": {
    notes: "2026-07-24 __NEXT_DATA__と公式API基点 https://api.tobe-official.jp/api/v1 を確認。NEWSの公開GETパスを確定できるまで無効。",
  },
  "seventeen": {
    strategy: "static_html",
    verificationStatus: "verified",
    notes: "2026-07-24 onclick型の公式NEWS一覧を個別HTML設定で20件検証し、安全ゲート全項目合格。",
    listSelectors: {
      item: ".news_list dl",
      link: "dl",
      linkAttribute: "onclick",
      linkValuePattern: "location\\.href=['\"]([^'\"]+)",
      title: "dd",
      date: "dt",
      dateFormat: "YYYY.M.D",
    },
    urlRules: {
      allow: ["^https://www\\.seventeen-17\\.jp/posts/information/[a-z0-9]+(?:[/?#]|$)"],
      normalize: { forceHttps: true },
    },
  },
  "doh-kyung-soo-d-o": {
    strategy: "rss",
    verificationStatus: "verified",
    rssUrl: "https://dohkyungsoo.jp/feed",
    notes: "2026-07-24 公式RSSを10件検証し、安全ゲート全項目合格。コメントフィードは使用しない。",
    urlRules: {
      allow: ["^https://dohkyungsoo\\.jp/archives/\\d+(?:[/?#]|$)"],
      deny: ["/comments?/"],
    },
  },
  "roselia": {
    strategy: "rss",
    verificationStatus: "candidate",
    rssUrl: "https://bang-dream.com/news/feed/",
    notes: "2026-07-24 公式共有NEWSのRSSを確認済み。直近フィードにRoselia該当記事がないため、名前フィルター付き・無効のまま待機。",
  },
  "holox": {
    strategy: "rss",
    verificationStatus: "candidate",
    rssUrl: "https://hololive.hololivepro.com/news/feed/",
    notes: "2026-07-24 公式共有NEWSのRSSを確認済み。直近フィードにholoX該当記事がないため、名前フィルター付き・無効のまま待機。",
  },
  "momosuzu-nene": {
    strategy: "rss",
    verificationStatus: "candidate",
    rssUrl: "https://hololive.hololivepro.com/news/feed/",
    notes: "2026-07-24 公式共有NEWSのRSSを確認済み。直近フィードに桃鈴ねね該当記事がないため、名前フィルター付き・無効のまま待機。",
  },
  "yoasobi": {
    strategy: "json_api",
    verificationStatus: "rejected",
    notes: "2026-07-24 公式サイトが使うSony Music公開APIを特定したが、API側robots.txtが主要AI crawlerを全域禁止しているため無効。回避しない。",
    jsonApi: {
      url: "https://www.sonymusic.co.jp/json/v2/artist/YOASOBI/information/start/0/count/100/callback/InfoCallcack",
      responseFormat: "jsonp",
      itemsPath: "items",
      titleField: "title",
      urlField: "link",
      dateField: "date",
      bodyField: "article",
      thumbnailField: "images.image",
      articleUrlBase: "https://www.sonymusic.co.jp",
    },
    urlRules: { allow: ["^https://www\\.sonymusic\\.co\\.jp/artist/YOASOBI/info/"] },
  },
  "roirom": {
    strategy: "auto_html",
    verificationStatus: "candidate",
    notes: "2026-07-24 公式NEWSページの『お知らせがありません』を自動検出。記事公開まで無効のまま再調査待ち。",
  },
};

export const DISCOVERED_OFFICIAL_NEWS_CONFIGS: Record<string, OfficialNewsConfig> = Object.fromEntries(
  Object.entries(SOURCES).map(([slug, newsUrl]) => {
    const enabled = VERIFIED.has(slug);
    const blocked = ROBOTS_BLOCKED.has(slug);
    const base = {
      newsUrl,
      enabled,
      notes: enabled
        ? "2026-07-24 公式サイトのrobots.txt・一覧到達・実記事抽出をローカル検証済み。"
        : blocked
          ? "2026-07-24 公式サイトを確認済み。主要AI crawlerをrobots.txtで禁止しているため無効。禁止サイトの扱いは後で一括検討する。"
          : "2026-07-24 公式サイトとrobots.txtを確認済み。現行の安全な汎用抽出では実記事0件のため無効。専用API/RSS対応候補。",
      strategy: "auto_html" as const,
      verificationStatus: enabled ? "verified" as const : blocked ? "rejected" as const : "candidate" as const,
      articleRules: ARTICLE_FILTERS[slug] ? { includeAny: ARTICLE_FILTERS[slug] } : undefined,
    } satisfies OfficialNewsConfig;
    return [slug, { ...base, ...DEDICATED_CONFIGS[slug] } as OfficialNewsConfig];
  }),
);

export const OFFICIAL_NEWS_AUDIT_COUNTS = {
  total: Object.keys(SOURCES).length,
  verified: VERIFIED.size,
  robotsBlocked: ROBOTS_BLOCKED.size,
  externalSourceBlocked: 1,
  needsDedicatedParser: Object.keys(SOURCES).length - VERIFIED.size - ROBOTS_BLOCKED.size - 1,
} as const;
