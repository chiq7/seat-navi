/** Base venue-guide sources checked 2026-09-24; shop rows carry their own latest source-check date. */
import { ADDITIONAL_FACILITY_SPOTS, getFacilityAnchor, matchesFacilityPassage, type FacilityAnchor } from "./tokyoDomeFacilityMap";
import { matchesDomeGuideWord, normalizeDomeGuideQuery } from "../lib/domeGuideSearch";
export const DOME_GUIDE_CHECKED_AT = "2026-09-24";
export const DOME_GUIDE_SOURCES = {
  access: { label: "アクセス・バリアフリールート", url: "https://www.tokyo-dome.co.jp/dome/access/" },
  seats: { label: "座席・360°ビュー", url: "https://www.tokyo-dome.co.jp/dome/seat/" },
  gates: { label: "ゲート案内（PDF）", url: "https://www.tokyo-dome.co.jp/dome/seat/pdf/gate_guide.pdf" },
  floors: { label: "場内フロアマップ（PDF）", url: "https://www.tokyo-dome.co.jp/dome/seat/pdf/dome_floor.pdf" },
  cityMap: { label: "東京ドームシティマップ", url: "https://www.tokyo-dome.co.jp/guest/pdf/citymap.pdf" },
  services: { label: "サービス施設ガイド", url: "https://www.tokyo-dome.co.jp/guide/" },
  laquaServices: { label: "ラクーア館内サービス", url: "https://www.laqua.jp/shops-restaurants/service/" },
  payment: { label: "支払い・各種サービス", url: "https://www.tokyo-dome.co.jp/faq/guide/service/" },
  faq: { label: "東京ドームのよくある質問", url: "https://www.tokyo-dome.co.jp/faq/facility/dome/" },
  food: { label: "場内の店舗一覧", url: "https://www.tokyo-dome.co.jp/dome/baseball/gourmet/pickup/" },
  foodMap: { label: "売店のフロア案内", url: "https://www.tokyo-dome.co.jp/dome/floor/" },
  child: { label: "授乳・おむつ替えの案内", url: "https://www.tokyo-dome.co.jp/guide/child.html" },
  barrierfree: { label: "バリアフリー施設案内", url: "https://www.tokyo-dome.co.jp/guide/barrierfree.html" },
  lockerMap: { label: "東京ドームシティのロッカー", url: "https://www.akilocker.biz/mobile/map.html?locationId=TOKYO_DOME&mapId=M70003&lang=1" },
  lockerLowerFloors: { label: "東京ドーム内1・2Fのロッカー", url: "https://www.akilocker.biz/mobile/map.html?locationId=TOKYO_DOME&mapId=M70001&lang=1" },
  lockerUpperFloors: { label: "東京ドーム内3・4Fのロッカー", url: "https://www.akilocker.biz/mobile/map.html?locationId=TOKYO_DOME&mapId=M70002&lang=1" },
  baggageBooking: { label: "周辺の荷物預かり", url: "https://ja.bounce.com/luggage-storage/tokyo/tokyo-dome" },
  baggageJoysound: { label: "JOYSOUND水道橋店の荷物預かり", url: "https://ja.bounce.com/stores/tokyo/jh7fw7" },
  baggageYamatoIidabashi: { label: "ヤマト運輸 飯田橋駅前営業所の荷物預かり", url: "https://ja.bounce.com/s/location/a09e768e-b913-4946-b21a-2633c795d6b7" },
  baggageBigEcho: { label: "ビッグエコー飯田橋東口駅前店の荷物預かり", url: "https://ja.bounce.com/stores/tokyo/qb1l7c" },
  baggageYamatoKoraku: { label: "ヤマト運輸 文京後楽営業所の荷物預かり", url: "https://ja.bounce.com/s/location/fddeb6dd-aa62-4c42-8059-cc5c45038147" },
  baggageShinsanyo: { label: "新三陽コラくえんの荷物預かり", url: "https://ja.bounce.com/s/location/57fab627-fe7a-47b0-812d-3d6344766044" },
  baggageNamaste: { label: "ナマステ 本郷三丁目店の荷物預かり", url: "https://ja.bounce.com/s/location/305a5ebb-8039-426a-896b-93999f7f552f" },
  baggageChiro: { label: "ちろクレープの荷物預かり", url: "https://ja.bounce.com/s/location/12ec8061-da40-4fc8-ae4c-3dedac36754e" },
  baggageNewberry: { label: "ニューベリーの荷物預かり", url: "https://ja.bounce.com/s/location/9de98621-bf5e-4172-9c66-5078eb09757f" },
  baggageAmmonite: { label: "アンモナイト本郷店の荷物預かり", url: "https://ja.bounce.com/s/location/3e86030b-927b-42f5-ae37-0e26ea5ce560" },
  suidobashiLockers: { label: "都営水道橋駅のロッカー", url: "https://www.kotsu.metro.tokyo.jp/other/kanren/stores/suidobashi.html" },
  kasugaLockers: { label: "都営春日駅のロッカー", url: "https://www.kotsu.metro.tokyo.jp/other/kanren/stores/kasuga.html" },
  korakuenLockers: { label: "後楽園駅のロッカー", url: "https://www.tokyometro.jp/station/korakuen/shop/metlocker.html" },
  korakuenLockerOperator: { label: "後楽園駅ロッカーの料金・予約", url: "https://spacer.co.jp/base/op-284/" },
  jrLockers: { label: "JR中央・総武線の駅設備", url: "https://www.jreast.co.jp/estation/facility_result.aspx?SearchCategoryCd=7&mode=2&rosen=81%3D1%3D%E4%B8%AD%E5%A4%AE%E7%B7%9A%E7%B7%8F%E6%AD%A6%E7%B7%9A%E5%90%84%E9%A7%85%E5%81%9C%E8%BB%8A" },
  jrSuidobashiMap: { label: "JR水道橋駅の構内図", url: "https://www.jreast.co.jp/estation/stations/891.html" },
} as const;
export const DOME_LOCKER_URL = "https://www.akilocker.biz/mobile/area.html?locationId=TOKYO_DOME";
export type GuideSource = keyof typeof DOME_GUIDE_SOURCES;
export type GuideCategory = "locker" | "facility" | "food";
export type GuideArea = "inside" | "outside";
export type GuideFloor = "1F" | "2F" | "3F" | "4F" | "外野" | "場外" | "各階";
/** Coarse zones shown on our independently drawn visitor map; not seat-level coordinates. */
export type DomeGuideMapZone = "first-base" | "third-base" | "center" | "left-field" | "right-field" | "gate-21" | "gate-22" | "gate-25" | "korakuen-hall" | "laqua" | "attractions" | "yellow-building" | "dome-hotel" | "meets-port" | "everyvalley" | "gallery-aamo";
export type DomeGuideSpot = {
  id: string;
  name: string;
  category: GuideCategory;
  area: GuideArea;
  floor: GuideFloor;
  location: string;
  description: string;
  sources: readonly GuideSource[];
  checkedAt: string;
  status: "official-listed" | "service-listed";
  eventAvailability: "unconfirmed" | "not-applicable";
  mapZone?: DomeGuideMapZone;
  mapAccuracy: "area" | "named-point" | "unplaced";
  facilityAnchor?: FacilityAnchor;
  /** Explicitly documented types; not inferred from a building's generic icon. */
  toiletTypes?: readonly ("women" | "men" | "accessible")[];
  storageKind?: "coin" | "staffed";
  bookingUrl?: string;
  priceFrom?: number;
  /** Direct station/operator conditions, rather than the Dome City's locker link. */
  guideUrl?: string;
  reservation?: "available";
  outsideAreaName?: string;
  accessCondition?: string;
};

const spot = (entry: Omit<DomeGuideSpot, "checkedAt" | "status" | "eventAvailability" | "mapAccuracy"> & { checkedAt?: string; status?: DomeGuideSpot["status"]; mapAccuracy?: DomeGuideSpot["mapAccuracy"] }): DomeGuideSpot => ({
  ...entry,
  checkedAt: entry.checkedAt ?? DOME_GUIDE_CHECKED_AT,
  status: entry.status ?? "official-listed",
  eventAvailability: entry.area === "inside" || entry.category === "food" ? "unconfirmed" : "not-applicable",
  mapAccuracy: entry.mapAccuracy ?? (entry.mapZone ? "area" : "unplaced"),
  facilityAnchor: getFacilityAnchor(entry.id),
  description: entry.description.replace("図では側・エリアを表示します。", "施設アイコンを押すと図上の場所を確認できます。"),
});

export const DOME_GUIDE_SPOTS: readonly DomeGuideSpot[] = [
  ...ADDITIONAL_FACILITY_SPOTS.map(spot),
  ...([
    ["1f-14-16", "1F", "first-base", "14〜16通路側"],
    ["1f-17-19", "1F", "first-base", "17〜19通路側"],
    ["1f-23-24", "1F", "center", "23〜24通路側"],
    ["2f-13", "2F", "first-base", "13通路側"],
    ["2f-31", "2F", "third-base", "31通路側"],
    ["2f-24-25", "2F", "center", "24〜25通路側・22ゲート側"],
  ] as const).map(([id, floor, mapZone, location]) => spot({
    id: `stairs-floor-${id}`, name: "階段", category: "facility", area: "inside", floor, mapZone,
    location: `${floor}・${location}`, description: "公式フロア図の階段表示。接続先や公演時の通行可否は場内案内で確認してください。",
    sources: ["floors"], checkedAt: "2026-09-26",
  })),
  // Individual symbols read from dome_floor.pdf on 2026-09-26.
  // Passage ranges describe the printed landmark, not a surveyed entrance.
  ...([
    ["1f-36-48", "1F", "third-base", "36〜48通路側", "女性トイレ"],
    ["1f-33-35", "1F", "third-base", "33〜35通路付近", "女性トイレ"],
    ["1f-30-32", "1F", "third-base", "30〜32通路付近", "男女共用トイレ"],
    ["1f-27-28", "1F", "third-base", "27〜28通路側", "男女トイレ"],
    ["1f-20-22-w", "1F", "first-base", "20〜22通路側", "女性トイレ"],
    ["1f-20-22-m", "1F", "first-base", "20〜22通路側", "男性トイレ"],
    ["1f-1-13", "1F", "first-base", "1〜13通路側", "男女トイレ"],
    ["1f-1-13-w", "1F", "first-base", "1〜13通路側・外周", "女性トイレ"],
    ["2f-34", "2F", "third-base", "34通路付近・23ゲート側", "男性トイレ"],
    ["2f-27", "2F", "third-base", "27通路付近", "女性トイレ"],
    ["2f-23", "2F", "center", "23通路付近", "男女トイレ"],
    ["2f-15", "2F", "first-base", "15通路付近・21ゲート側", "女性トイレ"],
    ["3f-33-near", "3F", "third-base", "33ゲート側", "男女トイレ"],
    ["3f-33-outer", "3F", "third-base", "33ゲート側・外周奥", "男女トイレ"],
    ["3f-30-near", "3F", "first-base", "30ゲート側", "男女トイレ"],
    ["3f-30-outer", "3F", "first-base", "30ゲート側・外周奥", "男女トイレ"],
    ["4f-14-w", "4F", "third-base", "14通路付近", "女性トイレ"],
    ["4f-14-outer", "4F", "third-base", "14通路側・外周", "女性トイレ"],
    ["4f-13", "4F", "third-base", "13通路付近", "女性トイレ"],
    ["4f-11", "4F", "third-base", "11通路側", "男性トイレ"],
    ["4f-9", "4F", "center", "9通路付近・41ゲート側", "女性トイレ"],
    ["4f-6", "4F", "center", "6通路付近・40ゲート側", "男性トイレ"],
    ["4f-4", "4F", "first-base", "4通路側", "女性トイレ"],
    ["4f-2", "4F", "first-base", "2通路付近", "女性トイレ"],
    ["4f-1", "4F", "first-base", "1通路付近", "女性トイレ"],
    ["4f-1-outer", "4F", "first-base", "1通路側・外周", "男性トイレ"],
    ["outfield-49", "外野", "left-field", "1F外野・49通路側", "女性トイレ"],
    ["outfield-50-w", "外野", "left-field", "1F外野・50通路側", "女性トイレ"],
    ["outfield-50-m", "外野", "left-field", "1F外野・50〜51通路側", "男性トイレ"],
    ["outfield-55", "外野", "right-field", "1F外野・55通路側", "女性トイレ"],
    ["outfield-57", "外野", "right-field", "1F外野・57通路側", "男性トイレ"],
  ] as const).map(([id, floor, mapZone, location, name]) => spot({
    id: `toilet-floor-${id}`, name, category: "facility", area: "inside", floor, mapZone,
    location: `${floor}・${location}`, description: "公式フロア図に掲載されたトイレ。図では側・エリアを表示します。",
    sources: ["floors"], checkedAt: "2026-09-26",
  })),
  ...([
    ["1f-left", "1F", "third-base", "36〜48通路側"],
    ["2f-left", "2F", "third-base", "42通路付近・24ゲート側"],
    ["2f-right", "2F", "first-base", "7通路付近・20ゲート側"],
    ["4f-left", "4F", "center", "9通路付近・41ゲート側"],
    ["4f-right", "4F", "center", "6通路付近・40ゲート側"],
    ["outfield-left", "外野", "left-field", "1F外野・53通路側"],
    ["outfield-right", "外野", "right-field", "1F外野・57通路側"],
  ] as const).map(([id, floor, mapZone, location]) => spot({
    id: `locker-floor-${id}`, name: `ロッカー（${location}）`, category: "locker", area: "inside", floor, mapZone,
    location: `${floor}・${location}`, description: "イベント開催時に入場後に利用するロッカー。料金・サイズ・利用時間はロッカーの案内で確認してください。",
    sources: ["floors", floor === "4F" ? "lockerUpperFloors" : "lockerLowerFloors"],
    guideUrl: DOME_GUIDE_SOURCES[floor === "4F" ? "lockerUpperFloors" : "lockerLowerFloors"].url, checkedAt: "2026-10-08",
  })),
  ...([
    ["1f", "1F", "first-base", "17〜19通路側"],
    ["4f", "4F", "center", "8通路付近"],
    ["outfield", "外野", "right-field", "1F外野・55通路側"],
  ] as const).map(([id, floor, mapZone, location]) => spot({
    id: `baby-floor-${id}`, name: "ベビールーム", category: "facility", area: "inside", floor, mapZone,
    location: `${floor}・${location}`, description: "公式フロア図に掲載。公演時の利用は場内スタッフへ確認してください。",
    sources: ["floors"], checkedAt: "2026-09-26",
  })),
  spot({ id: "locker-inside", name: "場内のコインロッカー", category: "locker", area: "inside", floor: "各階", location: "東京ドーム内各所", description: "イベント開催時に入場後に使うロッカー。支払いは交通系ICカード。場所・サイズ・利用条件はロッカー案内へ。", sources: ["faq", "services", "payment"], guideUrl: DOME_LOCKER_URL, checkedAt: "2026-10-08" }),
  spot({ id: "locker-hall", name: "後楽園ホールビルのロッカー", category: "locker", area: "outside", floor: "場外", location: "後楽園ホールビル 1F", description: "ドーム入場前の荷物預け候補。空きや利用条件は公式案内で確認できます。", sources: ["services"], mapZone: "korakuen-hall", mapAccuracy: "area" }),
  spot({ id: "locker-laqua", name: "ラクーアのロッカー", category: "locker", area: "outside", floor: "場外", location: "ラクーア1F・ワンダードロップ横", description: "当日利用・7:00〜23:30。空き状況とサイズは利用案内で確認できます。", sources: ["services", "laquaServices"], mapZone: "laqua", mapAccuracy: "area", checkedAt: "2026-09-29" }),
  spot({ id: "locker-geopolis", name: "ジオポリスのロッカー", category: "locker", area: "outside", floor: "場外", location: "アトラクションズ・ジオポリス", description: "ドーム場外のロッカー。利用時間に注意して預け先を選びましょう。", sources: ["services"], mapZone: "attractions", mapAccuracy: "area" }),
  spot({ id: "locker-everyvalley", name: "ハイ！エブリバレーのロッカー", category: "locker", storageKind: "coin", area: "outside", floor: "場外", location: "ハイ！エブリバレー", description: "交通系ICカードで支払い。大型12・中型21・小型1口。料金・利用時間・空きはロッカー案内で確認できます。", sources: ["lockerMap"], mapZone: "everyvalley", mapAccuracy: "area", checkedAt: "2026-10-04" }),
  spot({ id: "locker-gallery-aamo", name: "Gallery AaMo〜水道橋A3出口付近のロッカー", category: "locker", storageKind: "coin", area: "outside", floor: "場外", location: "Gallery AaMo〜都営三田線水道橋A3出口付近", description: "D・E・F・G・Hの設置区分。交通系ICカードで支払い。料金・サイズ・利用時間・空きはロッカー案内で確認できます。", sources: ["lockerMap"], mapZone: "gallery-aamo", mapAccuracy: "area", checkedAt: "2026-10-04" }),
  spot({ id: "locker-station-suidobashi-mita", name: "都営水道橋駅のコインロッカー", category: "locker", storageKind: "coin", area: "outside", floor: "場外", outsideAreaName: "都営水道橋駅", location: "都営三田線 水道橋駅 B1・改札外（A1・A2出口改札付近）", description: "大型9・中型9・標準15・ハーフ10口。PASMO対応。料金・利用時間は駅の案内で確認してください。", accessCondition: "駅の改札外。東京ドームの入場前に利用できます。", sources: ["suidobashiLockers"], guideUrl: DOME_GUIDE_SOURCES.suidobashiLockers.url, mapAccuracy: "unplaced", checkedAt: "2026-10-07" }),
  spot({ id: "locker-station-kasuga-a", name: "都営春日駅のコインロッカー（施設A）", category: "locker", storageKind: "coin", area: "outside", floor: "場外", outsideAreaName: "春日駅", location: "都営大江戸線 春日駅 B2・改札外（丸ノ内線・南北線方面通路）", description: "中型3・標準15口。料金・利用時間・支払方法は駅の案内で確認してください。", accessCondition: "駅の改札外。東京ドームの入場前に利用できます。", sources: ["kasugaLockers"], guideUrl: DOME_GUIDE_SOURCES.kasugaLockers.url, mapAccuracy: "unplaced", checkedAt: "2026-10-07" }),
  spot({ id: "locker-station-kasuga-b", name: "都営春日駅のコインロッカー（施設B）", category: "locker", storageKind: "coin", area: "outside", floor: "場外", outsideAreaName: "春日駅", location: "都営大江戸線 春日駅 B2・改札外（三田線連絡通路・A1出口方）", description: "大型6・中型6・標準12口。PASMO対応。料金・利用時間は駅の案内で確認してください。", accessCondition: "駅の改札外。東京ドームの入場前に利用できます。", sources: ["kasugaLockers"], guideUrl: DOME_GUIDE_SOURCES.kasugaLockers.url, mapAccuracy: "unplaced", checkedAt: "2026-10-07" }),
  spot({ id: "locker-station-korakuen-plus", name: "後楽園駅 東京メトロッカー＋", category: "locker", storageKind: "coin", area: "outside", floor: "場外", outsideAreaName: "後楽園駅", location: "後楽園駅・春日通り方面改札外、右手のエレベーター前", description: "利用5:00〜24:00。小300・中400・大600円／3時間、24時間は小900・中1,200・大1,800円。SPACERアプリから予約できます。利用日・サイズごとの料金と受取期限は運営元の案内で確認してください。", accessCondition: "駅の改札外。東京ドームの入場前に利用できます。", reservation: "available", sources: ["korakuenLockers", "korakuenLockerOperator"], guideUrl: DOME_GUIDE_SOURCES.korakuenLockerOperator.url, bookingUrl: DOME_GUIDE_SOURCES.korakuenLockerOperator.url, mapAccuracy: "unplaced", checkedAt: "2026-10-07" }),
  // The station's current link serves a diagram dated October 2024. Its three
  // locker symbols have different ticket-gate boundaries; no street pin is inferred.
  ...([
    ["locker-station-suidobashi-jr", "西口・改札外", "乗車せずに利用できます。"],
    ["locker-station-suidobashi-jr-west-inside", "西口・改札内", "改札内のロッカーです。利用には改札へ入るためのきっぷ等が必要です。"],
    ["locker-station-suidobashi-jr-east-inside", "東口・改札内", "改札内のロッカーです。利用には改札へ入るためのきっぷ等が必要です。"],
  ] as const).map(([id, place, accessCondition]) => spot({
    id, name: `JR水道橋駅のコインロッカー（${place}）`, category: "locker", storageKind: "coin", area: "outside", floor: "場外",
    outsideAreaName: "JR水道橋駅", location: `JR水道橋駅 1F・${place}`,
    description: "駅の構内図に掲載。料金・サイズ・利用時間・支払方法は駅の案内で確認してください。",
    accessCondition, sources: ["jrSuidobashiMap", "jrLockers"], guideUrl: DOME_GUIDE_SOURCES.jrSuidobashiMap.url,
    mapAccuracy: "unplaced", checkedAt: "2026-10-08",
  })),
  ...([
    ["joysound", "JOYSOUND水道橋店", "千代田区神田三崎町2-20-8・FUNDES水道橋6F", "baggageJoysound", 500, "平日12:00〜翌5:00、土日10:00〜翌5:00。", false],
    ["yamato-iidabashi", "ヤマト運輸 飯田橋駅前営業所", "飯田橋駅周辺", "baggageYamatoIidabashi", 1100, "休業日があるため利用日を確認してください。", true],
    ["big-echo", "ビッグエコー飯田橋東口駅前店", "千代田区飯田橋4-9-8・飯田橋プラザビル2F", "baggageBigEcho", 850, "11:00〜翌4:30。", false],
    ["yamato-koraku", "ヤマト運輸 文京後楽営業所（後楽）", "後楽エリア", "baggageYamatoKoraku", 1100, "休業日があるため利用日を確認してください。", true],
    ["shinsanyo", "新三陽コラくえん", "東京ドーム・ラクーア周辺", "baggageShinsanyo", 500, "昼と夜の受付が分かれています。", true],
    ["namaste", "ナマステ 本郷三丁目店", "本郷三丁目エリア", "baggageNamaste", 500, "", true],
    ["chiro", "ちろクレープ", "東京ドーム周辺", "baggageChiro", 500, "休業日があるため利用日を確認してください。", true],
    ["newberry", "ニューベリー・ティー・アンド・コーヒー", "東京ドーム周辺", "baggageNewberry", 500, "", false],
    ["ammonite", "アンモナイトコーヒーマーケット 本郷店", "本郷エリア", "baggageAmmonite", 500, "曜日で受付時間が異なります。", true],
  ] as const).map(([id,name,location,source,priceFrom,hours,addressAfterBooking]) => spot({
    id: `baggage-${id}`, name, category: "locker", storageKind: "staffed", area: "outside", floor: "場外", location,
    description: `店で預ける荷物預かり・事前予約。${hours}利用日の受付時間と受取時刻を予約画面で確認してください。${addressAfterBooking ? "現地での現金受付はなく、詳しい住所は予約後に表示されます。" : ""}`,
    bookingUrl: DOME_GUIDE_SOURCES[source].url, priceFrom, sources: [source, "baggageBooking"], status: "service-listed", mapAccuracy: "unplaced", checkedAt: "2026-10-08",
  })),
  spot({ id: "toilet-inside", name: "場内トイレ・バリアフリートイレ", category: "facility", area: "inside", floor: "各階", location: "各フロアの公式マップに掲載", description: "女性・男性・男女共用・バリアフリーの表示から探せます。座席の階とコンコースの階を確認してください。", sources: ["floors"] }),
  spot({ id: "toilet-1f-101", name: "バリアフリートイレ（101）", category: "facility", area: "inside", floor: "1F", location: "1F・1塁側 101トイレ", description: "公式バリアフリー案内掲載。オストメイト対応。", sources: ["floors", "barrierfree"], mapZone: "first-base", mapAccuracy: "area", checkedAt: "2026-09-26" }),
  spot({ id: "toilet-1f-134", name: "バリアフリートイレ（134）", category: "facility", area: "inside", floor: "1F", location: "1F・3塁側 134トイレ", description: "公式バリアフリー案内掲載。設備詳細は公式案内を確認してください。", sources: ["floors", "barrierfree"], mapZone: "third-base", mapAccuracy: "area", checkedAt: "2026-09-26" }),
  spot({ id: "toilet-1f-138", name: "バリアフリートイレ（138）", category: "facility", area: "inside", floor: "1F", location: "1F・3塁側 138トイレ", description: "公式バリアフリー案内掲載。オストメイト対応。", sources: ["floors", "barrierfree"], mapZone: "third-base", mapAccuracy: "area", checkedAt: "2026-09-26" }),
  spot({ id: "toilet-2f-202", name: "バリアフリートイレ（202）", category: "facility", area: "inside", floor: "2F", location: "2F・1塁側 202トイレ", description: "公式バリアフリー案内掲載。オストメイト対応・介護用ベッドあり。", sources: ["floors", "barrierfree"], mapZone: "first-base", mapAccuracy: "area", checkedAt: "2026-09-28" }),
  spot({ id: "toilet-2f-218", name: "バリアフリートイレ（218）", category: "facility", area: "inside", floor: "2F", location: "2F・1塁側 218トイレ", description: "公式バリアフリー案内掲載。オストメイト対応・介護用ベッドあり。", sources: ["floors", "barrierfree"], mapZone: "first-base", mapAccuracy: "area", checkedAt: "2026-09-26" }),
  spot({ id: "toilet-2f-211", name: "バリアフリートイレ（211）", category: "facility", area: "inside", floor: "2F", location: "2F・3塁側 211トイレ", description: "公式バリアフリー案内掲載。設備詳細は公式案内を確認してください。", sources: ["floors", "barrierfree"], mapZone: "third-base", mapAccuracy: "area", checkedAt: "2026-09-26" }),
  spot({ id: "toilet-2f-219", name: "バリアフリートイレ（219）", category: "facility", area: "inside", floor: "2F", location: "2F・3塁側 219トイレ", description: "公式バリアフリー案内掲載。オストメイト対応・介護用ベッドあり。", sources: ["floors", "barrierfree"], mapZone: "third-base", mapAccuracy: "area", checkedAt: "2026-09-26" }),
  spot({ id: "toilet-3f-309", name: "バリアフリートイレ（309）", category: "facility", area: "inside", floor: "3F", location: "3F・1塁側 309トイレ", description: "公式バリアフリー案内掲載。オストメイト対応。", sources: ["floors", "barrierfree"], mapZone: "first-base", mapAccuracy: "area", checkedAt: "2026-09-26" }),
  spot({ id: "toilet-4f-409", name: "バリアフリートイレ（409）", category: "facility", area: "inside", floor: "4F", location: "4F・3塁側 409トイレ", description: "公式バリアフリー案内掲載。オストメイト対応・介護用ベッドあり。", sources: ["floors", "barrierfree"], mapZone: "third-base", mapAccuracy: "area", checkedAt: "2026-09-26" }),
  spot({ id: "toilet-25", name: "25ゲート横のトイレ", category: "facility", area: "outside", floor: "場外", location: "東京ドーム外周・25ゲート横（RF）", description: "男性・女性・バリアフリートイレにおむつ替え設備があります。", sources: ["child"], mapZone: "gate-25", mapAccuracy: "named-point", toiletTypes:["women","men","accessible"] }),
  spot({ id: "information-22", name: "インフォメーション", category: "facility", area: "outside", floor: "場外", location: "東京ドーム22ゲート前", description: "場所が分からないときの案内窓口。通常10:00〜18:00、イベントにより変更があります。", sources: ["services"], mapZone: "gate-22", mapAccuracy: "named-point" }),
  spot({ id: "lost-21", name: "落とし物センター", category: "facility", area: "outside", floor: "場外", location: "21ゲート前・チケットカウンター並び", description: "通常11:00〜19:00。忘れ物の問い合わせ方法は公式案内で確認できます。", sources: ["services"], mapZone: "gate-21", mapAccuracy: "named-point" }),
  spot({ id: "atm-inside", name: "セブン銀行ATM", category: "facility", area: "inside", floor: "1F", location: "1F・17〜19通路入口付近", description: "イベント開催時に利用できます。場内での買い物はキャッシュレス決済です。", sources: ["floors", "services", "payment"], mapZone: "first-base", checkedAt: "2026-09-26" }),
  spot({ id: "baby-hall", name: "後楽園ホールビルのベビールーム", category: "facility", area: "outside", floor: "場外", location: "後楽園ホールビル 1F", description: "授乳・おむつ替えに。利用時間は10:00〜23:00です。", sources: ["child"], mapZone: "korakuen-hall", mapAccuracy: "area" }),
  spot({ id: "baby-laqua", name: "ラクーアのベビールーム", category: "facility", area: "outside", floor: "場外", location: "ラクーア 3F・女性トイレ横", description: "授乳に利用できます。利用時間はショップ＆レストランの営業時間に準じます。", sources: ["child"], mapZone: "laqua", mapAccuracy: "area" }),
  ...([
    ["toilet-laqua", "ラクーアのトイレ", "facility", "laqua", "ラクーア1F〜4F・9F", "階ごとにトイレがあります。1Fサーティワン横に女性・誰でもトイレ。", ["child", "laquaServices"]],
    ["atm-laqua", "ラクーアのATM", "facility", "laqua", "ラクーア2F・3F", "2Fエレベーターホール横にみずほ銀行、3Fトイレ横にセブン銀行。", ["services", "laquaServices"]],
    ["information-laqua", "ラクーアのインフォメーション", "facility", "laqua", "ラクーア2F・後楽園駅側エントランス", "案内窓口。通常11:00〜21:00。", ["services"]],
    ["food-laqua", "DELI＆DISH", "food", "laqua", "ラクーア1F", "惣菜・パン・スイーツなどのフードゾーン。", ["cityMap"]],
    ["toilet-hall", "後楽園ホールビルのトイレ", "facility", "korakuen-hall", "後楽園ホールビル1F", "バリアフリートイレにおむつ替え設備。", ["child"]],
    ["food-hall", "TGI FRIDAYS", "food", "korakuen-hall", "後楽園ホールビル1F", "アメリカンレストラン。", ["cityMap"]],
    ["baby-geopolis", "ジオポリスのベビールーム", "facility", "attractions", "ジオポリス1F", "授乳・おむつ替え。利用時間はアトラクションズ営業時間に準じます。", ["child"]],
    ["toilet-geopolis", "ジオポリスのトイレ", "facility", "attractions", "ジオポリスB1", "バリアフリートイレにおむつ替え設備。利用時間はアトラクションズ営業時間に準じます。", ["child"]],
    ["atm-yellow", "黄色いビルのATM", "facility", "yellow-building", "黄色いビル2F", "みずほ銀行ATM。営業時間は利用案内で確認できます。", ["services"]],
    ["food-yellow", "FOOD STADIUM TOKYO", "food", "yellow-building", "黄色いビル2F", "複数の飲食店が集まるフードホール。", ["cityMap"]],
    ["baby-hotel", "東京ドームホテルのベビーケアルーム", "facility", "dome-hotel", "東京ドームホテル2F", "mamaro。通常6:00〜24:00。", ["child"]],
    ["atm-hotel", "東京ドームホテルのATM", "facility", "dome-hotel", "東京ドームホテル2F・ローソン店内", "ローソンATM。", ["services"]],
    ["food-hotel", "ローソン 東京ドームホテル店", "food", "dome-hotel", "東京ドームホテル2F", "コンビニ。食品・飲み物。", ["services", "child"]],
    ["toilet-meets", "ミーツポートのトイレ", "facility", "meets-port", "ミーツポート3F", "バリアフリートイレにおむつ替え設備。", ["child"]],
    ["atm-meets", "ミーツポートのATM", "facility", "meets-port", "ミーツポート1F・セブン‐イレブン店内", "セブン銀行ATM。", ["services"]],
    ["food-meets", "セブン‐イレブン 東京ドームシティミーツポート店", "food", "meets-port", "ミーツポート1F", "コンビニ。食品・飲み物。", ["services", "cityMap"]],
  ] as const).map(([id, name, category, mapZone, location, description, sources]) => spot({id, name, category, mapZone, location, description, sources, area:"outside", floor:"場外", mapAccuracy:"area", checkedAt:"2026-09-29", toiletTypes:id==="toilet-laqua"?["women","accessible"]:["toilet-hall","toilet-geopolis","toilet-meets"].includes(id)?["accessible"]:undefined})),
  ...([
    // 1F, third-base side
    ["route66-1f", "Route66 Diner", "1F", "third-base", "アメリカンフード・スイーツ"],
    ["tanaka", "串カツ田中", "1F", "third-base", "串カツ"],
    ["sanchaya", "三茶ヤ", "1F", "third-base", "タピオカ"],
    ["futago", "大阪焼肉・ホルモン ふたご", "1F", "third-base", "焼肉"],
    ["yoshiko", "大阪餃子専門店 よしこ", "1F", "third-base", "餃子"],
    ["pizzala-1f-3b", "ピザーラエクスプレス", "1F", "third-base", "ピザ"],
    ["tetsuichi-1f-3b", "鉄板酒場 鐵一", "1F", "third-base", "鉄板焼き"],
    ["hanmibijin", "韓美膳", "1F", "third-base", "韓国料理"],
    ["toritake", "大串やきとり 鳥竹", "1F", "third-base", "焼き鳥"],
    ["rikyu-1f-3b", "仙臺たんや 利久", "1F", "third-base", "牛たん"],
    ["crispys-burger", "Crispy's Burger", "1F", "third-base", "クリスピーチキンバーガー"],
    ["gourmet-ai", "奥渋 グルメ阿井", "1F", "third-base", "馬肉ステーキ（ポップアップ・ショップ）"],
    // 1F, center
    ["shop104", "Dome Shop 104", "1F", "center", "ホットドッグ・スナック"],
    ["shop105", "Dome Shop 105", "1F", "center", "ホットドッグ・スナック"],
    ["shop109", "Dome Shop 109", "1F", "center", "お弁当"],
    // 1F, first-base side
    ["labo-teria-piece", "Labo-Teria Piece", "1F", "first-base", "ドリンク・ジェラート"],
    ["grazy-potato", "GRAZY POTATO", "1F", "first-base", "ポテト"],
    ["rookie-curry", "ルーキーカレー", "1F", "first-base", "ミートカレー・ソーセージ"],
    ["tsukada-farm-stand", "塚田農場スタンド", "1F", "first-base", "宮崎郷土料理・鶏料理"],
    ["bontabonta", "ぼんたぼんた", "1F", "first-base", "おにぎり・からあげ・煮込み"],
    ["potamelt", "POTAMELT", "1F", "first-base", "サンドイッチ"],
    ["rrainbow", "RRainbow", "1F", "first-base", "ハワイアン料理"],
    ["kyoto-katsugyu", "京都勝牛", "1F", "first-base", "牛カツ"],
    ["nick-stock", "NICK STOCK", "1F", "first-base", "ステーキ・フライドポテト"],
    ["shop106", "Dome Shop 106", "1F", "first-base", "お弁当"],
    ["sapporo-kanikobo", "札幌蟹工船", "1F", "first-base", "海鮮弁当"],
    ["marion-1f", "マリオンクレープ", "1F", "first-base", "クレープ"],
    ["31-1f", "サーティワンアイスクリーム", "1F", "first-base", "アイスクリーム"],
    ["shishiro", "もみだれ焼肉 獅子楼", "1F", "first-base", "焼肉（ポップアップ・ショップ）"],
    // 2F, third-base side
    ["shop201", "Dome Shop 201", "2F", "third-base", "ハンバーガー"],
    ["shop202", "Dome Shop 202", "2F", "third-base", "ごはん処"],
    ["shop203", "Dome Shop 203", "2F", "third-base", "ハンバーガー・お弁当"],
    ["shop204", "Dome Shop 204", "2F", "third-base", "スナック・お弁当"],
    ["suntory-stadium-bar", "SUNTORY STADIUM BAR", "2F", "third-base", "スタジアムバー"],
    ["tokyo-potato", "TOKYO POTATO", "2F", "third-base", "ポテト"],
    // 2F, first-base side
    ["shop207", "Dome Shop 207", "2F", "first-base", "ホットドッグ・ごはん処"],
    ["shop208", "Dome Shop 208", "2F", "first-base", "スナック・お弁当"],
    ["shop209", "Dome Shop 209", "2F", "first-base", "ハンバーガー・お弁当"],
    ["shop210", "Dome Shop 210", "2F", "first-base", "ごはん処・お弁当"],
    ["now8", "NOW8（ナウエイト）", "2F", "first-base", "ドリンク"],
    // 4F, third-base side
    ["marion-4f", "マリオンクレープ", "4F", "third-base", "クレープ"],
    ["zeal-house", "ZEAL HOUSE", "4F", "third-base", "チュリトス"],
    ["shop402", "Dome Shop 402", "4F", "third-base", "ハンバーガー・ホットドッグ"],
    ["shop403", "Dome Shop 403", "4F", "third-base", "ごはん処"],
    ["kyubei", "球兵衛", "4F", "third-base", "アルコール・おつまみ"],
    ["momosushi", "MOMOSUSHI", "4F", "third-base", "サーモンロール"],
    ["shop409", "Dome Shop 409", "4F", "third-base", "クールデザート・お弁当"],
    ["rikyu-4f", "仙臺たんや 利久", "4F", "third-base", "牛たん"],
    // 4F, center
    ["shop404", "Dome Shop 404", "4F", "center", "ハンバーガー・ディッピンドッツ"],
    ["gindako-4f", "築地銀だこ大衆酒場", "4F", "center", "たこ焼"],
    ["smashed-burger-tokyo", "Smashed Burger TOKYO", "4F", "center", "ハンバーガー"],
    ["kakiya-donmatsu", "柿家すし・どんまつ", "4F", "center", "寿司・天丼"],
    ["pizzala-4f", "ピザーラエクスプレス", "4F", "center", "ピザ"],
    ["tetsuichi-4f", "鉄板酒場 鐵一", "4F", "center", "鉄板焼き"],
    ["shop406", "Dome Shop 406", "4F", "center", "ごはん処"],
    // 4F, first-base side
    ["shop407", "Dome Shop 407", "4F", "first-base", "ハンバーガー・ホットドッグ"],
    ["oyaji-highball", "親父のクラフトハイボール", "4F", "first-base", "クラフトハイボール"],
    ["waoyatsu", "和おやつ", "4F", "first-base", "和スイーツ"],
    ["shop410", "Dome Shop 410", "4F", "first-base", "クールデザート・お弁当"],
    ["31-4f", "サーティワンアイスクリーム", "4F", "first-base", "アイスクリーム"],
    ["shop412", "Dome Shop 412", "4F", "first-base", "お弁当・ホットドッグ"],
    // Outfield
    ["shop-of7", "Dome Shop O.F7", "外野", "left-field", "おつまみ"],
    ["shop-of8-burger", "Dome Shop O.F8（ハンバーガー）", "外野", "left-field", "ハンバーガー"],
    ["shop-of8-rice", "Dome Shop O.F8（ごはん処）", "外野", "left-field", "ごはん処"],
    ["topos", "IZAKAYA とぽす", "外野", "right-field", "おつまみ・お酒"],
    ["thunder-burger", "THUNDER BURGER", "外野", "right-field", "ハンバーガー・デザート"],
    ["taiheichan", "球場屋台 大平ちゃん", "外野", "right-field", "ラーメン"],
    ["gindako-outfield", "築地銀だこ", "外野", "right-field", "たこ焼"],
    ["shop-of6", "Dome Shop O.F6", "外野", "right-field", "ごはん処・お弁当"],
  ] as const).map(([id, name, floor, mapZone, description]) => spot({
    id, name, category: "food", area: "inside", floor, location: `${floor}・${({ "first-base": "1塁側", "third-base": "3塁側", center: "中央", "left-field": "レフト側", "right-field": "ライト側" } as const)[mapZone]}`,
    description, sources: ["food"], mapZone, mapAccuracy: "area", checkedAt: "2026-09-26",
  })),
];

export const DOME_STATIONS = [
  { line: "JR中央・総武線（各駅停車）", name: "水道橋駅", exit: "東口・西口", note: "西口にはエレベーターがありません。段差を避けたい方は公式のバリアフリールートを確認。" },
  { line: "都営三田線", name: "水道橋駅", exit: "A2出口", note: "JRとは別の駅です。待ち合わせは路線名と出口まで共有すると安心。" },
  { line: "東京メトロ丸ノ内線・南北線", name: "後楽園駅", exit: "2番出口", note: "段差のない経路は通常の出口案内と異なります。エレベーターを使う方は公式ルートへ。" },
  { line: "都営大江戸線", name: "春日駅", exit: "6番出口", note: "チケットの入場ゲートを確認してから会場へ向かいましょう。" },
] as const;

export const DOME_GUIDE_FAQ: readonly { question: string; answer: string; source: GuideSource }[] = [
  { question: "東京ドームの場内で現金は使える？", answer: "場内はキャッシュレス決済です。クレジットカード・電子マネー・コード決済を準備しておきましょう。場内ロッカーの支払いは交通系ICカードのみです。", source: "payment" },
  { question: "キャリーケースはどこに預ける？", answer: "ドーム内のほか、後楽園ホールビル・ラクーア・ジオポリスなどにロッカーがあります。数に限りがあるため、大きな荷物は駅や宿泊先に預けることを公式が勧めています。", source: "services" },
  { question: "2階席なのに売店の案内が4Fなのはなぜ？", answer: "座席の呼び方と建物のフロア番号が異なります。公式では2階席スタンドを4階コンコース、1階席スタンド・外野席を1階／2階コンコースとして案内しています。", source: "seats" },
  { question: "アリーナの座席はこの図で分かる？", answer: "アリーナは公演によって配置が変わります。会場の固定座席図だけでは確定できないため、参加する公演の案内と同じ公演の座席報告を確認してください。", source: "faq" },
  { question: "掲載されている売店はライブ当日も開いている？", answer: "営業する店舗やメニューはイベントによって変わります。このページでは公式掲載の店舗を紹介しています。当日の営業は主催者・会場の案内で確認してください。", source: "faq" },
];

export type DomeToiletFilter = "all" | "women" | "men" | "accessible";
export type DomeGuideFilters = { category?: GuideCategory | "all"; area?: GuideArea | "all"; floor?: GuideFloor | "all"; query?: string; accessibleOnly?: boolean; toiletType?: DomeToiletFilter };
export function isAccessibleDomeSpot(item: DomeGuideSpot) {
  return item.facilityAnchor?.kind === "accessible" || item.name.includes("バリアフリー") || Boolean(item.toiletTypes?.includes("accessible"));
}
// Count numbered, officially listed facilities separately from drawable points.
export function splitDomeGuideResults(rows: readonly DomeGuideSpot[], area: GuideArea) {
  const mapped = (item: DomeGuideSpot) => area === "inside" ? Boolean(item.facilityAnchor) : Boolean(item.mapZone);
  return { mapped: rows.filter(mapped), unlocated: rows.filter(item => !mapped(item)) };
}
export function domeSpotSource(item: DomeGuideSpot): GuideSource {
  return !item.facilityAnchor && item.sources.includes("barrierfree") ? "barrierfree" : item.category === "food" && item.area === "inside" ? "foodMap" : item.sources[0];
}
export function matchesDomeToiletType(item: DomeGuideSpot, type: DomeToiletFilter) {
  if (type === "all") return true;
  if (type === "accessible") return isAccessibleDomeSpot(item);
  if (item.area === "outside") return Boolean(item.toiletTypes?.includes(type));
  const kind = item.facilityAnchor?.kind;
  return kind === type || kind === "mixed" || kind === "unisex";
}
export function filterDomeGuideSpots(filters: DomeGuideFilters): readonly DomeGuideSpot[] {
  const normalizedQuery=normalizeDomeGuideQuery(filters.query ?? "");
  const passages=[...normalizedQuery.matchAll(/(?<!\d)(\d{1,2})\s*通路/g)].map((m)=>Number(m[1]));
  const shopNumbers=[...normalizedQuery.matchAll(/売店(?:番号)?\s*(\d{1,3})(?!\d)/g)].map((m)=>Number(m[1]));
  const words = normalizedQuery.replace(/(?<!\d)\d{1,2}\s*通路/g, "").replace(/売店(?:番号)?\s*\d{1,3}(?!\d)/g, "").split(/\s+/).filter(Boolean);
  return DOME_GUIDE_SPOTS.filter((item) => {
    if (filters.accessibleOnly && !isAccessibleDomeSpot(item)) return false;
    if (filters.toiletType && !matchesDomeToiletType(item, filters.toiletType)) return false;
    if (filters.category && filters.category !== "all" && item.category !== filters.category) return false;
    if (filters.area && filters.area !== "all" && item.area !== filters.area) return false;
    // A facility listed for multiple floors remains useful for a specific-floor search.
    if (filters.floor && filters.floor !== "all" && item.floor !== filters.floor && !(item.floor === "各階" && filters.floor !== "場外")) return false;
    if (!passages.every((passage)=>matchesFacilityPassage(item.id,passage))) return false;
    if (!shopNumbers.every((number)=>item.facilityAnchor?.shopNumber===number)) return false;
    const text = normalizeDomeGuideQuery(`${item.name} ${item.location} ${item.description} ${item.floor}`);
    return words.every((word) => matchesDomeGuideWord(text, word));
  });
}
