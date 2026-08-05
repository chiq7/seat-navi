import { ARTISTS, type Artist } from "@/lib/artists";
import { ARTIST_SEARCH_ALIASES } from "@/lib/artistSearchAliases";
import { VENUES, type VenueConfig } from "@/lib/eventCrawlerConfig";
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

/** 検索結果で会場ページへ直接案内するための最小の会場情報。 */
export type SearchVenue = Pick<VenueConfig, "id" | "name">;

/**
 * 正式名だけでは取りこぼす、検索でよく使われる会場の呼び方。
 * 英数字・全半角・記号のゆれは searchTextScore 側で吸収する。
 */
const VENUE_SEARCH_ALIASES: Readonly<Record<string, readonly string[]>> = {
  "tokyo-dome": ["東京ドームシティ"],
  "vantelin-dome": ["名古屋ドーム", "ナゴヤドーム"],
  "paypay-dome": ["福岡ドーム"],
  "saitama-super-arena": ["さいたまアリーナ", "SSA"],
  "yokohama-arena": ["横アリ"],
  "yoyogi": ["代々木体育館", "代々木第一"],
  "k-arena": ["Kアリーナ"],
  "osaka-jo-hall": ["城ホ"],
  "miyagi-arena": ["宮城スーパーアリーナ", "グランディ21"],
  "hiroshima-arena": ["広島アリーナ"],
};

/**
 * 「会場名 座席表」のような検索語では、意図語を外した候補でも会場名を照合する。
 * "アリーナ" は会場固有名に含まれるため削除しない。
 */
const VENUE_INTENT_WORD = /(?:の)?(?:ライブ|コンサート|公演|会場|座席表|座席|見え方|キャパ|収容人数)/g;

/** 検索語を区切って、アーティスト名と会場名の複合検索に使う。 */
const SEARCH_INTENT_TERMS = new Set([
  "ライブ",
  "コンサート",
  "公演",
  "会場",
  "座席表",
  "座席",
  "見え方",
  "当落",
  "当選率",
  "アリーナ予想",
  "アリーナ",
  "現地レポ",
]);

export function getSearchTerms(query: string): string[] {
  const terms = query
    .normalize("NFKC")
    .split(/[\s　]+/)
    .map((term) => term.trim())
    .filter(Boolean)
    .filter((term) => !SEARCH_INTENT_TERMS.has(normalizeForSearch(term)));

  return Array.from(new Set(terms)).slice(0, 3);
}

function venueQueryVariants(query: string): string[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const withoutIntent = trimmed.replace(VENUE_INTENT_WORD, " ").replace(/\s+/g, " ").trim();
  return Array.from(new Set([trimmed, withoutIntent].filter(Boolean)));
}

/**
 * 会場名・通称・「座席表」付き検索を会場詳細ページへつなぐ。
 * DBの公演有無に左右されない静的な会場ディレクトリを対象にする。
 */
export function searchVenues(query: string, limit = 8): SearchVenue[] {
  const variants = venueQueryVariants(query);
  if (variants.length === 0) return [];

  return VENUES.map((venue, index) => {
    const fields = [venue.name, ...(VENUE_SEARCH_ALIASES[venue.id] ?? [])];
    const score = Math.max(
      ...variants.flatMap((variant) => fields.map((field) => searchTextScore(variant, field))),
    );
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

/**
 * アーティスト単体の検索は総合ページを入口にする。
 * アーティスト名と会場名を組み合わせた検索は、意図が明確なので該当公演へ直接案内する。
 */
export function getSearchEventDestination(
  event: Pick<CrawledEvent, "id" | "artist_slug" | "venue">,
  query?: string,
): string {
  const searchTerms = query ? getSearchTerms(query) : [];
  const includesVenueTerm = searchTerms.some((term) => searchTextScore(term, event.venue) > 0);
  if (searchTerms.length >= 2 && includesVenueTerm) return `/events/${event.id}`;

  const artist = event.artist_slug
    ? ARTISTS.find((candidate) => candidate.slug === event.artist_slug && !isTestArtist(candidate))
    : null;
  return artist ? `/artists/${artist.slug}` : `/events/${event.id}`;
}

export function rankEventSearchResults(
  query: string,
  events: CrawledEvent[],
  matchedArtists: Artist[],
  limit = 30,
): CrawledEvent[] {
  const artistRank = new Map(matchedArtists.map((artist, index) => [artist.slug, index]));
  const includeTextMatches = shouldSearchEventText(query);
  const searchTerms = getSearchTerms(query);
  const requiresAllTerms = searchTerms.length >= 2;

  return events
    .filter((event) => !isTestEvent(event))
    .map((event) => {
      const titleScore = includeTextMatches ? searchTextScore(query, event.title) : 0;
      const venueScore = includeTextMatches ? searchTextScore(query, event.venue) : 0;
      const matchedArtistIndex = event.artist_slug ? artistRank.get(event.artist_slug) : undefined;
      const eventArtist = event.artist_slug ? ARTISTS.find((artist) => artist.slug === event.artist_slug) : null;
      const termMatches = searchTerms.map((term) => [
        event.title,
        event.venue,
        eventArtist?.name ?? "",
        ...(eventArtist?.keywords ?? []),
        eventArtist?.initials ?? "",
      ].some((field) => searchTextScore(term, field) > 0));
      const matchesAllTerms = !requiresAllTerms || termMatches.every(Boolean);
      const score = Math.max(
        titleScore > 0 ? 500 + titleScore : 0,
        matchedArtistIndex !== undefined ? 400 - matchedArtistIndex : 0,
        venueScore > 0 ? 300 + venueScore : 0,
        requiresAllTerms && matchesAllTerms ? 600 + termMatches.length : 0,
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

  const searchTerms = getSearchTerms(q);
  const matchedArtists = Array.from(
    new Map(
      [searchArtists(q), ...searchTerms.map((term) => searchArtists(term))]
        .flat()
        .map((artist) => [artist.slug, artist]),
    ).values(),
  );
  const matchedArtistSlugs = matchedArtists.map((artist) => artist.slug);
  const searchEventText = shouldSearchEventText(q);
  const textTerms = searchTerms.length > 1
    ? searchTerms.filter(shouldSearchEventText)
    : searchEventText ? [q] : [];
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
  const artistResult = await (matchedArtistSlugs.length > 0
      ? supabase
        .from("events")
        .select(columns)
        .in("artist_slug", matchedArtistSlugs)
        .order("date", { ascending: false })
        .limit(PREFETCH_CAP)
      : emptyResult);
  const { data: byArtist, error: artistErr } = artistResult;
  for (const result of textResults) {
    if (result.error) console.error(result.error);
  }
  if (artistErr) console.error(artistErr);

  const merged = new Map<string, CrawledEvent>();
  for (const result of textResults) {
    for (const event of (result.data as CrawledEvent[] | null) ?? []) merged.set(event.id, event);
  }
  for (const e of (byArtist as CrawledEvent[] | null) ?? []) merged.set(e.id, e);

  return rankEventSearchResults(q, [...merged.values()], matchedArtists, limit);
}
