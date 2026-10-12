import type { FacilityConfig, FacilityGroup, FacilityMeta, FacilityOutsideView } from "@/components/venue/template/facilityFinderState";
import type { StandMapData } from "@/components/venue/template/standMap";
import current from "./current-facilities.json";
import seats from "./stand-seats.json";
const gaishiMeta = current.meta as Record<string, FacilityMeta>;

export type GaishiMode = "fixed" | "bleacher";
export const gaishiSeats = seats as Record<GaishiMode, StandMapData>;
export const gaishiStandSeats = gaishiSeats.fixed;
export const gaishiLevels = (mode: GaishiMode) => [{ id: "stand", label: "スタンド", color: "#e6a8c2", point: [545,940] }, ...(mode === "bleacher" ? [{ id: "bleacher", label: "ブリージャー席", color: "#b8b1e6", point: [545,670] }] : [])];
export const gaishiAreas = [{ id: "all", label: "全体" }, ...["北", "東", "南", "西"].map(id => ({ id, label: id }))];
export const gaishiFacilityConfig: FacilityConfig = {
  defaultFloor: "1F", floors: ["1F", "2F"], groups: current.groups as FacilityGroup[], meta: gaishiMeta,
  primaryLandmarks: {
    ...Object.fromEntries(current.diagrams.map(d => [d.id, d.landmarks.map(m => m.id)])),
    ...current.outsidePrimaryLandmarks,
    "gaishi-hall-outside-north": ["gaishi-kasadera-west", "gaishi-grounds-2F-south", "gaishi-grounds-1F-foyer", "gaishi-hall-outside-motokasadera", "gaishi-hall-outside-oe"],
  },
  landmarkLabelPoints: {
    "gaishi-kasadera-west": [880, 300],
    "gaishi-grounds-2F-south": [380, 440],
    "gaishi-grounds-1F-foyer": [580, 640],
  },
  aliases: current.outsideAliases, outsideDiagramId: "gaishi-hall-outside-north",
  venueLabel: { name: "クロコくんホール", point: current.venuePoint },
  landmarkPlaceholder: { inside: "この階のロビー名", outside: "例：笠寺駅 / 西口" },
  outsideViews: [
    { id: "grounds", label: "会場周辺", diagramId: "gaishi-hall-outside-north", floorLabel: "会場・主要駅", northUp: true, venueLabel: { name: "クロコくんホール", point: current.venuePoint } },
    { id: "shared-1F", label: "共用1F", diagramId: "gaishi-shared-1F", floorLabel: "入場前・共用1F" },
    { id: "shared-2F", label: "共用2F", diagramId: "gaishi-shared-2F", floorLabel: "入場前・共用2F" },
    ...current.outsideViews as FacilityOutsideView[],
  ],
  landmarkGroupIds: {
    ...current.outsideLandmarkGroupIds,
    "gaishi-2F-south": current.groups.filter(g => g.diagramId === "gaishi-floor-2F" && g.area.startsWith("南ロビー")).map(g => g.id),
    "gaishi-1F-south": current.groups.filter(g => g.diagramId === "gaishi-floor-1F" && (g.area.includes("ロビー") || g.area.includes("玄関"))).map(g => g.id),
  },
  landmarkFacilityIds: {
    ...current.outsideLandmarkFacilityIds,
    "gaishi-grounds-1F-foyer": current.facilities.filter(f => f.scope === "場外" && gaishiMeta[f.id]?.outsideViewIds?.includes("shared-1F")).map(f => f.id),
    "gaishi-grounds-2F-south": current.facilities.filter(f => f.scope === "場外" && gaishiMeta[f.id]?.outsideViewIds?.includes("shared-2F")).map(f => f.id),
  },
  coverage: { description: "北上の敷地・主要駅略図と共用各階・乗換駅の独立区域図。入口は代表区域で、公演の指定入口・連続経路ではない。", sourceIds: ["venue-access", "site-plan", "venue-faq", "do758-locker", "nsk-nagoya-locker"] },
};
export const gaishiCapabilities = { rulesVersion: "2.5", formalZones: 17, numericSearch: "row-ranges-except-E-row-names", seatToEquipmentFloor: "unavailable", manualReview: "user-pending", fullAcceptance: "partial-real-device-pending" };
