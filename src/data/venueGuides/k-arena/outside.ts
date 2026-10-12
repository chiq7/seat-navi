import type { GuideDiagram, GuideFacility, GuideSource } from "../types";

export const kArenaOutsideSources: GuideSource[] = [
  { id: "k-arena-terrace", title: "ミュージックテラス", url: "https://k-arena.com/shopguide/", checkedAt: "2026-10-04", scope: "テラスの店名・トイレ・屋外ロッカー・各ゲート。代表区域の位置関係", usage: "facts-only" },
  { id: "k-arena-cloak", title: "K-Arena Shop クローク", url: "https://k-arena-shop.com/", checkedAt: "2026-10-04", scope: "1個1000円、予約不可、受付条件", usage: "facts-only" },
  { id: "mm-lockers", title: "みなとみらい線のコインロッカー", url: "https://www.mm21railway.co.jp/info/faq02.html", checkedAt: "2026-10-04", scope: "横浜・新高島・みなとみらいのロッカー設置階・改札内外。駅内の個別座標は未登録", usage: "facts-only" },
];
const outside = (id: string, name: string, purpose: GuideFacility["purpose"], floor: string, location: string, detail: string, sourceIds: string[], extras: Partial<GuideFacility> = {}): GuideFacility => ({ id, name, purpose, floor, location, detail, sourceIds, scope: "場外", precision: "text-only", ...extras });
export const kArenaOutsideFacilities: GuideFacility[] = [
  outside("outside-locker-east", "屋外コインロッカー", "荷物", "グラウンドフロア", "アリーナストリート（建物東〜南側）", "小400円・中500円・大800円。現金のみ。公演日10時から終演1時間後まで。", ["k-arena-terrace", "k-arena-faq"], { storageKind: "coin", kind: "locker" }),
  outside("outside-cloak-shop", "K-Arena Shop クローク", "荷物", "テラスフロア", "ミュージックテラス・K-Arena Shop", "1個1,000円。当日店頭受付・予約不可。預けた後の出し入れ不可。終演後1時間以内の引き取りが必要です。受付数に上限があります。", ["k-arena-cloak", "k-arena-faq"], { storageKind: "staffed", kind: "luggage" }),
  outside("outside-toilet-north", "男女トイレ", "トイレ", "グラウンドフロア", "ノースゲート階段下", "開場前から利用できます。", ["k-arena-faq", "k-arena-terrace"], { kind: "toilet-mixed", toiletType: "mixed" }),
  outside("outside-toilet-south", "男女トイレ", "トイレ", "グラウンドフロア", "サウスエントランス側の外周", "開場前から利用できます。", ["k-arena-faq", "k-arena-terrace"], { kind: "toilet-mixed", toiletType: "mixed" }),
  outside("outside-toilet-accessible", "車いす優先トイレ", "トイレ", "場外", "K-Arena Shop下・ミュージックテラスプラザ側", "車いす優先トイレとおむつ替え設備。", ["k-arena-terrace"], { kind: "toilet-accessible", toiletType: "accessible" }),
  outside("outside-baydeck", "BAYDECK BEER & GRILL", "飲食", "テラスフロア", "ミュージックテラス中央", "ビアレストラン。店内とテイクアウトの営業時間は異なります。", ["k-arena-terrace"], { kind: "food" }),
  outside("outside-lido", "Lido Stand COFFEE & JUICE", "飲食", "テラスフロア", "サウスゲート・Kタワー側", "コーヒー・ジュース。公演日の営業時間は公演に合わせて変更されます。", ["k-arena-terrace"], { kind: "food" }),
  outside("outside-lawson", "ローソン ミュージックテラス店", "飲食", "グラウンドフロア", "ヒルトン横浜・ノースゲート側", "7時〜23時。飲食物・日用品。", ["k-arena-terrace"], { kind: "food" }),
  outside("outside-south-access", "サウスゲートのエレベーター・スロープ", "案内", "グラウンド〜テラス", "サウスゲート", "車いすで来場する場合はサウスゲートへ。館内の利用案内は公演主催者に確認してください。", ["k-arena-faq"], { kind: "elevator" }),
  ...[
    ["shin-ev", "新高島駅", "B2F", "改札外・エレベーター脇"],
    ["shin-concourse", "新高島駅", "B2F", "改札外コンコース"],
    ["yokohama-main", "横浜駅（みなとみらい線）", "B3F", "正面改札外"],
    ["yokohama-south", "横浜駅（みなとみらい線）", "B3F", "みなみ改札"],
    ["yokohama-slope", "横浜駅（みなとみらい線）", "B2F", "南北連絡通路・スロープ部"],
    ["yokohama-cial", "横浜駅（みなとみらい線）", "B2F", "南北連絡通路・CIAL横浜接続口"],
    ["mm-central-in", "みなとみらい駅", "B3F", "中央改札内"],
    ["mm-central-out", "みなとみらい駅", "B3F", "中央改札外"],
    ["mm-tube", "みなとみらい駅", "B3F", "みらいチューブ脇"],
    ["mm-exit5", "みなとみらい駅", "B2F", "5番口"],
    ["mm-north", "みなとみらい駅", "B2F", "北改札外"],
  ].map(([id, station, floor, location]) => outside(`locker-${id}`, `${station} コインロッカー`, "荷物", floor, location,
    location.includes("改札内") ? "改札内の設備です。利用には有効な乗車券等が必要です。" : "駅構内のコインロッカー。サイズ・料金・利用時間は現地表示を確認してください。", ["mm-lockers"], { kind: "locker", storageKind: "coin" })),
];

// A relationship diagram, not surveyed geography or a walking route. Station
// symbols represent stations, never their individual exits or indoor lockers.
export const kArenaOutsideDiagram: GuideDiagram = {
  id: "k-arena-outside", floor: "場外", scope: "場外", viewBox: [0, 0, 1100, 900],
  contextPaths: ["M580 180L850 110L930 410L840 530H560V380L530 340Z", "M430 290L510 260L540 330L460 370Z", "M390 440H470V510H390Z", "M820 640L1060 600V860H940Z"],
  concoursePaths: ["M320 440L480 410L540 460H840L980 410", "M500 100L410 200L300 310", "M410 560L720 560L780 640"],
  landmarks: [
    { id: "outside-yokohama", label: "横浜駅", name: "横浜駅・東口方面", kind: "station", x: 160, y: 250 },
    { id: "outside-shin", label: "新高島駅", name: "新高島駅・4臨港パーク口方面", kind: "station", x: 390, y: 630 },
    { id: "outside-mm", label: "みなとみらい駅", name: "みなとみらい駅・2いちょう通り口方面", kind: "station", x: 750, y: 800 },
    { id: "outside-north", label: "ノースゲート", kind: "gate", x: 500, y: 240 },
    { id: "outside-south", label: "サウスゲート", kind: "gate", x: 510, y: 540 },
    { id: "outside-west", label: "ウエストゲート", kind: "gate", x: 320, y: 390 },
  ].map(m => ({ ...m, kind: m.kind as "station" | "gate", sourceIds: [m.kind === "station" ? "k-arena-access" : "k-arena-terrace"], reference: "公式アクセス・テラス図を基にした位置関係の代表区域。個別入口の実測点ではない。" })),
  evidence: { sourceIds: ["k-arena-access", "k-arena-terrace"], file: "k-arena-current/sources/", sha256: "", width: 1100, height: 900, method: "independent relationship schematic; fixed campus and three access stations; north upward approximately", status: "area-schematic-not-route" },
};
