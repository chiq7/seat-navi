export type Box = [number, number, number, number];
export function projectMapPoint(x: number, y: number, box: number[], width: number, height: number) {
  const scale = Math.min(width / box[2], height / box[3]);
  return { x: (width - box[2] * scale) / 2 + (x - box[0]) * scale,
    y: (height - box[3] * scale) / 2 + (y - box[1]) * scale, scale };
}
export function fitMapPoints(points: { x: number; y: number }[], whole: number[]): Box {
  if (!points.length) return [...whole] as Box;
  const left = Math.min(...points.map(p => p.x)), right = Math.max(...points.map(p => p.x));
  const top = Math.min(...points.map(p => p.y)), bottom = Math.max(...points.map(p => p.y));
  const width = Math.max(260, right - left + 180), height = Math.max(240, bottom - top + 180);
  return [Math.max(whole[0], left - (width - right + left) / 2), Math.max(whole[1], top - (height - bottom + top) / 2),
    Math.min(whole[2], width), Math.min(whole[3], height)];
}
