import type { EventTicketResult, SeatReport } from "@/lib/types";

export type AnalyticsReport = SeatReport;

export type TicketResultAnalytics = Pick<
  EventTicketResult,
  "id" | "event_id" | "user_id" | "result" | "lost_application_count" | "ticket_count" | "lottery_type" | "fc_history" | "payment_method" | "seat_type" | "upgrade_result" | "comment" | "seat_block" | "seat_row" | "seat_number" | "stand_direction" | "stand_floor" | "other_seat_info" | "created_at"
>;

export type AfterReportCard = {
  id: string;
  event_id: string;
  user_id: string | null;
  seat_area_type: string | null;
  seat_block: string | null;
  seat_row: string | null;
  seat_number: string | null;
  seat_view_photo_paths: string[] | null;
  main_stage: string | null;
  center_stage: string | null;
  fansa_rating: string | null;
  torokko: string | null;
  kyakukudari: string | null;
  silver_tape_rows: number | null;
  /** @deprecated fansa_rating(5段階)に移行済み。LiveEffectsSectionの演出集計でのみ参照 */
  fansa: boolean | null;
  memo: string | null;
  created_at: string;
};
