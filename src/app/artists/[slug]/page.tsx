"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { findArtistBySlug } from "@/lib/artists";
import type { CrawledEvent } from "@/lib/types";
import type { AnalyticsReport, TicketResultAnalytics, AfterReportCard } from "@/lib/artistPageTypes";
import { computeTicketResultStats, computeArenaDetailStats, computeUpgradeDetailStats, computeLiveEffects, computeTourInfo } from "@/lib/artistPageStats";

import HeroSection from "@/components/artist-page/HeroSection";
import TrendSection from "@/components/artist-page/TrendSection";
import EventSection, { type VenueGroup } from "@/components/artist-page/EventSection";
import ReportSection from "@/components/artist-page/ReportSection";
import MapPreviewSection from "@/components/artist-page/MapPreviewSection";
import LiveEffectsSection from "@/components/artist-page/LiveEffectsSection";
import ArtistPageBottomNav from "@/components/artist-page/ArtistPageBottomNav";

export default function ArtistPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const artist = findArtistBySlug(slug);

  const [events, setEvents] = useState<CrawledEvent[]>([]);
  const [analyticsReports, setAnalyticsReports] = useState<AnalyticsReport[]>([]);
  const [ticketResultReports, setTicketResultReports] = useState<TicketResultAnalytics[]>([]);
  const [seatCounts, setSeatCounts] = useState<Map<string, number>>(new Map());
  const [latestAfterReports, setLatestAfterReports] = useState<AfterReportCard[]>([]);
  const [topPredictionImageUrl, setTopPredictionImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  async function loadData(a: NonNullable<ReturnType<typeof findArtistBySlug>>) {
    setFetchError(null);
    setTopPredictionImageUrl(null);
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

    const [seatRes, ticketResultRes, latestAfterRes] = await Promise.all([
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
        .select("id, event_id, seat_area_type, seat_block, seat_row, seat_view_photo_paths, center_stage, torokko, kyakukudari, silver_tape_rows, fansa, memo, created_at")
        .in("event_id", ids)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    const seatData = (seatRes.data as AnalyticsReport[]) ?? [];
    const ticketResultData = (ticketResultRes.data as TicketResultAnalytics[]) ?? [];
    const latestAfterData = (latestAfterRes.data as AfterReportCard[]) ?? [];

    const sCounts = new Map<string, number>();
    for (const r of seatData) sCounts.set(r.event_id, (sCounts.get(r.event_id) ?? 0) + 1);

    setAnalyticsReports(seatData);
    setTicketResultReports(ticketResultData);
    setSeatCounts(sCounts);
    setLatestAfterReports(latestAfterData);

    // Fan prediction: most-liked image for the most recent event
    const recentEventId = allEvs[0]?.id ?? null;
    if (recentEventId) {
      const { data: predData } = await supabase
        .from("fan_seat_predictions")
        .select("id, image_path")
        .eq("event_id", recentEventId)
        .eq("approved", true);

      if (predData && predData.length > 0) {
        const predIds = predData.map((p: { id: string; image_path: string }) => p.id);
        const { data: voteData } = await supabase
          .from("fan_seat_prediction_votes")
          .select("prediction_id")
          .in("prediction_id", predIds);

        let topImagePath: string | null = null;
        if (voteData && voteData.length > 0) {
          const counts = new Map<string, number>();
          for (const v of voteData as { prediction_id: string }[]) {
            counts.set(v.prediction_id, (counts.get(v.prediction_id) ?? 0) + 1);
          }
          const topId = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
          topImagePath = predData.find((p: { id: string; image_path: string }) => p.id === topId)?.image_path ?? null;
        } else {
          topImagePath = predData[0].image_path;
        }

        if (topImagePath) {
          const { data: urlData } = supabase.storage
            .from("fan-seat-predictions")
            .getPublicUrl(topImagePath);
          setTopPredictionImageUrl(urlData.publicUrl);
        }
      }
    }

    setLoading(false);
  }

  // Suppress unused warning — analyticsReports kept for future seat map use
  void analyticsReports;

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!artist) return;
    setLoading(true);
    loadData(artist);
  }, [artist]);
  /* eslint-enable react-hooks/set-state-in-effect */

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

  const nearestUpcomingEvent = useMemo(
    () =>
      events
        .filter(ev => ev.date && ev.date >= today)
        .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""))[0] ?? null,
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
      const latA = (venueGroups.get(a) ?? [])[0]?.date ?? "";
      const latB = (venueGroups.get(b) ?? [])[0]?.date ?? "";
      return latB.localeCompare(latA);
    });
  }, [venueGroups, today]);

  const tourInfo = useMemo(
    () => computeTourInfo(events, today, artist?.name),
    [events, today, artist],
  );

  const ticketResultStats = useMemo(
    () => computeTicketResultStats(ticketResultReports),
    [ticketResultReports],
  );

  const arenaDetailStats = useMemo(
    () => computeArenaDetailStats(ticketResultReports),
    [ticketResultReports],
  );

  const upgradeDetailStats = useMemo(
    () => computeUpgradeDetailStats(ticketResultReports),
    [ticketResultReports],
  );

  const liveEffects = useMemo(
    () => computeLiveEffects(latestAfterReports),
    [latestAfterReports],
  );

  const eventMap = useMemo(() => {
    const m = new Map<string, CrawledEvent>();
    for (const ev of events) m.set(ev.id, ev);
    return m;
  }, [events]);

  const countdownDays = useMemo(() => {
    if (!nearestUpcomingEvent?.date) return null;
    const diff = new Date(nearestUpcomingEvent.date).getTime() - new Date(today).getTime();
    return Math.ceil(diff / 86400000);
  }, [nearestUpcomingEvent?.date, today]);

  const tourStops = useMemo(() => {
    return events
      .filter(ev => ev.date && ev.date >= today)
      .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""))
      .slice(0, 4)
      .map((ev, i) => ({ date: ev.date!, label: ev.venue, active: i === 0 }));
  }, [events, today]);

  const afterHref = `/artists/${slug}/after-reports`;

  const venueGroupsForEvents = useMemo((): VenueGroup[] => {
    const map = new Map<string, { dates: string[]; totalReports: number; nearestUpcoming: string | null }>();
    for (const ev of events) {
      const entry = map.get(ev.venue);
      const isUpcoming = ev.date != null && ev.date >= today;
      const reports = seatCounts.get(ev.id) ?? 0;
      if (entry) {
        if (ev.date) entry.dates.push(ev.date);
        entry.totalReports += reports;
        if (isUpcoming && (!entry.nearestUpcoming || ev.date! < entry.nearestUpcoming)) {
          entry.nearestUpcoming = ev.date!;
        }
      } else {
        map.set(ev.venue, {
          dates: ev.date ? [ev.date] : [],
          totalReports: reports,
          nearestUpcoming: isUpcoming ? ev.date! : null,
        });
      }
    }
    return [...map.entries()]
      .map(([venue, { dates, totalReports, nearestUpcoming }]) => ({
        venue,
        dates: [...dates].sort(),
        totalReports,
        nearestUpcoming,
      }))
      .sort((a, b) => {
        if (a.nearestUpcoming && !b.nearestUpcoming) return -1;
        if (!a.nearestUpcoming && b.nearestUpcoming) return 1;
        if (a.nearestUpcoming && b.nearestUpcoming) return a.nearestUpcoming.localeCompare(b.nearestUpcoming);
        const latA = a.dates[a.dates.length - 1] ?? "";
        const latB = b.dates[b.dates.length - 1] ?? "";
        return latB.localeCompare(latA);
      })
      .slice(0, 5)
      .map(({ venue, dates, totalReports }) => ({ venue, dates, totalReports }));
  }, [events, seatCounts, today]);

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

  return (
    <main className="mx-auto min-h-screen max-w-[390px] bg-white font-sans text-gray-900">
      <HeroSection
        artistName={artist.name}
        tourTitle={nearestUpcomingEvent === null ? "公演発表待機中" : tourInfo.fullTitle}
        dateRange={tourInfo.dateRange}
        ticketRate={ticketResultStats.rate}
        normalArenaRate={ticketResultStats.normalArenaRate}
        upgradeRate={ticketResultStats.upgradeRate}
        nextEvent={
          nearestUpcomingEvent
            ? { date: nearestUpcomingEvent.date!, venue: nearestUpcomingEvent.venue }
            : null
        }
        countdownDays={countdownDays}
        tourStops={tourStops}
      />

      {fetchError && (
        <div className="mx-4 mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {fetchError}
        </div>
      )}

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#FF6B9D] border-t-transparent" />
        </div>
      ) : (
        <div className="bg-gradient-to-b from-white via-[#FFF8FB] to-white pb-24">
          <div id="trend">
            <TrendSection
              ticketStats={ticketResultStats}
              arenaStats={arenaDetailStats}
              upgradeStats={upgradeDetailStats}
            />
          </div>
          <div id="map">
            <MapPreviewSection venues={venuesSorted} topPredictionImageUrl={topPredictionImageUrl} />
          </div>
          <LiveEffectsSection liveEffects={liveEffects} />
          <ReportSection
            reports={latestAfterReports}
            eventMap={eventMap}
            afterHref={afterHref}
          />
          <EventSection venueGroups={venueGroupsForEvents} />
        </div>
      )}

      <ArtistPageBottomNav slug={slug} />
    </main>
  );
}
