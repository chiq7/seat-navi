import type { SupabaseClient } from "@supabase/supabase-js";
import type { SeatReport } from "../types";
import type { ExternalSeatObservation } from "../external-seats/types";

export const ARENA_REPORT_FIELDS = "id, event_id, block, row_num, seat_num, lottery_type, fc_history, payment_method, lottery_round, lottery_name, comment, created_at";
const EXTERNAL_FIELDS = "id, event_id, source_type, source_url, observed_at, seat_area, block, row_min, row_max, seat_min, seat_max, gate, level, confidence, evidence_summary, review_status";
const PAGE_SIZE = 500, MAX_ROWS = 10000;
type Page = { data: unknown[] | null; count: number | null; error: unknown };

/** A bounded, ordered read; concurrent count changes and duplicate-page gaps cannot masquerade as complete input. */
export async function readArenaPages<T extends { id: string }>(fetchPage: (from: number, to: number) => PromiseLike<Page>) {
  const rows = new Map<string, T>();
  let count: number | null = null, limited = false;
  for (let from = 0; from < MAX_ROWS; from += PAGE_SIZE) {
    const page = await fetchPage(from, from + PAGE_SIZE - 1);
    if (page.error) return { data: [...rows.values()], error: page.error, count, limited: true };
    if (from === 0) count = page.count;
    else if (count !== page.count) limited = true;
    for (const row of (page.data ?? []) as T[]) rows.set(row.id, row);
    if ((page.data?.length ?? 0) < PAGE_SIZE || (count !== null && from + PAGE_SIZE >= count)) break;
  }
  limited ||= count === null || rows.size !== count;
  return { data: [...rows.values()], count, limited, error: null };
}

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
