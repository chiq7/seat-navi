import type { Point } from "./kyoceraMapDrawing";

export type LabelRect = Point & { width: number; height: number };
export type NumberLabel = { rect: LabelRect; from: Point; to: Point };

export function rectanglesOverlap(a: LabelRect, b: LabelRect, gap = 3) {
  return Math.abs(a.x - b.x) < (a.width + b.width) / 2 + gap && Math.abs(a.y - b.y) < (a.height + b.height) / 2 + gap;
}

// A segment/rectangle test also catches steep arrows running through a label.
function arrowRectInterval(from: Point, to: Point, rect: LabelRect, gap: number) {
  let start = 0, end = 1;
  const dx = to.x - from.x, dy = to.y - from.y;
  const edges = [[-dx, from.x - rect.x + rect.width / 2 + gap], [dx, rect.x + rect.width / 2 + gap - from.x],
    [-dy, from.y - rect.y + rect.height / 2 + gap], [dy, rect.y + rect.height / 2 + gap - from.y]];
  for (const [p, q] of edges) {
    if (!p) { if (q < 0) return null; continue; }
    const t = q / p;
    if (p < 0) start = Math.max(start, t); else end = Math.min(end, t);
    if (start > end) return null;
  }
  return [start, end];
}
export function arrowOverlapsRect(from: Point, to: Point, rect: LabelRect, gap = 3) {
  return arrowRectInterval(from, to, rect, gap) !== null;
}

/** Keep the arrow attached to the badge. Only its length may shrink. */
export function clearNumberArrow(sign: NumberLabel, rectangles: LabelRect[]) {
  let end = 1;
  for (const rect of rectangles) {
    const interval = arrowRectInterval(sign.from, sign.to, rect, 3);
    if (interval) end = Math.min(end, interval[0]);
  }
  const dx = sign.to.x - sign.from.x, dy = sign.to.y - sign.from.y;
  if (end * Math.hypot(dx, dy) < 8) return null;
  return { from: sign.from, to: { x: sign.from.x + dx * end, y: sign.from.y + dy * end } };
}

export function placeNumberLabel(low: Point, high: Point, width: number, height = 28, gap = 6, arrowLength = 20): NumberLabel {
  const span = Math.hypot(high.x - low.x, high.y - low.y) || 1;
  const direction = { x: (high.x - low.x) / span, y: (high.y - low.y) / span };
  const clearance = Math.abs(direction.x) * width / 2 + Math.abs(direction.y) * height / 2 + gap;
  return { rect: { ...low, width, height },
    from: { x: low.x + direction.x * clearance, y: low.y + direction.y * clearance },
    to: { x: low.x + direction.x * (clearance + arrowLength), y: low.y + direction.y * (clearance + arrowLength) } };
}

/** A neighbouring number can lose its repeated unit, but never its fixed anchor. */
export function compactNeighbourNumber(sign: NumberLabel, high: Point, number: number, obstacles: LabelRect[]) {
  const compact = obstacles.some(rect => rectanglesOverlap(sign.rect, rect, 3));
  return { compact, sign: compact ? placeNumberLabel(sign.rect, high, String(number).length * 7 + 4, 18) : sign };
}

export function numberBadgePath(rect: LabelRect, cut = 5) {
  const left = rect.x - rect.width / 2, right = rect.x + rect.width / 2;
  const top = rect.y - rect.height / 2, bottom = rect.y + rect.height / 2;
  return `M${left + cut},${top} H${right - cut} L${right},${top + cut} V${bottom - cut} L${right - cut},${bottom} H${left + cut} L${left},${bottom - cut} V${top + cut} Z`;
}

/** Keep the entire badge visible at its fixed young-side anchor; never clamp its position. */
export function numberAnchorVisible(sign: NumberLabel, width: number, height: number) {
  const {x, y, width: badgeWidth, height: badgeHeight} = sign.rect;
  return x - badgeWidth / 2 >= 0 && x + badgeWidth / 2 <= width
    && y - badgeHeight / 2 >= 0 && y + badgeHeight / 2 <= height;
}
