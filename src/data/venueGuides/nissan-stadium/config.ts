import type { FacilityConfig, FacilityGroup, FacilityMeta } from "@/components/venue/template/facilityFinderState";
import type { StandMapData } from "@/components/venue/template/standMap";
import seats from "./seats.json";
import current from "./current-facilities.json";

export const nissanSeats = seats as StandMapData;
export const nissanLevels = [
  { id: "f1", label: "1階席", color: "#bfdced", point: [890, 1045] },
  { id: "f2", label: "2階席", color: "#d9d3e8", point: [890, 1310] },
];
export const nissanAreas = [{ id: "all", label: "全体" }, ...["メインスタンド", "バックスタンド", "北サイドスタンド", "南サイドスタンド"].map(id => ({ id, label: id }))];
export const nissanFacilityConfig: FacilityConfig = {
  defaultFloor: "4F", floors: ["4F", "5F", "6F", "7F"],
  groups: current.groups as FacilityGroup[], meta: current.meta as Record<string, FacilityMeta>,
  aliases: current.aliases, landmarkFacilityIds: current.landmarkFacilityIds,
  primaryLandmarks: Object.fromEntries(current.diagrams.map(d => [d.id, d.landmarks.map(l => l.id)])),
  outsideDiagramId: "nissan-grounds",
  landmarkPlaceholder: { inside: "例：E13 / EV3", outside: "例：西ゲート / 小机 / 新横浜" },
  outsideViews: [
    { id: "grounds", label: "敷地・入場前", diagramId: "nissan-grounds", floorLabel: "ゲート・館外店舗" },
    { id: "park", label: "公園・荷物", diagramId: "nissan-park", floorLabel: "第2・第3レストハウス" },
    { id: "access", label: "駅・周辺", diagramId: "nissan-access", floorLabel: "会場と駅の位置関係" },
    { id: "station", label: "駅の荷物", diagramId: "nissan-station", floorLabel: "新横浜・小机・北新横浜の場所一覧" },
    { id: "store", label: "予約店舗", diagramId: "nissan-store", floorLabel: "新横浜・7F受付の場所一覧" },
  ],
  coverage: { description: "1階席の設備は4・5F、2階席は6・7Fです。公園・駅・店舗の荷物は場外から探せます。図の点は参考区域で、精密入口・連続経路は確認中です。", sourceIds: ["facility-faq", "floor4", "floor5", "floor6", "floor7", "park"] },
};
