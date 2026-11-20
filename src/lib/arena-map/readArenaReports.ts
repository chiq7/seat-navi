import type { SupabaseClient } from "@supabase/supabase-js";
import type { SeatReport } from "../types";
import type { ExternalSeatObservation } from "../external-seats/types";
import { readSupabasePages as readArenaPages } from "../supabase/readPages";
export { readArenaPages };

export const ARENA_REPORT_FIELDS = "id, event_id, block, row_num, seat_num, lottery_type, fc_history, payment_method, lottery_round, lottery_name, comment, created_at";
const EXTERNAL_FIELDS = "id, event_id, source_type, source_url, observed_at, seat_area, block, row_min, row_max, seat_min, seat_max, gate, level, confidence, evidence_summary, review_status";
export async function readArenaReports(client: Pick<SupabaseClient, "from">, eventIds: readonly string[]) {
  if (!eventIds.length) throw new Error("Explicit event scope required");
  const [seats, external] = await Promise.all([
    readArenaPages<SeatReport>((from, to) => client.from("seat_reports").select(ARENA_REPORT_FIELDS, { count: "exact" })
      .in("event_id", [...eventIds]).order("created_at", { ascending: false }).order("id").range(from, to)),
    readArenaPages<ExternalSeatObservation>((from, to) => client.from("external_seat_observations").select(EXTERNAL_FIELDS, { count: "exact" })
      .in("event_id", [...eventIds]).eq("review_status", "approved").eq("seat_area", "arena")
      .order("observed_at", { ascending: false }).order("id").range(from, to)),
  ]);
  return { seats, external, limited: seats.limited || external.limited };
}
