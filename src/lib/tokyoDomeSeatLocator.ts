import { TOKYO_DOME_SPECIAL_LABELS } from "@/data/tokyoDomeSpecialSeatLabels";
import { TOKYO_DOME_VERIFIED_SEAT_BLOCKS, TOKYO_DOME_REPRESENTATIVE_SEAT_BLOCKS, type TokyoDomeVerifiedSeatBlock } from "@/data/tokyoDomeVerifiedSeatRows";

const SEARCHABLE_BLOCKS: readonly TokyoDomeVerifiedSeatBlock[] = [...TOKYO_DOME_VERIFIED_SEAT_BLOCKS, ...TOKYO_DOME_REPRESENTATIVE_SEAT_BLOCKS];

export type TokyoDomeSection = { prefix: string; number: number; code: string };
export type TokyoDomeSeatLevel = "all" | "lower" | "upper" | "balcony" | "outfield";
export type TokyoDomeSeatDirection = "all" | "first" | "home" | "third" | "right" | "left" | "outfield";

// 東京ドーム公式座席図の区画記号。欠番を範囲で明示し、存在しない区画を受け付けない。
const TOKYO_DOME_SECTION_RANGES: Record<string, readonly [number, number][]> = {
  A: [[1, 49]],
  B: [[2, 48]],
  C: [[1, 48], [50, 97]],
  D: [[1, 51]],
  E: [[6, 46]],
  F: [[1, 20]],
};
const SPECIAL_LABELS = new Set<string>(TOKYO_DOME_SPECIAL_LABELS.map(({ code }) => code));

export function parseTokyoDomeSection(raw: string): TokyoDomeSection | null {
  const normalized = raw.normalize("NFKC").toUpperCase().replace(/[\s-]/g, "").replace(/(?:ブロック|区画)$/, "");
  const match = normalized.match(/^([A-GPST])(\d{1,3})$/);
  if (!match) return null;
  const prefix = match[1];
  const number = Number(match[2]);
  if (!Number.isInteger(number) || number < 1) return null;
  const code = `${prefix}${String(number).padStart(number >= 100 ? 3 : 2, "0")}`;
  if (prefix in TOKYO_DOME_SECTION_RANGES) {
    if (match[2].length > 2 || !TOKYO_DOME_SECTION_RANGES[prefix].some(([start, end]) => number >= start && number <= end)) return null;
  } else if (!SPECIAL_LABELS.has(code)) return null;
  return { prefix, number, code };
}

export function getTokyoDomeVerifiedSeatBlock(code: string): TokyoDomeVerifiedSeatBlock | undefined {
  return SEARCHABLE_BLOCKS.find(block => block.code === code);
}

/** Individually read detail rows take precedence over overall-map captions. */
export function getTokyoDomeVerifiedRowRange(code: string): [number, number] | null {
  const block = getTokyoDomeVerifiedSeatBlock(code);
  if (block?.rowCoverage === "representative") return block.rowRange ? [...block.rowRange] : null;
  const rows = block?.rows;
  return rows?.length ? [rows[0].row, rows[rows.length - 1].row] : null;
}

/** Complete detail rows retain gaps; representative number rows do not narrow the sourced row range. */
export function getTokyoDomeVerifiedPrintedRows(code: string): readonly number[] | undefined {
  const block = getTokyoDomeVerifiedSeatBlock(code);
  return block?.rowCoverage === "representative" ? undefined : block?.rows.map(row => row.row);
}

export function isTokyoDomeSectionRowSelectable(code: string, row: number, range: readonly [number, number] | null | undefined): boolean {
  if (!Number.isSafeInteger(row) || !range || row < range[0] || row > range[1]) return false;
  const block = getTokyoDomeVerifiedSeatBlock(code);
  return !block || block.rowCoverage === "representative" || block.rows.some(candidate => candidate.row === row);
}

/** A number badge describes its reviewed row, never an unreviewed selected row. */
export function getTokyoDomeNumberReference(code: string, selectedRow: number | null): { row: number; start: number } | null {
  const block = getTokyoDomeVerifiedSeatBlock(code);
  if (!block) return null;
  const row = block.rowCoverage === "representative" ? block.rows.find(candidate => candidate.row === selectedRow) : undefined;
  return row ? { row: row.row, start: Math.min(...row.intervals.map(([start]) => start)) }
    : { row: block.numberEdge.referenceRow, start: block.numberEdge.start };
}

/** Match only individually reviewed rows, including split intervals and gaps. */
export function findTokyoDomeVerifiedSeats(row: number, seat: number, level: TokyoDomeSeatLevel = "all", direction: TokyoDomeSeatDirection = "all") {
  if (!Number.isSafeInteger(row) || !Number.isSafeInteger(seat) || row < 1 || seat < 1) return [];
  if (["right", "left", "outfield"].includes(direction)) return [];
  return SEARCHABLE_BLOCKS.filter(block => {
    if (level !== "all" && level !== block.level) return false;
    // The home-side camera includes these central blocks. The centre block is
    // shared by the two side views; it must not be silently assigned to one side.
    if (direction !== "all" && direction !== "home" && block.area !== direction && block.area !== "home") return false;
    const verifiedRow = block.rows.find(candidate => candidate.row === row);
    return verifiedRow?.intervals.some(([start, end]) => seat >= start && seat <= end) ?? false;
  });
}
