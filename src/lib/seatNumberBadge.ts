type Point = { x: number; y: number };
const cross = (a: Point, b: Point) => a.x * b.y - a.y * b.x;

/** One outline in screen pixels. Its number centre stays at the source anchor. */
function badgePoints(direction: readonly number[], width = 52, height = 28, arrowLength = 20, cut = 5) {
  const x = width / 2, y = height / 2;
  const polygon: Point[] = [
    { x: -x + cut, y: -y }, { x: x - cut, y: -y }, { x, y: -y + cut }, { x, y: y - cut },
    { x: x - cut, y }, { x: -x + cut, y }, { x: -x, y: y - cut }, { x: -x, y: -y + cut },
  ];
  const length = Math.hypot(direction[0], direction[1]);
  if (!Number.isFinite(length) || length < 1e-9 || arrowLength < 8) return polygon;
  const u = { x: direction[0] / length, y: direction[1] / length };
  const n = { x: -u.y, y: u.x };
  function exit(offset: number) {
    const origin = { x: n.x * offset, y: n.y * offset };
    for (let i = 0; i < polygon.length; i++) {
      const a = polygon[i], b = polygon[(i + 1) % polygon.length];
      const edge = { x: b.x - a.x, y: b.y - a.y };
      const delta = { x: a.x - origin.x, y: a.y - origin.y };
      const denominator = cross(u, edge);
      if (Math.abs(denominator) < 1e-9) continue;
      const t = cross(delta, edge) / denominator, s = cross(delta, u) / denominator;
      if (t > 0 && s >= -1e-9 && s <= 1 + 1e-9) return {
        point: { x: origin.x + u.x * t, y: origin.y + u.y * t },
        parameter: i + Math.max(0, Math.min(1, s)), t,
      };
    }
    throw Error('Number badge has no forward boundary');
  }
  const minus = exit(-1.5), plus = exit(1.5);
  const points = [plus.point];
  let end = minus.parameter;
  while (end <= plus.parameter) end += polygon.length;
  for (let i = Math.floor(plus.parameter) + 1; i < end - 1e-9; i++) points.push(polygon[i % polygon.length]);
  points.push(minus.point);
  const tip = Math.max(minus.t, plus.t) + arrowLength;
  // A shortened arrowhead must also clear the chamfer at its full 8px width.
  const corners = polygon.filter(p => Math.abs(p.x * n.x + p.y * n.y) <= 4).map(p => p.x * u.x + p.y * u.y);
  const neck = Math.max(tip - 8, exit(-4).t + .001, exit(4).t + .001, ...corners.map(t => t + .001));
  if (neck >= tip - .5) return polygon;
  const at = (along: number, across: number) => ({ x: u.x * along + n.x * across, y: u.y * along + n.y * across });
  points.push(at(neck, -1.5), at(neck, -4), at(tip, 0), at(neck, 4), at(neck, 1.5));
  return points;
}

export function seatNumberBadge(direction: readonly number[], width = 52, height = 28, arrowLength = 20, cut = 5) {
  return `M${badgePoints(direction, width, height, arrowLength, cut).map(p => `${p.x},${p.y}`).join(' L')} Z`;
}

/** Conservative screen-pixel obstacle for the complete joined outline. */
export function seatNumberBadgeBounds(direction: readonly number[], width = 52, height = 28, arrowLength = 20, cut = 5) {
  const points = badgePoints(direction, width, height, arrowLength, cut);
  const xs = points.map(p => p.x), ys = points.map(p => p.y);
  const left = Math.min(...xs), right = Math.max(...xs), top = Math.min(...ys), bottom = Math.max(...ys);
  return { x: (left + right) / 2, y: (top + bottom) / 2, width: right - left + 2, height: bottom - top + 2 };
}

/** Darken only the existing arrow perimeter, leaving the white badge and its anchor intact. */
export function seatNumberArrowInk(direction: readonly number[], width = 52, height = 28, arrowLength = 20, cut = 5) {
  const points = badgePoints(direction, width, height, arrowLength, cut);
  if (points.length <= 8) return undefined;
  return `M${[...points.slice(-6), points[0]].map(p => `${p.x},${p.y}`).join(' L')}`;
}
