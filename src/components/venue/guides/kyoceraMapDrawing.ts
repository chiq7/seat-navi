import type { DedicatedVenueGuide } from "@/data/venueGuides/types";
import { safeKyoceraCatalog } from "./kyoceraNavigation";
import { kyoceraLocalDetails, localSegmentRanges } from "./kyoceraLocalSeatData";
import type { Box } from "./mapGeometry";
import physicalSeats from "@/data/venueGuides/kyocera-dome/seat-special-physical.json";

export type Point = { x: number; y: number };
type NumberGuide = { youngEdge: Point[]; oppositeEdge: Point[]; sourceCode: string; segmentId: string };
export function pathRings(path: string): Point[][] {
  // Source outlines are absolute M/L polygons. Leave other SVG syntax intact.
  if (/[ACHQSTVachqlstv]/.test(path)) return [];
  return path.split(/[Zz]/).flatMap(part => {
    const values = part.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
    return values.length >= 6 ? [Array.from({ length: values.length / 2 }, (_, i) => ({ x: values[i * 2], y: values[i * 2 + 1] }))] : [];
  });
}
function lineDistance(p: Point, a: Point, b: Point) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
}
function simplify(points: Point[], tolerance: number): Point[] {
  if (points.length <= 2) return points;
  let furthest = 0, distance = tolerance;
  for (let i = 1; i < points.length - 1; i++) {
    const d = lineDistance(points[i], points[0], points.at(-1)!);
    if (d > distance) { distance = d; furthest = i; }
  }
  return furthest ? [...simplify(points.slice(0, furthest + 1), tolerance).slice(0, -1), ...simplify(points.slice(furthest), tolerance)] : [points[0], points.at(-1)!];
}
export function tidySeatPath(path: string): string {
  const rings = pathRings(path);
  if (!rings.length) return path;
  return rings.map(ring => {
    // Two open arcs avoid collapsing a closed outline onto its start vertex.
    let pivot = 1;
    for (let i = 2; i < ring.length; i++) if (Math.hypot(ring[i].x - ring[0].x, ring[i].y - ring[0].y) > Math.hypot(ring[pivot].x - ring[0].x, ring[pivot].y - ring[0].y)) pivot = i;
    const points = [...simplify(ring.slice(0, pivot + 1), 1.8).slice(0, -1), ...simplify([...ring.slice(pivot), ring[0]], 1.8).slice(0, -1)];
    return points.map((p, i) => `${i ? "L" : "M"}${p.x},${p.y}`).join(" ") + " Z";
  }).join(" ");
}
export function pathBounds(paths: string[]) {
  const points = paths.flatMap(path => pathRings(path).flat());
  if (!points.length) return null;
  return { left: Math.min(...points.map(p => p.x)), right: Math.max(...points.map(p => p.x)), top: Math.min(...points.map(p => p.y)), bottom: Math.max(...points.map(p => p.y)) };
}
export function fitKyoceraPaths(paths: string[], whole: number[], minimum = 230): Box {
  const b = pathBounds(paths); if (!b) return [...whole] as Box;
  const tiny = paths.length === 1 && (minimum === 75 || (minimum === 230 && Math.max(b.right - b.left, b.bottom - b.top) < 28));
  const margin = tiny ? 35 : 120, lower = tiny ? 75 : minimum;
  const width = Math.min(whole[2], Math.max(lower, b.right - b.left + margin));
  const height = Math.min(whole[3], Math.max(lower, b.bottom - b.top + margin));
  return [(b.left + b.right - width) / 2, (b.top + b.bottom - height) / 2, width, height];
}
export function kyoceraDrawingBlocks(guide: DedicatedVenueGuide) {
  const regular = Object.entries(guide.seatMap!.groups).flatMap(([areaId, group]) => {
    const shapes = (group.blocks ?? []) as { code: string; path?: string; x: number; y: number }[];
    const catalog = safeKyoceraCatalog(areaId, shapes.map(b => b.code));
    const area = guide.seats.find(a => a.id === areaId)!;
    return shapes.flatMap(shape => {
      const entry = catalog.find(b => b.code === shape.code);
      if (!shape.path || !entry) return [];
      const letterRows = entry.rows.every((row, i) => /^[A-Z]$/.test(row.row) && row.row.charCodeAt(0) === entry.rows[0].row.charCodeAt(0) + i);
      const rowLabel = letterRows && entry.rows.length > 1 ? `${entry.rows[0].row}〜${entry.rows.at(-1)!.row}` : entry.rowLabel;
      return [{ ...entry, rowLabel, areaId, label: area.label, tier: area.type, x: shape.x, y: shape.y, path: tidySeatPath(shape.path), special: false,
        sourceCode: entry.code, rowLabelIsPrinted: true, numberGuide: null as NumberGuide | null }];
    });
  });
  const special = physicalSeats.blocks.map(physical => {
    const d = kyoceraLocalDetails.find(detail => detail.code === physical.sourceBlockCode)!;
    const segment = d.rows.find(row => row.row === physical.row)!.segments.find(segment => segment.id === physical.segmentId)!;
    const ranges = localSegmentRanges(segment).map(range => ({ ...range, blockCode: physical.code, passage: physical.passage }));
    const rows = [{ row: physical.row, ranges, seatCount: ranges.reduce((sum, range) => sum + range.end - range.start + 1, 0) }];
    // Each source contour keeps its own search keys and number-side evidence.
    // Retain the native outline vertices, including the numbered endpoint edge.
    const path = d.overview!.paths[physical.overviewPathIndex], bounds = pathBounds([path])!;
    const point = ([x, y]: number[]): Point => ({ x, y });
    return { code: physical.code, sourceCode: d.code, areaId: d.areaId, label: d.name.replace(/ブロック/g, ""), tier: d.level,
      x: (bounds.left + bounds.right) / 2, y: (bounds.top + bounds.bottom) / 2, path, special: true, rows, rowLabel: physical.row,
      rowLabelIsPrinted: physical.row !== "0", numberGuide: { sourceCode: d.code, segmentId: segment.id,
        youngEdge: physical.youngEdge.map(point), oppositeEdge: physical.oppositeEdge.map(point) } as NumberGuide,
      firstSeat: Math.min(...rows.flatMap(r => r.ranges.map(s => s.start))), lastSeat: Math.max(...rows.flatMap(r => r.ranges.map(s => s.end))),
      seatCount: rows.reduce((n, r) => n + r.seatCount, 0), passages: [physical.passage], hasGaps: ranges.length > 1 };
  });
  return [...regular, ...special];
}
export type DrawingBlock = ReturnType<typeof kyoceraDrawingBlocks>[number];
export function kyoceraBlockCamera(block: DrawingBlock, whole: number[]): Box {
  return fitKyoceraPaths([block.path], whole, block.special ? 75 : 230);
}
export function kyoceraBlockDirection(block: DrawingBlock) {
  return block.code.startsWith("X_") ? "first" : block.code.startsWith("Y_") ? "third" : "home";
}
export function kyoceraMatchesArea(block: DrawingBlock, whole: readonly number[], direction: string, tier = "すべて") {
  if (tier !== "すべて" && block.tier !== tier) return false;
  if (direction === "all") return true;
  const wing = direction === "outfield-right" ? "first" : direction === "outfield-left" ? "third" : null;
  return wing ? !block.special && kyoceraBlockDirection(block) === wing && block.y < whole[1] + whole[3] / 3 : kyoceraBlockDirection(block) === direction;
}
export function kyoceraSelectedDirection(block: DrawingBlock, whole: readonly number[], preferred: string) {
  return preferred.startsWith("outfield-") && kyoceraMatchesArea(block, whole, preferred) ? preferred : kyoceraBlockDirection(block);
}
// A half-ring is too long to fit at a useful scale. Open its middle seats,
// retaining the neighbouring blocks; the same map can then be dragged.
export function kyoceraAreaCamera(blocks: DrawingBlock[], whole: number[], direction: string, tier: string): Box {
  const candidates = blocks.filter(b => !b.special && kyoceraMatchesArea(b, whole, direction, tier));
  if (!candidates.length || (direction === "all" && tier === "すべて")) return [...whole] as Box;
  if (direction === "home") {
    const middle = candidates.find(b => b.label === "中央C" && b.rows.length > 4) ?? candidates[0];
    return [middle.x - 165, middle.y - 165, 330, 330];
  }
  const centre = { x: candidates.reduce((n, b) => n + b.x, 0) / candidates.length,
    y: candidates.reduce((n, b) => n + b.y, 0) / candidates.length };
  // Outfield views use the far end of the corresponding wing. This changes
  // the browsing camera, not the official seat categories or membership.
  const anchor = [...candidates].sort((a, b) => Math.hypot(a.x - centre.x, a.y - centre.y) - Math.hypot(b.x - centre.x, b.y - centre.y))[0];
  return [anchor.x - 310, anchor.y - 310, 620, 620];
}
const localDirections = new Map(kyoceraLocalDetails.flatMap(detail => {
  const segment = detail.rows[Math.floor(detail.rows.length / 2)]?.segments[0];
  if (!segment) return [];
  const dx = segment.endLabel[0] - segment.startLabel[0], dy = segment.endLabel[1] - segment.startLabel[1];
  const length = Math.hypot(dx, dy);
  return length > 1 ? [[detail.code, { x: dx / length, y: dy / length }] as const] : [];
}));
export function blockAxes(block: DrawingBlock) {
  const length = Math.hypot(block.x - 800, block.y - 800) || 1;
  const radial = { x: (block.x - 800) / length, y: (block.y - 800) / length };
  // X and Y follow opposite sides from home plate. Central A–L increase
  // right-to-left. These directions agree with the source endpoint labels.
  const sign = block.code.startsWith("X_") ? 1 : -1;
  const measured = localDirections.get(block.code);
  if (measured) {
    const normal = { x: -measured.y, y: measured.x };
    const outward = normal.x * radial.x + normal.y * radial.y < 0 ? -1 : 1;
    return { radial: { x: normal.x * outward, y: normal.y * outward }, across: measured };
  }
  return { radial, across: { x: sign * radial.y, y: -sign * radial.x } };
}
export function simplifiedRows(block: DrawingBlock, selectedRow: string | null = null) {
  if (block.numberGuide) {
    const midpoint = (edge: Point[]) => ({ x: (edge[0].x + edge[1].x) / 2, y: (edge[0].y + edge[1].y) / 2 });
    const low = midpoint(block.numberGuide.youngEdge), opposite = midpoint(block.numberGuide.oppositeEdge);
    const length = Math.hypot(opposite.x - low.x, opposite.y - low.y);
    const high = { x: low.x + (opposite.x - low.x) / length * 40, y: low.y + (opposite.y - low.y) / length * 40 };
    const row = block.rows[0];
    return { rows: [{ ...row, from: low, to: opposite, selected: row.row === selectedRow }], low, high,
      seatStart: Math.min(...row.ranges.map(range => range.start)), referenceRow: row.row,
      front: { x: block.x, y: block.y }, back: { x: block.x, y: block.y } };
  }
  const { radial, across } = blockAxes(block);
  const points = pathRings(block.path).flat();
  const dot = (p: Point, axis: Point) => (p.x - block.x) * axis.x + (p.y - block.y) * axis.y;
  const start = Math.min(...points.map(p => dot(p, radial))), end = Math.max(...points.map(p => dot(p, radial)));
  const left = Math.min(...points.map(p => dot(p, across))), right = Math.max(...points.map(p => dot(p, across)));
  const at = (r: number, t: number) => ({ x: block.x + radial.x * r + across.x * t, y: block.y + radial.y * r + across.y * t });
  const rows = block.rows.map((row, i) => {
    const offset = start + (end - start) * (i + .5) / block.rows.length;
    return { ...row, from: at(offset, left - 5), to: at(offset, right + 5), selected: row.row === selectedRow };
  });
  const reference = rows[Math.floor(rows.length / 2)];
  const seatStart = Math.min(...reference.ranges.map(r => r.start));
  // Midpoint row is an example of the printed numbering, not a shared endpoint
  // for every row. An exact search highlights its block, never a chair dot.
  const offset = dot(reference.from, radial);
  const intervals = pathRings(block.path).flatMap(ring => {
    const crossings: number[] = [];
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i], b = ring[(i + 1) % ring.length];
      const ra = dot(a, radial), rb = dot(b, radial);
      if ((ra <= offset && rb > offset) || (rb <= offset && ra > offset)) {
        const t = (offset - ra) / (rb - ra);
        crossings.push(dot({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }, across));
      }
    }
    crossings.sort((a, b) => a - b);
    return crossings.flatMap((a, i) => i % 2 === 0 && crossings[i + 1] !== undefined ? [[a, crossings[i + 1]]] : []);
  });
  const segment = intervals.sort((a, b) => a[0] - b[0])[0] ?? [left, right];
  // The badge belongs to the physical young-side edge midpoint. Its number
  // remains the source-backed middle-row example, never a common row endpoint.
  const edges = pathRings(block.path).flatMap(ring => ring.map((a, i) => ({ a, b: ring[(i + 1) % ring.length] })));
  const flank = edges.filter(({ a, b }) => Math.abs(dot(b, radial) - dot(a, radial)) >= (end - start) * .35)
    .sort((a, b) => (dot(a.a, across) + dot(a.b, across)) - (dot(b.a, across) + dot(b.b, across)))[0];
  const low = flank ? { x: (flank.a.x + flank.b.x) / 2, y: (flank.a.y + flank.b.y) / 2 } : at(offset, segment[0]);
  const high = { x: low.x + across.x * 40, y: low.y + across.y * 40 };
  return { rows, low, high, seatStart, referenceRow: reference.row, front: at(start, 0), back: at(end, 0) };
}
