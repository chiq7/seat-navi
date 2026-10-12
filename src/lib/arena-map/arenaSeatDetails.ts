import type { SeatReport } from "@/lib/types";
import type { ExternalSeatObservation } from "@/lib/external-seats/types";
import { externalObservationsToArenaReports } from "@/lib/external-seats/arena";

export type SeatPosition = { block: string; row: number; seat: number };
export function getArenaSeatDetails(position: SeatPosition, reports: SeatReport[], external: ExternalSeatObservation[]) {
  return {
    reports: reports.filter(r => r.block === position.block && r.row_num === position.row && r.seat_num === position.seat),
    external: external.filter(item => externalObservationsToArenaReports([item]).some(r => r.block === position.block && r.row_num === position.row && r.seat_num === position.seat)),
  };
}

const lotteryLabels: Record<SeatReport["lottery_type"], string> = {
  fc1: "FC先行1次", fc2: "FC先行2次", general: "一般", upgrade: "アップグレード", revival: "復活当選", production: "制作開放",
};
export function seatConditionLabels(report: SeatReport) {
  return [report.lottery_name || lotteryLabels[report.lottery_type] || "抽選種別不明", report.lottery_round,
    report.fc_history ? `FC歴 ${report.fc_history}` : null,
    report.payment_method ? ({ credit: "クレカ", convenience: "コンビニ", other: "その他決済" }[report.payment_method] ?? report.payment_method) : null,
  ].filter((value): value is string => Boolean(value));
}
