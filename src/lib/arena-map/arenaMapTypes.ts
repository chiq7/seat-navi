import type { RefObject } from "react";
import type { SeatReport } from "@/lib/types";
import type { ExternalSeatConfidence, ExternalSeatObservation } from "@/lib/external-seats/types";

export type { SeatReport };

export type ColorMode = "lottery" | "fcHistory" | "ticketCount" | "payment" | "upgrade";

/** ユーザー報告と外部由来データを同じ座席グリッドへ安全に渡すための最小形。 */
export type ArenaMapReport = Pick<
  SeatReport,
  "block" | "row_num" | "seat_num" | "lottery_type" | "fc_history" | "payment_method"
> & {
  sourceKind?: "user" | "external";
  externalConfidence?: ExternalSeatConfidence;
};

/** ブロック名をパースした結果 */
export type ParsedBlockName = {
  prefix: string;  // 例: "A", "SA", "SB"
  num: number;     // 例: 1, 3, 12
};

/** グリッド上のブロック位置 */
export type BlockPosition = {
  row: number;  // 0-indexed グリッド行
  col: number;  // 0-indexed グリッド列
};

/** ブロック内の1座席（描画用） */
export type ArenaCell = {
  row: number;           // row_num（報告値）
  seat: number;          // seat_num（報告値）
  lotteryType: SeatReport["lottery_type"];
  fcHistory: string | null;
  paymentMethod: string | null;
  sourceKind: "user" | "external";
  externalConfidence: ExternalSeatConfidence | null;
};

/** グリッド上に配置された1ブロックの情報 */
export type ArenaBlock = {
  blockName: string;
  position: BlockPosition;
  cells: ArenaCell[];
  minRow: number;
  maxRow: number;
  minSeat: number;
  maxSeat: number;
  hasReports: boolean;
};

/** buildFixedArenaGrid の戻り値。A〜H×1〜8を最小に、報告状況に応じて拡張された動的グリッド */
export type ArenaGridResult = {
  /** グリッド内の全マス（報告のないマスも含む） */
  gridBlocks: ArenaBlock[];
  /** パース失敗、またはグリッド範囲外の報告。件数降順・同数はブロック名昇順でソート済み */
  overflowBlocks: ArenaBlock[];
  /** 実際に描画するグリッドの行（A〜最終行） */
  gridRowPrefixes: string[];
  /** 実際に描画するグリッドの列（1〜最終列） */
  gridColNums: number[];
};

/** ArenaReportMap コンポーネントのprops */
export type ArenaReportMapProps = {
  eventId: string;
  reports: SeatReport[];
  externalObservations?: ExternalSeatObservation[];
  variant?: "full" | "compact";
  compactVenueName?: string | null;
  compactDateLabel?: string | null;
  submitPredictionHref?: string;
  colorModeExternal?: ColorMode;
  hideShareSection?: boolean;
  mapFullBleed?: boolean;
  svgRef?: RefObject<SVGSVGElement | null>;
};
