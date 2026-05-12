"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { genreLabel } from "@/lib/utils";
import { GENRES } from "@/lib/types";
import type { CrawledEvent } from "@/lib/types";

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const GENRE_PILLS = [
  { key: "all",          label: "すべて",       icon: "🎶" },
  { key: "kpop",         label: "K-POP",        icon: "🎵" },
  { key: "johnnys",      label: "ジャニーズ",   icon: "⭐" },
  { key: "female_idol",  label: "女性アイドル", icon: "👧" },
  { key: "male_idol",    label: "男性アイドル", icon: "👦" },
  { key: "other",        label: "その他",       icon: "🎸" },
];

const GENRE_STRIP: Record<string, string> = {
  kpop:        "bg-violet-50  text-violet-600  border-violet-100",
  johnnys:     "bg-blue-50    text-blue-600    border-blue-100",
  female_idol: "bg-pink-50    text-pink-600    border-pink-100",
  male_idol:   "bg-sky-50     text-sky-600     border-sky-100",
  other:       "bg-gray-50    text-gray-500    border-gray-100",
};

// ---------------------------------------------------------------------------
// ユーティリティ
// ---------------------------------------------------------------------------

function formatDate(dateStr: string | null): { month: number; day: number; weekday: string } | null {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  const weekday = ["日", "月", "火", "水", "木", "金", "土"][new Date(y, m - 1, d).getDay()];
  return { month: m, day: d, weekday };
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  const event = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((event.getTime() - today.getTime()) / 86_400_000);
}

// ---------------------------------------------------------------------------
// 公演カード
// ---------------------------------------------------------------------------

function EventCard({ ev, onTap }: { ev: CrawledEvent; onTap: (ev: CrawledEvent) => void }) {
  const date = formatDate(ev.date);
  const days = daysUntil(ev.date);
  const strip = GENRE_STRIP[ev.genre] ?? GENRE_STRIP.other;
  const isUpcoming = days !== null && days >= 0 && days <= 7;

  return (
    <button
      type="button"
      onClick={() => onTap(ev)}
      className="card-hover flex w-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm text-left"
    >
      <div className={`flex items-center justify-between border-b px-3 py-2 ${strip}`}>
        <span className="text-[11px] font-semibold">{genreLabel(ev.genre)}</span>
        {isUpcoming && (
          <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
            もうすぐ
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3">
        {date ? (
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-extrabold leading-none text-gray-900">
              {date.month}/{date.day}
            </span>
            <span className="text-xs text-gray-400">({date.weekday})</span>
          </div>
        ) : (
          <span className="text-xs text-gray-400">日程未定</span>
        )}
        <p className="mt-1.5 truncate text-[11px] text-gray-500">{ev.venue}</p>
        <p className="mt-1 line-clamp-2 text-xs font-bold leading-snug text-gray-800">{ev.title}</p>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// ボトムシート
// ---------------------------------------------------------------------------

function BottomSheet({
  ev,
  onClose,
}: {
  ev: CrawledEvent;
  onClose: () => void;
}) {
  const router = useRouter();

  function go(path: string) {
    onClose();
    router.push(path);
  }

  return (
    <>
      {/* オーバーレイ */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* シート */}
      <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl bg-white px-5 pb-10 pt-5 shadow-2xl">
        {/* ハンドル */}
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-200" />

        {/* 公演名 */}
        <p className="mb-1 text-[11px] text-gray-400">{ev.venue}</p>
        <p className="mb-5 text-sm font-bold leading-snug text-gray-900">{ev.title}</p>

        {/* 2択ボタン */}
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => go(`/events/${ev.id}/report`)}
            className="flex items-center gap-3 rounded-2xl bg-[var(--accent)] px-5 py-4 text-left text-white transition-all active:scale-95"
          >
            <span className="text-2xl">✍️</span>
            <div>
              <p className="text-sm font-bold">座席を報告する</p>
              <p className="text-[11px] opacity-80">当選席・抽選情報を共有</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => go(`/events/${ev.id}/after-report`)}
            className="flex items-center gap-3 rounded-2xl bg-rose-500 px-5 py-4 text-left text-white transition-all active:scale-95"
          >
            <span className="text-2xl">🎉</span>
            <div>
              <p className="text-sm font-bold">答え合わせを投稿する</p>
              <p className="text-[11px] opacity-80">花道・視認性・満足度を共有</p>
            </div>
          </button>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// ページ
// ---------------------------------------------------------------------------

export default function Home() {
  const [events,        setEvents]        = useState<CrawledEvent[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [genre,         setGenre]         = useState("all");
  const [search,        setSearch]        = useState("");
  const [selectedEvent, setSelectedEvent] = useState<CrawledEvent | null>(null);

  useEffect(() => {
    async function load() {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("events")
        .select("id, title, venue, venue_id, date, genre")
        .gte("date", today)
        .order("date", { ascending: true })
        .limit(300);
      if (error) console.error("Supabase fetch error:", error);
      setEvents((data as CrawledEvent[]) ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter((ev) => {
      if (genre !== "all" && ev.genre !== genre) return false;
      if (q && !ev.title.toLowerCase().includes(q) && !ev.venue.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [events, genre, search]);

  return (
    <div className="min-h-screen bg-white pb-24">

      {/* ===== ヘッダー ===== */}
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/90 px-4 pb-3 pt-4 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--accent)] text-white">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
              </svg>
            </div>
            <span className="text-base font-extrabold tracking-tight text-gray-900">座席ナビ</span>
          </div>
          <Link
            href="/chat"
            className="flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-[var(--accent-dark)] active:scale-95"
          >
            <span>🎀</span>
            <span>AIに聞く</span>
          </Link>
        </div>

        <div className="mt-3 flex items-center gap-2.5 rounded-2xl border-2 border-gray-200 bg-gray-50 px-4 py-2.5 transition-all focus-within:border-[var(--accent)] focus-within:bg-white focus-within:shadow-md">
          <svg className="h-4 w-4 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="公演名・会場名で探す"
            className="w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
          />
          {search && (
            <button type="button" onClick={() => setSearch("")} className="text-gray-300 hover:text-gray-500">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </header>

      {/* ===== ジャンルフィルター ===== */}
      <section className="px-4 pt-4">
        <div className="flex flex-wrap gap-2">
          {GENRE_PILLS.map((pill) => {
            const active = genre === pill.key;
            return (
              <button
                key={pill.key}
                type="button"
                onClick={() => setGenre(active && pill.key !== "all" ? "all" : pill.key)}
                className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold transition-all active:scale-95 ${
                  active
                    ? "border-[var(--accent)] bg-[var(--accent)] text-white shadow-sm"
                    : "border-gray-200 bg-white text-gray-600 hover:border-[var(--accent)] hover:text-[var(--accent)]"
                }`}
              >
                <span className="text-sm leading-none">{pill.icon}</span>
                <span>{pill.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ===== 件数ヘッダー ===== */}
      <section className="mt-4 px-4">
        <div className="flex items-center justify-between">
          {loading ? (
            <span className="text-sm text-gray-400">読み込み中...</span>
          ) : (
            <span className="text-sm font-bold text-gray-900">
              {filtered.length}
              <span className="ml-1 font-normal text-gray-400">件の公演</span>
            </span>
          )}
          {!loading && (
            <span className="flex items-center gap-1 text-[11px] text-gray-400">
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              日付が近い順
            </span>
          )}
        </div>
      </section>

      {/* ===== イベントグリッド ===== */}
      <section className="mt-3 px-4">
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-2xl border border-gray-100 bg-gray-50">
                <div className="h-8 rounded-t-2xl bg-gray-100" />
                <div className="p-3 space-y-2">
                  <div className="h-6 w-16 rounded bg-gray-200" />
                  <div className="h-3 w-24 rounded bg-gray-100" />
                  <div className="h-3 w-full rounded bg-gray-100" />
                  <div className="h-3 w-3/4 rounded bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-200 bg-gray-50 py-16 text-center">
            <div className="text-4xl">🎤</div>
            <p className="mt-3 text-sm font-semibold text-gray-700">公演が見つかりません</p>
            <p className="mt-1 text-xs text-gray-400">
              {search ? "検索ワードを変えてみて" : "また後でチェックしてね"}
            </p>
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="mt-4 rounded-full border border-gray-200 px-4 py-2 text-xs text-gray-500 hover:bg-gray-100"
              >
                検索をクリア
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((ev) => (
              <EventCard key={ev.id} ev={ev} onTap={setSelectedEvent} />
            ))}
          </div>
        )}
      </section>

      {/* ===== ボトムナビ ===== */}
      <nav className="fixed bottom-0 left-1/2 z-30 flex w-full max-w-md -translate-x-1/2 border-t border-gray-100 bg-white/95 backdrop-blur-md">
        <Link href="/" className="flex flex-1 flex-col items-center gap-0.5 py-3 text-[var(--accent)]">
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
          </svg>
          <span className="text-[10px] font-semibold">ホーム</span>
        </Link>
        <Link href="/chat" className="flex flex-1 flex-col items-center gap-0.5 py-3 text-gray-400">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="text-[10px] font-semibold">AIチャット</span>
        </Link>
      </nav>

      {/* ===== ボトムシート ===== */}
      {selectedEvent && (
        <BottomSheet ev={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
    </div>
  );
}
