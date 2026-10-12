import type { FacilityConfig, FacilityGroup, FacilityMeta, FacilityOutsideView } from "@/components/venue/template/facilityFinderState";
import type { StandMapData } from "@/components/venue/template/standMap";
import current from "./current-facilities.json";
import seats from "./stand-seats.json";
export const piaStandSeats = seats as StandMapData;
export const piaLevels = [
  { id: "2F", label: "2F", color: "#e7abc7", point: [680, 420] },
  { id: "3F", label: "3F", color: "#c7b9e0", point: [680, 1320] },
  { id: "4F", label: "4F", color: "#aeb8e8", point: [680, 2220] },
];
export const piaAreas = [{ id: "all", label: "全体" }, { id: "L", label: "L側" }, { id: "C", label: "C側" }, { id: "R", label: "R側" }];
export const piaFacilityConfig: FacilityConfig = {
  defaultFloor: "2F", floors: ["1F", "2F", "3F", "4F"], groups: current.groups as FacilityGroup[], meta: current.meta as Record<string, FacilityMeta>,
  primaryLandmarks: Object.fromEntries(current.diagrams.map(d => [d.id, d.landmarks.filter(m => m.kind !== "stairs" || !/floor-[34]-native/.test(d.id)).sort((a,b) => Number(a.kind !== "gate") - Number(b.kind !== "gate")).map(m => m.id)])),
  aliases: { "pamm-1f-gate-a": ["A", "Aゲート"], "pamm-1f-gate-p": ["P", "Pゲート"],
    "pamm-2f-gate-i": ["I", "Iゲート"], "pamm-2f-gate-p": ["P", "Pゲート"],
    "pamm-ground-1-gate-a": ["A", "Aゲート"], "pamm-ground-1-gate-p": ["P", "Pゲート"],
    "pamm-ground-2-gate-p": ["P", "Pゲート"], "pamm-ground-2-gate-i": ["I", "Iゲート"],
    "pamm-1f-motion-corridor": ["モーション", "モーションコリドー", "Motion Corridor"],
    "pamm-mm-station": ["みなとみらい", "みなとみらい駅", "1番出口"], "pamm-new-station": ["新高島", "新高島駅", "2番出口"], "pamm-sakura-station": ["桜木町", "桜木町駅", "北改札東口", "東口"] },
  outsideViews: current.outsideViews as FacilityOutsideView[],
  landmarkFacilityIds: current.landmarkFacilityIds,
  landmarkGroupIds: current.landmarkGroupIds,
  outsideDiagramId: "pia-arena-mm-outside-current", venueLabel: { name: "ぴあアリーナMM", point: [515, 300] },
  landmarkPlaceholder: { inside: "例：Aゲート", outside: "例：駅名 / Pゲート" },
  coverage: { description: "会場と主要3駅・指定出口の位置関係、階別の館外入口図、周辺商業施設の場所一覧。横浜駅の荷物は別区域。個別ロッカーピンや未確認の歩行経路は描かない。", sourceIds: ["access", "floor-1-map", "floor-2-map", "pamm-station-lockers", "pamm-sakura-storage-current", "pamm-markis-services-current"] },
};
export const piaCapabilities = { rulesVersion: "2.20", geometry: "schematic-source-checked", selection: "verified", numericSearch: "printed-rows-verified", numberReference: "all-printed-floors-row-verified", outside: "approximate", connectedFloors: ["2F", "3F", "4F"], pendingFloors: [] };
