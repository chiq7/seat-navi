import { ARTISTS, type Artist } from "@/lib/artists";
import { ARTIST_SEARCH_ALIASES } from "@/lib/artistSearchAliases";
import { normalizeForSearch, searchTextScore } from "@/lib/keywordMatch";
import { isTestArtist, isTestEvent } from "@/lib/seoData";
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

  return ARTISTS.map((artist, index) => {
    const fields = [
      { value: artist.name, boost: 40 },
      ...artist.keywords.map((value) => ({ value, boost: 30 })),
      ...(ARTIST_SEARCH_ALIASES[artist.slug] ?? []).map((value) => ({ value, boost: 35 })),
      { value: artist.initials, boost: 20 },
      { value: artist.slug, boost: 10 },
    ];
    const score = Math.max(...fields.map(({ value, boost }) => searchTextScore(q, value) + boost));
    return { artist, index, score };
  })
    .filter(({ artist, score }) => !isTestArtist(artist) && score > 40)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ artist }) => artist)
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

export function rankEventSearchResults(
  query: string,
  events: CrawledEvent[],
  matchedArtists: Artist[],
  limit = 30,
): CrawledEvent[] {
  const artistRank = new Map(matchedArtists.map((artist, index) => [artist.slug, index]));
  const includeTextMatches = shouldSearchEventText(query);

  return events
    .filter((event) => !isTestEvent(event))
    .map((event) => {
      const titleScore = includeTextMatches ? searchTextScore(query, event.title) : 0;
      const venueScore = includeTextMatches ? searchTextScore(query, event.venue) : 0;
      const matchedArtistIndex = event.artist_slug ? artistRank.get(event.artist_slug) : undefined;
      const score = Math.max(
        titleScore > 0 ? 500 + titleScore : 0,
        matchedArtistIndex !== undefined ? 400 - matchedArtistIndex : 0,
        venueScore > 0 ? 300 + venueScore : 0,
      );
      return { event, score };
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

  const matchedArtists = searchArtists(q);
  const matchedArtistSlugs = matchedArtists.map((artist) => artist.slug);
  const searchEventText = shouldSearchEventText(q);
  const escaped = escapeIlikePattern(q);
  const columns = "id, title, venue, venue_id, date, genre, lottery_types, artist_slug";
  const emptyResult = Promise.resolve({ data: null, error: null });
  const [titleResult, venueResult, artistResult] = await Promise.all([
    searchEventText
      ? supabase
        .from("events")
        .select(columns)
        .ilike("title", `%${escaped}%`)
        .order("date", { ascending: false })
        .limit(PREFETCH_CAP)
      : emptyResult,
    searchEventText
      ? supabase
        .from("events")
        .select(columns)
        .ilike("venue", `%${escaped}%`)
        .order("date", { ascending: false })
        .limit(PREFETCH_CAP)
      : emptyResult,
    matchedArtistSlugs.length > 0
      ? supabase
        .from("events")
        .select(columns)
        .in("artist_slug", matchedArtistSlugs)
        .order("date", { ascending: false })
        .limit(PREFETCH_CAP)
      : emptyResult,
  ]);
  const { data: byTitle, error: titleErr } = titleResult;
  const { data: byVenue, error: venueErr } = venueResult;
  const { data: byArtist, error: artistErr } = artistResult;
  if (titleErr) console.error(titleErr);
  if (venueErr) console.error(venueErr);
  if (artistErr) console.error(artistErr);

  const merged = new Map<string, CrawledEvent>();
  for (const e of (byTitle as CrawledEvent[] | null) ?? []) merged.set(e.id, e);
  for (const e of (byVenue as CrawledEvent[] | null) ?? []) merged.set(e.id, e);
  for (const e of (byArtist as CrawledEvent[] | null) ?? []) merged.set(e.id, e);

  return rankEventSearchResults(q, [...merged.values()], matchedArtists, limit);
}
