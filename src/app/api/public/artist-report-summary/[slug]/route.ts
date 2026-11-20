import { unstable_cache } from "next/cache";
import { findArtistBySlug } from "@/lib/artists";
import { isTestArtist } from "@/lib/seoData";
import type { ArtistReportSummary } from "@/lib/artistPageTypes";
import { getCachedArtistEvents } from "@/lib/serverEventData";
import { createSupabasePublicClient } from "@/lib/supabase/public";

const readSummary = unstable_cache(async (slug: string): Promise<ArtistReportSummary> => {
  const events = await getCachedArtistEvents(slug);
  if (!events.length) return { seatCounts: {}, tickets: [], ticketDataLimited: false };
  const reader = createSupabasePublicClient(AbortSignal.timeout(6000));
  if (!reader) throw new Error("Public report reader unavailable");
  const ids = events.map(e => e.id);
  const [seats, tickets] = await Promise.all([
    reader.from("seat_reports").select("event_id").in("event_id", ids)
      .order("created_at", { ascending: false }).limit(500),
    reader.from("event_ticket_results")
      .select("id,event_id,result,lost_application_count,ticket_count,lottery_type,fc_history,payment_method,seat_type,upgrade_result", { count: "exact" })
      .in("event_id", ids).order("created_at", { ascending: false }).limit(1000),
  ]);
  if (seats.error || tickets.error || !seats.data || !tickets.data || tickets.count === null) {
    throw new Error("Incomplete public report summary");
  }
  const seatCounts: Record<string, number> = {};
  for (const seat of seats.data) seatCounts[seat.event_id] = (seatCounts[seat.event_id] ?? 0) + 1;
  return { seatCounts, tickets: tickets.data, ticketDataLimited: tickets.count > 1000 };
}, ["public-artist-report-summary-v1"], { revalidate: 300 });

export async function GET(_request: Request, { params }: { params: Promise<{slug: string}> }) {
  const { slug } = await params;
  const artist = findArtistBySlug(slug);
  if (!artist || isTestArtist(artist)) return Response.json({ error: "Unknown artist" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  try {
    const summary = await readSummary(slug);
    return Response.json(summary, { headers: { "Cache-Control": "public, max-age=0, s-maxage=300" } });
  } catch {
    return Response.json({ error: "Summary temporarily unavailable" }, {
      status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "60" },
    });
  }
}
