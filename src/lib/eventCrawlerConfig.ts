export type SingleUrlVenue = {
  id: string;
  name: string;
  type: "single_url";
  url: string;
};

export type MonthlyPatternVenue = {
  id: string;
  name: string;
  type: "monthly_pattern";
  urlPattern: string;
};

export type FollowMonthLinksVenue = {
  id: string;
  name: string;
  type: "follow_month_links";
  startUrl: string;
};

export type DisabledVenue = {
  id: string;
  name: string;
  type: "disabled";
  reason: string;
};

export type VenueConfig = SingleUrlVenue | MonthlyPatternVenue | FollowMonthLinksVenue | DisabledVenue;

const PAYPAY_DOME_YEAR = Number(new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
}).format(new Date()));

export const VENUES: readonly VenueConfig[] = [
  { id: "tokyo-dome", name: "東京ドーム", type: "single_url", url: "https://www.tokyo-dome.co.jp/en/dome/event/schedule.html" },
  { id: "kyocera-dome", name: "京セラドーム大阪", type: "single_url", url: "https://www.kyoceradome-osaka.jp/schedule/" },
  { id: "vantelin-dome", name: "バンテリンドームナゴヤ", type: "single_url", url: "https://www.nagoya-dome.co.jp/sp/eventcalen.php" },
  { id: "paypay-dome", name: "福岡PayPayドーム", type: "single_url", url: `https://www.softbankhawks.co.jp/stadium/event_schedule/${PAYPAY_DOME_YEAR}/` },
  { id: "sapporo-dome", name: "札幌ドーム", type: "single_url", url: "https://www.sapporo-dome.co.jp/schedule/" },
  { id: "belluna-dome", name: "ベルーナドーム", type: "single_url", url: "https://bellunadome.seibulions.co.jp/schedule/" },
  { id: "zozo-marine", name: "ZOZOマリンスタジアム", type: "single_url", url: "https://www.marines.co.jp/stadium/schedule/" },
  { id: "koshien", name: "阪神甲子園球場", type: "monthly_pattern", urlPattern: "https://koshien.hanshin.co.jp/event/{YYYYMM}.html" },
  { id: "mufg-stadium", name: "MUFGスタジアム", type: "monthly_pattern", urlPattern: "https://jns-e.com/event/page/{YYYYMM}/" },
  // 月切替リンクが ?m=x(次月) / ?m=a(翌々月) という不透明な値のため、リンクを辿って年月を判定する。
  { id: "nissan-stadium", name: "日産スタジアム", type: "follow_month_links", startUrl: "https://www.nissan-stadium.jp/calendar/" },
  { id: "saitama-super-arena", name: "さいたまスーパーアリーナ", type: "single_url", url: "https://www.saitama-arena.co.jp/schedule/" },
  { id: "yokohama-arena", name: "横浜アリーナ", type: "single_url", url: "https://www.yokohama-arena.co.jp/event" },
  { id: "pia-arena-mm", name: "ぴあアリーナMM", type: "single_url", url: "https://pia-arena-mm.jp/" },
  // 月切替リンクが next/two/three/last という相対スラッグのため、リンクを辿って年月を判定する。
  { id: "ariake-arena", name: "有明アリーナ", type: "follow_month_links", startUrl: "https://ariake-arena.tokyo/event/" },
  { id: "budokan", name: "日本武道館", type: "disabled", reason: "公式に一般公演の統一一覧が存在しない" },
  { id: "yoyogi", name: "代々木第一体育館", type: "single_url", url: "https://www.jpnsport.go.jp/yoyogi/event/tabid/59/default.aspx" },
  { id: "makuhari-messe", name: "幕張メッセ", type: "single_url", url: "https://www.m-messe.co.jp/event/" },
  { id: "k-arena", name: "Kアリーナ横浜", type: "single_url", url: "https://k-arena.com/en/schedule/" },
  { id: "tokyo-garden-theater", name: "東京ガーデンシアター", type: "monthly_pattern", urlPattern: "https://www.shopping-sumitomo-rd.com/tokyo_garden_theater/schedule/?date={YYYY-MM}" },
  { id: "osaka-jo-hall", name: "大阪城ホール", type: "single_url", url: "https://www.osaka-johall.com/event/" },
  { id: "edion-arena", name: "大阪エディオンアリーナ", type: "disabled", reason: "2027年1月末まで休館" },
  { id: "marine-messe", name: "マリンメッセ福岡", type: "single_url", url: "https://www.marinemesse.or.jp/messe/event" },
  { id: "miyagi-arena", name: "セキスイハイムスーパーアリーナ", type: "single_url", url: "https://www.mspf.jp/grande21/" },
  { id: "hiroshima-arena", name: "広島グリーンアリーナ", type: "single_url", url: "https://h-jigyoudan.or.jp/sports-center/center-events/" },
  { id: "gaishi-hall", name: "名古屋ガイシホール", type: "single_url", url: "https://www.nespa.or.jp/hall/" },
  { id: "toki-messe", name: "朱鷺メッセ", type: "single_url", url: "https://www.tokimesse.com/sp/visitor/event/index" },
];

function currentYearMonthInJapan(now: Date): { year: number; month: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "numeric",
  }).formatToParts(now);
  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
  };
}

/** 前月〜12ヶ月先の {year, month} リスト（monthly_pattern / follow_month_links 共通） */
export function targetMonths(now = new Date()): { year: number; month: number }[] {
  const { year, month } = currentYearMonthInJapan(now);
  return Array.from({ length: 14 }, (_, index) => {
    const target = new Date(Date.UTC(year, month - 1 + index - 1, 1));
    return { year: target.getUTCFullYear(), month: target.getUTCMonth() + 1 };
  });
}

export function generateVenueUrls(venue: SingleUrlVenue): string[] {
  return [venue.url];
}

/**
 * 本番DBに残る旧venue_idのエイリアス。
 * 重複判定（dry-run / upsert前の既存確認）にのみ使用する。
 * 新規保存は常に正式ID（キーの側）で行い、旧IDでは保存しない。
 * 座席マップ等のvenue_idグルーピングには適用しない。
 */
export const VENUE_ID_ALIASES: Readonly<Record<string, readonly string[]>> = {
  "paypay-dome": ["paypay-dome", "fukuoka-paypay-dome"],
  "vantelin-dome": ["vantelin-dome", "nagoya-dome"],
  "saitama-super-arena": ["saitama-super-arena", "saitama-arena"],
  "mufg-stadium": ["mufg-stadium"],
};

/** 正式IDに対応する重複判定用のvenue_id一覧（エイリアス未定義なら自分自身のみ）を返す */
export function getVenueIdAliases(venueId: string): readonly string[] {
  return VENUE_ID_ALIASES[venueId] ?? [venueId];
}

/** monthly_pattern 会場の {year, month, url} リスト（URL重複は除去） */
export function generateMonthlyPages(
  venue: MonthlyPatternVenue,
  now = new Date()
): { year: number; month: number; url: string }[] {
  const seen = new Set<string>();
  const result: { year: number; month: number; url: string }[] = [];
  for (const { year, month } of targetMonths(now)) {
    const yyyy = String(year);
    const mm = String(month).padStart(2, "0");
    const url = venue.urlPattern.replaceAll("{YYYYMM}", `${yyyy}${mm}`).replaceAll("{YYYY-MM}", `${yyyy}-${mm}`);
    if (seen.has(url)) continue;
    seen.add(url);
    result.push({ year, month, url });
  }
  return result;
}
