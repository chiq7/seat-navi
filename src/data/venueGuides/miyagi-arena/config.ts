import type { FacilityConfig, FacilityGroup, FacilityMeta } from "@/components/venue/template/facilityFinderState";
import type { StandMapData } from "@/components/venue/template/standMap";
import fixed from "./seats.json";
import current from "./current-facilities.json";

export const miyagiSeats = fixed as StandMapData;
export const miyagiLevels = [{ id: "stand", label: "2階スタンド", color: "#d8e4f0", point: [430,120] }];
export const miyagiAreas = [{ id: "all", label: "全体" }, ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map(id => ({ id, label: id }))];
export const miyagiFacilityConfig: FacilityConfig = {
  defaultFloor: "メイン2F", floors: ["メイン1F", "メイン2F", "サブ1F", "サブ2F", "棟・階確認中"],
  groups: current.groups as FacilityGroup[], meta: current.meta as Record<string,FacilityMeta>, aliases: current.aliases,
  landmarkFacilityIds: current.landmarkFacilityIds, landmarkGroupIds: current.landmarkGroupIds,
  primaryLandmarks: Object.fromEntries(current.diagrams.map(d => [d.id, d.landmarks.map(l => l.id)])),
  outsideDiagramId: "miyagi-grounds",
  outsideViews: [
    { id: "grounds", label: "敷地・バス停", diagramId: "miyagi-grounds", floorLabel: "会場・バス停・駐車場の場所関係。精密入口と連続経路は確認中", northUp: true },
    { id: "station", label: "駅・店舗の荷物", diagramId: "miyagi-station", floorLabel: "駅名の札から一覧を選べます。札は駅・機械の実位置を表しません", northUp: false },
  ],
  landmarkPlaceholder: { inside: "例：メインロビー / サブ受付", outside: "例：仙台駅 / 利府駅 / 菅谷台" },
  coverage: { description: "メインとサブの棟・階を分けて案内。サブ1Fロッカーと仙台駅の荷物は一覧から選べます。個別入口・公演時の利用条件は確認中です。", sourceIds: ["intro", "qa", "floor", "park", "access-map", "sendai-locker-current", "sendai-storage-operator"] },
};
