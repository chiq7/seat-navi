import type { FacilityConfig, FacilityGroup, FacilityMeta, FacilityOutsideView } from "@/components/venue/template/facilityFinderState";
import type { StandMapData } from "@/components/venue/template/standMap";
import current from "./current-facilities.json";
import seats from "./stand-seats.json";
import prime from "./prime-seats.json";

export const vantelinStandSeats = seats as StandMapData;
export const vantelinPrimeSeats = prime as StandMapData;
export const vantelinPrimeLevels = [
  { id: "ツイン", label: "ツイン", color: "#b9ce8f", point: [1220, 475] },
  { id: "ボックス", label: "ボックス", color: "#b5cde0", point: [1820, 125] },
  { id: "レストラン", label: "レストラン", color: "#bedacb", point: [630, 320] },
];
export const vantelinPrimeAreas = ["全体", "1塁側", "3塁側", "センター側"]
  .map(label => ({ id: label === "全体" ? "all" : label, label }));
export const vantelinLevels = [
  { id: "下段", label: "下段", color: "#b8c3e5", point: [840, 1200] },
  { id: "上段", label: "上段", color: "#e4aec6", point: [840, 1360] },
  { id: "パノラマ", label: "パノラマ", color: "#b3d8cf", point: [840, 1510] },
  { id: "ウイング", label: "ウイング", color: "#cabbe1", point: [840, 480] },
];
export const vantelinAreas = ["全体", "バックネット側", "1塁側", "3塁側", "ライト側", "レフト側"]
  .map(label => ({ id: label === "全体" ? "all" : label, label }));
export const vantelinFacilityConfig: FacilityConfig = {
  defaultFloor: "2F", floors: ["2F", "3F", "4F", "5F"],
  groups: current.groups as FacilityGroup[], meta: current.meta as Record<string, FacilityMeta>,
  primaryLandmarks: Object.fromEntries(current.diagrams.map(d => [d.id, d.landmarks.map(m => m.id)])),
  aliases: {
    ...Object.fromEntries(Array.from({ length: 8 }, (_, i) => [`vantelin-gate-${i+1}`, [`${i+1}`, `${i+1}ゲート`, `ゲート${i+1}`]])),
    ...Object.fromEntries(Array.from({ length: 8 }, (_, i) => [`vantelin-out-gate-${i+1}`, [`${i+1}`, `${i+1}ゲート`, `ゲート${i+1}`]])),
    ...current.outsideAliases,
  },
  outsideDiagramId: "vantelin-outside", outsideViews: current.outsideViews as FacilityOutsideView[],
  landmarkFacilityIds: current.outsideLandmarkFacilityIds,
  landmarkGroupIds: current.outsideLandmarkGroupIds,
  landmarkPlaceholder: { inside: "例：ゲート1", outside: "例：矢田 / 大曽根 / イオン" },
  coverage: { description: "ゲート・デッキ、近隣モール、最寄り駅、乗換駅の荷物一覧を区域から切り替えられます。原図の向きを保持した部分略図で、歩行経路・当日の指定入口ではありません。", sourceIds: ["outside-guide-2026", "outside-access", "outside-aeon-ebook", "outside-nsk"] },
};
