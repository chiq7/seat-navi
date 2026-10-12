import type { FacilityGroup } from "@/components/venue/template/facilityFinderState";
import type { GuideDiagram } from "../types";

const diagramId = "ya-venue-exterior";
const sourceIds = ["floor-outside-map", "ya-exterior-services"];
// All points use the same 715 × 604 official exterior plan. The source's
// callout endpoints identify tenant areas; they are not measured door positions.
export const yokohamaExteriorDiagram: GuideDiagram = {
  id: diagramId, floor: "1F", scope: "場外", viewBox: [-30, -10, 775, 654], concoursePaths: [],
  contextPaths: [
    "M42 192C42 92 128 3 235 3L420 3C526 3 613 92 613 192C613 303 525 397 420 397L235 397C128 397 42 303 42 192Z",
    "M153 199C153 152 190 114 237 114L418 114C465 114 502 152 502 199C502 247 465 285 418 285L237 285C190 285 153 247 153 199Z",
    "M3 346L106 346L119 397L119 451L215 451L215 504L269 504Q332 565 386 504L439 504L439 451L536 451L536 397L559 346L653 346L653 538L536 538L536 507L439 507Q332 565 215 507L119 507L119 535L3 535Z",
    "M3 451L119 451L119 535L3 535Z", "M536 346L653 346L653 538L536 538Z",
  ],
  landmarks: [
    { id: "ya-exterior-entrance", label: "正面入口側", kind: "entrance", x: 332, y: 508, sourceIds, reference: "原図のエントランス名称位置。当日指定された入場口・個別ドアとは区別する。" },
    { id: "ya-exterior-lawson-entry", label: "ローソン入口", kind: "shop", x: 85, y: 550, sourceIds, reference: "原図のローソン入口矢印。外側から入る店舗入口。会場入場口ではない。" },
    { id: "ya-exterior-mugic-entry", label: "MUGIC入口", kind: "shop", x: 593, y: 550, sourceIds, reference: "原図のMugic Piano Studio入口矢印。外側から入る店舗入口。預かりカウンター位置ではない。" },
  ],
  evidence: {
    sourceIds, file: "research/yokohama-current-2026-10-07/remaining-sources/acc5e00b1bdc5a30f894c866afaa2a113b59c0b4828e1964886864d8d45af48f.png",
    sha256: "acc5e00b1bdc5a30f894c866afaa2a113b59c0b4828e1964886864d8d45af48f", width: 715, height: 604,
    method: "現行公式施設外図の建物・店舗区域・入口矢印・名称位置を独立転記。ロゴ・原画像は表示しない。駅図の座標や未確認の歩行経路を混ぜない。",
    status: "source-checked-tenant-areas-not-route",
  },
};

export const yokohamaExteriorGroups: FacilityGroup[] = [
  { id: "ya-exterior-west-ticket", label: "西券売所", purpose: "案内", area: "会場外1F・西券売所", memberIds: ["ya-outside-ticket-west"], x: 179, y: 477 },
  { id: "ya-exterior-south-ticket", label: "南券売所", purpose: "案内", area: "会場外1F・南券売所", memberIds: ["ya-outside-ticket-south"], x: 502, y: 503 },
  { id: "ya-exterior-lawson", label: "ローソン", purpose: "飲食", area: "会場外1F・ローソン店舗区域", memberIds: ["ya-lawson-arena"], x: 83, y: 486 },
  { id: "ya-exterior-mugic", label: "MUGIC カフェ", purpose: "飲食", area: "会場外1F・MUGIC店舗区域", memberIds: ["ya-mugic-cafe"], x: 591, y: 495 },
].map(group => ({ ...group, purpose: group.purpose as FacilityGroup["purpose"], diagramId,
  ...(["ya-exterior-west-ticket", "ya-exterior-south-ticket"].includes(group.id) ? {
    sourceCoordinateSpace: { diagramId: "ya-floor-outside-map-native", sourceId: "floor-outside-map",
      sha256: yokohamaExteriorDiagram.evidence.sha256, transform: "identity" as const },
  } : {}),
  boundary: "公式施設外図の同じ階・同じ店舗/券売所区域。別テナントや入場境界をまたがない。", visualReview: "source-checked" }));

export const yokohamaExteriorNearby = {
  "ya-exterior-entrance": ["ya-outside-ticket-west", "ya-outside-ticket-south", "ya-lawson-arena", "ya-mugic-cafe", "ya-mugic-cloak", "ya-mugic-locker"],
  "ya-exterior-lawson-entry": ["ya-lawson-arena"],
  "ya-exterior-mugic-entry": ["ya-mugic-cafe", "ya-mugic-cloak", "ya-mugic-locker"],
};
