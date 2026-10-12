import { getFacilityAnchor, type FacilityFloorId } from "./tokyoDomeFacilityMap";
import type { DomeGuideSpot } from "./tokyoDomeVisitorGuide";
import type { DomeGuidePurpose } from "../lib/domeGuideDisplay";

export type TokyoFacilityArea = {
  id: string; diagramId: string; floorId: FacilityFloorId; layer: "floors" | "shops";
  purpose: DomeGuidePurpose; area: string; memberIds: readonly string[]; x: number; y: number;
  boundary: "inside-concourse"; sourceId: string; checkedAt: string;
  review: "printed-concourse-area";
};

// Read from the current official PDF (all three pages) and gourmet drawing.
// These are groups of destinations along a printed concourse, not claims that
// separate toilet rooms/stores share an entrance. Inner/outer branches and the
// four 3F destinations stay separate. Original symbol/store IDs stay intact.
// No runtime distance, screen size, filter or sort order determines membership.
function area(floorId: FacilityFloorId, layer: TokyoFacilityArea["layer"], purpose: DomeGuidePurpose,
  key: string, label: string, x: number, y: number, memberIds: readonly string[]): TokyoFacilityArea {
  return { id: `tokyo:${floorId}:${layer}:${purpose}:${key}`, diagramId: `tokyo:${floorId}:${layer}`,
    floorId, layer, purpose, area: label, x, y, memberIds, boundary: "inside-concourse",
    sourceId: layer === "floors" ? "S-08dedac0facc" : "S-ee413cc72f26",
    checkedAt: "2026-10-07", review: "printed-concourse-area" };
}

export const TOKYO_FACILITY_AREAS: readonly TokyoFacilityArea[] = [
  area("1f-infield", "floors", "toilet", "30-35", "30〜35通路", 167, 583, ["toilet-floor-1f-33-35", "toilet-floor-1f-30-32"]),
  area("1f-infield", "floors", "toilet", "27-29", "27〜29通路", 199, 665, ["toilet-floor-1f-27-28", "toilet-map-1-458"]),
  area("1f-infield", "floors", "toilet", "20-22", "20〜22通路", 351, 685, ["toilet-floor-1f-20-22-w", "toilet-floor-1f-20-22-m"]),
  area("1f-infield", "floors", "toilet", "1-13-inner", "1〜13 客席側", 468.645, 518.638, ["toilet-floor-1f-1-13"]),
  area("1f-infield", "floors", "toilet", "1-13-outer", "1〜13 外周", 507.498, 536.571, ["toilet-floor-1f-1-13-w"]),
  area("1f-infield", "floors", "help", "36-48-outer", "36〜48 外周", 105, 555, ["stairs-map-1-393", "wash-map-1-434", "charge-map-1-514"]),
  area("1f-infield", "floors", "help", "25-29-outer", "25〜29 外周", 233, 683, ["stairs-map-1-387", "wash-map-1-422"]),
  area("1f-infield", "floors", "help", "17-19-outer", "17〜19 外周", 425, 623, ["atm-inside", "stairs-floor-1f-17-19"]),
  area("1f-infield", "floors", "help", "1-16-outer", "1〜16 外周", 507, 537, ["stairs-floor-1f-14-16", "wash-map-1-410"]),
  area("1f-outfield", "floors", "toilet", "49-51", "49〜51通路", 142, 299, ["toilet-floor-outfield-49", "toilet-floor-outfield-50-w", "toilet-floor-outfield-50-m"]),
  area("1f-outfield", "floors", "toilet", "55-57", "55〜57通路", 403, 264, ["toilet-floor-outfield-55", "toilet-floor-outfield-57"]),
  area("2f-infield", "floors", "toilet", "34-38", "34〜38通路", 121, 456, ["toilet-floor-2f-34", "toilet-map-2-447", "toilet-map-2-453"]),
  area("2f-infield", "floors", "toilet", "11-18", "11〜18通路", 461, 456, ["toilet-floor-2f-15", "toilet-map-2-459", "toilet-map-2-441"]),
  area("2f-infield", "floors", "help", "31-37", "31〜37通路", 140, 471, ["stairs-map-2-516", "wash-map-2-532", "stairs-floor-2f-31", "charge-map-2-613"]),
  area("2f-infield", "floors", "help", "13-18", "13〜18通路", 445, 471, ["stairs-floor-2f-13", "wash-map-2-544", "stairs-map-2-630", "charge-map-2-632"]),
  area("2f-infield", "floors", "help", "26-27", "26〜27通路", 231, 556, ["stairs-map-2-510", "wash-map-2-520"]),
  area("2f-infield", "floors", "help", "23-24", "23〜24通路", 353, 556, ["stairs-map-2-512", "wash-map-2-556"]),
  area("2f-infield", "floors", "help", "22-gate", "22ゲート側", 292, 560, ["stairs-floor-2f-24-25", "information-map-2-505"]),
  area("3f-infield", "floors", "toilet", "33-near", "33ゲート側", 148.592, 300.718, ["toilet-floor-3f-33-near"]),
  area("3f-infield", "floors", "toilet", "33-outer", "3塁側 外周", 89.206, 203.63, ["toilet-floor-3f-33-outer"]),
  area("3f-infield", "floors", "toilet", "30-near", "30ゲート側", 446.683, 300.722, ["toilet-floor-3f-30-near"]),
  area("3f-infield", "floors", "toilet", "30-outer", "1塁側 外周", 506.07, 203.63, ["toilet-floor-3f-30-outer"]),
  area("4f-infield", "floors", "toilet", "13-14-inner", "13〜14通路", 122, 531, ["toilet-floor-4f-14-w", "toilet-floor-4f-13"]),
  area("4f-infield", "floors", "toilet", "1-2-inner", "1〜2通路", 473, 531, ["toilet-floor-4f-1", "toilet-floor-4f-2"]),
  area("4f-infield", "floors", "help", "11-12", "11〜12通路", 141, 593, ["wash-map-3-341", "charge-map-3-356"]),
  area("4f-infield", "floors", "help", "3-4", "3〜4通路", 454, 595, ["wash-map-3-329", "charge-map-3-373"]),
  // Shops are partitioned by the printed counter/concourse branches. A shop
  // remains independently named in the resulting list, including both O.F8 menus.
  area("1f-infield", "shops", "food", "3b-outer-north", "30〜48通路", 69, 203, ["route66-1f", "tanaka", "sanchaya", "futago", "yoshiko"]),
  area("1f-infield", "shops", "food", "3b-outer-middle", "3塁 外周中央", 152, 275, ["pizzala-1f-3b", "tetsuichi-1f-3b", "hanmibijin", "toritake", "rikyu-1f-3b"]),
  area("1f-infield", "shops", "food", "3b-inner", "3塁側 客席側", 90, 139, ["gourmet-ai", "crispys-burger"]),
  area("1f-infield", "shops", "food", "home-1b", "ホーム1塁寄り", 374, 326, ["shop105", "labo-teria-piece"]),
  area("1f-infield", "shops", "food", "1b-outer-middle", "1塁 外周中央", 430, 272, ["grazy-potato", "rookie-curry", "tsukada-farm-stand", "bontabonta", "potamelt"]),
  area("1f-infield", "shops", "food", "1b-outer-north", "1〜16通路", 511, 196, ["rrainbow", "kyoto-katsugyu", "nick-stock", "shop106", "sapporo-kanikobo", "marion-1f"]),
  area("1f-infield", "shops", "food", "1b-inner", "1塁側 客席側", 480, 146, ["31-1f", "shishiro"]),
  area("2f-infield", "shops", "food", "34-36", "34〜36通路", 139, 653, ["shop202", "shop203"]),
  area("2f-infield", "shops", "food", "25-28", "25〜28通路", 209, 728, ["shop204", "suntory-stadium-bar", "tokyo-potato"]),
  area("2f-infield", "shops", "food", "21-23", "21〜23通路", 415, 723, ["shop207", "shop208"]),
  area("2f-infield", "shops", "food", "14-16", "14〜16通路", 493, 646, ["shop209", "shop210"]),
  area("4f-infield", "shops", "food", "13-14", "13〜14通路", 42, 808, ["marion-4f", "zeal-house"]),
  area("4f-infield", "shops", "food", "9-12", "9〜12通路", 149, 931, ["shop402", "kyubei", "rikyu-4f", "momosushi", "shop409"]),
  area("4f-infield", "shops", "food", "6-9", "6〜9通路", 305, 1046, ["shop403", "shop404", "gindako-4f", "kakiya-donmatsu", "smashed-burger-tokyo", "pizzala-4f", "tetsuichi-4f"]),
  area("4f-infield", "shops", "food", "3-5", "3〜5通路", 475, 924, ["shop407", "shop410", "31-4f", "shop412"]),
  area("4f-infield", "shops", "food", "1-2", "1〜2通路", 572, 808, ["oyaji-highball", "waoyatsu"]),
  area("1f-outfield", "shops", "food", "of8", "49〜50通路", 101, 1267, ["shop-of8-burger", "shop-of8-rice"]),
  area("1f-outfield", "shops", "food", "57-58", "57〜58通路", 485, 1280, ["taiheichan", "thunder-burger", "topos"]),
];

/** Returns fixed representatives and member IDs; filtering only removes rows. */
export function tokyoFacilityAreas(spots: readonly DomeGuideSpot[], floorId: FacilityFloorId,
  layer: TokyoFacilityArea["layer"], purpose: DomeGuidePurpose) {
  const here = spots.filter(s => s.facilityAnchor?.floorId === floorId && s.facilityAnchor.source === layer);
  const byId = new Map(here.map(s => [s.id, s]));
  const fixed = TOKYO_FACILITY_AREAS.filter(g => g.floorId === floorId && g.layer === layer && g.purpose === purpose);
  const assigned = new Set(fixed.flatMap(g => [...g.memberIds]));
  const groups = fixed.map(g => ({ ...g, members: g.memberIds.flatMap(id => byId.has(id) ? [byId.get(id)!] : []) }))
    .filter(g => g.members.length);
  // An unassigned symbol stays a stable singleton, never gets distance-clustered.
  for (const s of here.filter(s => !assigned.has(s.id)).sort((a,b) => a.id.localeCompare(b.id))) {
    const p = getFacilityAnchor(s.id)!;
    const ranges = p.passages.map(([a,b]) => a === b ? `${a}通路` : `${a}〜${b}通路`).join("・");
    const namedShop = layer === "shops" && /^Dome Shop \d+$/.test(s.name) ? s.name.replace("Dome Shop ", "Dome ") : null;
    const label = ranges || namedShop || (layer === "shops" && p.shopNumber ? `売店${p.shopNumber}` : (s.location.includes("外周") ? "外周側" : "客席側"));
    groups.push({ ...area(floorId, layer, purpose, s.id, label, p.x, p.y, [s.id]), members: [s] });
  }
  return groups;
}

/** A landmark selects whole fixed areas; the camera radius does not drop edges. */
export function tokyoLandmarkAreaIds(floorId: FacilityFloorId, layer: TokyoFacilityArea["layer"],
  purpose: DomeGuidePurpose, camera: readonly number[], spots: readonly DomeGuideSpot[]) {
  const groups = tokyoFacilityAreas(spots, floorId, layer, purpose);
  const inFrame = (p:{x:number;y:number}) => p.x >= camera[0] && p.x <= camera[0]+camera[2] && p.y >= camera[1] && p.y <= camera[1]+camera[3];
  const selected = groups.filter(g => inFrame(g) || g.members.some(s => inFrame(s.facilityAnchor!)));
  // An empty purpose is kept empty; no fallback to a different region/purpose.
  return selected.flatMap(g => [...g.memberIds]);
}
