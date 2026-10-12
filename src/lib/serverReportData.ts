import "server-only";
import { unstable_cache } from "next/cache";
import { dedupeVenueEventsForDisplay } from "@/lib/eventDisplay";
import { isTestEvent } from "@/lib/seoData";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import type { CrawledEvent } from "@/lib/types";

const REPORT_EVENT_COLUMNS = "id, title, venue, venue_id, date, genre, lottery_types, artist_slug";

/** 投稿フォームの全体選択で使う直近公演。入力中にも最新性を保てるよう短いキャッシュにする。 */
export async function getCachedRecentReportEvents(): Promise<CrawledEvent[]> {
  return unstable_cache(
    async () => {
      const client = createSupabasePublicClient();
      if (!client) return [];
      const { data } = await client
        .from("events")
        .select(REPORT_EVENT_COLUMNS)
        .order("date", { ascending: false })
        .limit(50);
      return dedupeVenueEventsForDisplay((data ?? []) as CrawledEvent[]).filter((event) => !isTestEvent(event));
    },
    ["public-recent-report-events"],
    { revalidate: 60, tags: ["report-events"] },
  )();
}
