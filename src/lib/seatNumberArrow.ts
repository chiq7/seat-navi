type Point = { x: number; y: number };

/** A solid arrow in screen-pixel units, ending at the existing confirmed direction anchor. */
export function seatNumberArrowPath(from: Point, to: Point, unit = 1): string | null {
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  if (![from.x, from.y, to.x, to.y, unit, length].every(Number.isFinite) || unit <= 0 || length < 8 * unit) return null;
  const dx = (to.x - from.x) / length, dy = (to.y - from.y) / length;
  const point = (along: number, across: number) => `${from.x + dx * along - dy * across},${from.y + dy * along + dx * across}`;
  const neck = length - 7 * unit;
  return `M${point(0, 1.5 * unit)}L${point(neck, 1.5 * unit)}L${point(neck, 4 * unit)}L${point(length, 0)}L${point(neck, -4 * unit)}L${point(neck, -1.5 * unit)}L${point(0, -1.5 * unit)}Z`;
}
