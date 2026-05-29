"use client";

import { useMemo, useState } from "react";
import type { PredictionMap, BlockAnalysis } from "@/lib/seatPrediction";
import type {
  LayoutHint,
  MissingMarker,
  PositionedBlock,
  Rect,
  SeatPredictionLayoutHints,
  ShapeCandidate,
  Slot,
} from "@/lib/seatPredictionImageTypes";
import {
  blockCols,
  clamp,
  parsePositionedBlockName,
  unionRects,
} from "@/lib/seatPredictionImageLayout";

// ── レイアウト定数 ───────────────────────────────────────────────
const SVG_W = 320;
const MX = 8;
const AVAIL_W = SVG_W - 2 * MX;
const CELL_MAX = 7; // セルサイズ上限（全ブロック統一・正方形）
const MIN_ROWS = 10; // 高さの最低行数
const MIN_COLS = 16; // 各ブロック幅の最低列数
const BLOCK_GAP_COLS = 2;
const MISSING_COLS = 5; // 欠番ブロックの白抜き幅
const STAGE_TOP = 4;
const STAGE_H = 26;
const STAGE_GAP = 16;
const LABEL_H = 12; // ブロック上のラベル領域
const BAND_GAP = 16;

const REPORTED_FILL = "#5B2BE0"; // 報告席（単色）
const UNREPORTED_FILL = "#F6F4FB"; // 未報告席グリッドの背景（全row×col）
const GRID_STROKE = "#E3DEF2"; // 未報告席のグリッド線
const GAP_FILL = "#FFFFFF"; // 白抜きgap（グリッドを消す）
const GAP_EDGE_STROKE = "#D4C9A8";
const BRAND_NAME = "公演なう";
const BRAND_DOMAIN = "koen-now.com";

type ColorMode = "lottery" | "fcHistory" | "ticketCount" | "payment" | "upgrade";

const COLOR_MODE_OPTIONS: { value: ColorMode; label: string; disabled?: boolean }[] = [
  { value: "lottery", label: "抽選順" },
  { value: "fcHistory", label: "FC歴" },
  { value: "ticketCount", label: "枚数", disabled: true },
  { value: "payment", label: "支払い" },
  { value: "upgrade", label: "アプグレ" },
];

const LOTTERY_COLORS: Record<string, string> = {
  fc1: "#5B2BE0",
  fc2: "#2563EB",
  general: "#0F766E",
  upgrade: "#DC2626",
  revival: "#D97706",
  production: "#7C3AED",
};

const FC_HISTORY_COLORS: Record<string, string> = {
  under_1_year: "#38BDF8",
  one_to_three_years: "#22C55E",
  over_3_years: "#A855F7",
};

const PAYMENT_COLORS: Record<string, string> = {
  credit: "#2563EB",
  convenience: "#F59E0B",
  other: "#6B7280",
};

function kindToLabel(kind: string): { label: string; color: string } {
  if (kind === "hanamichi") return { label: "花道候補", color: "#D97706" };
  if (kind === "yokoHanamichi") return { label: "横花候補", color: "#2563EB" };
  return { label: "通路候補", color: "#6B7280" };
}

function seatCellFill(
  cell: PositionedBlock["cells"][number],
  colorMode: ColorMode,
): string {
  if (colorMode === "lottery") return LOTTERY_COLORS[cell.lotteryType] ?? REPORTED_FILL;
  if (colorMode === "fcHistory") {
    return cell.fcHistory ? FC_HISTORY_COLORS[cell.fcHistory] ?? REPORTED_FILL : REPORTED_FILL;
  }
  if (colorMode === "payment") {
    return cell.paymentMethod ? PAYMENT_COLORS[cell.paymentMethod] ?? REPORTED_FILL : REPORTED_FILL;
  }
  if (colorMode === "upgrade") return cell.lotteryType === "upgrade" ? "#DC2626" : REPORTED_FILL;
  return REPORTED_FILL;
}

// 各ブロック幅: 自分のseat spanを基準に16〜30列。小さいブロックは無駄に広げない。
const EMPTY_LAYOUT_HINTS: SeatPredictionLayoutHints = {};

function makePositioned(
  b: BlockAnalysis,
  blockX: number,
  blockY: number,
  cell: number,
  wCols: number,
  hRows: number,
  layoutHint?: LayoutHint,
): PositionedBlock {
  const seatSpan = b.maxSeat - b.minSeat + 1;
  const usesCutSideLayout = !!layoutHint?.cutSide && layoutHint.cutSide !== "none";
  const blockW = wCols * cell;
  const blockH = hRows * cell;
  const cutSide = layoutHint?.cutSide ?? "none";
  const oneSideCutCols = cutSide === "none" ? 0 : Math.max(3, Math.floor(wCols * 0.38));
  const bothSideCutCols = cutSide === "both" ? Math.max(2, Math.floor(wCols * 0.22)) : 0;
  const leftCutCols = cutSide === "left" ? oneSideCutCols : bothSideCutCols;
  const rightCutCols = cutSide === "right" ? oneSideCutCols : bothSideCutCols;
  const usableCols = usesCutSideLayout ? wCols : Math.max(1, wCols - leftCutCols - rightCutCols);

  // seat番号 → 列インデックス（span超過時のみ右側を圧縮）
  const TAIL = 4;
  const linearCols = Math.max(1, usableCols - TAIL);
  const col = (seat: number): number => {
    if (usesCutSideLayout) {
      const idx = Math.max(seat - 1, 0);
      if (b.maxSeat <= usableCols) return clamp(idx, 0, usableCols - 1);
      if (idx < linearCols) return idx;
      const overflowTotal = b.maxSeat - linearCols;
      return linearCols + Math.round(((idx - linearCols) / Math.max(overflowTotal - 1, 1)) * (TAIL - 1));
    }

    const idx = seat - b.minSeat;
    if (seatSpan <= usableCols) return leftCutCols + idx;
    if (idx < linearCols) return leftCutCols + idx;
    const overflowTotal = seatSpan - linearCols;
    return leftCutCols + linearCols + Math.round(((idx - linearCols) / Math.max(overflowTotal - 1, 1)) * (TAIL - 1));
  };

  const cells = b.seatCells.map((c) => ({
    ...c,
    x: blockX + col(c.seat) * cell,
    y: blockY + (c.row - b.minRow) * cell,
  }));

  // 全row×col範囲に未報告グリッド（下部の高さ揃え領域もグリッドとして描く）
  const vLines: number[] = [];
  for (let c = 0; c <= wCols; c++) vLines.push(blockX + c * cell);
  const hLines: number[] = [];
  for (let r = 0; r <= hRows; r++) hLines.push(blockY + r * cell);

  // gap候補のみグリッドを消して白抜きにする
  const whiteRects: Rect[] = [];
  if (leftCutCols > 0) {
    whiteRects.push({
      x: blockX,
      y: blockY,
      w: leftCutCols * cell,
      h: blockH,
      axis: "seat",
      source: "cut",
      cutSide: "left",
    });
  }
  if (rightCutCols > 0) {
    whiteRects.push({
      x: blockX + (wCols - rightCutCols) * cell,
      y: blockY,
      w: rightCutCols * cell,
      h: blockH,
      axis: "seat",
      source: "cut",
      cutSide: "right",
    });
  }
  for (const g of b.gaps) {
    if (g.axis === "seat") {
      // 縦の通路/花道は全高で白抜き（アリーナの通路らしく）
      const left = blockX + (col(g.from) + 1) * cell;
      const right = blockX + col(g.to) * cell;
      if (right - left > 0.5) {
        whiteRects.push({
          x: left,
          y: blockY,
          w: right - left,
          h: blockH,
          axis: "seat",
          source: "gap",
          gapKind: g.kind,
        });
      }
    } else {
      const top = blockY + (g.from - b.minRow + 1) * cell;
      const bottom = blockY + (g.to - b.minRow) * cell;
      if (bottom - top > 0.5) {
        whiteRects.push({
          x: blockX,
          y: top,
          w: blockW,
          h: bottom - top,
          axis: "row",
          source: "gap",
          gapKind: g.kind,
        });
      }
    }
  }

  // 1ブロック1主役バッジ: 花道 > 横花 > 通路
  const kindSet = new Set<string>();
  for (const g of b.gaps) kindSet.add(g.kind);
  let primary: string | null = null;
  if (kindSet.has("hanamichi")) primary = "hanamichi";
  else if (kindSet.has("yokoHanamichi")) primary = "yokoHanamichi";
  else if (kindSet.has("passage")) primary = "passage";

  return {
    block: b.block,
    x: blockX,
    y: blockY,
    blockW,
    blockH,
    cells,
    vLines,
    hLines,
    whiteRects,
    topRightLabel: primary ? kindToLabel(primary) : null,
  };
}

function makeExpectedBlock(block: string, rowSpan: number): BlockAnalysis | null {
  const parsed = parsePositionedBlockName(block);
  if (!parsed) return null;

  return {
    block,
    prefix: parsed.prefix,
    num: parsed.num,
    reportCount: 0,
    minRow: 1,
    maxRow: Math.max(rowSpan, MIN_ROWS),
    minSeat: 1,
    maxSeat: MIN_COLS,
    rowNums: [],
    rowGaps: [],
    seatGaps: [],
    persistentSeatGaps: [],
    seatCells: [],
    gaps: [],
    isHanamichiCandidate: false,
    isYokoHanamichiCandidate: false,
    isCenterStageCandidate: false,
    isPassageCandidate: false,
  };
}

function canShowHanamichiCandidate(block: PositionedBlock): boolean {
  const parsed = parsePositionedBlockName(block.block);
  return parsed?.prefix === "A";
}

function isCentralSeatGap(block: PositionedBlock, rect: Rect): boolean {
  if (rect.source !== "gap" || rect.axis !== "seat") return false;
  const blockCenter = block.x + block.blockW / 2;
  const rectCenter = rect.x + rect.w / 2;
  return rect.w >= block.blockW * 0.25 && Math.abs(rectCenter - blockCenter) <= block.blockW * 0.28;
}

function hasSparseMiddleReports(
  middleBlock: PositionedBlock | undefined,
  leftBlock: PositionedBlock,
  rightBlock: PositionedBlock,
): boolean {
  if (!middleBlock) return false;
  const middleCount = middleBlock.cells.length;
  const neighborAverage = (leftBlock.cells.length + rightBlock.cells.length) / 2;
  return middleCount <= 5 || middleCount <= neighborAverage * 0.2;
}

function buildShapeCandidates(
  positioned: PositionedBlock[],
  missingMarkers: MissingMarker[],
  layoutHints: SeatPredictionLayoutHints,
  totalReports: number,
): ShapeCandidate[] {
  const out: ShapeCandidate[] = [];
  const byBlock = new Map(positioned.map((b) => [b.block, b]));
  const consumedMissing = new Set<string>();
  const addedHanamichi = new Set<string>();
  const manualCandidates = new Set<string>();

  for (const block of positioned) {
    const hint = layoutHints[block.block];
    const candidate = hint?.candidate;
    if (!candidate) continue;
    const frameExpandX = candidate === "centerStage" ? hint?.frameExpandX ?? 0 : 0;
    const isCenterBand = candidate === "hanamichi" && hint?.candidateScope === "centerBand";
    const bandW = isCenterBand
      ? block.blockW * clamp(hint?.bandWidthRatio ?? 0.28, 0.05, 1)
      : block.blockW;
    const candidateX = isCenterBand ? block.x + (block.blockW - bandW) / 2 : block.x;

    out.push({
      kind: candidate,
      x: candidateX - 1.5,
      y: block.y - 2,
      w: bandW + 3,
      h: block.blockH + 4,
      frameX: candidateX - 1.5 - frameExpandX,
      frameY: block.y - 2,
      frameW: bandW + 3 + frameExpandX * 2,
      frameH: block.blockH + 4,
      label: candidate === "centerStage" ? "センステ候補" : "花道候補",
    });
    manualCandidates.add(`${candidate}:${block.block}`);
    if (candidate === "hanamichi") addedHanamichi.add(block.block);
  }

  for (const block of positioned) {
    if (manualCandidates.has(`hanamichi:${block.block}`)) continue;
    if (!canShowHanamichiCandidate(block)) continue;
    const hanamichiGap = block.whiteRects.find(
      (r) => r.gapKind === "hanamichi" || isCentralSeatGap(block, r),
    );
    if (!hanamichiGap) continue;

    out.push({
      kind: "hanamichi",
      x: hanamichiGap.x - 1.5,
      y: hanamichiGap.y - 2,
      w: hanamichiGap.w + 3,
      h: hanamichiGap.h + 4,
      label: "花道候補",
    });
    addedHanamichi.add(block.block);
  }

  if (totalReports >= 50) {
    for (const missing of missingMarkers) {
      const leftBlock = byBlock.get(`${missing.prefix}${missing.num - 1}`);
      const rightBlock = byBlock.get(`${missing.prefix}${missing.num + 1}`);
      const leftHint = layoutHints[leftBlock?.block ?? ""]?.cutSide;
      const rightHint = layoutHints[rightBlock?.block ?? ""]?.cutSide;
      if (!leftBlock || !rightBlock || leftHint !== "right" || rightHint !== "left") continue;

      const leftCut = leftBlock.whiteRects.find((r) => r.source === "cut" && r.cutSide === "right");
      const rightCut = rightBlock.whiteRects.find((r) => r.source === "cut" && r.cutSide === "left");
      if (!leftCut || !rightCut) continue;

      const rect = unionRects([leftCut, missing, rightCut]);
      if (manualCandidates.has(`centerStage:${missing.block}`)) continue;
      out.push({
        kind: "centerStage",
        x: rect.x - 1.5,
        y: rect.y - 2,
        w: rect.w + 3,
        h: rect.h + 4,
        label: "センステ候補",
      });
      consumedMissing.add(missing.block);
    }

    for (const leftBlock of positioned) {
      const parsed = parsePositionedBlockName(leftBlock.block);
      if (!parsed || layoutHints[leftBlock.block]?.cutSide !== "right") continue;

      const rightBlock = byBlock.get(`${parsed.prefix}${parsed.num + 2}`);
      if (!rightBlock || layoutHints[rightBlock.block]?.cutSide !== "left") continue;

      const middleBlockName = `${parsed.prefix}${parsed.num + 1}`;
      if (manualCandidates.has(`centerStage:${middleBlockName}`)) continue;
      if (consumedMissing.has(middleBlockName)) continue;

      const leftCut = leftBlock.whiteRects.find((r) => r.source === "cut" && r.cutSide === "right");
      const rightCut = rightBlock.whiteRects.find((r) => r.source === "cut" && r.cutSide === "left");
      if (!leftCut || !rightCut) continue;

      const middleBlock = byBlock.get(middleBlockName);
      const middleCentralGap = middleBlock?.whiteRects.find((r) => isCentralSeatGap(middleBlock, r));
      const upstreamBlock = byBlock.get(`A${parsed.num + 1}`);
      const upstreamHanamichi = upstreamBlock?.whiteRects.some(
        (r) => r.gapKind === "hanamichi" || isCentralSeatGap(upstreamBlock, r),
      );
      const sparseMiddleReports = hasSparseMiddleReports(middleBlock, leftBlock, rightBlock);
      const evidenceCount =
        Number(!!leftCut) +
        Number(!!rightCut) +
        Number(!!upstreamHanamichi) +
        Number(!!middleCentralGap);
      if (evidenceCount < 2) continue;
      if (!middleCentralGap && !(sparseMiddleReports && upstreamHanamichi)) continue;

      const rect = middleCentralGap
        ? unionRects([leftCut, middleCentralGap, rightCut])
        : unionRects([leftCut, rightCut]);
      out.push({
        kind: "centerStage",
        x: rect.x - 1.5,
        y: rect.y - 2,
        w: rect.w + 3,
        h: rect.h + 4,
        label: "センステ候補",
      });
    }
  }

  for (const missing of missingMarkers) {
    if (consumedMissing.has(missing.block)) continue;
    const missingParsed = parsePositionedBlockName(missing.block);
    if (missingParsed?.prefix !== "A") continue;
    const hasLeft = byBlock.has(`${missing.prefix}${missing.num - 1}`);
    const hasRight = byBlock.has(`${missing.prefix}${missing.num + 1}`);
    if (!hasLeft || !hasRight) continue;
    if (addedHanamichi.has(missing.block)) continue;
    if (manualCandidates.has(`hanamichi:${missing.block}`)) continue;

    out.push({
      kind: "hanamichi",
      x: missing.x - 1.5,
      y: missing.y - 2,
      w: missing.w + 3,
      h: missing.h + 4,
      label: "花道候補",
    });
  }

  return out;
}

export function SeatPredictionImage({
  prediction,
  layoutHints = EMPTY_LAYOUT_HINTS,
  expectedBlocks,
  submitPredictionHref,
}: {
  prediction: PredictionMap;
  layoutHints?: SeatPredictionLayoutHints;
  expectedBlocks?: string[];
  submitPredictionHref?: string;
}) {
  const { totalReports, confidence, blocks, missingBlockCandidates } = prediction;
  const [shareStatus, setShareStatus] = useState("");
  const [colorMode, setColorMode] = useState<ColorMode>("lottery");

  const layout = useMemo(() => {
    const rowSpan = blocks.length
      ? Math.max(...blocks.map((b) => b.maxRow - b.minRow + 1))
      : MIN_ROWS;
    const blockMap = new Map(blocks.map((b) => [b.block, b]));
    const expectedOnlyBlocks =
      expectedBlocks
        ?.filter((block) => !blockMap.has(block))
        .map((block) => makeExpectedBlock(block, rowSpan))
        .filter((block): block is BlockAnalysis => block !== null) ?? [];
    const renderBlocks = expectedBlocks?.length ? [...blocks, ...expectedOnlyBlocks] : blocks;

    if (renderBlocks.length === 0) return null;

    const globalMaxRowSpan = Math.max(...renderBlocks.map((b) => b.maxRow - b.minRow + 1));
    const hRows = Math.max(globalMaxRowSpan, MIN_ROWS);

    // prefixごとにバンド化（A前方→B中間→C後方）
    const groups = new Map<string, BlockAnalysis[]>();
    for (const b of renderBlocks) {
      if (!groups.has(b.prefix)) groups.set(b.prefix, []);
      groups.get(b.prefix)!.push(b);
    }
    const prefixes = [...groups.keys()].sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true }),
    );

    const missByPrefix = new Map<string, Set<number>>();
    for (const name of missingBlockCandidates) {
      const m = name.match(/^(.*?)(\d+)$/);
      if (!m) continue;
      const p = m[1];
      const n = parseInt(m[2], 10);
      if (!missByPrefix.has(p)) missByPrefix.set(p, new Set());
      missByPrefix.get(p)!.add(n);
    }

    const groupSlots = new Map<string, Slot[]>();
    let maxBandCols = 1;
    for (const prefix of prefixes) {
      const gb = groups.get(prefix)!.slice().sort((a, b) => a.num - b.num);
      const present = new Set(gb.map((b) => b.num));
      const miss = missByPrefix.get(prefix) ?? new Set<number>();
      const minN = gb[0].num;
      const maxN = gb[gb.length - 1].num;
      const slots: Slot[] = [];
      for (let n = minN; n <= maxN; n++) {
        if (present.has(n)) {
          const b = gb.find((x) => x.num === n)!;
          slots.push({ kind: "block", b, cols: blockCols(b) });
        } else if (miss.has(n)) {
          slots.push({ kind: "missing", prefix, num: n, cols: MISSING_COLS });
        }
      }
      groupSlots.set(prefix, slots);
      const tot =
        slots.reduce((s, sl) => s + sl.cols, 0) + BLOCK_GAP_COLS * Math.max(slots.length - 1, 0);
      if (tot > maxBandCols) maxBandCols = tot;
    }

    const cell = Math.min(CELL_MAX, AVAIL_W / maxBandCols);

    const positioned: PositionedBlock[] = [];
    const missingMarkers: MissingMarker[] = [];
    let y = STAGE_TOP + STAGE_H + STAGE_GAP;
    const blockH = hRows * cell;
    for (const prefix of prefixes) {
      const slots = groupSlots.get(prefix)!;
      const bandTop = y + LABEL_H;
      const tot =
        slots.reduce((s, sl) => s + sl.cols, 0) + BLOCK_GAP_COLS * Math.max(slots.length - 1, 0);
      const bandWidth = tot * cell;
      let x = MX + (AVAIL_W - bandWidth) / 2;
      for (const sl of slots) {
        const slotW = sl.cols * cell;
        if (sl.kind === "block") {
          positioned.push(makePositioned(sl.b, x, bandTop, cell, sl.cols, hRows, layoutHints[sl.b.block]));
        } else {
          missingMarkers.push({
            block: `${prefix}${sl.num}`,
            prefix,
            num: sl.num,
            x,
            y: bandTop,
            w: slotW,
            h: blockH,
          });
        }
        x += slotW + BLOCK_GAP_COLS * cell;
      }
      y = bandTop + blockH + BAND_GAP;
    }
    const svgH = y;

    const shapeCandidates = buildShapeCandidates(positioned, missingMarkers, layoutHints, totalReports);

    return { svgH, positioned, missingMarkers, shapeCandidates, cell };
  }, [blocks, expectedBlocks, missingBlockCandidates, layoutHints, totalReports]);

  async function handleShare() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${BRAND_NAME}の座席報告マップ`,
          text: "このマップをスクショして、花道・センステ予想を書き込んで投稿しよう",
          url,
        });
        setShareStatus("共有を開きました");
      } else {
        await navigator.clipboard.writeText(url);
        setShareStatus("URLをコピーしました");
      }
    } catch {
      setShareStatus("");
    }
  }

  if (totalReports === 0) return null;

  if (confidence === "insufficient" || !layout) {
    return (
      <div className="mb-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <p className="text-xs font-bold text-gray-700">座席報告マップ</p>
        <p className="mt-2 text-[11px] leading-relaxed text-gray-500">
          報告が少ないため、まだマップを作成できません。座席報告にご協力ください。
        </p>
        <p className="mt-1 text-[10px] text-gray-400">
          現在 {totalReports}件の報告（10件以上でマップ表示）
        </p>
      </div>
    );
  }

  const { svgH, positioned, shapeCandidates, cell } = layout;
  const cellInset = cell * 0.06;
  const cellSize = cell - cellInset * 2;
  const hasCenterAreaCandidate = blocks.some((b) => b.isCenterStageCandidate);

  return (
    <div className="mb-4 overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="mb-2">
        <p className="text-xs font-bold text-gray-700">座席報告マップ</p>
        <p className="mt-1 text-[11px] font-bold text-gray-600">
          {BRAND_NAME}｜{BRAND_DOMAIN}
        </p>
        {confidence === "low" && (
          <span className="mt-1 inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[10px] text-amber-600">報告少</span>
        )}
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[10px] font-bold text-gray-500">色分け</span>
        {COLOR_MODE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            disabled={option.disabled}
            onClick={() => setColorMode(option.value)}
            className={`rounded-full px-2 py-1 text-[10px] font-bold ${
              colorMode === option.value ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500"
            } disabled:cursor-not-allowed disabled:opacity-45`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <svg
        viewBox={`0 0 ${SVG_W} ${svgH}`}
        width="100%"
        aria-label="座席報告マップ（参考・模式図）"
        style={{ overflow: "visible" }}
      >
        {/* メインステージ */}
        <rect x={SVG_W / 2 - 90} y={STAGE_TOP} width={180} height={STAGE_H} rx={5} fill="#1F2937" />
        <text
          x={SVG_W / 2}
          y={STAGE_TOP + STAGE_H / 2 + 2}
          textAnchor="middle"
          fill="white"
          fontSize={8}
          fontWeight="bold"
        >
          メインステージ
        </text>

        {/* ブロック */}
        {positioned.map((pb) => (
          <g key={pb.block}>
            {/* ブロック名 */}
            <text x={pb.x} y={pb.y - 3} fill="#6B7280" fontSize={6.5} fontWeight="bold">
              {pb.block}
            </text>
            {/* 主役バッジ（右上・座席や白抜きに重ねない） */}
            {pb.topRightLabel && (
              <text
                x={pb.x + pb.blockW}
                y={pb.y - 3}
                textAnchor="end"
                fontSize={6}
                fontWeight="bold"
                fill={pb.topRightLabel.color}
              >
                {pb.topRightLabel.label}
              </text>
            )}

            {/* 未報告席グリッドの背景（全row×col） */}
            <rect x={pb.x} y={pb.y} width={pb.blockW} height={pb.blockH} rx={2} fill={UNREPORTED_FILL} />

            {/* 未報告席のグリッド線（全高） */}
            {pb.vLines.map((vx, i) => (
              <line key={`v${i}`} x1={vx} y1={pb.y} x2={vx} y2={pb.y + pb.blockH} stroke={GRID_STROKE} strokeWidth={0.4} />
            ))}
            {pb.hLines.map((hy, i) => (
              <line key={`h${i}`} x1={pb.x} y1={hy} x2={pb.x + pb.blockW} y2={hy} stroke={GRID_STROKE} strokeWidth={0.4} />
            ))}

            {/* gap = 白抜き空白（グリッドを消し薄い背景色） */}
            {pb.whiteRects.map((wr, i) => (
              <g key={`g${i}`}>
                <rect x={wr.x} y={wr.y} width={wr.w} height={wr.h} fill={GAP_FILL} />
                {wr.axis === "seat" ? (
                  <>
                    <line x1={wr.x} y1={wr.y} x2={wr.x} y2={wr.y + wr.h} stroke={GAP_EDGE_STROKE} strokeOpacity={0.2} strokeWidth={0.5} />
                    <line x1={wr.x + wr.w} y1={wr.y} x2={wr.x + wr.w} y2={wr.y + wr.h} stroke={GAP_EDGE_STROKE} strokeOpacity={0.2} strokeWidth={0.5} />
                  </>
                ) : (
                  <>
                    <line x1={wr.x} y1={wr.y} x2={wr.x + wr.w} y2={wr.y} stroke={GAP_EDGE_STROKE} strokeOpacity={0.2} strokeWidth={0.5} />
                    <line x1={wr.x} y1={wr.y + wr.h} x2={wr.x + wr.w} y2={wr.y + wr.h} stroke={GAP_EDGE_STROKE} strokeOpacity={0.2} strokeWidth={0.5} />
                  </>
                )}
              </g>
            ))}

          </g>
        ))}

        {shapeCandidates.map((shape, i) => (
          <rect
            key={`shape-blank-${shape.kind}-${i}`}
            x={shape.x}
            y={shape.y}
            width={shape.w}
            height={shape.h}
            rx={3}
            fill={GAP_FILL}
          />
        ))}

        {positioned.map((pb) => (
          <g key={`cells-${pb.block}`}>
            {pb.cells.map((c, i) => (
              <rect
                key={`c${i}`}
                x={c.x + cellInset}
                y={c.y + cellInset}
                width={cellSize}
                height={cellSize}
                rx={0.5}
                fill={seatCellFill(c, colorMode)}
                fillOpacity={0.9}
              />
            ))}
          </g>
        ))}

        <text
          x={SVG_W / 2}
          y={svgH / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#111827"
          fillOpacity={0.14}
          fontSize={22}
          fontWeight="bold"
          transform={`rotate(-18 ${SVG_W / 2} ${svgH / 2})`}
          pointerEvents="none"
        >
          {BRAND_DOMAIN}
        </text>

        {shapeCandidates.map((shape, i) => {
          const stroke = shape.kind === "centerStage" ? "#F59E0B" : "#22C55E";
          const frameX = shape.frameX ?? shape.x;
          const frameY = shape.frameY ?? shape.y;
          const frameW = shape.frameW ?? shape.w;
          const frameH = shape.frameH ?? shape.h;
          return (
            <g key={`shape-${shape.kind}-${i}`}>
              <rect
                x={frameX}
                y={frameY}
                width={frameW}
                height={frameH}
                rx={3}
                fill="none"
                stroke={stroke}
                strokeOpacity={0.55}
                strokeWidth={1}
              />
              {shape.kind === "hanamichi" ? (
                <text
                  x={frameX + frameW / 2}
                  y={frameY + frameH / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={6}
                  fontWeight="bold"
                  fill={stroke}
                  fillOpacity={0.72}
                  style={{ writingMode: "vertical-rl" }}
                >
                  {shape.label}
                </text>
              ) : (
                <text
                  x={frameX + frameW / 2}
                  y={frameY + frameH / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={6}
                  fontWeight="bold"
                  fill={stroke}
                  fillOpacity={0.72}
                >
                  {shape.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      <div className="mt-3 rounded-xl border border-purple-100 bg-purple-50/60 p-3">
        <p className="text-[11px] font-bold text-gray-800">
          このマップをスクショして、花道・センステ予想を書き込んで投稿しよう
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleShare}
            className="rounded-full bg-gray-900 px-3 py-2 text-[11px] font-bold text-white"
          >
            このマップを共有する
          </button>
          {submitPredictionHref ? (
            <a
              href={submitPredictionHref}
              className="rounded-full bg-purple-600 px-3 py-2 text-center text-[11px] font-bold text-white shadow-sm shadow-purple-200 active:scale-95"
            >
              予想画像を投稿する
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="rounded-full bg-gray-200 px-3 py-2 text-[11px] font-bold text-gray-500"
            >
              予想画像を投稿する（準備中）
            </button>
          )}
        </div>
        {shareStatus && <p className="mt-2 text-[10px] text-gray-500">{shareStatus}</p>}
      </div>

      {/* 凡例（最小限） */}
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-gray-100 pt-2">
        <div className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: REPORTED_FILL }} />
          <span className="text-[10px] text-gray-500">報告席</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm border" style={{ backgroundColor: UNREPORTED_FILL, borderColor: GRID_STROKE }} />
          <span className="text-[10px] text-gray-500">未報告</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-3.5 shrink-0 rounded-sm ring-1 ring-gray-200" style={{ backgroundColor: GAP_FILL }} />
          <span className="text-[10px] text-gray-500">白抜き=花道・通路候補</span>
        </div>
      </div>
      {hasCenterAreaCandidate && (
        <p className="mt-1 text-[10px] leading-relaxed text-gray-400">
          中央付近に未報告エリア候補があります
        </p>
      )}

    </div>
  );
}
