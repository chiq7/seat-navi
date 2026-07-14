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

export type DisabledVenue = {
  id: string;
  name: string;
  type: "disabled";
  reason: string;
};

export type VenueConfig = SingleUrlVenue | MonthlyPatternVenue | DisabledVenue;

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
  // 月リンクが年月ではなく不透明なクエリ値のため、当月一覧を取得する。
  { id: "nissan-stadium", name: "日産スタジアム", type: "single_url", url: "https://www.nissan-stadium.jp/calendar/" },
  { id: "saitama-super-arena", name: "さいたまスーパーアリーナ", type: "single_url", url: "https://www.saitama-arena.co.jp/schedule/" },
  { id: "yokohama-arena", name: "横浜アリーナ", type: "single_url", url: "https://www.yokohama-arena.co.jp/event" },
  { id: "pia-arena-mm", name: "ぴあアリーナMM", type: "single_url", url: "https://pia-arena-mm.jp/" },
  // 月リンクが next/two 等の相対スラッグのため、公式イベント一覧を取得する。
  { id: "ariake-arena", name: "有明アリーナ", type: "single_url", url: "https://ariake-arena.tokyo/event/" },
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

export function generateVenueUrls(venue: Exclude<VenueConfig, DisabledVenue>, now = new Date()): string[] {
  if (venue.type === "single_url") return [venue.url];

  const { year, month } = currentYearMonthInJapan(now);
  return Array.from({ length: 14 }, (_, index) => {
    const target = new Date(Date.UTC(year, month - 1 + index - 1, 1));
    const yyyy = String(target.getUTCFullYear());
    const mm = String(target.getUTCMonth() + 1).padStart(2, "0");
    return venue.urlPattern
      .replaceAll("{YYYYMM}", `${yyyy}${mm}`)
      .replaceAll("{YYYY-MM}", `${yyyy}-${mm}`);
  });
}
