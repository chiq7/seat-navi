import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { findArtistBySlug, resolveUniqueArtistMatch } from "@/lib/artists";
import type { CrawledEvent } from "@/lib/types";
import { compareUpcomingEvents } from "@/lib/artistPageData";
import { dedupeVenueEventsForDisplay } from "@/lib/eventDisplay";
import { isArtistOnlyEventTitle } from "@/lib/eventTitle";

const EVENT_COLUMNS = "id, title, venue, venue_id, date, genre, lottery_types, artist_slug";

/**
 * 指定artistSlugの公演一覧を取得する共通実装。
 * Server Componentではサーバークライアント、フォーム等ではブラウザクライアントを渡す。
 */
export async function queryEventsForArtist(
  client: SupabaseClient,
  artistSlug: string,
): Promise<CrawledEvent[]> {
  const artist = findArtistBySlug(artistSlug);
  const bySlugPromise = client
    .from("events")
    .select(EVENT_COLUMNS)
    .eq("artist_slug", artistSlug)
    .order("date", { ascending: true });

  const byKeywordPromise = artist
    ? client
      .from("events")
      .select(EVENT_COLUMNS)
      .is("artist_slug", null)
      .or([...new Set([artist.name, ...artist.keywords])].map((term) => `title.ilike.%${term}%`).join(","))
      .order("date", { ascending: true })
    : Promise.resolve({ data: [] as CrawledEvent[] });

  const [{ data: bySlug }, { data: byKeyword }] = await Promise.all([bySlugPromise, byKeywordPromise]);

  const rows = ((bySlug as CrawledEvent[]) ?? [])
    .filter((event) => !isArtistOnlyEventTitle(event.title, artist?.name))
    .map((event) => ({
      ...event,
      artist_match_source: "explicit" as const,
    }));

  if (!artist) return rows;

  // DBへは広めにILIKEで問い合わせ、実際に採用するかどうかの最終判定は
  // keywordMatchesTitle(findArtistByKeywordと共通の判定関数)で行う。
  // ILIKEだけでは "EXO" が "EXOFIRE" のような無関係タイトルにも一致してしまうため、
  // ILIKEはあくまで候補を広く拾うための事前フィルタとして使い、単独では確定させない。
  const extra = ((byKeyword as CrawledEvent[]) ?? [])
    .filter((event) => resolveUniqueArtistMatch(event.title).artist?.slug === artistSlug)
    .filter((event) => !isArtistOnlyEventTitle(event.title, artist.name))
    .filter((e) => !rows.some((r) => r.id === e.id))
    .map((event) => ({ ...event, artist_match_source: "keyword" as const }));

  return dedupeVenueEventsForDisplay([...rows, ...extra]).sort(compareUpcomingEvents);
}

/** 指定artistSlugの公演一覧をブラウザから取得する互換ラッパー。 */
export async function getEventsForArtist(artistSlug: string): Promise<CrawledEvent[]> {
  return queryEventsForArtist(supabase, artistSlug);
}
