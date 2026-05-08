"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import type { CrawledEvent } from "@/lib/types";

export function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<CrawledEvent[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    supabase
      .from("events")
      .select("id, title, venue, venue_id, date, genre")
      .or(`title.ilike.%${q}%,venue.ilike.%${q}%`)
      .order("date", { ascending: true })
      .limit(6)
      .abortSignal(controller.signal)
      .then(({ data }) => {
        if (data) setSuggestions(data as CrawledEvent[]);
      });
    return () => controller.abort();
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (event: CrawledEvent) => {
    setQuery("");
    setShowSuggestions(false);
    router.push(`/venue/${event.id}`);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2.5 shadow-sm transition-all focus-within:border-[var(--accent)] focus-within:shadow-md">
        <svg className="h-4 w-4 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setShowSuggestions(true); }}
          onFocus={() => setShowSuggestions(true)}
          placeholder="公演名 / 会場名 を検索"
          className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
        />
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1.5 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg">
          {suggestions.map((ev) => (
            <button
              key={ev.id}
              type="button"
              onClick={() => handleSelect(ev)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent-light)] text-sm">
                🎤
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-gray-900">{ev.title}</div>
                <div className="text-xs text-gray-500">{ev.venue}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
