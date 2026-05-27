import type { SeatReport } from "@/lib/types";

export type ConfidenceLevel = "insufficient" | "low" | "medium" | "high";

export type SeatGapItem = {
  row: number;
  fromSeat: number;
  toSeat: number;
  size: number;
};

export type PersistentSeatGap = {
  fromSeat: number;
  toSeat: number;
  rowCount: number;
  rows: number[];
  candidateType: "hanamichi" | "passage";
};

export type RowGapItem = {
  fromRow: number;
  toRow: number;
  size: number;
};

/** ブロック内グリッドに描く1座席分の情報（報告された席のみ） */
export type SeatCell = {
  row: number;
  seat: number;
  lotteryType: string;
};

/** 白抜きgapとして描く候補（seat軸=縦の空白 / row軸=横の空白）。confidenceでゲート済み。 */
export type GapCandidate = {
  axis: "seat" | "row";
  from: number;
  to: number;
  rowCount: number;
  kind: "hanamichi" | "yokoHanamichi" | "passage";
  label: string;
};

export type BlockAnalysis = {
  block: string;
  prefix: string;
  num: number;
  reportCount: number;
  minRow: number;
  maxRow: number;
  minSeat: number;
  maxSeat: number;
  rowNums: number[];
  rowGaps: RowGapItem[];
  seatGaps: SeatGapItem[];
  persistentSeatGaps: PersistentSeatGap[];
  /** 報告された座席セル（描画用） */
  seatCells: SeatCell[];
  /** confidenceでゲートした白抜きgap候補 */
  gaps: GapCandidate[];
  isHanamichiCandidate: boolean;
  isYokoHanamichiCandidate: boolean;
  isCenterStageCandidate: boolean;
  isPassageCandidate: boolean;
};

export type PredictionMap = {
  totalReports: number;
  confidence: ConfidenceLevel;
  latestReportAt: string | null;
  blocks: BlockAnalysis[];
  allBlockNames: string[];
  missingBlockCandidates: string[];
};

function getConfidence(total: number): ConfidenceLevel {
  if (total < 10) return "insufficient";
  if (total < 30) return "low";
  if (total < 50) return "medium";
  return "high";
}

function parseBlock(name: string): { prefix: string; num: number } {
  const m = name.match(/^(.*?)(\d+)$/);
  if (!m) return { prefix: name, num: 0 };
  return { prefix: m[1], num: parseInt(m[2], 10) };
}

function detectSeatGaps(reports: SeatReport[]): {
  seatGaps: SeatGapItem[];
  persistentSeatGaps: PersistentSeatGap[];
} {
  const byRow = new Map<number, number[]>();
  for (const r of reports) {
    if (!byRow.has(r.row_num)) byRow.set(r.row_num, []);
    byRow.get(r.row_num)!.push(r.seat_num);
  }

  const seatGaps: SeatGapItem[] = [];
  const gapRows = new Map<string, number[]>(); // "fromSeat__toSeat" -> rows

  for (const [row, seats] of byRow) {
    if (seats.length < 2) continue;
    const sorted = [...new Set(seats)].sort((a, b) => a - b);
    for (let i = 0; i < sorted.length - 1; i++) {
      const size = sorted[i + 1] - sorted[i];
      if (size >= 5) {
        seatGaps.push({ row, fromSeat: sorted[i], toSeat: sorted[i + 1], size });
        const key = `${sorted[i]}__${sorted[i + 1]}`;
        if (!gapRows.has(key)) gapRows.set(key, []);
        gapRows.get(key)!.push(row);
      }
    }
  }

  const persistentSeatGaps: PersistentSeatGap[] = [];
  for (const [key, rows] of gapRows) {
    if (rows.length >= 3) {
      const [fromSeat, toSeat] = key.split("__").map(Number);
      persistentSeatGaps.push({
        fromSeat,
        toSeat,
        rowCount: rows.length,
        rows: [...rows].sort((a, b) => a - b),
        candidateType: toSeat - fromSeat >= 10 ? "hanamichi" : "passage",
      });
    }
  }

  return { seatGaps, persistentSeatGaps };
}

function detectRowGaps(rowNums: number[]): RowGapItem[] {
  if (rowNums.length < 2) return [];
  const sorted = [...new Set(rowNums)].sort((a, b) => a - b);
  const gaps: RowGapItem[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const size = sorted[i + 1] - sorted[i];
    if (size >= 3) gaps.push({ fromRow: sorted[i], toRow: sorted[i + 1], size });
  }
  return gaps;
}

/** confidenceに応じて白抜きgap候補を組み立てる（1件だけの飛びは過信せず、persistentのみ採用） */
function buildGaps(
  persistent: PersistentSeatGap[],
  rowGaps: RowGapItem[],
  total: number,
): GapCandidate[] {
  const out: GapCandidate[] = [];

  for (const g of persistent) {
    const size = g.toSeat - g.fromSeat;
    if (size >= 10) {
      // 10席以上の飛び: 50件以上で花道候補、30〜49件では控えめに通路候補
      if (total >= 50) {
        out.push({ axis: "seat", from: g.fromSeat, to: g.toSeat, rowCount: g.rowCount, kind: "hanamichi", label: "花道候補" });
      } else if (total >= 30) {
        out.push({ axis: "seat", from: g.fromSeat, to: g.toSeat, rowCount: g.rowCount, kind: "passage", label: "通路候補" });
      }
    } else {
      // 5〜9席の飛び: 30件以上で通路候補
      if (total >= 30) {
        out.push({ axis: "seat", from: g.fromSeat, to: g.toSeat, rowCount: g.rowCount, kind: "passage", label: "通路候補" });
      }
    }
  }

  // 行方向の飛び（横花候補）は50件以上のみ
  if (total >= 50) {
    for (const rg of rowGaps) {
      out.push({ axis: "row", from: rg.fromRow, to: rg.toRow, rowCount: 0, kind: "yokoHanamichi", label: "横花候補" });
    }
  }

  return out;
}

/** 欠番候補: 直前・直後の番号が両方とも報告済みの場合のみ（A1/A2/A4/A5→A3はOK、A1/A5のみ→対象外） */
function findMissingBlockCandidates(blocks: { prefix: string; num: number }[]): string[] {
  const byPrefix = new Map<string, Set<number>>();
  for (const b of blocks) {
    if (!byPrefix.has(b.prefix)) byPrefix.set(b.prefix, new Set());
    byPrefix.get(b.prefix)!.add(b.num);
  }

  const missing: string[] = [];
  for (const [prefix, nums] of byPrefix) {
    if (nums.size < 2) continue;
    const sorted = [...nums].sort((a, b) => a - b);
    const max = sorted[sorted.length - 1];
    for (let n = sorted[0] + 1; n < max; n++) {
      if (!nums.has(n) && nums.has(n - 1) && nums.has(n + 1)) {
        missing.push(`${prefix}${n}`);
      }
    }
  }
  return missing;
}

export function buildPredictionMap(reports: SeatReport[]): PredictionMap {
  const totalReports = reports.length;
  const confidence = getConfidence(totalReports);
  const gated = confidence === "insufficient" || confidence === "low";

  const latestReportAt =
    reports.length > 0
      ? reports.reduce(
          (latest, r) => (r.created_at > latest ? r.created_at : latest),
          reports[0].created_at,
        )
      : null;

  const byBlock = new Map<string, SeatReport[]>();
  for (const r of reports) {
    if (!byBlock.has(r.block)) byBlock.set(r.block, []);
    byBlock.get(r.block)!.push(r);
  }

  const blocks: BlockAnalysis[] = [];
  for (const [block, reps] of byBlock) {
    const { prefix, num } = parseBlock(block);
    const rows = reps.map((r) => r.row_num);
    const seats = reps.map((r) => r.seat_num);
    const rowNums = [...new Set(rows)].sort((a, b) => a - b);
    const rowGaps = detectRowGaps(rowNums);
    const { seatGaps, persistentSeatGaps } = detectSeatGaps(reps);

    const isHanamichiCandidate =
      persistentSeatGaps.some((g) => g.candidateType === "hanamichi") ||
      seatGaps.some((g) => g.size >= 10);
    const isPassageCandidate =
      !isHanamichiCandidate &&
      (persistentSeatGaps.some((g) => g.candidateType === "passage") ||
        seatGaps.some((g) => g.size >= 5));
    const isYokoHanamichiCandidate = rowGaps.length > 0;

    const gaps = gated ? [] : buildGaps(persistentSeatGaps, rowGaps, totalReports);
    const seatCells: SeatCell[] = reps.map((r) => ({
      row: r.row_num,
      seat: r.seat_num,
      lotteryType: r.lottery_type,
    }));

    blocks.push({
      block,
      prefix,
      num,
      reportCount: reps.length,
      minRow: Math.min(...rows),
      maxRow: Math.max(...rows),
      minSeat: Math.min(...seats),
      maxSeat: Math.max(...seats),
      rowNums,
      rowGaps,
      seatGaps,
      persistentSeatGaps,
      seatCells,
      gaps,
      isHanamichiCandidate,
      isYokoHanamichiCandidate,
      isCenterStageCandidate: false,
      isPassageCandidate,
    });
  }

  // センステ候補（X文化参考・厳しめ判定。すべて満たす場合のみ・必ず「候補」表記）
  //  1. 対象が中央寄り（prefix内で端ではない中間ブロック）
  //  2. 対象minRowが周辺ブロック平均minRowより +6以上後方
  //  3. 周辺ブロックのminRowが全体的に低い（平均 <=3）
  //  4. 対象の前方領域に報告がほとんどない（minRow >= 6）
  //  「単にminRowが高いだけ」では候補にしない。
  if (totalReports >= 60 && blocks.length > 2) {
    const prefixNums = new Map<string, number[]>();
    for (const b of blocks) {
      if (!prefixNums.has(b.prefix)) prefixNums.set(b.prefix, []);
      prefixNums.get(b.prefix)!.push(b.num);
    }
    for (const b of blocks) {
      const nums = prefixNums.get(b.prefix)!;
      const minNum = Math.min(...nums);
      const maxNum = Math.max(...nums);
      const isMiddle = nums.length >= 3 && b.num > minNum && b.num < maxNum;
      if (!isMiddle) continue;

      const neighbors = blocks.filter((o) => o.block !== b.block);
      if (neighbors.length === 0) continue;
      const avgNeighborMinRow =
        neighbors.reduce((s, o) => s + o.minRow, 0) / neighbors.length;

      if (b.minRow >= avgNeighborMinRow + 6 && avgNeighborMinRow <= 3 && b.minRow >= 6) {
        b.isCenterStageCandidate = true;
      }
    }
  }

  const allBlockNames = [...byBlock.keys()];
  const missingBlockCandidates = gated
    ? []
    : findMissingBlockCandidates(blocks.map((b) => ({ prefix: b.prefix, num: b.num })));

  return {
    totalReports,
    confidence,
    latestReportAt,
    blocks,
    allBlockNames,
    missingBlockCandidates,
  };
}
