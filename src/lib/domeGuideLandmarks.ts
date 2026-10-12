import { FACILITY_GATES, FACILITY_PASSAGE_LABELS, SHOP_GATES, SHOP_PASSAGE_LABELS, type FacilityFloorId } from "../data/tokyoDomeFacilityMap";

export type DomeGuideLayer = "floors" | "shops";
export type DomeGuideOrigin = { id: string; floorId: FacilityFloorId; label: string };
export type DomeGuideLandmark = DomeGuideOrigin & { kind: "gate" | "passage"; x: number; y: number };

/** A stable ID names the same printed landmark, while each diagram retains its own coordinate. */
export function domeGuideLandmarks(floorId: FacilityFloorId, layer: DomeGuideLayer): DomeGuideLandmark[] {
  const gates = layer === "floors" ? FACILITY_GATES.filter((g) => g.floorId === floorId).map((g) => [g.number, g.x, g.y] as const) : SHOP_GATES[floorId] ?? [];
  const passages = (layer === "floors" ? FACILITY_PASSAGE_LABELS : SHOP_PASSAGE_LABELS)[floorId] ?? [];
  return [
    ...gates.map(([number, x, y]) => ({ id: `${floorId}:gate:${number}`, floorId, kind: "gate" as const, label: `${number}ゲート`, x, y })),
    ...passages.map(([number, x, y]) => ({ id: `${floorId}:passage:${number}`, floorId, kind: "passage" as const, label: `${number.replace("–", "〜")}通路`, x, y })),
  ];
}

export function resolveDomeGuideOrigin(origin: DomeGuideOrigin | null, floorId: FacilityFloorId, layer: DomeGuideLayer) {
  if (!origin || origin.floorId !== floorId) return undefined;
  return domeGuideLandmarks(floorId, layer).find((item) => item.id === origin.id);
}

/** Fit diagram points in the viewport. This is display framing, not a walking route. */
export function frameDomeGuidePoints(points: readonly { x: number; y: number }[], width: number, height: number, maxZoom = 2.2) {
  if (!points.length) return { zoom: 1, x: 0, y: 0 };
  const xs = points.map((p) => p.x), ys = points.map((p) => p.y);
  const left = Math.min(...xs), right = Math.max(...xs), top = Math.min(...ys), bottom = Math.max(...ys);
  const zoom = Math.max(1, Math.min(maxZoom, (width - 100) / Math.max(1, right - left), (height - 100) / Math.max(1, bottom - top)));
  return { zoom, x: (width / 2 - (left + right) / 2) * zoom, y: (height / 2 - (top + bottom) / 2) * zoom };
}

export function domeFacilityCamera(whole:readonly number[],origin:{x:number;y:number}|null|undefined):number[] {
  return origin?[Math.max(whole[0],Math.min(origin.x-whole[2]*.28,whole[0]+whole[2]*.44)),Math.max(whole[1],Math.min(origin.y-whole[3]*.28,whole[1]+whole[3]*.44)),whole[2]*.56,whole[3]*.56]:[...whole];
}
export function inDomeFacilityCamera(point:{x:number;y:number},box:readonly number[]) {
  return point.x>=box[0]&&point.x<=box[0]+box[2]&&point.y>=box[1]&&point.y<=box[1]+box[3];
}
