"use client";

import { use, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { findArtistBySlug } from "@/lib/artists";
import type { CrawledEvent } from "@/lib/types";
import { type EditableItem, computeSongNumbers } from "@/lib/setlistHelpers";
import { SetlistBottomNav } from "@/components/setlist/SetlistBottomNav";
import { EventDateTabs } from "@/components/setlist/EventDateTabs";
import { SetlistItemsSection } from "@/components/setlist/SetlistItemsSection";
// ─── Constants ────────────────────────────────────────────────────────────────

const SUGGESTION_SONGS = ["HOT", "Super", "Rock with you", "VERY NICE", "CLAP", "God of Music"];

const INITIAL_SETLIST: EditableItem[] = [
  { id: "i01", type: "song",   title: "HOT" },
  { id: "i02", type: "song",   title: "Rock with you" },
  { id: "i03", type: "song",   title: "MAESTRO" },
  { id: "i04", type: "mc" },
  { id: "i05", type: "song",   title: "VERY NICE" },
  { id: "i06", type: "song",   title: "Left & Right" },
  { id: "i07", type: "song",   title: "READY TO LOVE" },
  { id: "i08", type: "song",   title: "HOME;RUN" },
  { id: "i09", type: "mc" },
  { id: "i10", type: "song",   title: "Adore U" },
  { id: "i11", type: "song",   title: "Snap Shoot" },
  { id: "i12", type: "song",   title: "Oh My!" },
  { id: "i13", type: "encore" },
  { id: "i14", type: "song",   title: "만세 (MANSAE)" },
  { id: "i15", type: "song",   title: "아낀다 (Ajouter)" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function newId(): string {
  return Math.random().toString(36).slice(2, 11);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SetlistPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const artist = findArtistBySlug(slug);

  const [events, setEvents]                     = useState<CrawledEvent[]>([]);
  const [selectedEventId, setSelectedEventId]   = useState<string | null>(null);
  const [toast, setToast]                       = useState<string | null>(null);
  const [setlistItems, setSetlistItems]         = useState<EditableItem[]>(() => slug === "seventeen" ? INITIAL_SETLIST : []);
  const [searchQuery, setSearchQuery]           = useState("");
  const [showSuggestions, setShowSuggestions]   = useState(false);

  useEffect(() => {
    if (!artist) return;
    const orFilter = artist.keywords.map(kw => `title.ilike.%${kw}%`).join(",");
    supabase
      .from("events")
      .select("id, title, venue, venue_id, date, genre, lottery_types")
      .or(orFilter)
      .order("date", { ascending: false })
      .then(({ data }) => {
        if (!data) return;
        const evs = data as CrawledEvent[];
        setEvents(evs);
        const t = new Date().toISOString().split("T")[0];
        const upcoming = evs
          .filter(ev => ev.date && ev.date >= t)
          .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
        const def = upcoming[0] ?? evs[0];
        if (def) setSelectedEventId(def.id);
      });
  }, [artist]);

  const today = new Date().toISOString().split("T")[0];

  const sortedEvents = useMemo(() => {
    const upcoming = events
      .filter(ev => ev.date && ev.date >= today)
      .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
    const past = events
      .filter(ev => !ev.date || ev.date < today)
      .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
    return [...upcoming, ...past];
  }, [events, today]);

  const selectedEvent = events.find(ev => ev.id === selectedEventId);

  const nextEvent = useMemo(
    () =>
      events
        .filter(ev => ev.date && ev.date >= today)
        .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""))[0] ?? events[0],
    [events, today],
  );

  const songNumbers = useMemo(() => computeSongNumbers(setlistItems), [setlistItems]);

  const filteredSuggestions = useMemo(() => {
    if (slug !== "seventeen") return [];
    if (!searchQuery.trim()) return SUGGESTION_SONGS;
    return SUGGESTION_SONGS.filter(s =>
      s.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [searchQuery, slug]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function addSong(title?: string) {
    const t = (title ?? searchQuery).trim();
    if (!t) return;
    setSetlistItems(prev => [...prev, { id: newId(), type: "song" as const, title: t }]);
    showToast(`「${t}」を追加しました`);
    setSearchQuery("");
    setShowSuggestions(false);
  }

  function addMC() {
    setSetlistItems(prev => [...prev, { id: newId(), type: "mc" as const }]);
  }

  function addEncore() {
    setSetlistItems(prev => [...prev, { id: newId(), type: "encore" as const }]);
  }

  function addSeparator(label: string) {
    setSetlistItems(prev => [...prev, { id: newId(), type: "separator" as const, label }]);
  }

  function moveItem(index: number, dir: "up" | "down") {
    setSetlistItems(prev => {
      const next = [...prev];
      const to = dir === "up" ? index - 1 : index + 1;
      if (to < 0 || to >= next.length) return prev;
      [next[index], next[to]] = [next[to], next[index]];
      return next;
    });
  }

  function removeItem(id: string) {
    setSetlistItems(prev => prev.filter(item => item.id !== id));
  }

  if (!artist) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50">
        <p className="text-sm text-gray-500">アーティストが見つかりません</p>
        <Link
          href="/"
          className="rounded-full px-5 py-2.5 text-xs font-bold text-white"
          style={{ background: "#006876" }}
        >
          ホームに戻る
        </Link>
      </div>
    );
  }

  const afterHref = nextEvent ? `/events/${nextEvent.id}/after-report` : "#";

  return (
    <div className="min-h-screen" style={{ background: "#e8edf0" }}>
      <div
        className="relative mx-auto min-h-screen w-full max-w-[430px] shadow-2xl"
        style={{ background: "#f3f6f8" }}
      >

        {/* Header */}
        <header
          className="fixed left-1/2 top-0 z-50 flex h-14 w-full max-w-[430px] -translate-x-1/2 items-center justify-between px-4"
          style={{
            background: "rgba(255,255,255,0.88)",
            backdropFilter: "blur(16px)",
            borderBottom: "1px solid rgba(0,0,0,0.06)",
          }}
        >
          <Link
            href="/"
            className="flex h-9 w-9 items-center justify-center rounded-full transition-transform active:scale-95"
            style={{ background: "rgba(0,104,118,0.06)" }}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "#006876" }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="text-center">
            <p className="text-sm font-bold tracking-tight" style={{ color: "#006876" }}>
              {artist.name}
            </p>
            <p className="text-[10px] text-gray-400">セトリ・曲順</p>
          </div>
          <div className="w-9" />
        </header>

        <main className="pb-24 pt-14">

          {/* ネタバレ補足 */}
          <div className="px-4 pt-4">
            <div className="flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-2">
              <svg className="h-3.5 w-3.5 shrink-0 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-[11px] font-semibold text-red-500">ネタバレを含む可能性があります</p>
            </div>
          </div>

          <EventDateTabs
            sortedEvents={sortedEvents}
            selectedEventId={selectedEventId}
            today={today}
            selectedEvent={selectedEvent}
            onSelect={setSelectedEventId}
          />

          {/* 追加フォーム + セトリリスト */}
          <section className="mt-4 px-4 pb-4">
            <div className="space-y-3">

                {/* セトリ追加フォーム */}
                <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                  <p className="mb-3 text-sm font-bold text-gray-800">セトリを追加</p>

                  {/* 曲名検索 + サジェスト */}
                  <div className="relative mb-3">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      onFocus={() => setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                      onKeyDown={e => { if (e.key === "Enter") addSong(); }}
                      placeholder="曲名を入力"
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition-colors focus:border-teal-600"
                    />
                    {showSuggestions && filteredSuggestions.length > 0 && (
                      <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg">
                        {filteredSuggestions.map(s => (
                          <button
                            key={s}
                            type="button"
                            onPointerDown={e => { e.preventDefault(); addSong(s); }}
                            className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors active:bg-gray-100 hover:bg-gray-50"
                          >
                            <svg className="h-3.5 w-3.5 shrink-0 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                            </svg>
                            <span className="text-sm text-gray-700">{s}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 区切り追加 */}
                  <div className="mb-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={addMC}
                      className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-500 transition-transform active:scale-95"
                    >
                      + MC
                    </button>
                    <button
                      type="button"
                      onClick={addEncore}
                      className="rounded-full border px-3 py-1.5 text-xs font-semibold transition-transform active:scale-95"
                      style={{ borderColor: "rgba(0,104,118,0.3)", color: "#006876" }}
                    >
                      + アンコール
                    </button>
                    <button
                      type="button"
                      onClick={() => addSeparator("トーク")}
                      className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-500 transition-transform active:scale-95"
                    >
                      + トーク
                    </button>
                  </div>

                  {/* 追加ボタン */}
                  <button
                    type="button"
                    onClick={() => addSong()}
                    disabled={!searchQuery.trim()}
                    className="w-full rounded-xl py-2.5 text-sm font-bold text-white transition-all disabled:opacity-40 active:opacity-80"
                    style={{ background: "linear-gradient(90deg, #0B7A88, #5B2BE0)" }}
                  >
                    ＋ セトリに追加
                  </button>
                </div>

                <SetlistItemsSection
                  setlistItems={setlistItems}
                  songNumbers={songNumbers}
                  onMove={moveItem}
                  onRemove={removeItem}
                />

            </div>
          </section>

        </main>

        {/* Toast */}
        {toast && (
          <div
            className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-gray-800 px-4 py-2.5 text-xs font-semibold text-white shadow-lg"
            style={{ maxWidth: "calc(100% - 32px)" }}
          >
            {toast}
          </div>
        )}

        <SetlistBottomNav slug={slug} nextEventId={nextEvent?.id} afterHref={afterHref} />

      </div>
    </div>
  );
}
