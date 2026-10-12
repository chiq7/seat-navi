import type { FacilityConfig, FacilityGroup, FacilityMeta, FacilityOutsideView } from "@/components/venue/template/facilityFinderState";
import type { StandMapData } from "@/components/venue/template/standMap";
import current from "./current-facilities.json";
import seats from "./stand-seats.json";
export const gardenStandSeats = seats as StandMapData;
export const gardenLevels = [
  { id: "3F", label: "3F バルコニー1", color: "#e7abc7", point: [515, 560] },
  { id: "4F", label: "4F バルコニー2", color: "#c7b9e0", point: [515, 1460] },
  { id: "5F", label: "5F バルコニー3", color: "#aeb8e8", point: [515, 2360] },
];
export const gardenAreas = [{ id: "all", label: "全体" }, ..."ABCDEFGHI".split("").map(id => ({ id, label: id }))];
export const gardenFacilityConfig: FacilityConfig = {
  defaultFloor: "3F", floors: ["2F", "3F", "4F", "5F"], groups: current.groups as FacilityGroup[], meta: current.meta as Record<string, FacilityMeta>,
  primaryLandmarks: Object.fromEntries(current.diagrams.map(d => [d.id, d.landmarks.filter(m => m.kind !== "stairs").map(m => m.id)])),
  aliases: { "tgt-tennis-station": ["有明テニスの森", "有明テニスの森駅", "2A", "2A出口"], "tgt-ariake-station": ["有明", "有明駅", "2B", "2B出口"], "tgt-kokusai-station": ["国際展示場", "国際展示場駅", "A出口"] },
  outsideViews: current.outsideViews as FacilityOutsideView[], landmarkFacilityIds: current.landmarkFacilityIds, landmarkGroupIds: current.landmarkGroupIds,
  outsideDiagramId: "tokyo-garden-theater-outside-current",
  landmarkPlaceholder: { inside: "例：バルコニーゲート", outside: "例：有明駅" },
  coverage: { description: "最寄り3駅と敷地・有明ガーデンの設備、周辺店舗・バス/駐車/タクシーの場所一覧。新橋・豊洲・大崎は乗換時の荷物として別表示し、駅の改札境界と店舗の予約条件を区別。個別機械点・連続歩行経路は推定しない。", sourceIds: ["access", "garden-grounds", "garden-locker-renewal", "garden-mall-services", "garden-ariake-plan", "garden-tennis-plan", "garden-kokusai-station", "garden-mall-access", "garden-shimbashi-plan", "garden-toyosu-plan", "garden-toyosu-metro", "garden-osaki-lockers", "garden-shimbashi-bounce"] },
};
export const gardenCapabilities = { rulesVersion: "2.20", geometry: "schematic-source-checked", selection: "verified", numericSearch: "printed-rows-verified", numberReference: "all-printed-balconies-row-verified", outside: "approximate", connectedFloors: ["3F", "4F", "5F"], pendingFloors: [] };
