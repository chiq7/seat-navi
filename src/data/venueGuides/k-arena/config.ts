import type { FacilityConfig, FacilityGroup, FacilityMeta } from "@/components/venue/template/facilityFinderState";
import evidence from "./floor-evidence.json";
import { kArenaOutsideFacilities } from "./outside";
import type { GuideFacility } from "../types";
export { default as kArenaStandSeats } from "./stand-seats.json";

export const kArenaLevels = [
  { id: "LEVEL3", label: "LEVEL3", color: "#e5a7c6", point: [704, 335] },
  { id: "LEVEL5", label: "LEVEL5", color: "#c5b3e3", point: [704, 635] },
  { id: "LEVEL7", label: "LEVEL7", color: "#b2bde0", point: [704, 908] },
];
export const kArenaAreas = [{ id: "all", label: "全体" }, { id: "left", label: "図の左側" }, { id: "center", label: "中央" }, { id: "right", label: "図の右側" }];

const facilities = evidence.facilities as GuideFacility[];
// Fixed room memberships measured on each official floor image. A new fixture
// cannot silently join a room because a viewport or distance threshold changed.
const rooms = [
  ["level1-toilet-left", "図の左側", ["level1-toilet-women-left", "level1-toilet-men-left", "level1-toilet-accessible-left"]],
  ["level1-toilet-right", "図の右側", ["level1-toilet-women-right", "level1-toilet-men-right", "level1-toilet-accessible-right"]],
  ["level3-toilet-north", "ノースエントランス側", ["toilet-women-north", "toilet-men-north", "toilet-accessible-north"]],
  ["level3-toilet-south", "サウスエントランス側", ["toilet-women-south", "toilet-men-south", "toilet-accessible-south"]],
  ["level4-toilet-north", "ロッカー4A側", ["level4-toilet-women-north", "level4-toilet-men-north"]],
  ["level4-toilet-south", "ロッカー4B側", ["level4-toilet-women-south", "level4-toilet-men-south"]],
  ["level7-toilet-left-upper", "図の左奥", ["level7-toilet-women-left-upper", "level7-toilet-men-left-upper"]],
  ["level7-toilet-right-upper", "図の右奥", ["level7-toilet-women-right-upper", "level7-toilet-men-right-upper"]],
] as const;
const groups: FacilityGroup[] = rooms.map(([id, label, ids]) => {
  const members = ids.map(id => facilities.find(f => f.id === id)!);
  return { id, label, area: label, purpose: "トイレ", memberIds: [...ids], diagramId: members[0].anchor!.diagramId,
    x: members.reduce((n, f) => n + f.anchor!.x, 0) / members.length, y: members[0].anchor!.y, boundary: "同じ階・同じトイレ区域。通路や有料境界をまたがない。", visualReview: id.startsWith("level1") ? "source-checked" : "browser-checked" };
});
// The LEVEL1 official floor drawing places these pairs on the same gate-side
// concourse. Keep their individual locker IDs in the result list.
for (const [id, label, ids] of [
  ["level1-lockers-102", "GATE 102側のロッカー", ["level1-locker-1b", "level1-locker-1c"]],
  ["level1-lockers-103", "GATE 103側のロッカー", ["level1-locker-1d", "level1-locker-1e"]],
  ["level1-lockers-104", "GATE 104側のロッカー", ["level1-locker-1f", "level1-locker-1g"]],
] as const) {
  const members = ids.map(memberId => facilities.find(f => f.id === memberId)!);
  groups.push({ id, label, area: id, purpose: "荷物", memberIds: [...ids], diagramId: members[0].anchor!.diagramId,
    x: members.reduce((sum, f) => sum + f.anchor!.x, 0) / members.length, y: members.reduce((sum, f) => sum + f.anchor!.y, 0) / members.length,
    boundary: "公式LEVEL1図の同じGATE側コンコース。左右側・別階・入場境界をまたがない区域札。", visualReview: "source-checked" });
}
const assigned = new Set(groups.flatMap(g => g.memberIds));
for (const f of facilities) if (!assigned.has(f.id)) groups.push({ id: `area-${f.id}`, label: f.name.replace(/（.*?）/g, ""), area: f.id, purpose: f.purpose, memberIds: [f.id], diagramId: f.anchor!.diagramId, x: f.anchor!.x, y: f.anchor!.y, boundary: "公式図の単一設備区域", visualReview: f.floor === "LEVEL5" && f.purpose === "飲食" || f.floor === "LEVEL7" && f.purpose === "トイレ" ? "browser-checked" : "source-checked" });

const outdoorAreas: [string, string, string[], number, number][] = [
  ["outside-luggage-street", "アリーナストリート", ["outside-locker-east"], 955, 460],
  ["outside-luggage-shop", "K-Arena Shop", ["outside-cloak-shop"], 390, 455],
  ["outside-wc-north", "ノースゲート下", ["outside-toilet-north"], 520, 165],
  ["outside-wc-south", "建物南側", ["outside-toilet-south"], 730, 550],
  ["outside-wc-accessible", "テラスプラザ", ["outside-toilet-accessible"], 430, 510],
  ["outside-food-baydeck", "BAYDECK", ["outside-baydeck"], 485, 440],
  ["outside-food-lido", "Lido Stand", ["outside-lido"], 350, 510],
  ["outside-food-lawson", "ローソン", ["outside-lawson"], 430, 290],
  ["outside-info-south", "サウスゲート", ["outside-south-access"], 555, 570],
];
for (const [id, label, memberIds, x, y] of outdoorAreas) groups.push({ id, label, memberIds, x, y, diagramId: "k-arena-outside", purpose: kArenaOutsideFacilities.find(f => f.id === memberIds[0])!.purpose, area: label, boundary: "公式テラス図の区域。略図上の代表札であり、施設入口の精密な点ではない。", visualReview: id.startsWith("outside-luggage") ? "browser-checked" : "source-checked" });

const meta: Record<string, FacilityMeta> = {};
for (const f of facilities) {
  const room = groups.find(g => g.memberIds.includes(f.id))!;
  const side = f.id.startsWith("level4") && f.id.includes("north") ? "ロッカー4A側" : f.id.startsWith("level4") && f.id.includes("south") ? "ロッカー4B側" : f.id.includes("north") ? "ノースエントランス側" : f.id.includes("south") ? "サウスエントランス側" : f.id.includes("left") ? "図の左側" : f.id.includes("right") ? "図の右側" : f.id.includes("central") ? "中央" : f.name;
  const location = f.purpose === "トイレ" && room.memberIds.length > 1 ? room.label : f.id.includes("lounge") ? `Lounge 5の${f.id.includes("left") ? "左" : "右"}側` : side;
  meta[f.id] = { name: f.name.replace(/（.*?）/g, ""), location, area: room.id, accessCondition: "公演チケット・開場後",
    detail: f.purpose === "トイレ" ? "公演により男女の割り当てが変わる場合があります。当日の表示を確認してください。" :
      f.purpose === "荷物" ? "館内ロッカーは小型・400円。現金のみ。利用時間は開館時間に準じます。" :
      f.purpose === "飲食" ? "ドリンク・軽食の売店。現金は使えません。営業は公演に準じます。" :
      f.kind === "escalator" ? "LEVEL3とLEVEL5を結びます。当日の運行案内に従ってください。" :
      f.kind === "smokingarea" ? "館内の喫煙室。公演により利用できない場合があります。" : "授乳室。利用については近くのスタッフにお尋ねください。",
    url: f.purpose === "荷物" ? "https://k-arena.com/faq/" : undefined };
}
for (const f of kArenaOutsideFacilities) meta[f.id] = { location: f.location, detail: f.detail, area: f.id.startsWith("locker-shin") ? "新高島駅" : f.id.startsWith("locker-yokohama") ? "横浜駅" : f.id.startsWith("locker-mm") ? "みなとみらい駅" : "ミュージックテラス", accessCondition: f.location.includes("改札内") ? "駅の改札内" : "入場前に利用可", url: f.id.startsWith("locker-") ? "https://www.mm21railway.co.jp/info/faq02.html" : f.id === "outside-cloak-shop" ? "https://k-arena-shop.com/" : "https://k-arena.com/shopguide/" };

export const kArenaFacilityConfig: FacilityConfig = {
  defaultFloor: "LEVEL3", floors: ["LEVEL1", "LEVEL3", "LEVEL4", "LEVEL5", "LEVEL7"], groups, meta,
  primaryLandmarks: {
    "k-arena-floor-level1-desktop": ["level1-gate101", "level1-gate104"],
    "k-arena-level3-floor-desktop": ["entrance-main", "gate301", "gate304"],
    "k-arena-floor-level4-desktop": [],
    "k-arena-floor-level5-desktop": ["level5-gate501", "level5-gate504", "level5-gate509", "level5-gate512"],
    "k-arena-floor-level7-desktop": ["level7-gate701", "level7-gate704", "level7-gate709", "level7-gate712"],
    "k-arena-outside": ["outside-yokohama", "outside-shin", "outside-mm", "outside-north", "outside-west", "outside-south"],
  },
  aliases: { "entrance-main": ["メイン", "メインエントランス", "Main Entrance"], "entrance-north": ["ノースエントランス", "North Entrance"], "entrance-south": ["サウスエントランス", "South Entrance"], "outside-north": ["North Gate"], "outside-south": ["South Gate"], "outside-west": ["West Gate"], "outside-shin": ["新高島", "4臨港パーク口"], "outside-yokohama": ["横浜", "横浜駅東口"], "outside-mm": ["みなとみらい", "2いちょう通り口"] },
  outsideDiagramId: "k-arena-outside", coverage: { description: "Kアリーナとミュージックテラス、横浜・新高島・みなとみらいの主要3駅。遠方の荷物施設は初期範囲を変更しない。", sourceIds: ["k-arena-access", "k-arena-terrace"] },
};

export const kArenaCapabilities = {
  rulesVersion: 2, configuration: "permanent-stand-2026-10-04",
  stands: { status: "verified", evidence: "公式全体PDFの常設LEVEL3/5/7。行番号・連続する番号区間。公演別利用席は別。" },
  arena: { status: "unavailable", evidence: "公演ごとに配置が異なるため固定しない。" },
  equipmentDefaultFloor: { status: "verified", evidence: "公式FAQのメインエントランスLEVEL3。" },
  outside: { status: "approximate", evidence: "公式アクセス・テラス図の位置関係の略図。経路・精密な入口座標ではない。" },
  stationLockerPositions: { status: "unavailable", evidence: "運営元の設置階・改札内外は確認済み。個々の位置は図に登録せず場所の案内に掲載。" },
};
