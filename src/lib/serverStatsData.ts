import "server-only";
import { unstable_cache } from "next/cache";
import {
  queryGroupedEventIds,
  queryPredictionCount,
  querySeatReportCount,
  type EventOgInfo,
} from "@/lib/og/eventOgData";
import { createSupabasePublicClient } from "@/lib/supabase/public";

export const PUBLIC_STATS_TTL_SECONDS = 60;

export async function getCachedEventStats(
  info: EventOgInfo,
): Promise<{ seatReports: number; predictions: number }> {
  const eventId = info.event.id;
  return unstable_cache(
    async () => {
      const client = createSupabasePublicClient();
      if (!client) return { seatReports: 0, predictions: 0 };
      const groupedIds = await queryGroupedEventIds(
        client,
        info.event,
        info.event.artist_slug ?? info.artist?.slug ?? null,
      );
      const [seatReports, predictions] = await Promise.all([
        querySeatReportCount(client, groupedIds),
        queryPredictionCount(client, eventId),
      ]);
      return { seatReports, predictions };
    },
    ["public-event-stats", eventId],
    { revalidate: PUBLIC_STATS_TTL_SECONDS, tags: [`stats:${eventId}`] },
  )();
}
