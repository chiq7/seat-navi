import "server-only";
import { unstable_cache } from "next/cache";
import {
  getRealtimeFeedItems,
  getUpcomingHomeEvents,
  type HomeFeedItem,
  type UpcomingEvent,
} from "@/lib/homeData";
import { createSupabasePublicClient } from "@/lib/supabase/public";

export const PUBLIC_FEED_TTL_SECONDS = 60;
/**
 * TOPの公演一覧はログイン状態に依存しない公開データ。
 * 個別の「推し優先表示」だけはページ側で重ねるため、ここでは全ユーザーで共有できる
 * 公演一覧を短時間キャッシュする。
 */
export const PUBLIC_UPCOMING_EVENTS_TTL_SECONDS = 300;

export async function getCachedUpcomingHomeEvents(): Promise<UpcomingEvent[]> {
  return unstable_cache(
    async () => {
      const client = createSupabasePublicClient();
      return client ? getUpcomingHomeEvents(client) : [];
    },
    ["public-upcoming-home-events"],
    { revalidate: PUBLIC_UPCOMING_EVENTS_TTL_SECONDS, tags: ["home-events"] },
  )();
}

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
