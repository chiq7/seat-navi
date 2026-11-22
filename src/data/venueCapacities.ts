/**
 * 収容人数 for venues whose SEO profile has no capacity fact. Shown right under the venue page title.
 * main: the figure; note: what it counts (shown small). Figures are from the operator's own site unless `source`
 * says otherwise. Checked 2026-11-22.
 */
export type VenueCapacity = { main: string; note?: string; source: string };

export const VENUE_CAPACITIES: Readonly<Record<string, VenueCapacity>> = {
  "pia-arena-mm": { main: "約1万人", source: "https://pia-arena-mm.jp/about/ux/index.html" },
  "tokyo-garden-theater": { main: "約8,000人", note: "最大", source: "https://www.shopping-sumitomo-rd.com/tokyo_garden_theater/org/facilities/events/" },
  // The official site publishes no figure; about 14,000 is the widely quoted seat count.
  budokan: { main: "約14,000人", note: "公式サイトに記載なし・目安", source: "https://www.nipponbudokan.or.jp/" },
  yoyogi: { main: "最大12,934席", source: "https://www.jpnsport.go.jp/yoyogi/facility/1st.html" },
  "gaishi-hall": { main: "最大10,000人", source: "https://www.nespa.or.jp/sports-plaza/hall/organizer/" },
  "marine-messe": { main: "A館 最大15,000人", note: "B館 最大6,000人", source: "https://www.marinemesse.or.jp/messe/organizer" },
  "vantelin-dome": { main: "最大49,185人", note: "アリーナ使用時", source: "https://www.nagoya-dome.co.jp/aboutus/gaiyo.php" },
  "paypay-dome": { main: "40,029人", note: "野球開催時", source: "https://www.softbankhawks.co.jp/stadium/institution.html" },
  "sapporo-dome": { main: "53,796人", note: "札幌市の施設案内", source: "https://www.city.sapporo.jp/sports/sisetsu/institution/stadium/sapporo-dome.html" },
  "belluna-dome": { main: "31,552人", note: "野球開催時", source: "https://bellunadome.seibulions.co.jp/eng.html" },
  "zozo-marine": { main: "29,645人", note: "野球開催時", source: "https://www.marines.co.jp/stadium/ballpark/guide.html" },
  koshien: { main: "47,359人", note: "野球開催時", source: "https://koshien.hanshin.co.jp/stadium_guide/seat.html" },
  "mufg-stadium": { main: "66,727席", source: "https://jns-e.com/facility/" },
  "nissan-stadium": { main: "約72,000席", source: "https://www.nissan-stadium.jp/stadium/gaiyo.php" },
  "makuhari-messe": { main: "最大9,000人", note: "幕張イベントホール", source: "https://www.m-messe.co.jp/organizers/guide/" },
  "edion-arena": { main: "固定席3,131席", note: "移動席は最大3,000席を追加可", source: "https://www.furitutaiikukaikan.ne.jp/facilities.php" },
  "miyagi-arena": { main: "最大約10,000人", note: "イベント時", source: "https://www.mspf.jp/grande21/index.php?action=sisetu_shoukai_arena" },
  "hiroshima-arena": { main: "最大約10,000人", source: "https://h-jigyoudan.or.jp/sports-center/center-facility/" },
  "toki-messe": { main: "10,000人", note: "展示ホール", source: "https://www.tokimesse.com/sponsor/guide" },
};
