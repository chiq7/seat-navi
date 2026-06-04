import type { SeatReport } from "@/lib/types";

export type { SeatReport };

export type ColorMode = "lottery" | "fcHistory" | "ticketCount" | "payment" | "upgrade";

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

/** ArenaReportMap コンポーネントのprops */
export type ArenaReportMapProps = {
  eventId: string;
  reports: SeatReport[];
  variant?: "full" | "compact";
  compactVenueName?: string | null;
  compactDateLabel?: string | null;
  submitPredictionHref?: string;
};
