import { ARTISTS, type Artist } from "@/lib/artists";
import { ARTIST_SEARCH_ALIASES } from "@/lib/artistSearchAliases";
import { VENUES, getVenueIdAliases, type VenueConfig } from "@/lib/eventCrawlerConfig";
import { getArtistSearchNames, getVenueSearchNames, parseSearchQuery } from "@/lib/searchQuery";
import { normalizeForSearch, searchTextScore } from "@/lib/keywordMatch";
import { isTestArtist, isTestEvent } from "@/lib/seoData";
import { isArtistOnlyEventTitle } from "@/lib/eventTitle";
import { supabase } from "@/lib/supabase/client";
import type { CrawledEvent } from "@/lib/types";

/**
 * ILIKEパターン中で特殊な意味を持つ "%" "_" "\" をエスケープする。
 * ユーザー入力をそのままILIKEへ渡すと、入力中の%/_が意図しないワイルドカードとして
 * 働いてしまう(例: "50%OFF" の"%"がワイルドカード展開されてしまう)ため、
 * PostgresのLIKE/ILIKEデフォルトエスケープ文字"\"で無害化する。
 */
function escapeIlikePattern(s: string): string {
  return s.replace(/[\\%_]/g, "\\$&");
}

/**
 * アーティスト名・別名・keywordsをローカル(ARTISTS配列)で検索する。DBアクセスなし。
 * 完全一致、前方一致、別名、表記ゆれの順にスコアリングする。
 * 短い英字も候補名の先頭なら入力途中として扱い、語中の偶然一致は除外する。
 */
export function searchArtists(query: string, limit = 20): Artist[] {
  const q = query.trim();
  if (q.length < 1) return [];
  const parsed = parseSearchQuery(q);
  if (parsed.artistSlugs.length > 0) {
    return ARTISTS.filter((artist) => parsed.artistSlugs.includes(artist.slug) && !isTestArtist(artist)).slice(0, limit);
  }
  const partial = parsed.remainder.join(" ");
  if (!partial) return [];

  return ARTISTS.map((artist, index) => {
    const fields = [
      { value: artist.name, boost: 40 },
      ...artist.keywords.map((value) => ({ value, boost: 30 })),
      ...(ARTIST_SEARCH_ALIASES[artist.slug] ?? []).map((value) => ({ value, boost: 35 })),
      { value: artist.initials, boost: 20 },
      { value: artist.slug, boost: 10 },
    ];
    const score = Math.max(...fields.map(({ value, boost }) => searchTextScore(partial, value) + boost));
    return { artist, index, score };
  })
    .filter(({ artist, score }) => !isTestArtist(artist) && score > 40)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ artist }) => artist)
    .slice(0, limit);
}

/** 検索結果で会場ページへ直接案内するための最小の会場情報。 */
export type SearchVenue = Pick<VenueConfig, "id" | "name">;

/** Names with spaces remain one term; spelling aliases resolve to canonical names. */
export function getSearchTerms(query: string): string[] {
  const parsed = parseSearchQuery(query);
  return [...new Set([
    ...ARTISTS.filter((artist) => parsed.artistSlugs.includes(artist.slug)).map((artist) => artist.name),
    ...VENUES.filter((venue) => parsed.venueIds.includes(venue.id)).map((venue) => venue.name),
    ...parsed.remainder,
  ])];
}

/**
 * 会場名・通称・「座席表」付き検索を会場詳細ページへつなぐ。
 * DBの公演有無に左右されない静的な会場ディレクトリを対象にする。
 */
export function searchVenues(query: string, limit = 8): SearchVenue[] {
  const parsed = parseSearchQuery(query);
  if (parsed.venueIds.length > 0) {
    return VENUES.filter((venue) => parsed.venueIds.includes(venue.id))
      .map(({ id, name }) => ({ id, name })).slice(0, limit);
  }
  const partial = parsed.remainder.join(" ");
  if (!partial) return [];

  return VENUES.map((venue, index) => {
    const score = Math.max(...getVenueSearchNames(venue).map((field) => searchTextScore(partial, field)));
    return { venue: { id: venue.id, name: venue.name }, index, score };
  })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ venue }) => venue)
    .slice(0, limit);
}

// DB側ILIKEはあくまで候補を広く拾うための事前フィルタ。短い英数字クエリ(例: "IVE")は
// ILIKEだけだと無関係な語("LIVE TOUR"等)まで大量に拾うため、事前フィルタの件数上限は
// 表示件数(limit)より十分大きく取り、最終的な採否と順位はsearchTextScoreで確定させる。
const PREFETCH_CAP = 400;

/** 1文字検索で全公演を部分一致させるとノイズが大きいため、本文検索は2文字から。 */
export function shouldSearchEventText(query: string): boolean {
  return [...normalizeForSearch(query)].length >= 2;
}

/** 検索結果の公演行は、押した公演と同じ詳細ページへ直接案内する。 */
export function getSearchEventDestination(
  event: Pick<CrawledEvent, "id">,
): string {
  return `/events/${event.id}`;
}

export function rankEventSearchResults(
  query: string,
  events: CrawledEvent[],
  matchedArtists: Artist[],
  limit = 30,
): CrawledEvent[] {
  const artistRank = new Map(matchedArtists.map((artist, index) => [artist.slug, index]));
  const includeTextMatches = shouldSearchEventText(query);
  const parsed = parseSearchQuery(query);
  const hasNamedEntity = parsed.artistSlugs.length + parsed.venueIds.length > 0;
  const requestedVenues = VENUES.filter((venue) => parsed.venueIds.includes(venue.id));

  return events
    .filter((event) => {
      const artist = event.artist_slug ? ARTISTS.find((candidate) => candidate.slug === event.artist_slug) : null;
      return !isTestEvent(event) && !isArtistOnlyEventTitle(event.title, artist?.name);
    })
    .map((event) => {
      const matchedArtistIndex = event.artist_slug ? artistRank.get(event.artist_slug) : undefined;
      const eventArtist = event.artist_slug ? ARTISTS.find((artist) => artist.slug === event.artist_slug) : null;
      const artistMatch = parsed.artistSlugs.length === 0 || (event.artist_slug
        ? parsed.artistSlugs.includes(event.artist_slug)
        : parseSearchQuery(event.title).artistSlugs.some((slug) => parsed.artistSlugs.includes(slug)));
      const venueMatch = requestedVenues.length === 0 || requestedVenues.some((venue) =>
        (event.venue_id && getVenueIdAliases(venue.id).includes(event.venue_id))
        || getVenueSearchNames(venue).some((name) => normalizeForSearch(name) === normalizeForSearch(event.venue)));
      const fields = [event.title, event.venue, event.date ?? "", ...(eventArtist ? getArtistSearchNames(eventArtist) : [])];
      const matchesAllTerms = artistMatch && venueMatch && parsed.remainder.every((term) =>
        fields.some((field) => searchTextScore(term, field) > 0));
      const titleScore = includeTextMatches ? searchTextScore(query, event.title) : 0;
      const venueScore = includeTextMatches ? searchTextScore(query, event.venue) : 0;
      const score = Math.max(
        titleScore > 0 ? 500 + titleScore : 0,
        matchedArtistIndex !== undefined ? 400 - matchedArtistIndex : 0,
        venueScore > 0 ? 300 + venueScore : 0,
        hasNamedEntity && matchesAllTerms ? 600 : 0,
        includeTextMatches && parsed.remainder.length > 0 && matchesAllTerms ? 200 : 0,
      );
      return { event, score: matchesAllTerms ? score : 0 };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || (b.event.date ?? "").localeCompare(a.event.date ?? ""))
    .map(({ event }) => event)
    .slice(0, limit);
}

/**
 * 公演名・会場名をDB(events)で検索する。
 * artist_slug が未設定のイベントも検索対象・表示対象に含める。
 *
 * アーティスト名・別名に一致した場合はartist_slugでも取得するため、イベント名に
 * アーティスト名が入っていないフェス等も見つかる。DB側のILIKEは候補抽出だけに使い、
 * 短い英字の語中誤爆（IVE → LIVE等）はsearchTextScoreで除外する。
 * 1文字入力ではタイトル・会場の総当たりをせず、該当アーティストの公演だけを表示する。
 */
export async function searchEvents(query: string, limit = 30): Promise<CrawledEvent[]> {
  const q = query.trim();
  if (q.length < 1) return [];

  const parsed = parseSearchQuery(q);
  const matchedArtists = searchArtists(q);
  const matchedArtistSlugs = matchedArtists.map((artist) => artist.slug);
  const venueIds = [...new Set(parsed.venueIds.flatMap((id) => [...getVenueIdAliases(id)]))];
  // Preserve the original spelling for SQL ILIKE: kana normalization belongs
  // in the final matcher, not the case-insensitive DB prefilter. Canonical
  // names supplement raw terms for aliases and rows without entity IDs.
  const textTerms = [...new Set([q, ...getSearchTerms(q), ...q.normalize("NFKC").split(/\s+/)])]
    .filter(shouldSearchEventText).slice(0, 8);
  const columns = "id, title, venue, venue_id, date, genre, lottery_types, artist_slug";
  const emptyResult = Promise.resolve({ data: null, error: null });
  const textResults = await Promise.all(textTerms.flatMap((term) => {
    const escaped = escapeIlikePattern(term);
    return [
      supabase
        .from("events")
        .select(columns)
        .ilike("title", `%${escaped}%`)
        .order("date", { ascending: false })
        .limit(PREFETCH_CAP),
      supabase
        .from("events")
        .select(columns)
        .ilike("venue", `%${escaped}%`)
        .order("date", { ascending: false })
        .limit(PREFETCH_CAP),
    ];
  }));
  let entityQuery = supabase.from("events").select(columns);
  if (matchedArtistSlugs.length > 0) entityQuery = entityQuery.in("artist_slug", matchedArtistSlugs);
  if (venueIds.length > 0) entityQuery = entityQuery.in("venue_id", venueIds);
  // Filter both IDs before applying the cap, rather than losing the requested
  // venue among hundreds of the artist's other events.
  const entityResult = await (matchedArtistSlugs.length > 0 || venueIds.length > 0
    ? entityQuery.order("date", { ascending: false }).limit(PREFETCH_CAP)
    : emptyResult);
  const results = [...textResults, entityResult];
  for (const result of results) {
    if (result.error) console.error(result.error);
  }

  const merged = new Map<string, CrawledEvent>();
  for (const result of results) {
    for (const event of (result.data as CrawledEvent[] | null) ?? []) merged.set(event.id, event);
  }

  return rankEventSearchResults(q, [...merged.values()], matchedArtists, limit);
}
