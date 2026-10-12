import type { FacilityConfig, FacilityGroup, FacilityMeta } from "@/components/venue/template/facilityFinderState";
import type { StandMapData } from "@/components/venue/template/standMap";
import arenaSeats from "./arena-seats.json";
import stadiumSeats from "./stadium-seats.json";
import arenaFacilities from "./arena-facilities.json";
import stadiumFacilities from "./stadium-facilities.json";
export type SaitamaMode = "arena" | "stadium";
export const saitamaSeats = { arena: arenaSeats as StandMapData, stadium: stadiumSeats as StandMapData };
export const saitamaFacilityData = { arena: arenaFacilities, stadium: stadiumFacilities };
export const saitamaAreas = [{ id: "all", label: "全体" }];
export function saitamaLevels(mode: SaitamaMode) {
  const [x,y,w,h] = saitamaSeats[mode].viewBox;
  return ["200", "300", "400", "500"].map((n,i) => ({ id: `${n}レベル`, label: `${n}レベル`, color: ["#e6a8c2", "#c9b9df", "#aeb7e7", "#b3ccdc"][i], point: [x+w*(i%2 ? .78 : .22), y+h*(i<2 ? .33 : .67)] }));
}
export function saitamaFacilityConfig(mode: SaitamaMode): FacilityConfig {
  const current = saitamaFacilityData[mode];
  return { defaultFloor: "2F", floors: ["1F", "2F", "3F", "4F", "5F"], groups: current.groups as FacilityGroup[], meta: current.meta as Record<string, FacilityMeta>,
    primaryLandmarks: Object.fromEntries(current.diagrams.map(d=>[d.id,d.landmarks.map(m=>m.id)])),
    aliases: { "ssa-gate-a": ["A", "Aゲート"], "ssa-gate-b": ["B", "Bゲート"], "ssa-gate-c": ["C", "Cゲート"], "ssa-gate-n": ["N", "Nゲート"], "ssa-gate-s1": ["S1", "S1ゲート"], "ssa-gate-s2": ["S2", "S2ゲート"], "ssa-gate-w": ["W", "Wゲート"], "ssa-shintoshin": ["さいたま新都心", "さいたま新都心駅"], "ssa-kitayono": ["北与野", "北与野駅"] },
    outsideDiagramId: "saitama-super-arena-outside", venueLabel: { name: "さいたまスーパーアリーナ", point: [505,275] },
    outsideViews: [
      { id: "grounds", label: "会場周辺", diagramId: "saitama-super-arena-outside", floorLabel: "会場・駅・周辺施設", northUp: true, venueLabel: { name: "さいたまスーパーアリーナ", point: [505,275] } },
      { id: "keyaki-1f", label: "けやき1F", diagramId: "ssa-keyaki-1f-native", floorLabel: "けやきひろば1F・入場前" },
      { id: "keyaki-3f", label: "けやき3F", diagramId: "ssa-keyaki-3f-native", floorLabel: "けやきひろば3F・屋上" },
    ],
    landmarkFacilityIds: current.outsideLandmarkFacilityIds,
    landmarkGroupIds: current.outsideLandmarkGroupIds,
    landmarkPlaceholder: { inside: "例：Aゲート", outside: "例：さいたま新都心駅" }, coverage: { description: "会場・主要2駅・けやきひろばの北上略図。個別入口や歩行経路ではない。", sourceIds: ["ssa-access"] } };
}
export const saitamaCapabilities = { rulesVersion: "2.6", geometry: "separate-native-physical-highlights", numericSearch: "official-row-rules-with-omissions", postRenovationLayout: "unverified", modes: ["arena", "stadium"], manualReview: "fine-adjustment-deferred", outside: "independent-keyaki-floors-and-operator-luggage" };
