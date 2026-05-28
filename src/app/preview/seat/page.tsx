"use client";

// 一時プレビュー用ページ（DB非接続）。現在の検証用mockをSeatPredictionImageで描画する。
// Supabaseは一切importしない。確認後に削除してよい。
import { useMemo } from "react";
import { buildPredictionMap } from "@/lib/seatPrediction";
import { SeatPredictionImage } from "@/components/SeatPredictionImage";
import type { SeatPredictionLayoutHints } from "@/lib/seatPredictionImageTypes";
import type { SeatReport } from "@/lib/types";

type RawSeat = { block: string; row_num: number; seat_num: number };

type PreviewCase = {
  id: string;
  title: string;
  description: string;
  rows: RawSeat[];
  layoutHints?: SeatPredictionLayoutHints;
  expectedBlocks?: string[];
};

function blockRows(block: string, rows: [number, number[]][]): RawSeat[] {
  return rows.flatMap(([row_num, seats]) =>
    seats.map((seat_num) => ({ block, row_num, seat_num })),
  );
}

const CUT_SIDE_HINTS: SeatPredictionLayoutHints = {
  B2: { cutSide: "right" },
  B4: { cutSide: "left" },
};

const MANUAL_CANDIDATE_HINTS: SeatPredictionLayoutHints = {
  A3: { candidate: "hanamichi", candidateScope: "centerBand", bandWidthRatio: 0.28 },
  B3: { candidate: "centerStage", frameExpandX: 12 },
};

const MANUAL_CANDIDATE_EXPECTED_BLOCKS = [
  "A1",
  "A2",
  "A3",
  "A4",
  "A5",
  "B1",
  "B2",
  "B3",
  "B4",
  "B5",
  "C1",
  "C2",
  "C3",
  "C4",
  "C5",
  "SS1",
  "SS2",
  "SS3",
  "SS4",
];
const A_NORMAL: RawSeat[] = [
  ...blockRows("A1", [[1, [3, 11]], [2, [6, 15]], [3, [4, 13]], [4, [8, 18]], [5, [5, 16]]]),
  ...blockRows("A2", [[1, [2, 10]], [2, [7, 17]], [3, [5, 14]], [4, [9, 19]], [5, [6, 15]]]),
  ...blockRows("A3", [[1, [8, 12]], [2, [9, 13]], [3, [7, 11]], [4, [10, 14]], [5, [8, 13]]]),
  ...blockRows("A4", [[1, [4, 12]], [2, [8, 18]], [3, [6, 15]], [4, [10, 20]], [5, [7, 16]]]),
  ...blockRows("A5", [[1, [3, 13]], [2, [7, 17]], [3, [5, 15]], [4, [9, 19]], [5, [6, 16]]]),
];

const A_WITH_HANAMICHI_GAP: RawSeat[] = [
  ...blockRows("A1", [[1, [3, 11]], [2, [6, 15]], [3, [4, 13]], [4, [8, 18]], [5, [5, 16]]]),
  ...blockRows("A2", [[1, [2, 10]], [2, [7, 17]], [3, [5, 14]], [4, [9, 19]], [5, [6, 15]]]),
  ...blockRows("A3", [[1, [4, 5, 19, 20]], [2, [3, 6, 18, 21]], [3, [4, 5, 19, 20]], [4, [3, 6, 18, 21]], [5, [4, 5, 19, 20]]]),
  ...blockRows("A4", [[1, [4, 12]], [2, [8, 18]], [3, [6, 15]], [4, [10, 20]], [5, [7, 16]]]),
  ...blockRows("A5", [[1, [3, 13]], [2, [7, 17]], [3, [5, 15]], [4, [9, 19]], [5, [6, 16]]]),
];

const B_SIDES: RawSeat[] = [
  ...blockRows("B1", [[1, [20]], [2, [21]], [3, [19]], [4, [22]], [5, [20]]]),
  ...blockRows("B2", [[1, [1, 2, 3]], [2, [1, 3, 5]], [3, [2, 4]], [4, [1, 5]], [5, [3]]]),
  ...blockRows("B4", [[1, [11, 13, 15]], [2, [11, 14, 15]], [3, [12, 15]], [4, [11, 15]], [5, [13]]]),
  ...blockRows("B5", [[1, [18]], [2, [19]], [3, [17]], [4, [20]], [5, [18]]]),
];

const B3_WITH_CENTER_GAP: RawSeat[] = [
  ...blockRows("B3", [[1, [1, 2, 14, 15]], [2, [1, 3, 13, 15]], [3, [1, 2, 14, 15]], [4, [1, 3, 13, 15]], [5, [1, 2, 14, 15]]]),
];

const B3_SPARSE_NOISE: RawSeat[] = [
  ...blockRows("B3", [[2, [8]], [4, [9]], [6, [8]]]),
];

const B3_MANY_REPORTS: RawSeat[] = [
  ...blockRows("B3", [[1, [1, 2, 3, 4, 5, 6, 7, 8]], [2, [1, 2, 3, 4, 5, 6, 7, 8]], [3, [1, 2, 3, 4, 5, 6, 7, 8]], [4, [1, 2, 3, 4, 5, 6, 7, 8]], [5, [1, 2, 3, 4, 5, 6, 7, 8]]]),
];

const C_D_NORMAL: RawSeat[] = [
  ...blockRows("C1", [[1, [30]], [2, [31]], [3, [29]], [4, [32]], [5, [30]]]),
  ...blockRows("C2", [[1, [6]], [2, [5]], [3, [7]], [4, [6]], [5, [8]]]),
  ...blockRows("C3", [[1, [10]], [2, [9]], [3, [11]], [4, [10]], [5, [12]]]),
  ...blockRows("C4", [[1, [6]], [2, [5]], [3, [7]], [4, [6]], [5, [8]]]),
  ...blockRows("C5", [[1, [14]], [2, [15]], [3, [13]], [4, [16]], [5, [14]]]),
  ...blockRows("D1", [[1, [26]], [2, [27]], [3, [25]], [4, [28]], [5, [26]]]),
  ...blockRows("D2", [[1, [5]], [2, [4]], [3, [6]], [4, [5]], [5, [7]]]),
  ...blockRows("D3", [[1, [11]], [2, [10]], [3, [12]], [4, [11]], [5, [13]]]),
  ...blockRows("D4", [[1, [5]], [2, [4]], [3, [6]], [4, [5]], [5, [7]]]),
  ...blockRows("D5", [[1, [16]], [2, [17]], [3, [15]], [4, [18]], [5, [16]]]),
];

const PREVIEW_CASES: PreviewCase[] = [
  {
    id: "b3-missing-cutside",
    title: "B3欠番 + B2/B4内側cutSide",
    description: "B3なし、B2右側/B4左側の削れで横長の中央空白がセンステ候補になるか確認。",
    rows: [...A_NORMAL, ...B_SIDES, ...C_D_NORMAL],
    layoutHints: CUT_SIDE_HINTS,
  },
  {
    id: "a3-hanamichi-cutside",
    title: "A3花道gap + B2/B4内側cutSide",
    description: "A3中央gapとB2/B4の削れが、花道候補からセンステ候補へつながって見えるか確認。",
    rows: [...A_WITH_HANAMICHI_GAP, ...B_SIDES, ...C_D_NORMAL],
    layoutHints: CUT_SIDE_HINTS,
  },
  {
    id: "b3-center-gap-cutside",
    title: "B3存在 + B3中央gap",
    description: "B3内の中央gapが複数row続き、B2/B4の削れとまとまってセンステ候補になるか確認。",
    rows: [...A_NORMAL, ...B_SIDES, ...B3_WITH_CENTER_GAP, ...C_D_NORMAL],
    layoutHints: CUT_SIDE_HINTS,
  },
  {
    id: "b3-sparse-noise-strong-shape",
    title: "B3少数誤入力あり + 周辺形状強い",
    description: "B3に少数報告があっても、A3花道候補とB2/B4の削れでセンステ候補が維持されるか確認。",
    rows: [...A_WITH_HANAMICHI_GAP, ...B_SIDES, ...B3_SPARSE_NOISE, ...C_D_NORMAL],
    layoutHints: CUT_SIDE_HINTS,
  },
  {
    id: "b3-many-reports",
    title: "B3報告が多すぎる",
    description: "B3に十分な報告がある場合、少数誤入力扱いせずセンステ候補が出すぎないか確認。",
    rows: [...A_WITH_HANAMICHI_GAP, ...B_SIDES, ...B3_MANY_REPORTS, ...C_D_NORMAL],
    layoutHints: CUT_SIDE_HINTS,
  },
  {
    id: "manual-a3-hanamichi-b3-center-stage",
    title: "manual A3花道 + B3センステ",
    description: "A3を花道候補、B3をセンステ候補として手動指定。B2/B4 cutSideなしで、報告0件ブロックは未報告グリッドのまま確認。",
    rows: [...A_NORMAL, ...B_SIDES, ...C_D_NORMAL],
    layoutHints: MANUAL_CANDIDATE_HINTS,
    expectedBlocks: MANUAL_CANDIDATE_EXPECTED_BLOCKS,
  },
];

function toReports(rows: RawSeat[], eventId: string): SeatReport[] {
  return rows.map((r, i) => ({
    id: `${eventId}-${i}`,
    event_id: eventId,
    block: r.block,
    row_num: r.row_num,
    seat_num: r.seat_num,
    lottery_type: "fc1",
    lottery_round: null,
    lottery_name: null,
    payment_method: null,
    fc_history: null,
    comment: null,
    created_at: "2026-05-26T00:00:00Z",
  }));
}

function PreviewPattern({ pattern }: { pattern: PreviewCase }) {
  const prediction = useMemo(() => {
    return buildPredictionMap(toReports(pattern.rows, pattern.id));
  }, [pattern]);

  return (
    <section>
      <p className="mb-2 text-sm font-bold text-gray-900">[preview] {pattern.title}</p>
      <p className="mb-2 text-[11px] leading-relaxed text-gray-500">{pattern.description}</p>
      <p className="mb-3 text-[11px] text-gray-500">
        confidence: {prediction.confidence} / reports: {prediction.totalReports} / missing blocks:{" "}
        {prediction.missingBlockCandidates.join(", ") || "none"}
      </p>
      <SeatPredictionImage
        prediction={prediction}
        layoutHints={pattern.layoutHints}
        expectedBlocks={pattern.expectedBlocks}
      />
    </section>
  );
}

export default function SeatPreviewPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-md space-y-6">
        {PREVIEW_CASES.map((pattern) => (
          <PreviewPattern key={pattern.id} pattern={pattern} />
        ))}
      </div>
    </div>
  );
}
