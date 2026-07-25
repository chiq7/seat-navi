"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/common/Header";
import { findArtistBySlug, type Artist } from "@/lib/artists";
import { getSearchEventDestination, searchArtists, searchEvents } from "@/lib/search";
import { fmtDate } from "@/lib/artistPageHelpers";
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
  const [eventResults, setEventResults] = useState<CrawledEvent[]>([]);
  const [loading, setLoading] = useState(false);

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
      setArtistResults(artists);
      setEventResults(events);
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const hasQuery = query.trim().length > 0;
  const hasResults = artistResults.length > 0 || eventResults.length > 0;

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <Header title="検索" backHref="/" />

      <div className="px-4 py-3">
        <div className="flex items-center gap-2 rounded-full bg-white border border-gray-200 px-4 h-[44px]">
          <svg className="w-4 h-4 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="アーティスト・公演名・会場名を検索"
            autoFocus
            className="flex-1 min-w-0 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 outline-none"
          />
        </div>
      </div>

      <div className="px-4">
        {!hasQuery && (
          <p className="py-8 text-center text-[13px] text-gray-400">
            アーティスト名・公演名・会場名で検索できます
          </p>
        )}

        {hasQuery && loading && (
          <div className="flex justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#FF6B9D] border-t-transparent" />
          </div>
        )}

        {hasQuery && !loading && !hasResults && (
          <p className="py-8 text-center text-[13px] text-gray-400">検索結果が見つかりませんでした</p>
        )}

        {hasQuery && !loading && artistResults.length > 0 && (
          <section className="mb-5">
            <h2 className="mb-2 text-[11px] font-semibold text-gray-400">アーティスト</h2>
            <div className="space-y-1.5">
              {artistResults.map((artist) => (
                <Link
                  key={artist.slug}
                  href={`/artists/${artist.slug}`}
                  className="block rounded-lg border border-gray-100 bg-white px-3 py-2.5 no-underline active:scale-[0.99]"
                >
                  <span className="truncate text-[13px] font-bold text-gray-900">{artist.name}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {hasQuery && !loading && eventResults.length > 0 && (
          <section>
            <h2 className="mb-2 text-[11px] font-semibold text-gray-400">公演</h2>
            <div className="space-y-1.5">
              {eventResults.map((event) => {
                const eventArtist = event.artist_slug ? findArtistBySlug(event.artist_slug) : null;
                return (
                  <Link
                    key={event.id}
                    href={getSearchEventDestination(event)}
                    className="block rounded-lg border border-gray-100 bg-white px-3 py-2.5 no-underline active:scale-[0.99]"
                  >
                    <p className="text-[10px] font-bold text-gray-400">{fmtDate(event.date)}</p>
                    <p className="truncate text-[13px] font-bold text-gray-900">{event.title}</p>
                    <p className="truncate text-[11px] text-gray-400">
                      {eventArtist ? `${eventArtist.name} · ${event.venue}` : event.venue}
                    </p>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
