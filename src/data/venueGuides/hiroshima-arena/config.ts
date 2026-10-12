import type { FacilityConfig, FacilityGroup, FacilityMeta } from "@/components/venue/template/facilityFinderState";
import type { StandMapData } from "@/components/venue/template/standMap";
import fixed from "./seats.json";
import current from "./current-facilities.json";

export const hiroshimaSeats = fixed as StandMapData;
export const hiroshimaLevels = [{ id: "stand", label: "大アリーナ固定スタンド", color: "#d8e4d8", point: [560,110] }];
export const hiroshimaAreas = [{ id: "all", label: "全体" }, ..."ABCDEFGHIJ".split("").map(id => ({ id, label: id }))];
export const hiroshimaFacilityConfig: FacilityConfig = {
  defaultFloor: "大アリーナ1F", floors: ["大アリーナ1F", "大アリーナB1", "本館1F", "本館B1", "小アリーナ2F", "小アリーナ3F", "武道場B1", "弓道場B1"],
  groups: current.groups as FacilityGroup[], meta: current.meta as Record<string,FacilityMeta>, aliases: current.aliases,
  landmarkFacilityIds: current.landmarkFacilityIds, landmarkGroupIds: current.landmarkGroupIds,
  primaryLandmarks: Object.fromEntries(current.diagrams.map(d => [d.id, d.landmarks.map(l => l.id)])),
  outsideDiagramId: "hiroshima-grounds",
  outsideViews: [
    { id: "grounds", label: "会場・駅・周辺", diagramId: "hiroshima-grounds", floorLabel: "会場・駅出口・周辺施設の場所札。実座標や連続経路を表す地図ではありません", northUp: false },
    { id: "station", label: "駅・店舗の荷物", diagramId: "hiroshima-station", floorLabel: "広島駅・バスセンター・アストラムの荷物を一覧で選べます。札は機械の位置を表しません", northUp: false },
  ],
  landmarkPlaceholder: { inside: "例：総合受付 / 本館授乳室", outside: "例：県庁前 / バスセンター / 広島駅" },
  coverage: { description: "大アリーナ・本館・小アリーナ等を棟と階で分けて案内。本館ロッカーと場外の荷物は一覧から選べます。個別入口・公演の利用境界は確認中です。", sourceIds: ["floor-guide", "qa-current", "access-current", "bus-current", "astram-current", "crosta-current"] },
};
