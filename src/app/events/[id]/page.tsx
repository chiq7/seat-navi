"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { findArtistByKeyword } from "@/lib/artists";
import type { CrawledEvent, EventLayout, FanSeatPrediction, SeatReport } from "@/lib/types";
import { ArenaReportMap } from "@/components/arena-map/ArenaReportMap";
import { FanSeatPredictionsCarousel } from "@/components/FanSeatPredictionsCarousel";
import { SeatReportForm } from "@/components/SeatReportForm";
import { EventPageHeader } from "@/components/event/EventPageHeader";
import { EventBottomNav } from "@/components/event/EventBottomNav";
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

  function fmtShortDate(d: string | null) {
    if (!d) return "日程未定";
    const [y, m, day] = d.split("-").map(Number);
    const w = ["日","月","火","水","木","金","土"][new Date(y, m - 1, day).getDay()];
    return `${m}/${day}(${w})`;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      <EventPageHeader title={loading ? null : (artist?.name ?? event?.title ?? "公演詳細")} />

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

          {/* 座席報告マップ */}
          <ArenaReportMap
            eventId={eventId}
            reports={seatReports}
            variant="full"
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

      <EventBottomNav eventId={eventId} artistSlug={artist?.slug} />
    </div>
  );
}
