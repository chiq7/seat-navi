import type { FacilityConfig, FacilityGroup, FacilityMeta } from "@/components/venue/template/facilityFinderState";
import type { StandMapData } from "@/components/venue/template/standMap";
import current from "./current-facilities.json";
import seats from "./stand-seats.json";
export const budokanStandSeats = seats as StandMapData;
export const budokanLevels = [
  { id: "1F", label: "1階スタンド", color: "#e6a8c2", point: [500, 750] },
  { id: "2F", label: "2階スタンド", color: "#bdb6df", point: [500, 930] },
];
export const budokanAreas = [{ id: "all", label: "全体" }, ...["北", "北東", "東", "南東", "南", "南西", "西", "北西"].map(id => ({ id, label: id }))];
const park = "budokan-park-north-schematic";
const stationIds = {
  "budokan-outside-station-kudanshita": current.facilities.filter(f => f.id.startsWith("budokan-locker-kudanshita")).map(f => f.id),
  "budokan-outside-station-takebashi": ["budokan-locker-takebashi", "budokan-outside-toilet-takebashi"],
};
const indoorNearby = Object.fromEntries(current.diagrams.filter(d => d.scope === "場内").flatMap(d => d.landmarks.map(m => [m.id,
  current.facilities.filter(f => f.floor === d.floor && (f.anchor?.diagramId === d.id && Math.hypot(f.anchor.x - m.x, f.anchor.y - m.y) < 235 || f.location.includes(m.label.replace("口", "")))).map(f => f.id),
])));
export const budokanFacilityConfig: FacilityConfig = {
  defaultFloor: "1F", floors: ["1F", "2F", "B2F"],
  groups: current.groups as FacilityGroup[], meta: current.meta as Record<string, FacilityMeta>,
  primaryLandmarks: Object.fromEntries(current.diagrams.map(d => [d.id, d.landmarks.map(m => m.id)])),
  aliases: {
    "budokan-outside-station-kudanshita": ["九段下", "九段下駅"],
    "budokan-outside-station-takebashi": ["竹橋", "竹橋駅"],
    ...Object.fromEntries(current.diagrams.filter(d => d.scope === "場内").flatMap(d => d.landmarks.map(m => [m.id, [m.label, m.label.replace("口", ""), m.label + "玄関"]]))),
  },
  landmarkFacilityIds: { ...stationIds, ...indoorNearby },
  outsideDiagramId: park,
  outsideViews: [
    { id: "park", label: "北の丸公園・周辺", diagramId: park, northUp: true },
    { id: "kudanshita", label: "九段下駅", diagramId: park, landmarkIds: ["budokan-outside-station-kudanshita"], northUp: true },
    { id: "takebashi", label: "竹橋駅", diagramId: park, landmarkIds: ["budokan-outside-station-takebashi"], northUp: true },
  ],
  venueLabel: { name: "日本武道館", point: current.venuePoint },
  landmarkPlaceholder: { inside: "例：北口 / 南", outside: "例：九段下駅" },
  coverage: { description: "館内は階ごとの独立略図。場外は北の丸公園の同一原図を北向きに回転した位置関係。出口・歩行経路ではありません。", sourceIds: ["budokan-judo-2025-seats", "park-access-map"] },
};
export const budokanCapabilities = {
  rulesVersion: "2.6", geometry: "aisle-divided-printed-reference-stands", numericSearch: "printed-reference-ranges",
  equipmentFloors: "1F-known-2F-concourse-link-unconfirmed", indoorLocker: "absent-per-official-faq", manualReview: "basic-PC-mobile-checked-final-polish-pending",
};
