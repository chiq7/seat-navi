import type { SeatReport } from "@/lib/types";
import type { ArenaBlock, ArenaCell, ParsedBlockName, BlockPosition } from "./arenaMapTypes";

// ─── 固定グリッド定数 ───────────────────────────────────────────────────────

export const FIXED_PREFIXES = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;
export const FIXED_NUMS     = [1, 2, 3, 4, 5, 6, 7, 8] as const;

// ─── SVGレイアウト定数 ──────────────────────────────────────────────────────

export const SVG_W   = 526;
export const MX      = 10;
export const AVAIL_W = SVG_W - 2 * MX;

// ブロック内座席セルのサイズ（デフォルト時）
export const SEAT_CELL           = 2;
export const DEFAULT_BLOCK_SEATS = 24;
export const DEFAULT_BLOCK_ROWS  = 10;

// ブロックの表示サイズ（px）— cellW=2.5px, cellH=3px
export const BLOCK_W = 60;
export const BLOCK_H = 30;

// グリッドヘッダー
export const COL_HEADER_H = 8;
export const ROW_HEADER_W = 10;

// ブロック間隔・ステップ
export const BLOCK_GAP_X = 2;
export const BLOCK_GAP_Y = 2;
export const GRID_STEP_X = BLOCK_W + BLOCK_GAP_X;  // 50
export const GRID_STEP_Y = BLOCK_H + BLOCK_GAP_Y;  // 22

// グリッド全体幅・開始X（行ヘッダー分を含む）
export const GRID_TOTAL_W = FIXED_NUMS.length * BLOCK_W + (FIXED_NUMS.length - 1) * BLOCK_GAP_X;  // 398
export const GRID_START_X = MX + ROW_HEADER_W + 2;  // 22

// 後方互換エイリアス
export const BLOCK_SIZE = BLOCK_W;
export const BLOCK_GAP  = BLOCK_GAP_X;
export const GRID_STEP  = GRID_STEP_X;

// ステージ
export const STAGE_TOP = 4;
export const STAGE_H   = 26;
export const STAGE_GAP = 16;
export const LABEL_H   = 12;

// グリッド線の描画幅
export const GRID_STROKE_W = 0.3;

export const BRAND_NAME   = "公演なう";
export const BRAND_DOMAIN = "koen-now.com";

// ─── ブロック名パース ────────────────────────────────────────────────────────

export function parseBlockName(blockName: string): ParsedBlockName {
  const m = blockName.match(/^([A-Za-z]+)(\d+)$/);
  if (!m) return { prefix: blockName, num: 0 };
  return { prefix: m[1].toUpperCase(), num: parseInt(m[2], 10) };
}

export function prefixToRow(prefix: string, allPrefixes: string[]): number {
  const sorted = [...allPrefixes].sort();
  const idx = sorted.indexOf(prefix);
  return idx >= 0 ? idx : 0;
}

export function numToCol(num: number): number {
  return Math.max(0, num - 1);
}

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

// ─── レイアウト計算（旧API、後方互換） ──────────────────────────────────────

export const CELL_MAX  = 7;
export const MIN_COLS  = 6;
export const MIN_ROWS  = 6;

export function extractPrefixes(reports: SeatReport[]): string[] {
  const set = new Set<string>();
  for (const r of reports) {
    set.add(parseBlockName(r.block).prefix);
  }
  return [...set].sort();
}

export function buildArenaBlocks(reports: SeatReport[]): ArenaBlock[] {
  if (reports.length === 0) return [];

  const allPrefixes = extractPrefixes(reports);
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
      minRow:  Math.min(...rows),
      maxRow:  Math.max(...rows),
      minSeat: Math.min(...seats),
      maxSeat: Math.max(...seats),
      hasReports: true,
    });
  }
  return blocks;
}

export function computeGridSize(blocks: ArenaBlock[]): { gridRows: number; gridCols: number } {
  if (blocks.length === 0) return { gridRows: MIN_ROWS, gridCols: MIN_COLS };
  const maxRow = Math.max(...blocks.map((b) => b.position.row));
  const maxCol = Math.max(...blocks.map((b) => b.position.col));
  return {
    gridRows: Math.max(maxRow + 1, MIN_ROWS),
    gridCols: Math.max(maxCol + 1, MIN_COLS),
  };
}

export function computeCellSize(gridCols: number): number {
  return Math.min(Math.floor(AVAIL_W / gridCols), CELL_MAX);
}

// ─── 固定グリッドビルダー ────────────────────────────────────────────────────

/**
 * A〜H × 1〜8 の64固定ブロックを生成し、reports を重ね合わせる。
 * 固定グリッド外のブロックは overflowBlocks に分離する。
 */
export function buildFixedArenaGrid(reports: SeatReport[]): {
  gridBlocks: ArenaBlock[];
  overflowBlocks: ArenaBlock[];
} {
  const fixedMap = new Map<string, ArenaBlock>();
  for (let ri = 0; ri < FIXED_PREFIXES.length; ri++) {
    for (let ci = 0; ci < FIXED_NUMS.length; ci++) {
      const blockName = `${FIXED_PREFIXES[ri]}${FIXED_NUMS[ci]}`;
      fixedMap.set(blockName, {
        blockName,
        position: { row: ri, col: ci },
        cells: [],
        minRow: 0,
        maxRow: 0,
        minSeat: 0,
        maxSeat: 0,
        hasReports: false,
      });
    }
  }

  const overflowMap = new Map<string, ArenaBlock>();
  for (const r of reports) {
    const cell: ArenaCell = {
      row:           r.row_num,
      seat:          r.seat_num,
      lotteryType:   r.lottery_type,
      fcHistory:     r.fc_history ?? null,
      paymentMethod: r.payment_method ?? null,
    };
    if (fixedMap.has(r.block)) {
      const b = fixedMap.get(r.block)!;
      const isFirst = b.cells.length === 0;
      b.cells.push(cell);
      b.hasReports = true;
      if (isFirst) {
        b.minRow  = r.row_num;
        b.maxRow  = r.row_num;
        b.minSeat = r.seat_num;
        b.maxSeat = r.seat_num;
      } else {
        if (r.row_num  < b.minRow)  b.minRow  = r.row_num;
        if (r.row_num  > b.maxRow)  b.maxRow  = r.row_num;
        if (r.seat_num < b.minSeat) b.minSeat = r.seat_num;
        if (r.seat_num > b.maxSeat) b.maxSeat = r.seat_num;
      }
    } else {
      if (!overflowMap.has(r.block)) {
        overflowMap.set(r.block, {
          blockName: r.block,
          position: { row: 0, col: 0 },
          cells: [],
          minRow:  r.row_num,
          maxRow:  r.row_num,
          minSeat: r.seat_num,
          maxSeat: r.seat_num,
          hasReports: true,
        });
      } else {
        const ob = overflowMap.get(r.block)!;
        if (r.row_num  < ob.minRow)  ob.minRow  = r.row_num;
        if (r.row_num  > ob.maxRow)  ob.maxRow  = r.row_num;
        if (r.seat_num < ob.minSeat) ob.minSeat = r.seat_num;
        if (r.seat_num > ob.maxSeat) ob.maxSeat = r.seat_num;
      }
      overflowMap.get(r.block)!.cells.push(cell);
    }
  }

  return {
    gridBlocks: [...fixedMap.values()],
    overflowBlocks: [...overflowMap.values()],
  };
}
