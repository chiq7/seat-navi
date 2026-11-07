import "server-only";
import { unstable_cache } from "next/cache";
import {
  queryGroupedEventIds,
  queryPredictionCount,
  querySeatReportCount,
  type EventOgInfo,
} from "@/lib/og/eventOgData";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { externalObservationsToArenaReports } from "@/lib/external-seats/arena";
import type { ExternalSeatObservation } from "@/lib/external-seats/types";

export const PUBLIC_STATS_TTL_SECONDS = 60;

export async function getCachedEventStats(
  info: EventOgInfo,
): Promise<{ seatReports: number; predictions: number; hasExternalArena: boolean }> {
  const eventId = info.event.id;
  return unstable_cache(
    async () => {
      const client = createSupabasePublicClient();
      if (!client) return { seatReports: 0, predictions: 0, hasExternalArena: false };
      const groupedIds = await queryGroupedEventIds(
        client,
        info.event,
        info.event.artist_slug ?? info.artist?.slug ?? null,
      );
      const [seatReports, predictions] = await Promise.all([
        querySeatReportCount(client, groupedIds),
        queryPredictionCount(client, eventId),
      ]);
      if (seatReports > 0 || predictions > 0) return { seatReports, predictions, hasExternalArena: false };
      const { data } = await client.from("external_seat_observations")
        .select("review_status,seat_area,block,row_min,row_max,seat_min,seat_max,confidence")
        .in("event_id", groupedIds).eq("review_status", "approved").eq("seat_area", "arena")
        .order("observed_at", { ascending: false }).limit(500);
      return { seatReports, predictions, hasExternalArena: externalObservationsToArenaReports((data ?? []) as ExternalSeatObservation[]).length > 0 };
    },
    ["public-event-stats-with-external-seats", eventId],
    { revalidate: PUBLIC_STATS_TTL_SECONDS, tags: [`stats:${eventId}`] },
  )();
}
