import type { EventTicketResult } from "@/lib/types";

export type AnalyticsReport = {
  id: string;
  event_id: string;
  block: string;
  row_num: number;
  seat_num: number;
  lottery_type: string;
  fc_history: string | null;
  payment_method?: string | null;
  created_at: string;
};

export type TicketResultAnalytics = Pick<
  EventTicketResult,
  "event_id" | "result" | "lost_application_count" | "ticket_count" | "lottery_type" | "fc_history" | "payment_method"
>;

export type AfterReportCard = {
  id: string;
  event_id: string;
  seat_area_type: string | null;
  seat_block: string | null;
  seat_row: string | null;
  seat_view_photo_paths: string[] | null;
  torokko: string | null;
  kyakukudari: string | null;
  fansa: boolean | null;
  memo: string | null;
  created_at: string;
};
