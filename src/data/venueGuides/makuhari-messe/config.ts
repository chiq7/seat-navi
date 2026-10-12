import type { FacilityConfig, FacilityGroup, FacilityMeta } from "@/components/venue/template/facilityFinderState";
import type { StandMapData } from "@/components/venue/template/standMap";
import fixed from "./seats.json";
import current from "./current-facilities.json";

export type MakuhariMode = "event" | "exhibition";
export const makuhariFixedSeats = fixed as StandMapData;
// The operator's building footprint is a hall reference, not a permanent
// concert seating plan. Row/seat lookup stays unavailable for every hall.
const halls = [
  [1,1258,193,113,203],[2,1139,193,119,203],[3,1010,193,129,203],
  [4,837,193,124,203],[5,712,193,125,203],[6,588,193,124,203],
  [7,439,193,124,203],[8,315,193,124,203],
  [9,932,830,205,204],[10,932,1034,205,120],[11,932,1154,205,118],
];
export const makuhariExhibitionSeats: StandMapData = {
  diagramId: "makuhari-exhibition-seats", viewBox: [275,150,1140,1170], detailSpan: 380,
  wholeBlockLabels: true, areaBlockNames: true, frontLabel: "展示ホール",
  searchPlaceholder: "例：展示ホール9", numberLookupNote: "列・席番号は公演ごとの配置です。展示ホール名や地図から探せます。",
  blocks: halls.map(([n,x,y,w,h]) => ({
    id: `makuhari-hall-${n}`, label: `展示ホール${n}`, aliases: [`展示ホール${n}`,`${n}ホール`,`ホール${n}`],
    level: n <= 8 ? "ex18" : "ex911", area: n <= 8 ? "展示1〜8" : "展示9〜11", balcony: false,
    path: `M${x} ${y} H${x+w} V${y+h} H${x} Z`, box: [x,y,w,h], center: [x+w/2,y+h/2],
    rows: [], neighbors: [], numberReference: null, numberLookup: "unavailable", equipmentFloor: null,
    sourceIds: ["floor"], seatNote: "展示場の参考輪郭です。アリーナ席・ステージ・入場口は公演案内をご確認ください。",
  })),
  levelViews: { ex18: [285,155,1110,280], ex911: [880,770,330,550] },
  areaViews: { "展示1〜8": [285,155,1110,280], "展示9〜11": [880,770,330,550] },
};
export const makuhariSeats = { event: makuhariFixedSeats, exhibition: makuhariExhibitionSeats };
export function makuhariLevels(mode: MakuhariMode) {
  return mode === "event" ? [{ id: "f2", label: "2F常設席", color: "#f1d589", point: [500,290] }, { id: "f3", label: "3F常設席", color: "#a7cead", point: [500,110] }]
    : [{ id: "ex18", label: "展示1〜8", color: "#c6d2ec", point: [825,300] }, { id: "ex911", label: "展示9〜11", color: "#f7b9ac", point: [1035,1090] }];
}
export function makuhariAreas(mode: MakuhariMode) {
  return [{ id: "all", label: "全体" }, ...(mode === "event" ? ["A","B","C","D","E","F","G","H","J","K","BOX"] : ["展示1〜8","展示9〜11"]).map(id => ({ id,label:id }))];
}
export function makuhariFacilityConfig(mode: MakuhariMode = "event"): FacilityConfig {
  return {
    defaultFloor: mode === "event" ? "イベント2F" : "1〜8 2F",
    floors: ["イベント1F","イベント2F","1〜8 1F","1〜8 2F","9〜11 1F","9〜11 2F","会議1F","会議2F","会議3F"],
    groups: current.groups as FacilityGroup[], meta: current.meta as Record<string,FacilityMeta>,
    aliases: current.aliases, landmarkFacilityIds: current.landmarkFacilityIds,
    primaryLandmarks: Object.fromEntries(current.diagrams.map(d => [d.id,d.landmarks.map(l => l.id)])),
    outsideDiagramId: "makuhari-grounds",
    landmarkPlaceholder: { inside: "例：中央エントランス / 展示ホール9", outside: "例：海浜幕張 / プレナ" },
    outsideViews: [
      { id: "grounds", label: "敷地・入場前", diagramId: "makuhari-grounds", floorLabel: "棟・入口・屋外ロッカーの参考区域" },
      { id: "access", label: "駅・アクセス", diagramId: "makuhari-access", floorLabel: "駅と会場の関係・場所一覧（経路図ではありません）" },
      { id: "station", label: "駅・店舗の荷物", diagramId: "makuhari-station", floorLabel: "海浜幕張周辺の場所一覧（図内の札は一覧選択用です）" },
    ],
    coverage: { description: "イベントホール・展示場・国際会議場は棟と階を選んでください。図外の設備も一覧から探せます。入口・機械の精密位置と公演の開放は当日の案内をご確認ください。", sourceIds: ["floor","event-floor","facility","locker-map","access","jre-locker","plena","outlet"] },
  };
}
