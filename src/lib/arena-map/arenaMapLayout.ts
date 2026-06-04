import type { SeatReport } from "@/lib/types";
import type { ArenaBlock, ArenaCell, ParsedBlockName, BlockPosition } from "./arenaMapTypes";

// ─── SVGレイアウト定数 ──────────────────────────────────────────────────────

export const SVG_W      = 320;
export const MX         = 8;
export const AVAIL_W    = SVG_W - 2 * MX;
export const CELL_MAX   = 7;
export const MIN_COLS   = 6;   // グリッドの最低列数（ブロック数基準）
export const MIN_ROWS   = 6;   // グリッドの最低行数（プレフィックス数基準）
export const BLOCK_GAP  = 3;   // ブロック間の余白（px）
export const STAGE_TOP  = 4;
export const STAGE_H    = 26;
export const STAGE_GAP  = 16;
export const LABEL_H    = 12;

export const BRAND_NAME   = "公演なう";
export const BRAND_DOMAIN = "koen-now.com";

// ─── ブロック名パース ────────────────────────────────────────────────────────

/**
 * ブロック名をプレフィックスと番号に分解する。
 * 例: "A1" → { prefix: "A", num: 1 }
 *     "SA3" → { prefix: "SA", num: 3 }
 *     "F12" → { prefix: "F", num: 12 }
 */
export function parseBlockName(blockName: string): ParsedBlockName {
  const m = blockName.match(/^([A-Za-z]+)(\d+)$/);
  if (!m) return { prefix: blockName, num: 0 };
  return { prefix: m[1].toUpperCase(), num: parseInt(m[2], 10) };
}

/**
 * プレフィックスをグリッド行インデックス（0-based）に変換する。
 * プレフィックス一覧のソート順に従い、辞書順で割り当てる。
 */
export function prefixToRow(prefix: string, allPrefixes: string[]): number {
  const sorted = [...allPrefixes].sort();
  const idx = sorted.indexOf(prefix);
  return idx >= 0 ? idx : 0;
}

/**
 * ブロック番号をグリッド列インデックス（0-based）に変換する（num - 1）。
 */
export function numToCol(num: number): number {
  return Math.max(0, num - 1);
}

/**
 * ブロック名から直接 BlockPosition を計算する。
 */
export function blockNameToPosition(
  blockName: string,
  allPrefixes: string[],
): BlockPosition {
  const { prefix, num } = parseBlockName(blockName);
  return {
    row: prefixToRow(prefix, allPrefixes),
    col: numToCol(num),
  };
}

// ─── レイアウト計算 ──────────────────────────────────────────────────────────

/**
 * SeatReport[] からプレフィックス一覧を抽出してソートする。
 */
export function extractPrefixes(reports: SeatReport[]): string[] {
  const set = new Set<string>();
  for (const r of reports) {
    set.add(parseBlockName(r.block).prefix);
  }
  return [...set].sort();
}

/**
 * SeatReport[] を ArenaBlock[] に変換する。
 * - reports が空でも空配列を返す（呼び出し側でデフォルト表示を担保する）
 */
export function buildArenaBlocks(reports: SeatReport[]): ArenaBlock[] {
  if (reports.length === 0) return [];

  const allPrefixes = extractPrefixes(reports);

  // ブロック名ごとにレポートをグループ化
  const byBlock = new Map<string, SeatReport[]>();
  for (const r of reports) {
    if (!byBlock.has(r.block)) byBlock.set(r.block, []);
    byBlock.get(r.block)!.push(r);
  }

  const blocks: ArenaBlock[] = [];
  for (const [blockName, reps] of byBlock) {
    const cells: ArenaCell[] = reps.map((r) => ({
      row:           r.row_num,
      seat:          r.seat_num,
      lotteryType:   r.lottery_type,
      fcHistory:     r.fc_history ?? null,
      paymentMethod: r.payment_method ?? null,
    }));

    const rows  = reps.map((r) => r.row_num);
    const seats = reps.map((r) => r.seat_num);

    blocks.push({
      blockName,
      position: blockNameToPosition(blockName, allPrefixes),
      cells,
      minRow:     Math.min(...rows),
      maxRow:     Math.max(...rows),
      minSeat:    Math.min(...seats),
      maxSeat:    Math.max(...seats),
      hasReports: true,
    });
  }

  return blocks;
}

/**
 * グリッドの総行数・総列数を計算する（最低 MIN_ROWS × MIN_COLS を保証）。
 */
export function computeGridSize(blocks: ArenaBlock[]): { gridRows: number; gridCols: number } {
  if (blocks.length === 0) {
    return { gridRows: MIN_ROWS, gridCols: MIN_COLS };
  }
  const maxRow = Math.max(...blocks.map((b) => b.position.row));
  const maxCol = Math.max(...blocks.map((b) => b.position.col));
  return {
    gridRows: Math.max(maxRow + 1, MIN_ROWS),
    gridCols: Math.max(maxCol + 1, MIN_COLS),
  };
}

/**
 * セルサイズを計算する（利用可能幅 / グリッド列数、上限 CELL_MAX）。
 */
export function computeCellSize(gridCols: number): number {
  return Math.min(Math.floor(AVAIL_W / gridCols), CELL_MAX);
}
