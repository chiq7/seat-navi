type LabelArea = { code: string; label: [number, number] };
type Box = { x: number; y: number; width: number; height: number };
export const TOKYO_DOME_OVERVIEW_AREAS = [
  { id: "left", label: "外野レフト", point: [420, 190], focus: [448, 142] },
  { id: "right", label: "外野ライト", point: [738, 190], focus: [710, 142] },
  { id: "third", label: "3塁側", point: [420, 365], focus: [349, 435] },
  { id: "first", label: "1塁側", point: [738, 365], focus: [810, 435] },
  { id: "home", label: "ホーム側", point: [579, 540], focus: [579, 550] },
] as const;

/** The five major locations open at a readable scale without selecting a seat. */
export function tokyoDomeOverviewView(id: typeof TOKYO_DOME_OVERVIEW_AREAS[number]["id"], size: {width: number}): Box {
  const [x, y] = TOKYO_DOME_OVERVIEW_AREAS.find(area => area.id === id)!.focus;
  const width = Math.max(140, Math.min(320, size.width * .55));
  return { x: x - width / 2, y: y - width * .44, width, height: width * .88 };
}

/** SVG clips labels at the canvas edge, including the extra space from aspect-ratio fitting. */
export function layoutTokyoDomeSeatLabels(areas: readonly LabelArea[], box: Box) {
  if (box.width > 680) return [];
  return areas.map(area => {
    const [x, y] = area.label;
    const rawAngle = Math.atan2(y - 300, x - 579) * 180 / Math.PI;
    const angle = Number((rawAngle > 90 ? rawAngle - 180 : rawAngle < -90 ? rawAngle + 180 : rawAngle).toFixed(3));
    return { code: area.code, x, y, angle, fontSize: area.code.startsWith("C") ? 4.3 : 6.5 };
  });
}

/** Largest initial view that keeps regular block labels around 12 screen pixels. */
export function initialTokyoDomeSeatView(size: { width: number; height: number }): Box {
  const width = Math.max(150, Math.min(680, size.width * .55));
  const height = width * size.height / Math.max(1, size.width);
  return { x: 579 - width / 2, y: Math.max(26, Math.min(816 - height, 550 - height / 2)), width, height };
}

/** Keep an auxiliary 52x28px number badge clear of a selected 56x28px row badge.
 * Coordinates stay in the SVG; clearance is measured in rendered CSS pixels. */
export function tokyoDomeNumberClearOfRows(point: readonly number[], rowPoints: readonly (readonly number[] | null)[], scale: number) {
  return rowPoints.every(rowPoint => !rowPoint
    || Math.abs(point[0]-rowPoint[0])*scale > 58
    || Math.abs(point[1]-rowPoint[1])*scale > 32);
}

/** Row badges keep their 56x28 CSS-pixel size at every zoom level. */
export function placeTokyoDomeRowMarker(anchor: readonly number[], occupied: readonly { x: number; y: number; halfWidth: number; halfHeight: number }[], scale: number): [number, number] {
  const offsets = [[0,0],[0,-14],[0,14],[22,0],[-22,0],[22,-14],[-22,-14],[22,14],[-22,14]];
  // A nearby gate can block all nine SVG offsets on a narrow screen.
  // Continue in CSS-pixel steps; the seat-number anchor stays fixed.
  const extraOffsets = [1,2,3,4].flatMap(step => {
    const dx = 64*step/scale, dy = 40*step/scale;
    return [[0,-dy],[0,dy],[dx,0],[-dx,0],[dx,-dy],[-dx,-dy],[dx,dy],[-dx,dy]];
  });
  const offset = [...offsets,...extraOffsets].find(([dx,dy]) => occupied.every(box =>
    Math.abs(anchor[0]+dx-box.x) > box.halfWidth+30/scale
    || Math.abs(anchor[1]+dy-box.y) > box.halfHeight+16/scale)) ?? offsets[0];
  return [anchor[0]+offset[0],anchor[1]+offset[1]];
}
