"use client";

import { use, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { findArtistBySlug } from "@/lib/artists";
import type { CrawledEvent } from "@/lib/types";

// ─── Types ───────────────────────────────────────────────────────────────────

type EditableItem =
  | { id: string; type: "song"; title: string }
  | { id: string; type: "mc" }
  | { id: string; type: "encore" }
  | { id: string; type: "separator"; label: string };

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

function computeSongNumbers(items: EditableItem[]): Map<string, string> {
  const map = new Map<string, string>();
  let count = 0;
  let encCount = 0;
  let inEncore = false;
  for (const item of items) {
    if (item.type === "encore") {
      inEncore = true;
      encCount = 0;
    } else if (item.type === "song") {
      if (inEncore) {
        encCount++;
        map.set(item.id, `EN${encCount}`);
      } else {
        count++;
        map.set(item.id, String(count));
      }
    }
  }
  return map;
}

function fmtDateShort(d: string | null) {
  if (!d) return "未定";
  const [, m, day] = d.split("-").map(Number);
  return `${m}/${day}`;
}

function fmtDateFull(d: string | null) {
  if (!d) return "日程未定";
  const [y, m, day] = d.split("-").map(Number);
  const w = ["日", "月", "火", "水", "木", "金", "土"][new Date(y, m - 1, day).getDay()];
  return `${m}/${day}(${w})`;
}

// ─── ItemControls ─────────────────────────────────────────────────────────────

function ItemControls({
  index,
  total,
  onUp,
  onDown,
  onRemove,
}: {
  index: number;
  total: number;
  onUp: () => void;
  onDown: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center">
      <button
        type="button"
        onClick={onUp}
        disabled={index === 0}
        className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition-colors disabled:opacity-20 active:bg-gray-100"
      >
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
        </svg>
      </button>
      <button
        type="button"
        onClick={onDown}
        disabled={index === total - 1}
        className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition-colors disabled:opacity-20 active:bg-gray-100"
      >
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <button
        type="button"
        onClick={onRemove}
        className="flex h-7 w-7 items-center justify-center rounded-md text-gray-300 transition-colors active:bg-red-50 active:text-red-400"
      >
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
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
  const songCount = setlistItems.filter(i => i.type === "song").length;

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

          {/* 公演日選択 */}
          <section className="mt-5">
            <div
              className="flex gap-2 overflow-x-auto px-4 pb-1"
              style={{ scrollbarWidth: "none" }}
            >
              {sortedEvents.length === 0 && (
                <p className="py-2 text-xs text-gray-400">公演情報を読み込み中...</p>
              )}
              {sortedEvents.map(ev => {
                const isPast = ev.date && ev.date < today;
                const isSelected = ev.id === selectedEventId;
                return (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => setSelectedEventId(ev.id)}
                    className="shrink-0 rounded-xl border px-3 py-2 text-center transition-all active:scale-95"
                    style={
                      isSelected
                        ? { background: "#006876", borderColor: "#006876", color: "#fff" }
                        : {
                            background: "#fff",
                            borderColor: "#e5e7eb",
                            color: isPast ? "#9ca3af" : "#374151",
                          }
                    }
                  >
                    <p className="text-[11px] font-bold leading-tight">{fmtDateShort(ev.date)}</p>
                    <p className="mt-0.5 max-w-[72px] truncate text-[10px] leading-tight opacity-75">
                      {ev.venue}
                    </p>
                  </button>
                );
              })}
            </div>
            {selectedEvent && (
              <p className="mt-2 px-4 text-[11px] text-gray-400">
                {fmtDateFull(selectedEvent.date)}　{selectedEvent.venue}
              </p>
            )}
          </section>

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

                {/* セトリリスト */}
                <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">

                  {/* カードヘッダー */}
                  <div className="flex items-center justify-between border-b border-gray-50 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "#006876" }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                      </svg>
                      <span className="text-xs font-bold" style={{ color: "#006876" }}>セトリ</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-600">
                        仮データ
                      </span>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-400">
                        {songCount}曲
                      </span>
                    </div>
                  </div>

                  {/* 曲リスト */}
                  {setlistItems.length === 0 ? (
                    <p className="p-8 text-center text-xs text-gray-400">
                      セトリはまだ投稿されていません
                    </p>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {setlistItems.map((item, index) => {
                        const total = setlistItems.length;
                        const controls = (
                          <ItemControls
                            index={index}
                            total={total}
                            onUp={() => moveItem(index, "up")}
                            onDown={() => moveItem(index, "down")}
                            onRemove={() => removeItem(item.id)}
                          />
                        );

                        if (item.type === "mc") {
                          return (
                            <div key={item.id} className="flex items-center justify-between px-3 py-2">
                              <span className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-semibold text-gray-400">
                                MC
                              </span>
                              {controls}
                            </div>
                          );
                        }

                        if (item.type === "encore") {
                          return (
                            <div key={item.id} className="flex items-center justify-between px-3 py-2">
                              <span
                                className="rounded-full px-3 py-1 text-[11px] font-bold"
                                style={{ background: "rgba(0,104,118,0.08)", color: "#006876" }}
                              >
                                アンコール
                              </span>
                              {controls}
                            </div>
                          );
                        }

                        if (item.type === "separator") {
                          return (
                            <div key={item.id} className="flex items-center justify-between px-3 py-2">
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-500">
                                {item.label}
                              </span>
                              {controls}
                            </div>
                          );
                        }

                        // song
                        const num = songNumbers.get(item.id) ?? "";
                        return (
                          <div key={item.id} className="flex items-center gap-2 px-3 py-2.5">
                            {/* ドラッグハンドル（装飾） */}
                            <svg className="h-4 w-4 shrink-0 text-gray-200" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                            </svg>
                            {/* 番号 */}
                            <span className="w-7 shrink-0 text-right text-[11px] font-bold text-gray-300">
                              {num}
                            </span>
                            {/* 曲名 */}
                            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-800">
                              {item.title}
                            </span>
                            {controls}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

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

        {/* ボトムナビ */}
        <nav
          className="fixed bottom-0 left-1/2 z-50 w-full max-w-[430px] -translate-x-1/2 border-t border-gray-100"
          style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(16px)" }}
        >
          <div className="flex items-center justify-around px-2 py-2 pb-safe">
            <Link
              href={`/artists/${slug}`}
              className="flex flex-col items-center gap-0.5 px-4 py-1.5"
            >
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="text-[10px] font-semibold text-gray-400">集計まとめ</span>
            </Link>

            <Link
              href={nextEvent ? `/events/${nextEvent.id}` : "#"}
              className="flex flex-col items-center gap-0.5 px-4 py-1.5"
            >
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
              </svg>
              <span className="text-[10px] font-semibold text-gray-400">座席予想</span>
            </Link>

            <Link href={afterHref} className="flex flex-col items-center gap-0.5 px-4 py-1.5">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-[10px] font-semibold text-gray-400">現地レポ</span>
            </Link>

            {/* アクティブ */}
            <div className="flex flex-col items-center gap-0.5 px-4 py-1.5">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "#006876" }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
              <span className="text-[10px] font-bold" style={{ color: "#006876" }}>セトリ</span>
            </div>
          </div>
        </nav>

      </div>
    </div>
  );
}
