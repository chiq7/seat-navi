"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, CalendarDays, MapPin, MoveRight, Search, X } from "lucide-react";
import FavoriteArtistButton from "@/components/auth/FavoriteArtistButton";
import { Header } from "@/components/common/Header";
import { InfoListRow } from "@/components/common/InfoListRow";
import { trackEvent } from "@/lib/analytics";
import { findArtistBySlug, type Artist } from "@/lib/artists";
import { getSearchEventDestination, searchArtists, searchEvents, searchVenues, type SearchVenue } from "@/lib/search";
import { fmtDate } from "@/lib/artistPageHelpers";
import { supabase } from "@/lib/supabase/client";
import type { CrawledEvent } from "@/lib/types";

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchPageInner />
    </Suspense>
  );
}

function SearchPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";

  const [query, setQuery] = useState(initialQuery);
  const [artistResults, setArtistResults] = useState<Artist[]>([]);
  const [venueResults, setVenueResults] = useState<SearchVenue[]>([]);
  const [eventResults, setEventResults] = useState<CrawledEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [favoriteUserId, setFavoriteUserId] = useState<string | null>(null);
  const [favoriteSlugs, setFavoriteSlugs] = useState<Set<string>>(new Set());
  const [favoritesReady, setFavoritesReady] = useState(false);
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

  function updateFavorite(artistSlug: string, favorite: boolean) {
    setFavoriteSlugs((current) => {
      const next = new Set(current);
      if (favorite) next.add(artistSlug);
      else next.delete(artistSlug);
      return next;
    });
  }

  // クエリ変更時にURLを同期(共有可能な検索結果URLにするため)
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (query) params.set("q", query);
    else params.delete("q");
    router.replace(`/search${params.toString() ? `?${params.toString()}` : ""}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // 検索実行(300msデバウンス)
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 1) {
      setArtistResults([]);
      setVenueResults([]);
      setEventResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      const [artists, events] = await Promise.all([
        Promise.resolve(searchArtists(trimmed)),
        searchEvents(trimmed),
      ]);
      const venues = searchVenues(trimmed);
      setArtistResults(artists);
      setVenueResults(venues);
      setEventResults(events);
      setLoading(false);
      if (lastTrackedQuery.current !== trimmed) {
        lastTrackedQuery.current = trimmed;
        trackEvent("search", {
          search_term: trimmed,
          artist_results: artists.length,
          venue_results: venues.length,
          event_results: events.length,
          has_results: artists.length + venues.length + events.length > 0,
        });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const hasQuery = query.trim().length > 0;
  const hasResults = artistResults.length > 0 || venueResults.length > 0 || eventResults.length > 0;

  return (
    <main className="community-page pb-16">
      <section className="community-hero">
        <Header title="検索" backHref="/" backLabel="TOPへ戻る" />

        <div className="zr-container pb-6 pt-4 sm:pb-9 sm:pt-7">
          <p className="community-eyebrow">SEARCH TIXREPO</p>
          <h1 className="mt-2 text-[28px] font-black tracking-[-0.05em] text-[#4b4148] sm:text-[38px]">アーティスト・会場を<span className="text-[#ef4f87]">探す</span></h1>
          <p className="mt-1 text-[11px] font-bold text-[#817981]">公演名・座席表・会場の見え方も検索できます。</p>

          <label className="mt-4 flex min-h-[52px] items-center gap-3 border border-[#eadfe4] bg-white px-4 text-[#4b4148] shadow-sm">
            <span className="sr-only">アーティスト・公演・会場を検索</span>
            <Search size={21} strokeWidth={2.2} className="shrink-0 text-[#ef4f87]" />
            <input
              type="text"
              inputMode="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="アーティスト・公演名・会場名"
              autoFocus
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
          </label>
        </div>
      </section>

      <div className="zr-container py-7 sm:py-10">
        {!hasQuery && (
          <section aria-labelledby="search-hint-title">
            <p className="artist-kicker">Search Ideas</p>
            <h2 id="search-hint-title" className="mt-1 text-[22px] font-black tracking-[-0.04em]">検索のヒント</h2>
            <div className="mt-4 grid grid-cols-2 border-y border-[#ded8dc] sm:grid-cols-4">
              {["YOASOBI 東京ドーム", "東京ドーム 座席表", "Kアリーナ 見え方", "さいたまアリーナ"].map((word) => (
                <button
                  key={word}
                  type="button"
                  onClick={() => setQuery(word)}
                  className="zr-focus min-h-12 border-b border-r border-[#ded8dc] px-3 text-left text-[11px] font-black text-[#665a61] transition-colors hover:bg-[#fff8fa] last:border-r-0 sm:border-b-0"
                >
                  {word}<span className="ml-1 text-[#f43679]">→</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {hasQuery && loading && (
          <div className="flex justify-center py-16">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#FF6B9D] border-t-transparent" />
          </div>
        )}

        {hasQuery && !loading && !hasResults && (
          <section className="border-y border-dashed border-[#ded8dc] bg-white py-9 text-center">
            <p className="text-[9px] font-black tracking-[0.18em] text-[#f43679]">NO RESULTS</p>
            <p className="mt-2 text-[17px] font-black">検索結果が見つかりませんでした</p>
            <Link href="/venues" className="community-secondary-button mt-5">
              ライブ会場一覧から座席表を探す<MoveRight size={15} className="text-[#f43679]" />
            </Link>
          </section>
        )}

        {hasQuery && !loading && venueResults.length > 0 && (
          <section className="pb-8 sm:pb-10" aria-labelledby="venue-results-title">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="artist-kicker">Venue seat map</p>
                <h2 id="venue-results-title" className="mt-1 text-[22px] font-black tracking-[-0.04em]">会場の座席表</h2>
              </div>
              <p className="text-[10px] font-black text-[#817981]">{venueResults.length} VENUES</p>
            </div>
            <div className="mt-4 border-y border-[#ded8dc] bg-white">
              {venueResults.map((venue) => (
                <InfoListRow
                  key={venue.id}
                  href={`/venues/${venue.id}`}
                  ariaLabel={`${venue.name}の公演・座席表を見る`}
                  className="group"
                  onClick={() => trackEvent("select_search_result", {
                    result_type: "venue",
                    result_id: venue.id,
                    search_term: query.trim(),
                  })}
                >
                  <span className="flex flex-col items-center gap-1 text-[#f43679]"><Building2 size={20} strokeWidth={1.7} /><span className="text-[8px] font-black">VENUE</span></span>
                  <span className="min-w-0"><span className="block truncate text-[15px] font-black tracking-[-0.035em] text-[#4b4148]">{venue.name}</span><span className="mt-1 block text-[10px] font-bold text-[#817981]">公演・座席表を見る</span></span>
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
                <p className="artist-kicker">Artists</p>
                <h2 id="artist-results-title" className="mt-1 text-[22px] font-black tracking-[-0.04em]">アーティスト</h2>
              </div>
              <p className="text-[10px] font-black text-[#817981]">{artistResults.length} RESULTS</p>
            </div>
            <div className="mt-4 border-y border-[#ded8dc] bg-white">
              {artistResults.map((artist, index) => (
                <div key={artist.slug} className="relative min-w-0">
                  <InfoListRow
                    href={`/artists/${artist.slug}`}
                    ariaLabel={`${artist.name}のアーティストページを見る`}
                    className="pr-14"
                    onClick={() => trackEvent("select_search_result", {
                      result_type: "artist",
                      result_id: artist.slug,
                      search_term: query.trim(),
                    })}
                  >
                    <span className="text-[9px] font-black tracking-[0.16em] text-[#f43679]">ARTIST<br />{String(index + 1).padStart(2, "0")}</span>
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
                <p className="artist-kicker">Live & Venue</p>
                <h2 id="event-results-title" className="mt-1 text-[22px] font-black tracking-[-0.04em]">公演・会場</h2>
              </div>
              <p className="text-[10px] font-black text-[#817981]">{eventResults.length} RESULTS</p>
            </div>
            <div className="mt-4 border-y border-[#ded8dc] bg-white">
              {eventResults.map((event) => {
                const eventArtist = event.artist_slug ? findArtistBySlug(event.artist_slug) : null;
                return (
                  <InfoListRow
                    key={event.id}
                    href={getSearchEventDestination(event, query)}
                    onClick={() => trackEvent("select_search_result", {
                      result_type: "event",
                      result_id: event.id,
                      search_term: query.trim(),
                    })}
                    ariaLabel={`${event.title}の情報を見る`}
                    className="group"
                  >
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 text-[10px] font-black text-[#f43679]"><CalendarDays size={13} />{fmtDate(event.date)}</p>
                      <p className="mt-2 flex items-center gap-1.5 truncate text-[10px] font-bold text-[#817981]"><MapPin size={12} />{event.venue}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-[14px] font-black leading-5 tracking-[-0.025em] text-[#4b4148]">{event.title}</p>
                      {eventArtist && <p className="mt-1 truncate text-[10px] font-bold text-[#817981]">{eventArtist.name}</p>}
                    </div>
                    <MoveRight size={17} className="shrink-0 text-[#f43679] transition-transform group-hover:translate-x-1" />
                  </InfoListRow>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
