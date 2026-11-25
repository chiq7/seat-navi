// Names for a stand block, shared by the seat map, the seat-share link page and the share images.
import { standDisplayRows, type StandBlock } from "./standMap";
import { seatLevelName } from "./seatFinderLabels";

/** The block's first row as a number (front halves before back halves of one stand). */
export const frontRow = (block: StandBlock) => {
  const first = Number.parseInt(standDisplayRows(block)[0]?.label ?? "", 10);
  return Number.isFinite(first) ? first : 1e9;
};

export const rowSummary = (block: StandBlock) => {
  const rows = standDisplayRows(block);
  return block.rowNameLookup === "unavailable" ? "列名は公式図に未掲載" : rows.length === 1 ? `${rows[0].label}列` : rows.length ? `${rows[0].label}〜${rows.at(-1)!.label}列` : "位置のみ";
};

// Reuse the source name while omitting only exact metadata repeated beside it.
export const blockDisplayTitle = (block: StandBlock, levelLabel: string) =>
  block.label.split("・").filter(part => part.trim() !== rowSummary(block) && part.trim() !== levelLabel)
    .map(part => part === "参考区画" && block.numberLookup === "unavailable" && !block.numberReference ? "番号未確認" : part).join("・") || block.label;

/** Front and back halves of one stand share a name ("79番〜"): their row range tells them apart. */
export function blockShortName(block: StandBlock, blocks: readonly StandBlock[]) {
  const title = blockDisplayTitle(block, "");
  return blocks.some(other => other.id !== block.id && other.level === block.level && other.label === block.label) ? `${title}・${rowSummary(block)}` : title;
}

/** "LEVEL5・212番〜" (with the row range when the name alone is shared by two blocks). */
export function blockLongName(block: StandBlock, blocks: readonly StandBlock[], levels: readonly { id: string; label: string }[]) {
  return `${seatLevelName(block.level, levels.find(l => l.id === block.level)?.label)}・${blockShortName(block, blocks)}`;
}

type Pt = [number, number];
const mid = (s: { a: number[]; b: number[] }): Pt => [(s.a[0] + s.b[0]) / 2, (s.a[1] + s.b[1]) / 2];

/** Typical distance between neighbouring row lines of a block, in map units (0 when it has fewer than two rows). */
export function blockRowGap(block: StandBlock): number {
  const centres = block.rows.map(row => row.segments[0]).filter(Boolean).map(mid);
  const gaps = centres.slice(1).map((point, index) => Math.hypot(point[0] - centres[index][0], point[1] - centres[index][1])).filter(gap => gap > 0).sort((a, b) => a - b);
  return gaps.length ? gaps[Math.floor(gaps.length / 2)] : 0;
}

/** Where seat `seat` lies on a row segment, spacing the seats evenly from the segment's first number (an estimate). */
export function seatOnSegment(segment: { start: number; end: number; a: number[]; b: number[]; points?: number[][] }, seat: number): Pt {
  let line = (segment.points?.length ? segment.points : [segment.a, segment.b]) as number[][];
  const near = (p: number[], q: number[]) => Math.hypot(p[0] - q[0], p[1] - q[1]);
  if (near(line[0], segment.a) > near(line.at(-1)!, segment.a)) line = [...line].reverse();
  const span = segment.end - segment.start;
  const share = span > 0 ? Math.min(1, Math.max(0, (seat - segment.start + .5) / (span + 1))) : .5;
  const lengths = line.slice(1).map((point, index) => near(point, line[index]));
  let left = share * lengths.reduce((sum, length) => sum + length, 0);
  for (let index = 0; index < lengths.length; index += 1) {
    if (left <= lengths[index] || index === lengths.length - 1) {
      const t = lengths[index] ? Math.min(1, left / lengths[index]) : 0;
      return [line[index][0] + (line[index + 1][0] - line[index][0]) * t, line[index][1] + (line[index + 1][1] - line[index][1]) * t];
    }
    left -= lengths[index];
  }
  return [line[0][0], line[0][1]];
}
