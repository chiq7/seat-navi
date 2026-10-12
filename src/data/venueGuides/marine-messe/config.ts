import type { FacilityConfig, FacilityGroup, FacilityMeta } from "@/components/venue/template/facilityFinderState";
import type { StandMapData } from "@/components/venue/template/standMap";
import current from "./current-facilities.json";
import seats from "./stand-seats.json";

export type MarineMode = "concert" | "center";
export const marineSeats = seats as Record<MarineMode, StandMapData>;
export const marineLevels = [{ id: "1F", label: "1階席", color: "#e6a8c2", point: [700,1200] }, { id: "2F", label: "2階席", color: "#bdb6df", point: [710,1385] }];
export const marineAreas = [{ id: "all", label: "全体" }, ...["北", "東", "南", "西"].map(id => ({ id, label: id }))];
export const marineFacilityConfig: FacilityConfig = {
  defaultFloor: "1F", floors: ["1F", "2F"], groups: current.groups as FacilityGroup[], meta: current.meta as Record<string, FacilityMeta>,
  primaryLandmarks: Object.fromEntries(current.diagrams.map(d => [d.id, d.landmarks.map(m => m.id)])), aliases: current.outsideAliases,
  outsideDiagramId: "marine-messe-outside-north", venueLabel: { name: "マリンメッセ福岡A館", point: current.venuePoint },
  landmarkPlaceholder: { inside: "この階のロビー・モール名", outside: "例：呉服町駅 / 博多駅" },
  coverage: { description: "北上の主要駅・ベイサイドの代表区域。B館の設備・個別出口・歩行経路は含めない。", sourceIds: ["a-home", "bayside-info"] },
};
export const marineCapabilities = { rulesVersion: "2.2", numericSearch: "aisle-separated-stands", seatGeometry: "source-traced-approximate", indoorFloors: ["1F", "2F"], manualReview: "producer-reviewed-user-pending", unresolvedNumberBlocks: ["marine-D-front-1", "marine-E-front-37"] };
