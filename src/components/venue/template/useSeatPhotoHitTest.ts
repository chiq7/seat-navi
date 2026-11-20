"use client";

import { useEffect, useState } from "react";

type Point = { x: number; y: number };
type HitTest = (paths: readonly string[], point: Point, radius?: number) => boolean;

// Use the same SVG paths as the seat drawing, including curves and holes.
// Keep the server and first client render identical until native geometry is ready.
export function useSeatPhotoHitTest(): HitTest {
  const [hitTest, setHitTest] = useState<HitTest>(() => () => false);
  useEffect(() => {
    const context = document.createElement("canvas").getContext("2d");
    if (!context) return;
    const paths = new Map<string, Path2D>();
    const test: HitTest = (sources, point, radius = 0) => {
      const shapes = sources.map(source => {
        if (!paths.has(source)) paths.set(source, new Path2D(source));
        return paths.get(source)!;
      });
      const samples = radius > 0
        ? [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [.707, .707], [-.707, .707], [.707, -.707], [-.707, -.707]]
        : [[0, 0]];
      return samples.every(([dx, dy]) => shapes.some(path =>
        context.isPointInPath(path, point.x + dx * radius, point.y + dy * radius, "evenodd")));
    };
    const frame = requestAnimationFrame(() => setHitTest(() => test));
    return () => cancelAnimationFrame(frame);
  }, []);
  return hitTest;
}

// Search near the sourced block anchor, never move a camera into an adjacent block.
export const seatPhotoOffsets = Array.from({ length: 33 }, (_, x) =>
  Array.from({ length: 33 }, (_, y) => [(x - 16) * 4, (y - 16) * 4]))
  .flat().filter(([x, y]) => Math.hypot(x, y) <= 64)
  .sort((a, b) => Math.hypot(...a) - Math.hypot(...b));
