import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabasePublicClient } from "./supabase/public";

/** The preview uses 0–3; 4 represents four or more. Bound both reads on popular shows. */
type ReportSummary = { count: number; reportIds: string[] };

async function queryPerformanceReportSummary(client: SupabaseClient, ids: readonly string[], countSeats = true): Promise<ReportSummary | null> {
  if (!ids.length) return null;
  const [seats, reports] = await Promise.all([
    countSeats ? client.from("seat_reports").select("event_id").in("event_id", ids).limit(4) : { data: [], error: null },
    client.from("after_reports").select("id").in("event_id", ids).limit(4),
  ]);
  if (seats.error || reports.error || !seats.data || !reports.data) return null;
  return { count: Math.min(4, seats.data.length + reports.data.length), reportIds: reports.data.map(row => row.id) };
}

export async function queryPerformanceReportCount(client: SupabaseClient, ids: readonly string[]): Promise<number | null> {
  return (await queryPerformanceReportSummary(client, ids))?.count ?? null;
}

export async function getPerformanceReportSummary(ids: readonly string[], countSeats: boolean): Promise<ReportSummary | null> {
  const client = createSupabasePublicClient(AbortSignal.timeout(3500));
  if (!client) return null;
  try {
    return await queryPerformanceReportSummary(client, ids, countSeats);
  } catch {
    // Keep the venue guide available during a read outage.
    return null;
  }
}
