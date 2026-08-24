import "server-only";
import { unstable_cache } from "next/cache";
import { getRealtimeFeedItems, getUpcomingHomeEvents, type HomeFeedItem } from "@/lib/homeData";
import { createSupabasePublicClient } from "@/lib/supabase/public";

export const PUBLIC_FEED_TTL_SECONDS = 60;

export async function getCachedRealtimeFeed(limit = 20): Promise<HomeFeedItem[]> {
  return unstable_cache(
    async () => {
      const client = createSupabasePublicClient();
      if (!client) return [];
      const upcoming = getUpcomingHomeEvents(client);
      return getRealtimeFeedItems(client, limit, upcoming);
    },
    ["public-realtime-feed", String(limit)],
    { revalidate: PUBLIC_FEED_TTL_SECONDS, tags: ["feed"] },
  )();
}
