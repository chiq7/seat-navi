"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { findArtistBySlug } from "@/lib/artists";
import { genreLabel } from "@/lib/utils";
import type { CrawledEvent, SeatReport } from "@/lib/types";

const GENRE_BADGE: Record<string, string> = {
  kpop:        "bg-violet-100 text-violet-700",
  johnnys:     "bg-blue-100   text-blue-700",
  female_idol: "bg-pink-100   text-pink-700",
  male_idol:   "bg-sky-100    text-sky-700",
  other:       "bg-gray-100   text-gray-600",
};

const LOTTERY_LABEL: Record<string, string> = {
  fc1:        "FC1次",
  fc2:        "FC2次",
  general:    "一般",
  upgrade:    "アプグレ",
  revival:    "復活当選",
  production: "制作開放",
};

function fmtDate(d: string | null) {
  if (!d) return "日程未定";
  const [y, m, day] = d.split("-").map(Number);
  const w = ["日","月","火","水","木","金","土"][new Date(y, m - 1, day).getDay()];
  return `${m}/${day}(${w})`;
}

function fmtDatetime(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
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
// リアルタイム座席予想マップカード
// ---------------------------------------------------------------------------

type BlockStat = { count: number; upgrade: number; fc: number };

function SeatPredictionMapCard({
  artistName,
  totalSeat,
  reports,
  firstEventId,
}: {
  artistName: string;
  totalSeat: number;
  reports: (SeatReport & { event_id: string })[];
  firstEventId?: string;
}) {
  const blockStats = useMemo(() => {
    const map = new Map<string, BlockStat>();
    for (const r of reports) {
      if (!map.has(r.block)) map.set(r.block, { count: 0, upgrade: 0, fc: 0 });
      const s = map.get(r.block)!;
      s.count++;
      if (r.lottery_type === "upgrade") s.upgrade++;
      if (r.lottery_type === "fc1" || r.lottery_type === "fc2") s.fc++;
    }
    return [...map.entries()].sort((a, b) => b[1].count - a[1].count);
  }, [reports]);

  const maxCount = blockStats[0]?.[1].count ?? 1;
  const upgradeBlocks = blockStats.filter(([, s]) => s.upgrade > 0).map(([b]) => b);
  const fcBlocks      = blockStats.filter(([, s]) => s.fc > 0).map(([b]) => b);

  return (
    <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
      {/* ヘッダー */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-100">
        <p className="text-sm font-extrabold text-gray-900">{artistName} 座席予想マップ</p>
        <p className="mt-0.5 text-xs text-gray-500">
          {totalSeat > 0
            ? `${totalSeat}件の座席報告をもとに、ブロック配置・良席傾向・アプグレ傾向を予想中`
            : "まだ座席報告がありません。最初の報告者になりませんか？"}
        </p>
      </div>

      {/* 本体 */}
      {totalSeat > 0 && blockStats.length > 0 ? (
        <div className="px-4 py-4 space-y-3">

          {/* ブロック別報告数バー */}
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-gray-400">報告が多いブロック</p>
            <div className="space-y-2">
              {blockStats.slice(0, 6).map(([block, stats]) => (
                <div key={block} className="flex items-center gap-2">
                  <span className="w-10 shrink-0 text-right text-xs font-bold text-gray-700">{block}</span>
                  <div className="flex-1 overflow-hidden rounded-full bg-gray-100 h-2">
                    <div
                      className="h-2 rounded-full bg-[var(--accent)]"
                      style={{ width: `${Math.round((stats.count / maxCount) * 100)}%` }}
                    />
                  </div>
                  <span className="w-6 shrink-0 text-[10px] text-gray-400 text-right">{stats.count}</span>
                  {stats.upgrade > 0 && (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-600">UP</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 傾向チップ */}
          <div className="flex flex-wrap gap-2">
            {upgradeBlocks.length > 0 && (
              <div className="rounded-xl bg-amber-50 px-3 py-2 flex-1 min-w-0">
                <p className="text-[10px] font-bold text-amber-700">⚡ アプグレ報告あり</p>
                <p className="mt-0.5 truncate text-xs text-amber-800">{upgradeBlocks.slice(0,4).join(" / ")}</p>
              </div>
            )}
            {fcBlocks.length > 0 && (
              <div className="rounded-xl bg-violet-50 px-3 py-2 flex-1 min-w-0">
                <p className="text-[10px] font-bold text-violet-700">🎫 FC報告あり</p>
                <p className="mt-0.5 truncate text-xs text-violet-800">{fcBlocks.slice(0,4).join(" / ")}</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center py-8 text-center">
          <span className="text-4xl">🗺️</span>
          <p className="mt-2 text-xs text-gray-400">報告が集まり次第、予想マップを表示します</p>
        </div>
      )}

      {/* CTA */}
      <div className="px-4 pb-4 flex gap-2">
        {firstEventId ? (
          <>
            <Link
              href={`/events/${firstEventId}`}
              className="flex flex-1 items-center justify-center rounded-xl bg-[var(--accent)] py-2.5 text-xs font-bold text-white transition-all active:scale-95"
            >
              この公演の座席を見る
            </Link>
            <Link
              href={`/events/${firstEventId}/report`}
              className="flex flex-1 items-center justify-center rounded-xl border border-gray-200 bg-white py-2.5 text-xs font-semibold text-gray-700 transition-all active:scale-95"
            >
              座席を報告する
            </Link>
          </>
        ) : (
          <p className="w-full text-center text-xs text-gray-400 py-2">公演情報を読み込み中…</p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 公演カード（セトリリンクなし）
// ---------------------------------------------------------------------------

function EventCard({
  ev,
  seatCount,
  afterCount,
}: {
  ev: CrawledEvent;
  seatCount: number;
  afterCount: number;
}) {
  const days = daysUntil(ev.date);
  const soon = days !== null && days >= 0 && days <= 7;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="mb-3">
        <div className="flex flex-wrap items-center gap-1.5 mb-1">
          <span className="text-xs font-bold text-gray-500">{fmtDate(ev.date)}</span>
          {soon && (
            <span className="rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">もうすぐ</span>
          )}
        </div>
        <p className="text-sm font-bold leading-snug text-gray-900">{ev.title}</p>
        <p className="mt-0.5 text-xs text-gray-500">{ev.venue}</p>
      </div>

      <div className="flex gap-2 mb-3">
        <div className={`flex-1 rounded-xl px-3 py-2 text-center ${seatCount > 0 ? "bg-[var(--accent-light)]" : "bg-gray-50"}`}>
          <p className={`text-base font-extrabold ${seatCount > 0 ? "text-[var(--accent)]" : "text-gray-400"}`}>{seatCount}</p>
          <p className="text-[10px] text-gray-500">座席報告</p>
        </div>
        <div className={`flex-1 rounded-xl px-3 py-2 text-center ${afterCount > 0 ? "bg-amber-50" : "bg-gray-50"}`}>
          <p className={`text-base font-extrabold ${afterCount > 0 ? "text-amber-600" : "text-gray-400"}`}>{afterCount}</p>
          <p className="text-[10px] text-gray-500">答え合わせ</p>
        </div>
      </div>

      <div className="flex gap-2">
        <Link
          href={`/events/${ev.id}`}
          className="flex flex-1 items-center justify-center rounded-xl bg-[var(--accent)] py-2.5 text-xs font-bold text-white transition-all active:scale-95"
        >
          座席を見る
        </Link>
        <Link
          href={`/events/${ev.id}/report`}
          className="flex flex-1 items-center justify-center rounded-xl border border-gray-200 bg-white py-2.5 text-xs font-semibold text-gray-700 transition-all active:scale-95"
        >
          座席を報告
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 最新の座席報告（3件）
// ---------------------------------------------------------------------------

function RecentReportsSection({
  reports,
  venueMap,
  firstEventId,
  loading,
}: {
  reports: (SeatReport & { event_id: string })[];
  venueMap: Map<string, string>;
  firstEventId?: string;
  loading: boolean;
}) {
  const displayed = reports.slice(0, 3);

  return (
    <section>
      <p className="mb-3 text-sm font-extrabold text-gray-900">最新の座席報告</p>

      {loading ? (
        <div className="space-y-2">
          {[0,1,2].map((i) => (
            <div key={i} className="animate-pulse rounded-2xl bg-white p-4 shadow-sm">
              <div className="mb-2 h-3 w-32 rounded bg-gray-100" />
              <div className="h-3 w-full rounded bg-gray-100" />
            </div>
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl bg-white py-10 shadow-sm">
          <span className="text-3xl">🪑</span>
          <p className="mt-2 text-sm font-semibold text-gray-600">まだ座席報告はありません</p>
          <p className="mt-1 text-xs text-gray-400">公演後に報告してね</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {displayed.map((r) => (
              <div key={r.id} className="rounded-2xl bg-white px-4 py-3.5 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                      <span className="rounded-md bg-[var(--accent-light)] px-2 py-0.5 text-xs font-bold text-[var(--accent)]">
                        {r.block}
                      </span>
                      <span className="text-xs text-gray-700">{r.row_num}列 {r.seat_num}番</span>
                      {r.lottery_type && (
                        <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500">
                          {LOTTERY_LABEL[r.lottery_type] ?? r.lottery_type}
                        </span>
                      )}
                    </div>
                    {venueMap.get(r.event_id) && (
                      <p className="text-[11px] text-gray-400">{venueMap.get(r.event_id)}</p>
                    )}
                  </div>
                  <span className="shrink-0 text-[10px] text-gray-400">{fmtDatetime(r.created_at)}</span>
                </div>
              </div>
            ))}
          </div>

          {firstEventId && (
            <div className="mt-2 text-center">
              <Link
                href={`/events/${firstEventId}`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent)] underline-offset-2 hover:underline"
              >
                すべての座席報告を見る
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          )}
        </>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// セトリ（アコーディオン）
// ---------------------------------------------------------------------------

function SetlistAccordion() {
  const [open, setOpen] = useState(false);

  return (
    <section>
      <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-4 text-left"
        >
          <div>
            <p className="text-sm font-extrabold text-gray-900">セトリ情報</p>
            <p className="mt-0.5 text-[11px] text-amber-600">ネタバレを含む可能性があります。見たい人だけ開いてください。</p>
          </div>
          <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
            <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {open && (
          <div className="border-t border-gray-100 px-4 py-8 text-center">
            <span className="text-3xl">🎵</span>
            <p className="mt-2 text-sm font-semibold text-gray-600">セトリ情報は準備中です</p>
            <p className="mt-1 text-xs text-gray-400">公演後に更新予定です</p>
          </div>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// ページ
// ---------------------------------------------------------------------------

export default function ArtistPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();

  const artist = findArtistBySlug(slug);

  const [events,        setEvents]        = useState<CrawledEvent[]>([]);
  const [seatCounts,    setSeatCounts]    = useState<Map<string, number>>(new Map());
  const [afterCounts,   setAfterCounts]   = useState<Map<string, number>>(new Map());
  const [totalSeat,     setTotalSeat]     = useState(0);
  const [totalAfter,    setTotalAfter]    = useState(0);
  const [recentReports, setRecentReports] = useState<(SeatReport & { event_id: string })[]>([]);
  const [loading,       setLoading]       = useState(true);

  useEffect(() => {
    if (!artist) return;

    async function load() {
      const orFilter = artist!.keywords.map((kw) => `title.ilike.%${kw}%`).join(",");

      const { data: allEvData } = await supabase
        .from("events")
        .select("id, title, venue, venue_id, date, genre")
        .or(orFilter)
        .order("date", { ascending: true });

      const allEvs = (allEvData as CrawledEvent[]) ?? [];
      setEvents(allEvs);

      if (allEvs.length === 0) {
        setLoading(false);
        return;
      }

      const ids = allEvs.map((e) => e.id);

      // 座席報告：件数集計 + 最新20件（マップ分析用）
      const [{ data: seatData }, { data: recentData }] = await Promise.all([
        supabase.from("seat_reports").select("event_id").in("event_id", ids),
        supabase
          .from("seat_reports")
          .select("*")
          .in("event_id", ids)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);

      const sCounts = new Map<string, number>();
      let sTotal = 0;
      for (const r of seatData ?? []) {
        sCounts.set(r.event_id, (sCounts.get(r.event_id) ?? 0) + 1);
        sTotal++;
      }
      setSeatCounts(sCounts);
      setTotalSeat(sTotal);
      setRecentReports((recentData as (SeatReport & { event_id: string })[]) ?? []);

      // 答え合わせ
      const { data: afterData } = await supabase
        .from("after_reports")
        .select("event_id")
        .in("event_id", ids);

      const aCounts = new Map<string, number>();
      let aTotal = 0;
      for (const r of afterData ?? []) {
        aCounts.set(r.event_id, (aCounts.get(r.event_id) ?? 0) + 1);
        aTotal++;
      }
      setAfterCounts(aCounts);
      setTotalAfter(aTotal);

      setLoading(false);
    }

    load();
  }, [artist]);

  const today = new Date().toISOString().split("T")[0];

  const upcomingEvents = useMemo(
    () => events.filter((ev) => ev.date && ev.date >= today),
    [events, today]
  );

  const firstEventId = upcomingEvents[0]?.id;

  const venueMap = useMemo(
    () => new Map(events.map((ev) => [ev.id, ev.venue])),
    [events]
  );

  if (!artist) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50">
        <p className="text-sm text-gray-500">アーティストが見つかりません</p>
        <Link href="/" className="rounded-full bg-[var(--accent)] px-5 py-2.5 text-xs font-bold text-white">
          ホームに戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">

      {/* ヘッダー */}
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/90 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-sm font-bold text-gray-900">{artist.name}</span>
          <Link
            href="/chat"
            className="ml-auto flex items-center gap-1 rounded-full bg-violet-50 px-3 py-1.5 text-[11px] font-bold text-violet-700"
          >
            <span>🎀</span><span>AIに聞く</span>
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-2xl space-y-4 px-4 pt-4">

        {/* ① アーティストヘッダー */}
        <div className={`overflow-hidden rounded-2xl bg-gradient-to-br ${artist.grad} p-5 shadow-md`}>
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
              <span className="text-3xl font-extrabold text-white drop-shadow-sm">{artist.initials}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xl font-extrabold text-white leading-tight">{artist.name}</p>
              <span className={`mt-1 inline-block rounded px-2 py-0.5 text-[10px] font-bold ${GENRE_BADGE[artist.genre] ?? GENRE_BADGE.other}`}>
                {genreLabel(artist.genre)}
              </span>
            </div>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-white/80">{artist.description}</p>
        </div>

        {/* ② 件数カード */}
        {loading ? (
          <div className="grid grid-cols-3 gap-2">
            {[0,1,2].map((i) => (
              <div key={i} className="animate-pulse rounded-2xl bg-white p-3 shadow-sm text-center">
                <div className="mx-auto mb-1 h-6 w-12 rounded bg-gray-100" />
                <div className="mx-auto h-2.5 w-10 rounded bg-gray-100" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-white p-3 shadow-sm text-center">
              <p className="text-xl font-extrabold text-[var(--accent)]">{totalSeat}</p>
              <p className="mt-0.5 text-[10px] text-gray-500">座席報告</p>
            </div>
            <div className="rounded-2xl bg-white p-3 shadow-sm text-center">
              <p className="text-xl font-extrabold text-amber-500">{totalAfter}</p>
              <p className="mt-0.5 text-[10px] text-gray-500">答え合わせ</p>
            </div>
            <div className="rounded-2xl bg-white p-3 shadow-sm text-center">
              <p className="text-xl font-extrabold text-gray-700">{events.length}</p>
              <p className="mt-0.5 text-[10px] text-gray-500">対象公演</p>
            </div>
          </div>
        )}

        {/* ③ リアルタイム座席予想マップ */}
        <SeatPredictionMapCard
          artistName={artist.name}
          totalSeat={totalSeat}
          reports={recentReports}
          firstEventId={firstEventId}
        />

        {/* ④ 直近の公演 */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-extrabold text-gray-900">直近の公演</p>
            {!loading && (
              <span className="text-[11px] text-gray-400">{upcomingEvents.length}件</span>
            )}
          </div>

          {loading ? (
            <div className="space-y-3">
              {[0,1].map((i) => (
                <div key={i} className="animate-pulse rounded-2xl bg-white p-4 shadow-sm">
                  <div className="mb-2 h-3 w-24 rounded bg-gray-100" />
                  <div className="mb-1 h-4 w-full rounded bg-gray-100" />
                  <div className="h-3 w-2/3 rounded bg-gray-100" />
                </div>
              ))}
            </div>
          ) : upcomingEvents.length === 0 ? (
            <div className="flex flex-col items-center rounded-2xl bg-white py-12 shadow-sm">
              <span className="text-4xl">🎤</span>
              <p className="mt-3 text-sm font-semibold text-gray-700">直近の公演はありません</p>
              <p className="mt-1 text-xs text-gray-400">過去公演の情報は報告履歴からご確認ください</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingEvents.map((ev) => (
                <EventCard
                  key={ev.id}
                  ev={ev}
                  seatCount={seatCounts.get(ev.id) ?? 0}
                  afterCount={afterCounts.get(ev.id) ?? 0}
                />
              ))}
            </div>
          )}
        </section>

        {/* ⑤ 最新の座席報告（3件） */}
        <RecentReportsSection
          reports={recentReports}
          venueMap={venueMap}
          firstEventId={firstEventId}
          loading={loading}
        />

        {/* ⑥ 答え合わせ情報 */}
        <section>
          <p className="mb-3 text-sm font-extrabold text-gray-900">答え合わせ情報</p>
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            {totalAfter === 0 ? (
              <div className="flex flex-col items-center py-6 text-center">
                <span className="text-3xl">📸</span>
                <p className="mt-2 text-sm font-semibold text-gray-600">答え合わせ報告を募集中</p>
                <p className="mt-1 text-xs text-gray-400">ステージの見え方・演出を教えてください</p>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50">
                  <span className="text-xl">📸</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{totalAfter}件の答え合わせ報告</p>
                  <p className="text-xs text-gray-500">演出・ステージ・花道情報あり</p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ⑦ セトリ（閉じた状態） */}
        <SetlistAccordion />

      </div>

      {/* ボトムナビ */}
      <nav className="fixed bottom-0 left-1/2 z-30 flex w-full max-w-md -translate-x-1/2 border-t border-gray-100 bg-white/95 backdrop-blur-md">
        <Link href="/" className="flex flex-1 flex-col items-center gap-0.5 py-3 text-gray-400">
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
    </div>
  );
}
