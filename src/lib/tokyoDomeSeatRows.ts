export type RowRange = [number, number];

// Draw independent row guides from the section outline and its row count.
// The guide is clipped to the sourced section polygon; it is not a seat boundary.
const ROW_ORIGIN: [number, number] = [579, 300];
const LINE_REACH = 1200;

type Point = [number, number];

function outlinePoints(path: string): Point[] {
  const points: Point[] = [];
  let current: Point | null = null;
  const commands = path.matchAll(/([MLCZ])([^MLCZ]*)/g);
  for (const [, command, argumentsText] of commands) {
    const values = (argumentsText.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
    if (command === "M" || command === "L") {
      for (let index = 0; index + 1 < values.length; index += 2) {
        current = [values[index], values[index + 1]];
        points.push(current);
      }
    } else if (command === "C" && current) {
      for (let index = 0; index + 5 < values.length; index += 6) {
        const start: Point = current;
        const first: Point = [values[index], values[index + 1]];
        const second: Point = [values[index + 2], values[index + 3]];
        const end: Point = [values[index + 4], values[index + 5]];
        for (let step = 1; step <= 12; step += 1) {
          const t = step / 12;
          const inverse = 1 - t;
          points.push([
            inverse ** 3 * start[0] + 3 * inverse ** 2 * t * first[0] + 3 * inverse * t ** 2 * second[0] + t ** 3 * end[0],
            inverse ** 3 * start[1] + 3 * inverse ** 2 * t * first[1] + 3 * inverse * t ** 2 * second[1] + t ** 3 * end[1],
          ]);
        }
        current = end;
      }
    }
  }
  return points;
}

export function sectionRowGuides(path: string, rows: RowRange, label: Point, printedRows?: readonly number[]) {
  const points = outlinePoints(path);
  if (points.length < 4 || points.some(([x, y]) => !Number.isFinite(x) || !Number.isFinite(y))) return null;
  const length = Math.hypot(label[0] - ROW_ORIGIN[0], label[1] - ROW_ORIGIN[1]);
  if (length < 1) return null;
  const outward: Point = [(label[0] - ROW_ORIGIN[0]) / length, (label[1] - ROW_ORIGIN[1]) / length];
  const across: Point = [-outward[1], outward[0]];
  const depth = points.map(([x, y]) => x * outward[0] + y * outward[1]);
  const inner = Math.min(...depth);
  const outer = Math.max(...depth);
  const rowNumbers = printedRows ?? Array.from({ length: rows[1] - rows[0] + 1 }, (_, index) => rows[0] + index);
  const count = rowNumbers.length;
  if (count < 1 || outer - inner < 1) return null;

  function pointAt(position: number, side: -1 | 1): string {
    const x = outward[0] * position + across[0] * LINE_REACH * side;
    const y = outward[1] * position + across[1] * LINE_REACH * side;
    return `${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  function lineAt(position: number): string {
    return `M ${pointAt(position, -1)} L ${pointAt(position, 1)}`;
  }

  const step = (outer - inner) / count;
  function marker(row: number): Point | null {
    const index = rowNumbers.indexOf(row);
    if (index < 0) return null;
    const position = inner + (index + 0.5) * step;
    const crossings: number[] = [];
    for (let index = 0; index < points.length; index += 1) {
      const start = points[index];
      const end = points[(index + 1) % points.length];
      const from = start[0] * outward[0] + start[1] * outward[1];
      const to = end[0] * outward[0] + end[1] * outward[1];
      if ((from <= position && position < to) || (to <= position && position < from)) {
        const ratio = (position - from) / (to - from);
        const x = start[0] + (end[0] - start[0]) * ratio;
        const y = start[1] + (end[1] - start[1]) * ratio;
        crossings.push(x * across[0] + y * across[1]);
      }
    }
    if (crossings.length < 2) return null;
    const middle = (Math.min(...crossings) + Math.max(...crossings)) / 2;
    return [outward[0] * position + across[0] * middle, outward[1] * position + across[1] * middle];
  }
  return {
    lines: Array.from({ length: count - 1 }, (_, index) => lineAt(inner + (index + 1) * step)).join(" "),
    marker,
    band(row: number) {
      const index = rowNumbers.indexOf(row);
      if (index < 0) return null;
      const from = inner + index * step;
      const to = from + step;
      return `M ${pointAt(from, -1)} L ${pointAt(from, 1)} L ${pointAt(to, 1)} L ${pointAt(to, -1)} Z`;
    },
  };
}
