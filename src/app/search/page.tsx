"use client";

import { getEventDisplayVenueName } from "@/lib/publicVenueGuides";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Building2, CalendarDays, MapPin, MoveRight, Search, X } from "lucide-react";
import ArtistGroupPhoto from "@/components/common/ArtistGroupPhoto";
import { getArtistGroupImage } from "@/lib/artistGroupImages";
import FavoriteArtistButton from "@/components/auth/FavoriteArtistButton";
import { Header } from "@/components/common/Header";
import { InfoListRow } from "@/components/common/InfoListRow";
import { EventListRow, formatEventDate } from "@/components/common/EventListRow";
import { EmptyState } from "@/components/common/EmptyState";
import { trackEvent } from "@/lib/analytics";
import { findArtistBySlug, type Artist } from "@/lib/artists";
import { getSearchEventDestination, groupSearchEventsByDate, rankEventSearchResults, searchArtists, searchEvents, searchVenues, type SearchVenue } from "@/lib/search";
import { dedupeVenueEventsForDisplay } from "@/lib/eventDisplay";
import { getJstDateString } from "@/lib/artistPageData";
import { getCommittedSearchUrl, parseSearchQuery } from "@/lib/searchQuery";
import { getSearchNameSuggestions, type SearchNameSuggestion } from "@/lib/searchSpellingSuggestion";
import { getSearchDiscoveryResults, type SearchDiscoveryResult } from "@/lib/searchDiscovery";
import { supabase } from "@/lib/supabase/client";
import type { CrawledEvent } from "@/lib/types";
import { isVagueHomeVenue } from "@/lib/homeData";
import { isArtistOnlyEventTitle, parseEventTitle } from "@/lib/eventTitle";
import { formatPublicDataTime, publicPageDataPaths, STATIC_PUBLIC_PAGES } from "@/lib/publicPageData";

async function readSearchCatalog(signal: AbortSignal) {
  const response = await fetch(publicPageDataPaths.events, { signal });
  if (!response.ok) throw new Error("Public event catalog is unavailable");
  const { events } = await response.json() as { events: CrawledEvent[] };
  const savedAt = response.headers.get("X-Tixrepo-Data-Stale") === "1"
    ? response.headers.get("X-Tixrepo-Data-Updated-At") : null;
  return { events, savedAt };
}

const POPULAR_SEARCH_ARTIST_SLUGS = [
  "snow-man",
  "mrs-green-apple",
  "nogizaka46",
  "sixtones",
  "number-i",
  "niziu",
  "seventeen",
  "stray-kids",
] as const;

const POPULAR_SEARCH_ARTISTS = POPULAR_SEARCH_ARTIST_SLUGS
  .map((slug) => findArtistBySlug(slug))
  .filter((artist): artist is Artist => Boolean(artist));

function readAddressQuery() {
  return new URLSearchParams(window.location.search).get("q") ?? "";
}

// A queryless static snapshot serves all search URLs. Only this observer
// depends on the router, so the form itself can be included in that snapshot.
function SearchLocation({ onChange }: { onChange: (value: string) => void }) {
  const routerQuery = useSearchParams().get("q");
  useEffect(() => { onChange(readAddressQuery()); }, [routerQuery, onChange]);
  return null;
}

type SearchRequest = { query: string; address: string; attempt: number };
type SearchMatches = {
  artists: Artist[]; venues: SearchVenue[]; events: CrawledEvent[];
  discovery: SearchDiscoveryResult[]; suggestions: SearchNameSuggestion[];
};
type SearchResponse = {
  request: SearchRequest; matches: SearchMatches; state: "loading" | "ready" | "unavailable"; savedAt: string | null;
};
const emptyMatches: SearchMatches = { artists: [], venues: [], events: [], discovery: [], suggestions: [] };

export default function SearchPage() {
  const [initialQuery, setInitialQuery] = useState("");
  const [draft, setDraft] = useState<{ address: string; value: string } | null>(null);
  const query = draft?.address === initialQuery ? draft.value : initialQuery;
  const setQuery = (value: string) => setDraft({ address: initialQuery, value });
  const hasQuery = query.trim().length > 0;
  const [attempt, setAttempt] = useState(0);
  const retry = () => setAttempt(current => current + 1);
  const composing = useRef(false);
  const searchRequest = useMemo(() => ({ query, address: initialQuery, attempt }), [query, initialQuery, attempt]);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const current = response?.request === searchRequest ? response : null;
  const { artists: artistResults, venues: venueResults, events: eventResults, discovery: discoveryResults, suggestions: nameSuggestions } = current?.matches ?? emptyMatches;
  const loading = hasQuery && !current;
  const eventSearchState = current?.state ?? (hasQuery ? "loading" : "ready");
  const eventSearchSavedAt = current?.savedAt;
  const resolvedQuery = current && current.state !== "loading" ? query.trim() : "";
  const [favoriteUserId, setFavoriteUserId] = useState<string | null>(null);
  const [favoriteSlugs, setFavoriteSlugs] = useState<Set<string>>(new Set());
  const [favoritesReady, setFavoritesReady] = useState(false);
  const recentRequest = useMemo(() => ({ hasQuery, attempt }), [hasQuery, attempt]);
  const [recentResponse, setRecentResponse] = useState<{ request: typeof recentRequest; events: CrawledEvent[]; failed: boolean } | null>(null);
  const recent = recentResponse?.request === recentRequest ? recentResponse : null;
  const recentEvents = recent?.events ?? [];
  const recentEventsLoading = recent === null;
  const recentEventsFailed = recent?.failed;
  const lastTrackedQuery = useRef("");

  useEffect(() => {
    let cancelled = false;

    async function loadFavorites() {
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id ?? null;
      if (cancelled) return;
      setFavoriteUserId(userId);

      if (userId) {
        const { data: rows } = await supabase
          .from("favorite_artists")
          .select("artist_slug")
          .eq("user_id", userId);
        if (cancelled) return;
        setFavoriteSlugs(new Set((rows ?? []).map((row) => row.artist_slug)));
      }
      setFavoritesReady(true);
    }

    void loadFavorites();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (recentRequest.hasQuery) return;
    let cancelled = false;
    const controller = new AbortController();
    const fail = () => { if (!cancelled) setRecentResponse({ request: recentRequest, events: [], failed: true }); };
    const deadline = window.setTimeout(() => {
      controller.abort();
      fail();
    }, 4000);
    async function loadRecentEvents() {
      const today = getJstDateString();
      const catalog = STATIC_PUBLIC_PAGES ? await readSearchCatalog(controller.signal).catch(() => null) : null;
      if (cancelled) return;
      if (controller.signal.aborted) return;
      const data = catalog ? catalog.events.filter(event => event.date && event.date >= today)
        .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? "")).slice(0, 30) : (await supabase
        .from("events")
        .select("id, title, venue, venue_id, date, genre, lottery_types, artist_slug")
        .gte("date", today)
        .order("date", { ascending: true })
        .limit(30).abortSignal(controller.signal).throwOnError()).data;
      if (cancelled || controller.signal.aborted) return;
      const safeRows = ((data as CrawledEvent[]) ?? []).filter((event) => {
        const artist = event.artist_slug ? findArtistBySlug(event.artist_slug) : null;
        return Boolean(artist)
          && !isVagueHomeVenue(event.venue)
          && !parseEventTitle(event.title, artist?.name).isTestData
          && !isArtistOnlyEventTitle(event.title, artist?.name);
      });
      setRecentResponse({ request: recentRequest, events: dedupeVenueEventsForDisplay(safeRows).slice(0, 4), failed: false });
    }
    void loadRecentEvents().catch(fail).finally(() => window.clearTimeout(deadline));
    return () => { cancelled = true; window.clearTimeout(deadline); controller.abort(); };
  }, [recentRequest]);

  function updateFavorite(artistSlug: string, favorite: boolean) {
    setFavoriteSlugs((current) => {
      const next = new Set(current);
      if (favorite) next.add(artistSlug);
      else next.delete(artistSlug);
      return next;
    });
  }

  useEffect(() => {
    const sync = () => setInitialQuery(readAddressQuery());
    sync();
    window.addEventListener("popstate", sync);
    window.addEventListener("pageshow", sync);
    return () => { window.removeEventListener("popstate", sync); window.removeEventListener("pageshow", sync); };
  }, []);

  function selectResult(resultType: string, resultId?: string) {
    const term = query.trim();
    const url = getCommittedSearchUrl(window.location.href, term);
    // Preserve live-result selection for Back without creating another history entry.
    if (url) window.history.replaceState(window.history.state, "", url);
    if (term && lastTrackedQuery.current !== term) {
      lastTrackedQuery.current = term;
      trackEvent("search", { search_term: term, has_results: true });
    }
    trackEvent("select_search_result", { result_type: resultType, result_id: resultId, search_term: term });
  }

  // 検索実行(200msデバウンス)
  useEffect(() => {
    const trimmed = searchRequest.query.trim();
    if (!trimmed) return;
    let cancelled = false;
    const controller = new AbortController();
    const markUnavailable = () => {
      if (cancelled) return;
      setResponse(previous => ({
        request: searchRequest,
        matches: previous?.request === searchRequest ? previous.matches : emptyMatches,
        state: "unavailable", savedAt: null,
      }));
    };
    const deadline = window.setTimeout(() => { controller.abort(); markUnavailable(); }, 4000);
    async function runSearch() {
      const artists = searchArtists(trimmed);
      const parsed = parseSearchQuery(trimmed);
      const nameResults = getSearchNameSuggestions(trimmed, parsed);
      function findMatches(events: CrawledEvent[]): SearchMatches {
        return {
          artists, venues: searchVenues(trimmed, 200, events), events,
          discovery: getSearchDiscoveryResults(trimmed, { ...parsed, events }), suggestions: nameResults,
        };
      }
      setResponse({ request: searchRequest, matches: findMatches([]), state: "loading", savedAt: null });

      const catalog = STATIC_PUBLIC_PAGES ? await readSearchCatalog(controller.signal).catch(() => null) : null;
      if (cancelled || controller.signal.aborted) return;
      const result = catalog
        ? rankEventSearchResults(trimmed, catalog.events, artists)
        : await searchEvents(trimmed, 30, controller.signal).catch(() => null);
      if (cancelled || controller.signal.aborted) return;
      const events = result ?? [];
      const matches = findMatches(events);
      const { venues, discovery } = matches;
      setResponse({ request: searchRequest, matches, state: result === null ? "unavailable" : "ready", savedAt: catalog?.savedAt ?? null });
      if (trimmed === searchRequest.address.trim() && lastTrackedQuery.current !== trimmed) {
        lastTrackedQuery.current = trimmed;
        trackEvent("search", {
          search_term: trimmed,
          artist_results: artists.length,
          venue_results: venues.length,
          event_results: events.length,
          guide_results: discovery.length,
          has_results: nameResults.length > 0 || artists.length + venues.length + events.length + discovery.length > 0,
        });
      }
    }
    const timer = window.setTimeout(() => {
      void runSearch().catch(markUnavailable).finally(() => window.clearTimeout(deadline));
    }, 200);

    return () => { cancelled = true; window.clearTimeout(timer); window.clearTimeout(deadline); controller.abort(); };
  }, [searchRequest]);

  const hasResults = nameSuggestions.length > 0 || artistResults.length > 0 || venueResults.length > 0 || eventResults.length > 0 || discoveryResults.length > 0;

  return (
    <main className="community-page pb-16" data-search-query={loading ? undefined : resolvedQuery}>
      <Suspense fallback={null}><SearchLocation onChange={setInitialQuery} /></Suspense>
      <section className="community-hero">
        <Header title="検索" backHref="/" backLabel="TOPへ戻る" />

        <div className="zr-container pb-6 pt-4 sm:pb-9 sm:pt-7">
          
          <h1 className="mt-2 text-[28px] font-black tracking-[-0.05em] text-[#4b4148] sm:text-[38px]">ライブの情報を<span className="text-[#ef4f87]">探す</span></h1>
          <p className="mt-1 text-pretty text-[12px] font-bold leading-6 text-[#817981]">地域・座席表・アクセス・ロッカー・セトリも検索できます。</p>

          <form action="/search" method="get" role="search" className="mt-4 flex min-h-[52px] items-center gap-2 border border-[#eadfe4] bg-white py-1 pl-3 pr-1 text-[#4b4148] shadow-sm"
            onSubmit={event => {
              event.preventDefault();
              if (composing.current) return;
              const url = getCommittedSearchUrl(window.location.href, query);
              if (url) window.location.assign(url.href);
              else setQuery(query.trim());
            }}>
            <label htmlFor="site-search" className="sr-only">アーティスト・公演・会場を検索</label>
            <input
              id="site-search"
              name="q"
              type="text"
              inputMode="search"
              enterKeyHint="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onCompositionStart={() => { composing.current = true; }}
              onCompositionEnd={() => { composing.current = false; }}
              onKeyDown={event => {
                if (event.key === "Enter" && (composing.current || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229)) {
                  event.preventDefault();
                }
              }}
              placeholder="名前・地域・知りたいこと"
              className="min-w-0 flex-1 bg-transparent text-[14px] font-bold text-[#4b4148] outline-none placeholder:text-[#aaa2a8]"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="検索語を消す"
                className="zr-focus flex h-11 w-11 shrink-0 items-center justify-center text-[#817981]"
              >
                <X size={19} />
              </button>
            )}
            <button type="submit" className="zr-focus flex min-h-11 shrink-0 items-center gap-1 rounded-lg bg-[#aa285b] px-3 text-sm font-bold text-white">
              <Search size={16} aria-hidden="true" />検索
            </button>
          </form>
        </div>
      </section>

      <div className="zr-container py-7 sm:py-10">
        {!hasQuery && (
          <div className="space-y-8">
            <section aria-labelledby="popular-artists-title">
              
              <h2 id="popular-artists-title" className="mt-1 text-[22px] font-black tracking-[-0.04em]">人気のアーティスト</h2>
              <div className="mt-4 grid grid-cols-2 border-l border-t border-[#ded8dc] sm:grid-cols-4">
                {POPULAR_SEARCH_ARTISTS.map((artist) => (
                  <Link
                    key={artist.slug}
                    href={`/artists/${artist.slug}`}
                    className="zr-focus flex min-h-[56px] flex-wrap items-center justify-between gap-2 border-b border-r border-[#ded8dc] bg-white px-3 py-3 text-[12px] font-black text-[#4b4148]"
                  >
                    <span className="block w-full"><ArtistGroupPhoto slug={artist.slug} name={artist.name} variant="tile" /></span>
                    <span className="min-w-0 flex-1 truncate">{artist.name}</span><MoveRight size={14} className="shrink-0 text-[#f43679]" />
                  </Link>
                ))}
              </div>
            </section>

            <section aria-labelledby="recent-events-title">
              
              <h2 id="recent-events-title" className="mt-1 text-[22px] font-black tracking-[-0.04em]">開催が近い公演</h2>
              {recentEventsLoading ? (
                <div className="mt-4 space-y-px" aria-busy="true">
                  {[0, 1, 2, 3].map((item) => <div key={item} className="h-[72px] animate-pulse bg-[#f8f3f5]" />)}
                </div>
              ) : recentEventsFailed ? (
                <SearchRetry onRetry={retry} />
              ) : recentEvents.length > 0 ? (
                <div className="mt-4 border-t border-[#ded8dc] bg-white">
                  {recentEvents.map((event) => (
                    <EventListRow
                      key={event.id}
                      event={event}
                      artistName={event.artist_slug ? findArtistBySlug(event.artist_slug)?.name : null}
                      artistFirst
                      secondary={getEventDisplayVenueName(event.venue_id, event.venue)}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState className="mt-4" title="開催予定を確認中です" icon={<CalendarDays size={18} aria-hidden="true" />} />
              )}
            </section>
          </div>
        )}

        {hasQuery && loading && (
          <div className="space-y-3 py-5" aria-busy="true" aria-label="検索結果を読み込み中">
            {[0, 1, 2].map((item) => (
              <div key={item} className="animate-pulse border-y border-[#ece5e9] bg-white px-4 py-4">
                <div className="h-3 w-20 bg-[#f2e9ed]" />
                <div className="mt-3 h-4 w-2/3 bg-[#f8f3f5]" />
              </div>
            ))}
          </div>
        )}

        {hasQuery && !loading && eventSearchState === "unavailable" && (
          <SearchRetry onRetry={retry} />
        )}
        {hasQuery && !loading && eventSearchSavedAt && (
          <p role="status" className="mb-4 text-sm">{formatPublicDataTime(eventSearchSavedAt)}時点の公演情報で検索しています。</p>
        )}
        {hasQuery && !loading && nameSuggestions.length > 0 && (
          <section className="mb-5 rounded-xl border border-[#eadfe4] bg-white p-3 text-sm" aria-label="入力に近い候補" data-search-name-result>
            {nameSuggestions.some(item => item.correction) && <p className="mb-2 font-bold text-[#68525e]">もしかして</p>}
            <ul className="space-y-2">
              {nameSuggestions.map(item => <li key={item.href}>
                <Link href={item.href} className="zr-focus flex min-h-11 items-center justify-between gap-3 rounded-lg border border-[#eadfe4] bg-[#fff7fa] px-3 py-2 font-bold text-[#8f2f59]" prefetch={false}
                  onClick={() => selectResult(item.correction ? "name_suggestion" : "site")}>
                  <span className="min-w-0 break-words">{item.title}</span><MoveRight size={16} className="shrink-0" aria-hidden="true" />
                </Link>
              </li>)}
            </ul>
          </section>
        )}
        {hasQuery && !loading && eventSearchState === "ready" && !hasResults && (
          <EmptyState
            title="検索結果が見つかりませんでした"
            icon={<Search size={18} aria-hidden="true" />}
            actionHref="/venues"
            actionLabel="会場から探す"
            actionIcon={<MoveRight size={14} aria-hidden="true" />}
          />
        )}

        {hasQuery && !loading && discoveryResults.length > 0 && (
          <section className="pb-8 sm:pb-10" aria-labelledby="discovery-results-title">
            <h2 id="discovery-results-title" className="text-[22px] font-black tracking-[-0.04em]">目的に合う案内</h2>
            <div className="mt-4 border-y border-[#ded8dc] bg-white">
              {discoveryResults.map((result) => (
                <Link key={result.id} href={result.href} prefetch={false}
                  scroll={!/#(?:venue-(?:seat-photos|luggage|baby|nursing|baby-room|diaper)|performance-ticket-timing)$/.test(result.href)}
                  className="zr-focus group flex min-h-[72px] items-center justify-between gap-4 border-b border-[#ece5e9] px-4 py-4 last:border-b-0"
                  onClick={() => selectResult(result.kind, result.id)}>
                  <span className="min-w-0">
                    <span className="block text-[15px] font-black leading-6 text-[#4b4148]">{result.title}</span>
                    <span className="mt-1 block text-[12px] font-medium leading-5 text-[#817981]">{result.description}</span>
                  </span>
                  <MoveRight size={17} className="shrink-0 text-[#f43679]" aria-hidden="true" />
                </Link>
              ))}
            </div>
          </section>
        )}

        {hasQuery && !loading && venueResults.length > 0 && (
          <section className="pb-8 sm:pb-10" aria-labelledby="venue-results-title">
            <div className="flex items-end justify-between gap-3">
              <div>
                
                <h2 id="venue-results-title" className="mt-1 text-[22px] font-black tracking-[-0.04em]">会場・公演の案内</h2>
              </div>
              <p className="text-[10px] font-black text-[#817981]">{venueResults.length}会場</p>
            </div>
            <div className="mt-4 border-y border-[#ded8dc] bg-white">
              {venueResults.map((venue) => (
                <InfoListRow
                  key={venue.id}
                  href={venue.href}
                  ariaLabel={`${venue.name}：${venue.description}`}
                  className="group"
                  onClick={() => selectResult("venue", venue.id)}
                >
                  <span className="flex flex-col items-center gap-1 text-[#f43679]"><Building2 size={20} strokeWidth={1.7} /><span className="text-[8px] font-black">会場</span></span>
                  <span className="min-w-0"><span data-search-venue-name className="block [overflow-wrap:anywhere] text-[15px] font-black leading-6 tracking-[-0.035em] text-[#4b4148]">{venue.name}</span><span className="mt-1 block text-[12px] font-medium leading-5 text-[#817981]">{venue.description}</span></span>
                  <MoveRight size={17} className="shrink-0 text-[#f43679] transition-transform group-hover:translate-x-1" />
                </InfoListRow>
              ))}
            </div>
          </section>
        )}

        {hasQuery && !loading && artistResults.length > 0 && (
          <section className={`${venueResults.length > 0 ? "pt-8 " : ""}pb-8 sm:pb-10`} aria-labelledby="artist-results-title">
            <div className="flex items-end justify-between gap-3">
              <div>
                
                <h2 id="artist-results-title" className="mt-1 text-[22px] font-black tracking-[-0.04em]">アーティスト</h2>
              </div>
              <p className="text-[10px] font-black text-[#817981]">{artistResults.length}組</p>
            </div>
            <div className="mt-4 border-y border-[#ded8dc] bg-white">
              {artistResults.map((artist) => (
                <div key={artist.slug} className="relative min-w-0">
                  <InfoListRow
                    href={`/artists/${artist.slug}`}
                    ariaLabel={`${artist.name}のアーティストページを見る`}
                    className="pr-14"
                    onClick={() => selectResult("artist", artist.slug)}
                  >
                    {getArtistGroupImage(artist.slug) ? <ArtistGroupPhoto slug={artist.slug} name={artist.name} /> : <span className="text-[9px] font-black tracking-[0.16em] text-[#f43679]">{artist.name.slice(0, 2)}</span>}
                    <span className="block truncate text-[16px] font-black tracking-[-0.035em] text-[#4b4148]">{artist.name}</span>
                    <MoveRight size={17} className="shrink-0 text-[#f43679]" />
                  </InfoListRow>
                  {favoritesReady ? (
                    <FavoriteArtistButton
                      artistSlug={artist.slug}
                      initialUserId={favoriteUserId}
                      initialFavorite={favoriteSlugs.has(artist.slug)}
                      onChange={(favorite) => updateFavorite(artist.slug, favorite)}
                      className="absolute right-8 top-1/2 z-10 -translate-y-1/2"
                    />
                  ) : (
                    <span aria-hidden="true" className="absolute right-8 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full bg-[#eee9ec]" />
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {hasQuery && !loading && eventResults.length > 0 && (
          <section className={artistResults.length > 0 || venueResults.length > 0 ? "pt-8" : ""} aria-labelledby="event-results-title">
            <div className="flex items-end justify-between gap-3">
              <div>
                
                <h2 id="event-results-title" className="mt-1 text-[22px] font-black tracking-[-0.04em]">公演・会場</h2>
              </div>
              <p className="text-[10px] font-black text-[#817981]">{eventResults.length}公演</p>
            </div>
            {groupSearchEventsByDate(eventResults).map(group => <div key={group.id} className="mt-5" data-search-event-group={group.id}>
              <h3 className="mb-2 text-[14px] font-bold text-[#665a61]">{group.title}</h3>
              <div className="border-y border-[#ded8dc] bg-white">
              {group.events.map((event) => {
                const eventArtist = event.artist_slug ? findArtistBySlug(event.artist_slug) : null;
                return (
                  <InfoListRow
                    key={event.id}
                    href={getSearchEventDestination(event)}
                    onClick={() => selectResult("event", event.id)}
                    ariaLabel={`${event.title}の情報を見る`}
                    className="group"
                  >
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 text-[10px] font-black text-[#f43679]"><CalendarDays size={13} aria-hidden="true" />{formatEventDate(event.date)}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-[14px] font-black leading-5 tracking-[-0.025em] text-[#4b4148]">{event.title}</p>
                      <p className="mt-1 flex items-start gap-1 text-[11px] font-bold text-[#817981]"><MapPin size={12} className="mt-0.5 shrink-0" aria-hidden="true" /><span data-search-event-venue className="min-w-0 [overflow-wrap:anywhere]">{getEventDisplayVenueName(event.venue_id, event.venue)}</span></p>
                      {eventArtist && <p className="mt-1 truncate text-[10px] font-bold text-[#817981]">{eventArtist.name}</p>}
                    </div>
                    <MoveRight size={17} className="shrink-0 text-[#f43679] transition-transform group-hover:translate-x-1" />
                  </InfoListRow>
                );
              })}
              </div>
            </div>)}
          </section>
        )}
      </div>
    </main>
  );
}

function SearchRetry({ onRetry }: { onRetry: () => void }) {
  return <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
    <p role="alert">公演情報を読み込めませんでした。もう一度お試しください。</p>
    <button type="button" className="zr-focus min-h-11 rounded-lg border border-[#d7a6ba] bg-white px-4 font-bold text-[#812c53]" onClick={onRetry}>再試行</button>
  </div>;
}

