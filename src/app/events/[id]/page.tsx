"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { findArtistByKeyword } from "@/lib/artists";
import type { CrawledEvent, EventLayout, FanSeatPrediction, SeatReport } from "@/lib/types";
import { buildPredictionMap } from "@/lib/seatPrediction";
import {
  getSeatPredictionExpectedBlocks,
  getSeatPredictionLayoutHints,
} from "@/lib/seatPredictionLayoutHints";
import { SeatPredictionImage } from "@/components/SeatPredictionImage";
import { FanSeatPredictionsCarousel } from "@/components/FanSeatPredictionsCarousel";
import { SeatReportForm } from "@/components/SeatReportForm";

const LOTTERY_LABELS: Record<string, string> = {
  fc1: "FC1次", fc2: "FC2次", general: "一般", upgrade: "アプグレ",
  revival: "復活当選", production: "制作開放",
};
const LOTTERY_ORDER = ["fc1", "fc2", "general", "upgrade", "revival", "production"];
const FC_LABELS: Record<string, string> = {
  over_3_years: "FC歴3年以上", one_to_three_years: "FC歴1〜3年",
  under_1_year: "FC歴1年未満",
};
const FC_ORDER = ["over_3_years", "one_to_three_years", "under_1_year"];
const PM_LABELS: Record<string, string> = { credit: "クレカ", convenience: "コンビニ", other: "その他" };

function isArenaBlock(block: string): boolean {
  return /^(A|SA|SB|SC|SD|SE)\d/i.test(block);
}

type TrendItem = { key: string; label: string; count: number; topBlocks: string[]; arenaRatio: number };
type SeatSummary = {
  totalReports: number;
  topBlocks: string[];
  arenaCount: number;
  standCount: number;
  arenaRatio: number;
  lotteryTypeTrends: TrendItem[];
  fcHistoryTrends: TrendItem[];
  paymentMethodTrends: TrendItem[];
  predictionComment: string;
};

function topBlocksFor(reports: SeatReport[], n = 3): string[] {
  const cnt = new Map<string, number>();
  for (const r of reports) cnt.set(r.block, (cnt.get(r.block) ?? 0) + 1);
  return [...cnt.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k);
}

function arenaRatioFor(reports: SeatReport[]): number {
  if (!reports.length) return 0;
  return reports.filter(r => isArenaBlock(r.block)).length / reports.length;
}

function buildPredictionComment(total: number, arenaRatio: number, lotteryTrends: TrendItem[]): string {
  if (total === 0) return "";
  const lines: string[] = [];
  if (total < 10) {
    lines.push("報告数がまだ少ないため、傾向は参考程度にご確認ください。");
  } else if (arenaRatio >= 0.7) {
    lines.push("報告ベースでは、アリーナブロックが多い傾向が見られます。");
  } else if (arenaRatio <= 0.3) {
    lines.push("報告ベースでは、スタンド席が多い傾向が見られます。");
  } else {
    lines.push("報告ベースでは、アリーナ・スタンドに幅広い分布が見られます。");
  }
  const fc1 = lotteryTrends.find(t => t.key === "fc1");
  if (fc1 && fc1.topBlocks.length > 0) {
    lines.push(`FC1次当選者の多い報告ブロック: ${fc1.topBlocks.join("・")}（参考傾向）`);
  }
  return lines.join(" ");
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function computeSeatSummary(reports: SeatReport[]): SeatSummary | null {
  if (reports.length === 0) return null;
  const arenaCount = reports.filter(r => isArenaBlock(r.block)).length;
  const standCount = reports.length - arenaCount;
  const arenaRatio = arenaCount / reports.length;

  function buildTrends(
    order: string[],
    labels: Record<string, string>,
    getKey: (r: SeatReport) => string | null | undefined,
  ): TrendItem[] {
    const allKeys = new Set(reports.map(getKey).filter((k): k is string => k != null));
    const orderedKeys = [
      ...order.filter(k => allKeys.has(k)),
      ...[...allKeys].filter(k => !order.includes(k)),
    ];
    return orderedKeys.map(k => {
      const subset = reports.filter(r => getKey(r) === k);
      return {
        key: k,
        label: labels[k] ?? k,
        count: subset.length,
        topBlocks: topBlocksFor(subset),
        arenaRatio: arenaRatioFor(subset),
      };
    }).filter(t => t.count > 0);
  }

  const lotteryTypeTrends = buildTrends(LOTTERY_ORDER, LOTTERY_LABELS, r => r.lottery_type);
  const fcHistoryTrends   = buildTrends(FC_ORDER, FC_LABELS, r => r.fc_history ?? null);
  const paymentMethodTrends = buildTrends(Object.keys(PM_LABELS), PM_LABELS, r => r.payment_method ?? null);
  const predictionComment = buildPredictionComment(reports.length, arenaRatio, lotteryTypeTrends);

  return {
    totalReports: reports.length,
    topBlocks: topBlocksFor(reports),
    arenaCount,
    standCount,
    arenaRatio,
    lotteryTypeTrends,
    fcHistoryTrends,
    paymentMethodTrends,
    predictionComment,
  };
}

export default function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: eventId } = use(params);
  const searchParams = useSearchParams();
  const justAfterReported = searchParams.get("after_reported") === "1";

  // ページデータ
  const [event,   setEvent]   = useState<CrawledEvent | null>(null);
  const [layout,  setLayout]  = useState<EventLayout | null>(null);
  const [loading, setLoading] = useState(true);
  const [seatReports, setSeatReports] = useState<SeatReport[]>([]);
  const [fanSeatPredictions, setFanSeatPredictions] = useState<FanSeatPrediction[]>([]);
  const [relatedEvents, setRelatedEvents] = useState<CrawledEvent[]>([]);

  // トースト
  const [toast, setToast] = useState(justAfterReported ? "答え合わせ投稿ありがとう！ 🎉" : "");

  useEffect(() => {
    async function load() {
      const [evRes, layoutRes, reportsRes, fanPredictionsRes] = await Promise.all([
        supabase
          .from("events")
          .select("id, title, venue, venue_id, date, genre, lottery_types")
          .eq("id", eventId)
          .single(),
        supabase
          .from("event_layouts")
          .select("id, event_id, image_url, created_at")
          .eq("event_id", eventId)
          .limit(1)
          .maybeSingle(),
        supabase
          .from("seat_reports")
          .select("id, event_id, block, row_num, seat_num, lottery_type, fc_history, payment_method, lottery_round, lottery_name, comment, created_at")
          .eq("event_id", eventId)
          .order("created_at", { ascending: false })
          .limit(500),
        supabase
          .from("fan_seat_predictions")
          .select("id, event_id, image_path, comment, prediction_tags, display_name, approved, created_at")
          .eq("event_id", eventId)
          .eq("approved", true)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);
      if (evRes.data)      setEvent(evRes.data as CrawledEvent);
      if (layoutRes.data)  setLayout(layoutRes.data as EventLayout);
      if (reportsRes.data) setSeatReports(reportsRes.data as SeatReport[]);
      if (fanPredictionsRes.data) setFanSeatPredictions(fanPredictionsRes.data as FanSeatPrediction[]);
      setLoading(false);
    }
    load();
  }, [eventId]);

  // トースト自動消去
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const predictionMap = useMemo(() => buildPredictionMap(seatReports), [seatReports]);
  const layoutHints = useMemo(
    () => getSeatPredictionLayoutHints({ eventId, venueId: event?.venue_id }),
    [eventId, event?.venue_id],
  );
  const expectedBlocks = useMemo(
    () => getSeatPredictionExpectedBlocks({ eventId, venueId: event?.venue_id }),
    [eventId, event?.venue_id],
  );

  const artist = event ? findArtistByKeyword(event.title) : undefined;
  const relatedEventFilter = useMemo(
    () => artist?.keywords.map(kw => `title.ilike.%${kw}%`).join(",") ?? "",
    [artist],
  );

  useEffect(() => {
    if (!event || !relatedEventFilter) return;

    let cancelled = false;
    async function loadRelatedEvents() {
      const { data } = await supabase
        .from("events")
        .select("id, title, venue, venue_id, date, genre, lottery_types")
        .or(relatedEventFilter)
        .order("date", { ascending: true });
      if (!cancelled) setRelatedEvents((data as CrawledEvent[]) ?? [event]);
    }
    loadRelatedEvents();
    return () => {
      cancelled = true;
    };
  }, [event, relatedEventFilter]);

  const relatedVenueEvents = useMemo(() => {
    if (!event) return [];
    const source = relatedEventFilter && relatedEvents.length > 0 ? relatedEvents : [event];
    return source
      .filter(ev => ev.venue === event.venue)
      .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
  }, [event, relatedEventFilter, relatedEvents]);

  // 全会場リスト（ツアー内のユニーク会場を日程順で）
  const allVenues = useMemo(() => {
    const seen = new Set<string>();
    const venues: string[] = [];
    const source = relatedEvents.length > 0 ? relatedEvents : (event ? [event] : []);
    for (const ev of source) {
      if (ev.venue && !seen.has(ev.venue)) {
        seen.add(ev.venue);
        venues.push(ev.venue);
      }
    }
    return venues;
  }, [relatedEvents, event]);

  // 会場ごとの先頭イベントID（会場タブのリンク先）
  const firstEventByVenue = useMemo(() => {
    const m = new Map<string, string>();
    const source = relatedEvents.length > 0 ? relatedEvents : (event ? [event] : []);
    for (const ev of source) {
      if (ev.venue && !m.has(ev.venue)) m.set(ev.venue, ev.id);
    }
    return m;
  }, [relatedEvents, event]);

  function fmtDate(d: string | null) {
    if (!d) return "日程未定";
    const [y, m, day] = d.split("-").map(Number);
    const w = ["日","月","火","水","木","金","土"][new Date(y, m - 1, day).getDay()];
    return `${y}年${m}月${day}日(${w})`;
  }

  function fmtShortDate(d: string | null) {
    if (!d) return "日程未定";
    const [y, m, day] = d.split("-").map(Number);
    const w = ["日","月","火","水","木","金","土"][new Date(y, m - 1, day).getDay()];
    return `${m}/${day}(${w})`;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* ヘッダー */}
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
              {loading ? "読み込み中..." : (artist?.name ?? event?.title ?? "公演詳細")}
            </p>
            <p className="text-[10px] text-gray-400">座席予想</p>
          </div>
          <div className="w-9" />
      </header>

      {loading ? (
        <div className="space-y-3 px-4 pt-[76px]">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse rounded-2xl bg-white p-4 shadow-sm">
              <div className="h-4 w-32 rounded bg-gray-200" />
              <div className="mt-3 h-24 rounded bg-gray-100" />
            </div>
          ))}
        </div>
      ) : event ? (
        <div className="mx-auto max-w-md px-4 pt-[72px]">
          {/* 会場タブ */}
          {allVenues.length > 1 && (
            <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
              {allVenues.map(venue => {
                const isSel = venue === event.venue;
                const targetId = firstEventByVenue.get(venue);
                return (
                  <Link
                    key={venue}
                    href={targetId ? `/events/${targetId}` : "#"}
                    className="whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-all active:scale-95"
                    style={isSel ? { background: "#006876", color: "#fff" } : { background: "#edf3f4", color: "#4b6870" }}
                  >
                    {venue}
                  </Link>
                );
              })}
            </div>
          )}

          {/* 日付タブ */}
          {relatedVenueEvents.length > 0 && (
            <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
              {relatedVenueEvents.map(ev => {
                const isSel = ev.id === eventId;
                return (
                  <Link
                    key={ev.id}
                    href={`/events/${ev.id}`}
                    className="whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-semibold transition-all active:scale-95"
                    style={isSel ? { background: "#006876", color: "#fff" } : { background: "#edf3f4", color: "#4b6870" }}
                  >
                    {fmtShortDate(ev.date)}
                  </Link>
                );
              })}
            </div>
          )}

          {/* 参考予想図 */}
          {layout && (
            <div className="mb-4 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-2.5">
                <span className="text-xs font-bold text-gray-700">参考予想図</span>
                <span className="ml-auto text-[10px] text-gray-400">ユーザー提供</span>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={layout.image_url} alt="座席予想図" className="w-full object-contain" style={{ maxHeight: "280px" }} />
            </div>
          )}

          {/* 座席予想図 */}
          <SeatPredictionImage
            prediction={predictionMap}
            layoutHints={layoutHints}
            expectedBlocks={expectedBlocks}
            submitPredictionHref={`/events/${eventId}/fan-seat-prediction`}
          />

          {/* フォーム */}
          <SeatReportForm eventId={eventId} event={event} successMode="inline" variant="progressive" />

          <FanSeatPredictionsCarousel predictions={fanSeatPredictions} />

        </div>
      ) : (
        <div className="px-4 pt-8 text-center text-sm text-gray-500">公演が見つかりません</div>
      )}

      {/* トースト */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-gray-900 px-5 py-3 text-xs font-semibold text-white shadow-lg">
          {toast}
        </div>
      )}

      <nav
        className="fixed bottom-0 left-1/2 z-50 w-full max-w-[430px] -translate-x-1/2 border-t border-gray-100"
        style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(16px)" }}
      >
        <div className="flex items-center justify-around px-2 py-2 pb-safe">
          <Link
            href={artist ? `/artists/${artist.slug}` : "#"}
            className="flex flex-col items-center gap-0.5 px-4 py-1.5"
          >
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-[10px] font-semibold text-gray-400">集計まとめ</span>
          </Link>

          <Link
            href={`/events/${eventId}`}
            className="flex flex-col items-center gap-0.5 px-4 py-1.5"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "#006876" }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
            <span className="text-[10px] font-bold" style={{ color: "#006876" }}>座席予想</span>
          </Link>

          <Link href={`/events/${eventId}/after-report`} className="flex flex-col items-center gap-0.5 px-4 py-1.5">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-[10px] font-semibold text-gray-400">現地レポ</span>
          </Link>

          <Link
            href={artist ? `/artists/${artist.slug}/setlist` : "#"}
            className="flex flex-col items-center gap-0.5 px-4 py-1.5"
          >
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
            <span className="text-[10px] font-semibold text-gray-400">セトリ</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
