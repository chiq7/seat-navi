"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { findArtistBySlug } from "@/lib/artists";
import type { CrawledEvent, SeatReport } from "@/lib/types";
import { ArenaReportMap } from "@/components/arena-map/ArenaReportMap";
import { SeatReportForm } from "@/components/SeatReportForm";
import { HeroCard } from "@/components/artist/HeroCard";
import { SetlistSection } from "@/components/artist/SetlistSection";
import { PastToursSection } from "@/components/artist/PastToursSection";
import { AfterReportsSection } from "@/components/artist/AfterReportsSection";
import { TicketStatsSection } from "@/components/artist/TicketStatsSection";
import { ArtistPageHeader } from "@/components/artist/ArtistPageHeader";
import { ArtistMainMenuSection } from "@/components/artist/ArtistMainMenuSection";
import { ArtistBottomNav } from "@/components/artist/ArtistBottomNav";
import type { AnalyticsReport, TicketResultAnalytics, AfterReportCard } from "@/lib/artistPageTypes";
import { fmtDate } from "@/lib/artistPageHelpers";
import { computeSeatStats, computeTicketResultStats, computeArenaDetailStats, computeTourInfo, computePastTours } from "@/lib/artistPageStats";
const VENUE_TAB_ORDER = ["東京ドーム", "バンテリンドーム ナゴヤ", "京セラドーム大阪"];

// 笏笏笏 Page 笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏笏

export default function ArtistPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const artist = findArtistBySlug(slug);

  const [events, setEvents] = useState<CrawledEvent[]>([]);
  const [analyticsReports, setAnalyticsReports] = useState<AnalyticsReport[]>([]);
  const [ticketResultReports, setTicketResultReports] = useState<TicketResultAnalytics[]>([]);
  const [seatCounts, setSeatCounts] = useState<Map<string, number>>(new Map());
  const [afterCounts, setAfterCounts] = useState<Map<string, number>>(new Map());
  const [latestAfterReports, setLatestAfterReports] = useState<AfterReportCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedVenue, setSelectedVenue] = useState<string | null>(null);
  const [hasUserSelectedVenue, setHasUserSelectedVenue] = useState(false);
  const [selectedMapEventId, setSelectedMapEventId] = useState<string | null>(null);
  const [heroUpgradeRate, setHeroUpgradeRate] = useState<number | null>(null);

  async function loadData(a: NonNullable<ReturnType<typeof findArtistBySlug>>) {
    setFetchError(null);
    const orFilter = a.keywords.map(kw => `title.ilike.%${kw}%`).join(",");

    const { data: evData, error: evError } = await supabase
      .from("events")
      .select("id, title, venue, venue_id, date, genre, lottery_types")
      .or(orFilter)
      .order("date", { ascending: false });

    if (evError) {
      setFetchError("公演情報を取得できませんでした。時間をおいて再度お試しください。");
      setLoading(false);
      return;
    }

    const allEvs = (evData as CrawledEvent[]) ?? [];
    setEvents(allEvs);

    if (allEvs.length === 0) { setLoading(false); return; }

    const ids = allEvs.map(e => e.id);

    const [seatRes, ticketResultRes, afterRes, latestAfterRes] = await Promise.all([
      supabase.from("seat_reports")
        .select("id, event_id, block, row_num, seat_num, lottery_type, fc_history, payment_method, lottery_round, lottery_name, comment, created_at")
        .in("event_id", ids)
        .order("created_at", { ascending: false })
        .limit(500),
      supabase.from("event_ticket_results")
        .select("event_id, result, lost_application_count, ticket_count, lottery_type, fc_history, payment_method, seat_type, upgrade_result")
        .in("event_id", ids)
        .order("created_at", { ascending: false })
        .limit(1000),
      supabase.from("after_reports")
        .select("id, event_id")
        .in("event_id", ids),
      supabase.from("after_reports")
        .select("id, event_id, seat_area_type, seat_block, seat_row, seat_view_photo_paths, torokko, kyakukudari, fansa, memo, created_at")
        .in("event_id", ids)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    const seatData = (seatRes.data as AnalyticsReport[]) ?? [];
    const ticketResultData = (ticketResultRes.data as TicketResultAnalytics[]) ?? [];
    const afterData = (afterRes.data as { id: string; event_id: string }[]) ?? [];
    const latestAfterData = (latestAfterRes.data as AfterReportCard[]) ?? [];

    const sCounts = new Map<string, number>();
    for (const r of seatData) sCounts.set(r.event_id, (sCounts.get(r.event_id) ?? 0) + 1);
    const aCounts = new Map<string, number>();
    for (const r of afterData) aCounts.set(r.event_id, (aCounts.get(r.event_id) ?? 0) + 1);

    setAnalyticsReports(seatData);
    setTicketResultReports(ticketResultData);
    setSeatCounts(sCounts);
    setAfterCounts(aCounts);
    setLatestAfterReports(latestAfterData);
    setLoading(false);
  }

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!artist) return;
    setSelectedVenue(null);
    setHasUserSelectedVenue(false);
    setSelectedMapEventId(null);
    loadData(artist);
  }, [artist]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("ticket_result_votes")
        .select("vote_type, result")
        .eq("artist_slug", slug);
      if (!data) return;
      let uw = 0, ul = 0;
      for (const row of data) {
        if (row.vote_type !== "ticket") {
          if (row.result === "won") uw++;
          else if (row.result === "lost") ul++;
        }
      }
      const ut = uw + ul;
      setHeroUpgradeRate(ut > 0 ? Math.round((uw / ut) * 100) : null);
    })();
  }, [slug]);

  const today = new Date().toISOString().split("T")[0];

  const sortedEvents = useMemo(() => {
    const upcoming = events
      .filter(ev => ev.date && ev.date >= today)
      .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
    const past = events
      .filter(ev => !ev.date || ev.date < today)
      .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
    const pastWithData = past.filter(ev => (seatCounts.get(ev.id) ?? 0) > 0);
    const pastNoData = past.filter(ev => (seatCounts.get(ev.id) ?? 0) === 0);
    return [...upcoming, ...pastWithData, ...pastNoData];
  }, [events, seatCounts, today]);

  const pastEvents = useMemo(
    () =>
      events
        .filter(ev => ev.date && ev.date < today)
        .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "")),
    [events, today],
  );

  const venueGroups = useMemo(() => {
    const map = new Map<string, CrawledEvent[]>();
    for (const ev of sortedEvents) {
      const group = map.get(ev.venue) ?? [];
      group.push(ev);
      map.set(ev.venue, group);
    }
    return map;
  }, [sortedEvents]);

  const nearestUpcomingEvent = useMemo(
    () =>
      events
        .filter(ev => ev.date && ev.date >= today)
        .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""))[0] ?? null,
    [events, today],
  );

  const venuesSorted = useMemo(() => {
    return [...venueGroups.keys()].sort((a, b) => {
      const nearA = (venueGroups.get(a) ?? [])
        .filter(ev => ev.date && ev.date >= today)
        .sort((x, y) => (x.date ?? "").localeCompare(y.date ?? ""))[0]?.date;
      const nearB = (venueGroups.get(b) ?? [])
        .filter(ev => ev.date && ev.date >= today)
        .sort((x, y) => (x.date ?? "").localeCompare(y.date ?? ""))[0]?.date;
      if (nearA && !nearB) return -1;
      if (!nearA && nearB) return 1;
      if (nearA && nearB) return nearA.localeCompare(nearB);
      const orderA = VENUE_TAB_ORDER.indexOf(a);
      const orderB = VENUE_TAB_ORDER.indexOf(b);
      if (orderA !== -1 || orderB !== -1) {
        if (orderA === -1) return 1;
        if (orderB === -1) return -1;
        return orderA - orderB;
      }
      const latA = (venueGroups.get(a) ?? [])[0]?.date ?? "";
      const latB = (venueGroups.get(b) ?? [])[0]?.date ?? "";
      return latB.localeCompare(latA);
    });
  }, [venueGroups, today]);

  const selectedVenueHasUpcoming = selectedVenue
    ? (venueGroups.get(selectedVenue) ?? []).some(ev => ev.date && ev.date >= today)
    : false;
  const effectiveVenue =
    selectedVenue && (hasUserSelectedVenue || !nearestUpcomingEvent || selectedVenueHasUpcoming)
      ? selectedVenue
      : nearestUpcomingEvent?.venue ?? venuesSorted[0] ?? null;
  const selectedVenueEvents = useMemo(
    () => venueGroups.get(effectiveVenue ?? "") ?? [],
    [venueGroups, effectiveVenue],
  );

  const defaultVenueEvent = useMemo(() => {
    const upcoming = selectedVenueEvents
      .filter(ev => ev.date && ev.date >= today)
      .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
    return (
      upcoming[0] ??
      [...selectedVenueEvents].sort((a, b) =>
        (b.date ?? "").localeCompare(a.date ?? ""),
      )[0]
    );
  }, [selectedVenueEvents, today]);

  const selectedCTAEvent = useMemo(
    () => selectedVenueEvents.find(ev => ev.id === selectedMapEventId) ?? defaultVenueEvent,
    [defaultVenueEvent, selectedMapEventId, selectedVenueEvents],
  );

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (selectedVenueEvents.length === 0) {
      if (selectedMapEventId !== null) setSelectedMapEventId(null);
      return;
    }
    if (selectedMapEventId && selectedVenueEvents.some(ev => ev.id === selectedMapEventId)) return;
    setSelectedMapEventId(defaultVenueEvent?.id ?? null);
  }, [defaultVenueEvent?.id, selectedMapEventId, selectedVenueEvents]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const selectedVenueDateLabel = useMemo(() => {
    return selectedCTAEvent?.date ? fmtDate(selectedCTAEvent.date) : null;
  }, [selectedCTAEvent?.date]);

  const sortedSelectedVenueEvents = useMemo(
    () => {
      const upcoming = selectedVenueEvents
        .filter(ev => ev.date && ev.date >= today)
        .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
      const past = selectedVenueEvents
        .filter(ev => !ev.date || ev.date < today)
        .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
      return [...upcoming, ...past];
    },
    [selectedVenueEvents, today],
  );

  const selectedSeatReports = useMemo(
    () => analyticsReports.filter(report => report.event_id === selectedCTAEvent?.id),
    [analyticsReports, selectedCTAEvent?.id],
  );


  // First upcoming event for bottom nav links
  const nextEvent = useMemo(
    () =>
      events
        .filter(ev => ev.date && ev.date >= today)
        .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""))[0] ?? selectedCTAEvent,
    [events, today, selectedCTAEvent],
  );

  // Hero header info: tour name, date range, cities/performances
  const tourInfo = useMemo(
    () => computeTourInfo(events, today, artist?.name),
    [events, today, artist],
  );

  // Group past events into tours by title
  const pastTours = useMemo(
    () => computePastTours(pastEvents, artist?.name),
    [pastEvents, artist],
  );

  // Compute stats from seat_reports
  const seatStats = useMemo(
    () => computeSeatStats(analyticsReports),
    [analyticsReports],
  );

  const ticketResultStats = useMemo(
    () => computeTicketResultStats(ticketResultReports),
    [ticketResultReports],
  );


  const arenaDetailStats = useMemo(
    () => computeArenaDetailStats(ticketResultReports),
    [ticketResultReports],
  );

  // Event lookup for after-report cards
  const eventMap = useMemo(() => {
    const m = new Map<string, CrawledEvent>();
    for (const ev of events) m.set(ev.id, ev);
    return m;
  }, [events]);

  // Suppress unused warning 窶・afterCounts kept for future use
  void afterCounts;

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
        className="mx-auto w-full max-w-[430px] min-h-screen relative shadow-2xl"
        style={{ background: "#f3f6f8" }}
      >

        <ArtistPageHeader artistName={artist.name} />

        <main className="pt-14 pb-24">

          {/* 1. Hero Card */}
          <HeroCard tourInfo={tourInfo} artistName={artist.name} />

          {fetchError && (
            <div className="mx-4 mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {fetchError}
            </div>
          )}

          <ArtistMainMenuSection slug={slug} selectedEventId={selectedCTAEvent?.id} afterHref={afterHref} />

          {/* 3. アリーナ報告マップ */}
          <section className="mt-5 px-4">
            <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-gray-900">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "#006876" }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              アリーナ報告マップ · 速報プレビュー
            </h3>
            <div className="overflow-hidden rounded-2xl bg-white">
              {/* 莨壼ｴ繧ｿ繝・*/}
              {venuesSorted.length > 1 && (
                <div className="border-b border-gray-100 p-3" style={{ background: "rgba(243,246,248,0.6)" }}>
                  <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                    {venuesSorted.map(venue => {
                      const isSel = venue === effectiveVenue;
                      return (
                        <button
                          key={venue}
                          type="button"
                          onClick={() => {
                            setHasUserSelectedVenue(true);
                            setSelectedVenue(venue);
                            setSelectedMapEventId(null);
                          }}
                          className="whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-semibold transition-all active:scale-95"
                          style={
                            isSel
                              ? { background: "#006876", color: "#fff" }
                              : { background: "#e2e8ea", color: "#4b6870" }
                          }
                        >
                          {venue}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {sortedSelectedVenueEvents.length > 0 && (
                <div className="border-b border-gray-100 px-3 py-2" style={{ background: "rgba(243,246,248,0.42)" }}>
                  <div className="flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                    {sortedSelectedVenueEvents.map(ev => {
                      const isSel = ev.id === selectedCTAEvent?.id;
                      return (
                        <button
                          key={ev.id}
                          type="button"
                          onClick={() => setSelectedMapEventId(ev.id)}
                          className="whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-semibold transition-all active:scale-95"
                          style={
                            isSel
                              ? { background: "#006876", color: "#fff" }
                              : { background: "#edf3f4", color: "#4b6870" }
                          }
                        >
                          {fmtDate(ev.date)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {(() => {
                if (loading) {
                  return (
                    <div className="flex aspect-[4/3] items-center justify-center">
                      <div
                        className="h-6 w-6 animate-spin rounded-full border-2"
                        style={{ borderColor: "#006876", borderTopColor: "transparent" }}
                      />
                    </div>
                  );
                }
                if (!selectedCTAEvent) {
                  return (
                    <div className="flex aspect-[4/3] items-center justify-center">
                      <p className="text-xs text-gray-400">公演情報がありません</p>
                    </div>
                  );
                }
                return (
                  <Link href={`/events/${selectedCTAEvent.id}`} className="group block cursor-pointer">
                    {/* 速報プレビュー：上部のみ切り取り表示 */}
                    <div className="relative h-[220px] overflow-hidden bg-white">
                      <ArenaReportMap
                        eventId={selectedCTAEvent.id}
                        reports={selectedSeatReports as SeatReport[]}
                        variant="compact"
                        compactVenueName={effectiveVenue}
                        compactDateLabel={selectedVenueDateLabel}
                      />
                      {/* 下部フェード */}
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white to-transparent" />
                      {/* ドット部分オーバーレイ */}
                      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-end pb-6">
                        <div className="rounded-2xl bg-black/45 px-3 py-2 text-center">
                          <p className="text-[11px] font-bold text-white">列・席番・色分けは詳細へ</p>
                          <p className="mt-0.5 text-[9px] font-semibold text-white/90">抽選回・FC歴・枚数・支払い・アプグレ</p>
                          <p className="mt-1.5 text-[10px] font-bold text-white/80">タップで詳細マップへ ›</p>
                        </div>
                      </div>
                    </div>
                    <div className="px-1 pt-2 pb-1">
                      <div
                        className="flex w-full items-center justify-center rounded-xl py-2.5 text-xs font-bold text-white transition-transform active:scale-[0.98]"
                        style={{ background: "#006876" }}
                      >
                        詳細な座席分布を見る
                      </div>
                    </div>
                  </Link>
                );
              })()}
            </div>
            {selectedCTAEvent && (
              <div id="seat-report" className="mt-3">
                <SeatReportForm
                  eventId={selectedCTAEvent.id}
                  event={selectedCTAEvent}
                  successMode="inline"
                  variant="progressive"
                />
              </div>
            )}
          </section>

          {/* 4. 当選率データ・詳細傾向 */}
          <TicketStatsSection
            ticketResultStats={ticketResultStats}
            seatStats={seatStats}
            heroUpgradeRate={heroUpgradeRate}
            arenaDetailStats={arenaDetailStats}
          />
          {/* 5. 最新の現地レポ */}
          <AfterReportsSection
            reports={latestAfterReports}
            eventMap={eventMap}
            afterHref={afterHref}
          />

          {/* 6. 繧ｻ繝医Μ繝ｻ譖ｲ鬆・*/}
          <SetlistSection slug={slug} />

          {/* 7. 驕主悉蜈ｬ貍斐ョ繝ｼ繧ｿ */}
          <PastToursSection loading={loading} pastTours={pastTours} />

        </main>

        <ArtistBottomNav slug={slug} selectedEventId={selectedCTAEvent?.id} afterHref={afterHref} />

      </div>
    </div>
  );
}
