import type { SeatReport } from "@/lib/types";
import type { ArenaBlock, ArenaCell, ArenaGridResult, ParsedBlockName, BlockPosition, ArenaMapReport } from "./arenaMapTypes";

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
export const STAGE_W   = 370;
export const STAGE_GAP = 16;
export const LABEL_H   = 12;

// グリッド線の描画幅
export const GRID_STROKE_W = 0.3;

export const BRAND_NAME   = "ちけレポ";
export const BRAND_DOMAIN = "tixrepo.com";

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
      sourceKind: "user",
      externalConfidence: null,
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

// ─── ブロック名パース（動的グリッド用: 英字1文字+数字1〜20のみ成功） ────────────

function toHalfWidthUpperBlock(v: string): string {
  let s = v;
  s = s.replace(/[Ａ-Ｚ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
  s = s.replace(/[ａ-ｚ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
  s = s.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
  s = s.replace(/[a-z]/g, (c) => c.toUpperCase());
  s = s.replace(/\s+/g, "");
  return s;
}

/**
 * マップ描画用のブロック名正規化（全角→半角・大文字化・空白除去）。
 * report/ticket/page.tsx の normalizeBlock と同等の変換のみを切り出したもの（フォーム側の実装・保存処理は変更しない）。
 */
export function normalizeBlockForGrid(v: string): string {
  return toHalfWidthUpperBlock(v);
}

const GRID_COL_MAX_NUM = 20;
const GRID_BLOCK_NAME_RE = /^([A-Z])(\d{1,2})$/;

/**
 * 「英字1文字(A〜Z) + 数字(1〜20)」の形式のみ位置パース成功とみなす。
 * 数字なし("D")・英字2文字以上("SA2")・かな漢字混在("センターA")等はnull（その他ブロック行き）。
 * 行はA〜Z、列は1〜20の範囲に正規表現・数値チェックで自動的に収まる。
 */
export function parseGridBlockName(raw: string): { prefix: string; num: number } | null {
  const normalized = normalizeBlockForGrid(raw);
  const m = normalized.match(GRID_BLOCK_NAME_RE);
  if (!m) return null;
  const num = parseInt(m[2], 10);
  if (num < 1 || num > GRID_COL_MAX_NUM) return null;
  return { prefix: m[1], num };
}

// ─── グリッド拡張のしきい値（定数化。変更時はここだけ触ればよい） ──────────────

/** 行方向: I〜K（アルファベットインデックス8〜10）は1件、L〜Z（11〜25）は2件以上で拡張 */
export const ROW_EXPAND_NEAR_LAST_INDEX = 10; // "K" のインデックス(A=0始まり)
export const ROW_EXPAND_NEAR_THRESHOLD  = 1;
export const ROW_EXPAND_FAR_THRESHOLD   = 2;

/** 列方向: 9〜13は1件、14〜20は2件以上で拡張 */
export const COL_EXPAND_NEAR_LAST_NUM  = 13;
export const COL_EXPAND_NEAR_THRESHOLD = 1;
export const COL_EXPAND_FAR_THRESHOLD  = 2;

function rowExpansionThreshold(rowIndex: number): number {
  return rowIndex <= ROW_EXPAND_NEAR_LAST_INDEX ? ROW_EXPAND_NEAR_THRESHOLD : ROW_EXPAND_FAR_THRESHOLD;
}

function colExpansionThreshold(colNum: number): number {
  return colNum <= COL_EXPAND_NEAR_LAST_NUM ? COL_EXPAND_NEAR_THRESHOLD : COL_EXPAND_FAR_THRESHOLD;
}

function letterAt(index: number): string {
  return String.fromCharCode(65 + index); // 65 = "A"
}

// ─── 動的グリッドビルダー ────────────────────────────────────────────────────

/**
 * 座席報告の可視化 兼 予想図の下書き素材として、A〜H×1〜8を常に描画しつつ、
 * 報告状況に応じて必要な分だけ行・列を拡張した固定グリッドを組み立てる（グリッドは縮小しない）。
 * パースできない、または拡張後のグリッド範囲を超える報告は overflowBlocks（その他ブロック）に分離する。
 */
export function buildFixedArenaGrid(reports: ArenaMapReport[]): ArenaGridResult {
  type Parsed = { report: ArenaMapReport; prefix: string; num: number; rowIndex: number };
  const parsed: Parsed[] = [];
  const failed: ArenaMapReport[] = [];
  for (const r of reports) {
    const p = parseGridBlockName(r.block);
    if (!p) {
      failed.push(r);
      continue;
    }
    parsed.push({ report: r, prefix: p.prefix, num: p.num, rowIndex: p.prefix.charCodeAt(0) - 65 });
  }

  // 行・列ごとの件数集計（拡張判定は行・列を別々に行う）
  const rowCounts = new Map<number, number>();
  const colCounts = new Map<number, number>();
  for (const p of parsed) {
    rowCounts.set(p.rowIndex, (rowCounts.get(p.rowIndex) ?? 0) + 1);
    colCounts.set(p.num, (colCounts.get(p.num) ?? 0) + 1);
  }

  // 拡張条件を満たす行・列のうち、最も後ろのものを最終行・最終列とする
  const baseRowIndex = FIXED_PREFIXES.length - 1; // "H"
  let finalRowIndex = baseRowIndex;
  for (const [idx, count] of rowCounts) {
    if (idx > baseRowIndex && idx > finalRowIndex && count >= rowExpansionThreshold(idx)) {
      finalRowIndex = idx;
    }
  }

  const baseColNum = FIXED_NUMS.length; // 8
  let finalColNum: number = baseColNum;
  for (const [num, count] of colCounts) {
    if (num > baseColNum && num > finalColNum && count >= colExpansionThreshold(num)) {
      finalColNum = num;
    }
  }

  // Aから最終行、1から最終列まで（報告のない空セルも含めて）すべて描画
  const gridRowPrefixes = Array.from({ length: finalRowIndex + 1 }, (_, i) => letterAt(i));
  const gridColNums = Array.from({ length: finalColNum }, (_, i) => i + 1);

  const fixedMap = new Map<string, ArenaBlock>();
  for (let ri = 0; ri < gridRowPrefixes.length; ri++) {
    for (let ci = 0; ci < gridColNums.length; ci++) {
      const blockName = `${gridRowPrefixes[ri]}${gridColNums[ci]}`;
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
  function toArenaCell(r: ArenaMapReport): ArenaCell {
    return {
      row: r.row_num,
      seat: r.seat_num,
      lotteryType: r.lottery_type,
      fcHistory: r.fc_history ?? null,
      paymentMethod: r.payment_method ?? null,
      sourceKind: r.sourceKind ?? "user",
      externalConfidence: r.externalConfidence ?? null,
    };
  }

  function addToOverflow(r: ArenaMapReport) {
    const cell = toArenaCell(r);
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

  // パース失敗分はそのまま「その他」へ
  for (const r of failed) addToOverflow(r);

  // パース成功分は最終グリッド範囲内ならグリッドへ、範囲外（L3など）は「その他」へ
  for (const p of parsed) {
    const blockName = `${p.prefix}${p.num}`;
    const b = fixedMap.get(blockName);
    if (!b) {
      addToOverflow(p.report);
      continue;
    }
    const cell = toArenaCell(p.report);
    const isFirst = b.cells.length === 0;
    b.cells.push(cell);
    b.hasReports = true;
    if (isFirst) {
      b.minRow  = p.report.row_num;
      b.maxRow  = p.report.row_num;
      b.minSeat = p.report.seat_num;
      b.maxSeat = p.report.seat_num;
    } else {
      if (p.report.row_num  < b.minRow)  b.minRow  = p.report.row_num;
      if (p.report.row_num  > b.maxRow)  b.maxRow  = p.report.row_num;
      if (p.report.seat_num < b.minSeat) b.minSeat = p.report.seat_num;
      if (p.report.seat_num > b.maxSeat) b.maxSeat = p.report.seat_num;
    }
  }

  // その他ブロック: 件数降順、同数はブロック名昇順
  const overflowBlocks = [...overflowMap.values()].sort((a, b) => {
    if (b.cells.length !== a.cells.length) return b.cells.length - a.cells.length;
    return a.blockName.localeCompare(b.blockName);
  });

  return {
    gridBlocks: [...fixedMap.values()],
    overflowBlocks,
    gridRowPrefixes,
    gridColNums,
  };
}

// ─── 動的グリッドの寸法・ステージ中央配置ヘルパー ───────────────────────────

/** グリッド右端のX座標（列数に応じて可変） */
export function computeGridRightX(gridColsCount: number): number {
  return GRID_START_X + (gridColsCount - 1) * GRID_STEP_X + BLOCK_W;
}

/** グリッドの水平中央X座標。ステージ・ウォーターマークをここに中央配置する */
export function computeGridCenterX(gridColsCount: number): number {
  return (GRID_START_X + computeGridRightX(gridColsCount)) / 2;
}

/**
 * 列数に応じたSVG全体の幅。A〜H×1〜8（列8以下）は従来通りSVG_W固定のまま、
 * それを超える場合のみ右側の行ヘッダーラベルが収まる幅まで広げる。
 */
export function computeDynamicSvgWidth(gridColsCount: number): number {
  if (gridColsCount <= FIXED_NUMS.length) return SVG_W;
  const rightLabelX = computeGridRightX(gridColsCount) + 9;
  return rightLabelX + 6 + MX;
}

// ─── 透かし配置 ──────────────────────────────────────────────────────────────

/**
 * グリッド（座席セル範囲）の左上・右下座標。svgW/svgHなどキャンバス全体ではなく、
 * A〜最終行×1〜最終列のセルが実際に描画される矩形のみを表す。
 */
export function computeGridBounds(
  gridColsCount: number,
  gridRowsCount: number,
  bandTop: number,
): { left: number; top: number; right: number; bottom: number } {
  const left = GRID_START_X;
  const top = bandTop + COL_HEADER_H;
  const right = computeGridRightX(gridColsCount);
  const gridH = gridRowsCount * BLOCK_H + (gridRowsCount - 1) * BLOCK_GAP_Y;
  const bottom = top + gridH;
  return { left, top, right, bottom };
}

/**
 * 透かし(tixrepo.com)をグリッド内に分散配置するための相対位置（0〜1、グリッドの左上を(0,0)・右下を(1,1)とする）。
 * ArenaReportMap（通常表示・PNG保存）・OGPの両方でこの一箇所を共有する。
 * 左上寄り・中央・右下寄りの3箇所。グリッドが動的に拡張されても比率のため常に内側に収まる。
 */
const WATERMARK_POSITION_RATIOS: { x: number; y: number }[] = [
  { x: 0.22, y: 0.25 },
  { x: 0.5,  y: 0.5 },
  { x: 0.78, y: 0.75 },
];

/** グリッド（座席セル範囲）内に収まる透かしの実座標一覧を返す */
export function computeWatermarkPositions(
  gridColsCount: number,
  gridRowsCount: number,
  bandTop: number,
): { x: number; y: number }[] {
  const { left, top, right, bottom } = computeGridBounds(gridColsCount, gridRowsCount, bandTop);
  const w = right - left;
  const h = bottom - top;
  return WATERMARK_POSITION_RATIOS.map((r) => ({ x: left + w * r.x, y: top + h * r.y }));
}
