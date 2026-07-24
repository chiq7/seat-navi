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
  "ive": "https://ive-official.jp/mob/news/newsShw.php?site=DIVE",
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

export const DISCOVERED_OFFICIAL_NEWS_CONFIGS: Record<string, OfficialNewsConfig> = Object.fromEntries(
  Object.entries(SOURCES).map(([slug, newsUrl]) => {
    const enabled = VERIFIED.has(slug);
    const blocked = ROBOTS_BLOCKED.has(slug);
    return [slug, {
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
    } satisfies OfficialNewsConfig];
  }),
);

export const OFFICIAL_NEWS_AUDIT_COUNTS = {
  total: Object.keys(SOURCES).length,
  verified: VERIFIED.size,
  robotsBlocked: ROBOTS_BLOCKED.size,
  needsDedicatedParser: Object.keys(SOURCES).length - VERIFIED.size - ROBOTS_BLOCKED.size,
} as const;
