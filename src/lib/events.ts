import { supabase } from "@/lib/supabase/client";
import { findArtistBySlug, resolveUniqueArtistMatch } from "@/lib/artists";
import type { CrawledEvent } from "@/lib/types";
import { compareUpcomingEvents } from "@/lib/artistPageData";

const EVENT_COLUMNS = "id, title, venue, venue_id, date, genre, lottery_types, artist_slug";

/** 指定artistSlugの公演一覧を取得。artist_slug未設定の取りこぼしはtitle keyword一致で補完する。 */
export async function getEventsForArtist(artistSlug: string): Promise<CrawledEvent[]> {
  const { data: bySlug } = await supabase
    .from("events")
    .select(EVENT_COLUMNS)
    .eq("artist_slug", artistSlug)
    .order("date", { ascending: true });

  const rows = ((bySlug as CrawledEvent[]) ?? []).map((event) => ({
    ...event,
    artist_match_source: "explicit" as const,
  }));

  const artist = findArtistBySlug(artistSlug);
  if (!artist) return rows;

  // DBへは広めにILIKEで問い合わせ、実際に採用するかどうかの最終判定は
  // keywordMatchesTitle(findArtistByKeywordと共通の判定関数)で行う。
  // ILIKEだけでは "EXO" が "EXOFIRE" のような無関係タイトルにも一致してしまうため、
  // ILIKEはあくまで候補を広く拾うための事前フィルタとして使い、単独では確定させない。
  const matchTerms = [...new Set([artist.name, ...artist.keywords])];
  const orFilter = matchTerms.map((term) => `title.ilike.%${term}%`).join(",");
  const { data: byKeyword } = await supabase
    .from("events")
    .select(EVENT_COLUMNS)
    .is("artist_slug", null)
    .or(orFilter)
    .order("date", { ascending: true });

  const extra = ((byKeyword as CrawledEvent[]) ?? [])
    .filter((event) => resolveUniqueArtistMatch(event.title).artist?.slug === artistSlug)
    .filter((e) => !rows.some((r) => r.id === e.id))
    .map((event) => ({ ...event, artist_match_source: "keyword" as const }));

  return [...rows, ...extra].sort(compareUpcomingEvents);
}
