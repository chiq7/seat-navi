"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { genreLabel } from "@/lib/utils";
import type { CrawledEvent } from "@/lib/types";

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const GENRE_TABS = [
  { key: "all",         label: "すべて" },
  { key: "kpop",        label: "K-POP" },
  { key: "johnnys",     label: "ジャニーズ" },
  { key: "female_idol", label: "女性アイドル" },
  { key: "male_idol",   label: "男性アイドル" },
  { key: "other",       label: "その他" },
];

const GENRE_BADGE: Record<string, string> = {
  kpop:        "bg-violet-100 text-violet-700",
  johnnys:     "bg-blue-100   text-blue-700",
  female_idol: "bg-pink-100   text-pink-700",
  male_idol:   "bg-sky-100    text-sky-700",
  other:       "bg-gray-100   text-gray-600",
};

const POPULAR_ARTISTS = [
  { name: "乃木坂46",    genre: "female_idol", initials: "乃", grad: "from-pink-400 to-rose-500" },
  { name: "日向坂46",    genre: "female_idol", initials: "日", grad: "from-orange-300 to-pink-400" },
  { name: "SEVENTEEN",   genre: "kpop",        initials: "SE", grad: "from-violet-400 to-purple-600" },
  { name: "嵐",          genre: "johnnys",     initials: "嵐", grad: "from-blue-400 to-indigo-600" },
  { name: "B'z",         genre: "other",       initials: "Bz", grad: "from-slate-500 to-gray-700" },
  { name: "Mr.Children", genre: "other",       initials: "Mr", grad: "from-teal-400 to-cyan-600" },
];

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
// 公演リスト行
// ---------------------------------------------------------------------------

function EventRow({ ev, onTap, reportCount }: { ev: CrawledEvent; onTap: (ev: CrawledEvent) => void; reportCount: number }) {
  const date = formatDate(ev.date);
  const days = daysUntil(ev.date);
  const badge = GENRE_BADGE[ev.genre] ?? GENRE_BADGE.other;
  const soon = days !== null && days >= 0 && days <= 7;

  const countBadge =
    reportCount === 0
      ? { label: "未投稿", cls: "bg-gray-100 text-gray-400" }
      : reportCount < 5
      ? { label: `${reportCount}件`, cls: "bg-amber-100 text-amber-600" }
      : { label: `${reportCount}件`, cls: "bg-green-100 text-green-600" };

  return (
    <button
      type="button"
      onClick={() => onTap(ev)}
      className="flex w-full items-center gap-3 bg-white px-4 py-3.5 text-left transition-colors active:bg-gray-50"
    >
      {/* 日付列 */}
      <div className="w-12 shrink-0 text-center">
        {date ? (
          <>
            <p className="text-sm font-extrabold leading-none text-gray-900">
              {date.month}/{date.day}
            </p>
            <p className={`mt-1 text-[10px] font-semibold ${soon ? "text-red-500" : "text-gray-400"}`}>
              ({date.weekday})
            </p>
          </>
        ) : (
          <p className="text-[11px] text-gray-400">未定</p>
        )}
      </div>

      <div className="h-9 w-px shrink-0 bg-gray-100" />

      {/* 公演情報 */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1">
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${badge}`}>
            {genreLabel(ev.genre)}
          </span>
          {soon && (
            <span className="rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
              もうすぐ
            </span>
          )}
        </div>
        <p className="mt-1 truncate text-xs font-bold leading-snug text-gray-900">{ev.title}</p>
        <p className="mt-0.5 truncate text-[11px] text-gray-500">{ev.venue}</p>
      </div>

      {/* 件数バッジ */}
      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${countBadge.cls}`}>
        {countBadge.label}
      </span>

      <svg className="h-4 w-4 shrink-0 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
}

// ---------------------------------------------------------------------------
// 座席チェックフォーム
// ---------------------------------------------------------------------------

function SeatCheckForm() {
  const [venue, setVenue] = useState("");
  const [seat,  setSeat]  = useState("");

  return (
    <section className="mx-4 overflow-hidden rounded-2xl shadow-md">
      {/* ヘッダー帯 */}
      <div className="bg-[var(--accent)] px-4 pt-4 pb-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-violet-200">Seat Navigator</p>
        <p className="mt-0.5 text-base font-extrabold text-white">座席の見え方をチェック</p>
        <p className="text-[11px] text-violet-200">会場・座席番号を入力して調べよう</p>
      </div>
      {/* フォーム */}
      <div className="space-y-2 bg-white px-4 py-3.5">
        <input
          type="text"
          value={venue}
          onChange={(e) => setVenue(e.target.value)}
          placeholder="会場名（例：東京ドーム、京セラドーム）"
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs text-gray-900 outline-none placeholder:text-gray-400 focus:border-[var(--accent)] focus:bg-white"
        />
        <input
          type="text"
          value={seat}
          onChange={(e) => setSeat(e.target.value)}
          placeholder="座席情報（例：1階 3塁側 24列 180番）"
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs text-gray-900 outline-none placeholder:text-gray-400 focus:border-[var(--accent)] focus:bg-white"
        />
        <Link
          href={`/chat?venue=${encodeURIComponent(venue)}&seat=${encodeURIComponent(seat)}`}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] py-2.5 text-xs font-bold text-white transition-all active:scale-95"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          座席の見え方をチェック
        </Link>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// ボトムシート
// ---------------------------------------------------------------------------

function BottomSheet({ ev, reportCount, onClose }: { ev: CrawledEvent; reportCount: number; onClose: () => void }) {
  const router = useRouter();

  function go(path: string) {
    onClose();
    router.push(path);
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl bg-white px-5 pb-10 pt-5 shadow-2xl">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-200" />
        <p className="mb-0.5 text-[11px] text-gray-400">{ev.venue}</p>
        <p className="mb-3 text-sm font-bold leading-snug text-gray-900">{ev.title}</p>

        {/* 座席レポート状況 */}
        <div className="mb-4 rounded-xl bg-gray-50 px-3.5 py-2.5">
          {reportCount === 0 ? (
            <>
              <p className="text-xs font-bold text-gray-700">まだ座席レポートはありません</p>
              <p className="mt-0.5 text-[11px] text-gray-500">最初の見え方を投稿しませんか？</p>
            </>
          ) : reportCount < 5 ? (
            <>
              <p className="text-xs font-bold text-gray-700">現在 {reportCount} 件の座席レポート</p>
              <p className="mt-0.5 text-[11px] text-amber-600">あと {5 - reportCount} 件でリアルタイム予想可能</p>
            </>
          ) : (
            <>
              <p className="text-xs font-bold text-gray-700">現在 {reportCount} 件の座席レポート</p>
              <p className="mt-0.5 text-[11px] text-green-600">✓ リアルタイム予想が利用できます</p>
            </>
          )}
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => go(`/events/${ev.id}`)}
            className="flex items-center gap-3 rounded-2xl bg-[var(--accent)] px-5 py-3.5 text-left text-white transition-all active:scale-95"
          >
            <span className="text-xl">🪑</span>
            <div>
              <p className="text-sm font-bold">座席・見え方を見る</p>
              <p className="text-[11px] opacity-75">参加者の座席レポートを確認</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => go(`/events/${ev.id}`)}
            className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-3 text-left text-gray-700 transition-all active:scale-95"
          >
            <span className="text-xl">✍️</span>
            <div>
              <p className="text-sm font-semibold">見え方を投稿</p>
              <p className="text-[11px] text-gray-400">見え方レポートを追加する</p>
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
  const [reportCounts,  setReportCounts]  = useState<Map<string, number>>(new Map());

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
      const evList = (data as CrawledEvent[]) ?? [];
      setEvents(evList);

      // 座席レポート件数を取得
      if (evList.length) {
        const { data: repData } = await supabase
          .from("seat_reports")
          .select("event_id")
          .in("event_id", evList.map((e) => e.id));
        const counts = new Map<string, number>();
        for (const r of repData ?? []) {
          counts.set(r.event_id, (counts.get(r.event_id) ?? 0) + 1);
        }
        setReportCounts(counts);
      }

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
    <div className="min-h-screen bg-gray-50 pb-24">

      {/* ===== ヘッダー ===== */}
      <header className="sticky top-0 z-40 bg-white shadow-sm">
        {/* ロゴ行 */}
        <div className="flex items-center gap-2 px-4 pt-3 pb-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent)]">
            <svg className="h-3.5 w-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
          </div>
          <span className="text-sm font-extrabold tracking-tight text-gray-900">座席ナビ</span>
          <Link
            href="/chat"
            className="ml-auto flex items-center gap-1 rounded-full bg-violet-50 px-3 py-1.5 text-[11px] font-bold text-violet-700"
          >
            <span>🎀</span><span>AIに聞く</span>
          </Link>
        </div>

        {/* 検索バー */}
        <div className="px-4 pb-2">
          <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 transition-all focus-within:border-[var(--accent)] focus-within:bg-white focus-within:shadow-sm">
            <svg className="h-4 w-4 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="公演名・会場名・アーティスト名で検索"
              className="w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
            />
            {search && (
              <button type="button" onClick={() => setSearch("")} className="text-gray-400">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* ジャンルタブ */}
        <div className="flex overflow-x-auto hide-scrollbar border-t border-gray-100">
          {GENRE_TABS.map((tab) => {
            const active = genre === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setGenre(active && tab.key !== "all" ? "all" : tab.key)}
                className={`relative shrink-0 px-3.5 py-2.5 text-xs font-semibold transition-colors ${
                  active ? "text-[var(--accent)]" : "text-gray-500"
                }`}
              >
                {tab.label}
                {active && (
                  <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-t-full bg-[var(--accent)]" />
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* ===== 座席チェックフォーム ===== */}
      <div className="pt-4">
        <SeatCheckForm />
      </div>

      {/* ===== 人気アーティスト ===== */}
      <section className="mt-5">
        <div className="mb-3 flex items-center justify-between px-4">
          <p className="text-sm font-extrabold text-gray-900">人気アーティスト</p>
          <span className="text-[11px] text-gray-400">→ スクロール</span>
        </div>
        <div className="flex gap-3 overflow-x-auto hide-scrollbar px-4 pb-1">
          {POPULAR_ARTISTS.map((artist) => (
            <button
              key={artist.name}
              type="button"
              onClick={() => setSearch(artist.name)}
              className="shrink-0 w-[88px] overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all active:scale-95"
            >
              <div className={`flex h-16 items-center justify-center bg-gradient-to-br ${artist.grad}`}>
                <span className="text-xl font-extrabold text-white drop-shadow-sm">{artist.initials}</span>
              </div>
              <div className="px-2 py-2">
                <p className="truncate text-[11px] font-bold text-gray-800">{artist.name}</p>
                <p className="mt-0.5 text-[10px] text-gray-400">{genreLabel(artist.genre)}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* ===== 公演一覧 ===== */}
      <section className="mt-5">
        <div className="mb-3 flex items-center justify-between px-4">
          <p className="text-sm font-extrabold text-gray-900">
            {search
              ? <><span className="text-[var(--accent)]">「{search}」</span>の検索結果</>
              : "開催が近い公演"}
          </p>
          {!loading && (
            <span className="text-[11px] text-gray-400">{filtered.length}件</span>
          )}
        </div>

        <div className="mx-4 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm divide-y divide-gray-100">
          {loading ? (
            <div className="space-y-0">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3.5 animate-pulse">
                  <div className="h-8 w-12 shrink-0 rounded bg-gray-100" />
                  <div className="h-9 w-px shrink-0 bg-gray-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-16 rounded bg-gray-100" />
                    <div className="h-3 w-full rounded bg-gray-100" />
                    <div className="h-3 w-2/3 rounded bg-gray-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-14 text-center">
              <span className="text-4xl">🎤</span>
              <p className="mt-3 text-sm font-semibold text-gray-700">公演が見つかりません</p>
              <p className="mt-1 text-xs text-gray-400">
                {search ? "検索ワードを変えてみて" : "また後でチェックしてね"}
              </p>
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="mt-4 rounded-full border border-gray-200 px-4 py-2 text-xs text-gray-500"
                >
                  検索をクリア
                </button>
              )}
            </div>
          ) : (
            filtered.map((ev) => (
              <EventRow key={ev.id} ev={ev} onTap={setSelectedEvent} reportCount={reportCounts.get(ev.id) ?? 0} />
            ))
          )}
        </div>
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
        <BottomSheet
          ev={selectedEvent}
          reportCount={reportCounts.get(selectedEvent.id) ?? 0}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
}
