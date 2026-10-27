type LabelArea = { code: string; label: [number, number] };
type Box = { x: number; y: number; width: number; height: number };
/** Suppress only a unique same-number reference near the confirmed number edge.
 * This is a decoration rule, independent of zoom; source anchors remain unchanged. */
export function tokyoDomeDuplicateReferenceId(guides: readonly {
  id: string; level: string; number: number; point: readonly number[];
}[], primary: { level: string; number: number; edge: readonly (readonly number[])[] }) {
  const [a,b]=primary.edge;
  if(!a||!b)return null;
  const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);
  if(!length)return null;
  const matches=guides.filter(guide=>guide.level===primary.level && guide.number===primary.number
    && (()=>{
      const t=Math.max(0,Math.min(1,((guide.point[0]-a[0])*dx+(guide.point[1]-a[1])*dy)/(length*length)));
      // The printed reference can sit just outside an edge endpoint. This
      // half-edge neighborhood is decorative clearance, never seat coverage.
      return Math.hypot(guide.point[0]-a[0]-t*dx,guide.point[1]-a[1]-t*dy)<=length/2;
    })());
  return matches.length===1 ? matches[0].id : null;
}
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

/** A tier button opens real blocks in that tier, retaining the requested side. */
export function tokyoDomeTierView(id: typeof TOKYO_DOME_OVERVIEW_AREAS[number]["id"], prefixes: string, size: {width: number}, areas: readonly LabelArea[]): Box {
  const overview = tokyoDomeOverviewView(id, size);
  const [focusX, focusY] = TOKYO_DOME_OVERVIEW_AREAS.find(area => area.id === id)!.focus;
  const target = areas.filter(area => prefixes.includes(area.code[0]))
    .reduce<LabelArea | undefined>((nearest, area) => !nearest ||
      Math.hypot(area.label[0] - focusX, area.label[1] - focusY) < Math.hypot(nearest.label[0] - focusX, nearest.label[1] - focusY) ? area : nearest, undefined);
  return target ? { ...overview, x: target.label[0] - overview.width / 2, y: target.label[1] - overview.height / 2 } : overview;
}

/** SVG clips labels at the canvas edge, including the extra space from aspect-ratio fitting. */
export function layoutTokyoDomeSeatLabels(areas: readonly LabelArea[], box: Box, display?: {
  screenScale: number;
  detailStage: boolean;
  numberedCodes: ReadonlySet<string>;
}) {
  if (box.width > 680) return [];
  // At close detail, confirmed end numbers identify the blocks. Unnumbered
  // blocks retain their name; neither source anchors nor hit targets change.
  return areas.filter(area => !(display?.detailStage && box.width <= 120 && display.numberedCodes.has(area.code))).map(area => {
    const [x, y] = area.label;
    const rawAngle = Math.atan2(y - 300, x - 579) * 180 / Math.PI;
    const angle = Number((rawAngle > 90 ? rawAngle - 180 : rawAngle < -90 ? rawAngle + 180 : rawAngle).toFixed(3));
    const baseSize = area.code.startsWith("C") ? 4.3 : 6.5;
    const fontSize = display ? 12 / display.screenScale : baseSize;
    return { code: area.code, x, y, angle: display ? 0 : angle, fontSize };
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
export function placeTokyoDomeRowMarker(anchor: readonly number[], occupied: readonly { x: number; y: number; halfWidth: number; halfHeight: number }[], scale: number, viewport?: Box): [number, number] {
  // A row outside the actual canvas stays outside; never manufacture an edge tag.
  if (viewport && (anchor[0] < viewport.x || anchor[0] > viewport.x + viewport.width
    || anchor[1] < viewport.y || anchor[1] > viewport.y + viewport.height)) return [anchor[0],anchor[1]];
  const boundedOffset = viewport ? [
    Math.max(viewport.x+30/scale,Math.min(viewport.x+viewport.width-30/scale,anchor[0]))-anchor[0],
    Math.max(viewport.y+16/scale,Math.min(viewport.y+viewport.height-16/scale,anchor[1]))-anchor[1],
  ] : [0,0];
  const offsets = [[0,0],boundedOffset,[0,-14],[0,14],[22,0],[-22,0],[22,-14],[-22,-14],[22,14],[-22,14]];
  // A nearby gate can block all nine SVG offsets on a narrow screen.
  // Continue in CSS-pixel steps; the seat-number anchor stays fixed.
  const extraOffsets = [1,2,3,4].flatMap(step => {
    const dx = 64*step/scale, dy = 40*step/scale;
    return [[0,-dy],[0,dy],[dx,0],[-dx,0],[dx,-dy],[-dx,-dy],[dx,dy],[-dx,dy]];
  });
  const offset = [...offsets,...extraOffsets].find(([dx,dy]) => (!viewport || (
    anchor[0]+dx >= viewport.x+30/scale && anchor[0]+dx <= viewport.x+viewport.width-30/scale
    && anchor[1]+dy >= viewport.y+16/scale && anchor[1]+dy <= viewport.y+viewport.height-16/scale)) && occupied.every(box =>
    Math.abs(anchor[0]+dx-box.x) > box.halfWidth+30/scale
    || Math.abs(anchor[1]+dy-box.y) > box.halfHeight+16/scale)) ?? offsets[0];
  return [anchor[0]+offset[0],anchor[1]+offset[1]];
}


export function tokyoDomeSeatFocus(code: string, label: readonly [number, number], sourcePath: string | null): [number, number] {
  if (code !== "A49" || !sourcePath) return [...label];
  const points = [...sourcePath.matchAll(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)].map(m => [Number(m[1]), Number(m[2])]);
  if (!points.length) return [...label];
  return [(Math.min(...points.map(p => p[0])) + Math.max(...points.map(p => p[0]))) / 2,
    (Math.min(...points.map(p => p[1])) + Math.max(...points.map(p => p[1]))) / 2];
}
