import type { BlockAnalysis } from "@/lib/seatPrediction";

const MIN_COLS = 16;
const MAX_COLS = 30;

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function blockCols(b: BlockAnalysis): number {
  return clamp(b.maxSeat - b.minSeat + 1, MIN_COLS, MAX_COLS);
}

export function unionRects(rects: { x: number; y: number; w: number; h: number }[]) {
  const minX = Math.min(...rects.map((r) => r.x));
  const minY = Math.min(...rects.map((r) => r.y));
  const maxX = Math.max(...rects.map((r) => r.x + r.w));
  const maxY = Math.max(...rects.map((r) => r.y + r.h));
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

export function parsePositionedBlockName(name: string): { prefix: string; num: number } | null {
  const m = name.match(/^(.*?)(\d+)$/);
  if (!m) return null;
  return { prefix: m[1], num: parseInt(m[2], 10) };
}
