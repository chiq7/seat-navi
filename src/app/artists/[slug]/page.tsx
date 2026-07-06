"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { findArtistBySlug } from "@/lib/artists";
import { getEventsForArtist } from "@/lib/events";
import type { CrawledEvent } from "@/lib/types";
import type { AnalyticsReport, TicketResultAnalytics, AfterReportCard } from "@/lib/artistPageTypes";
import { computeTicketResultStats, computeArenaDetailStats, computeUpgradeDetailStats, computeLiveEffects, computeTourInfo } from "@/lib/artistPageStats";

import HeroSection from "@/components/artist-page/HeroSection";
import PastTourSection, { type PastTourGroup, type PastTourEvent } from "@/components/artist-page/PastTourSection";
import TrendSection from "@/components/artist-page/TrendSection";
import SeatReportTimelineSection from "@/components/artist-page/SeatReportTimelineSection";
import { type VenueGroup } from "@/components/artist-page/EventSection";
import ReportSection from "@/components/artist-page/ReportSection";
import MapPreviewSection from "@/components/artist-page/MapPreviewSection";
import LiveEffectsSection from "@/components/artist-page/LiveEffectsSection";
import { BottomNav } from "@/components/common/BottomNav";

export default function ArtistPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const artist = findArtistBySlug(slug);

  const [events, setEvents] = useState<CrawledEvent[]>([]);
  const [analyticsReports, setAnalyticsReports] = useState<AnalyticsReport[]>([]);
  const [ticketResultReports, setTicketResultReports] = useState<TicketResultAnalytics[]>([]);
  const [seatCounts, setSeatCounts] = useState<Map<string, number>>(new Map());
  const [venueAfterReports, setVenueAfterReports] = useState<AfterReportCard[]>([]);
  const [topPredictionImageUrl, setTopPredictionImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedVenue, setSelectedVenue] = useState<string | null>(null);
  const [activeEventTab, setActiveEventTab] = useState<"current" | "past">("current");
  const [pastMapOverride, setPastMapOverride] = useState<{ eventId: string; venue: string } | null>(null);
  const [selectedTourEventIds, setSelectedTourEventIds] = useState<string[] | null>(null);

  async function loadData(a: NonNullable<ReturnType<typeof findArtistBySlug>>) {
    setFetchError(null);
    setTopPredictionImageUrl(null);

    const allEvs = await getEventsForArtist(a.slug);
    setEvents(allEvs);

    if (allEvs.length === 0) { setLoading(false); return; }

    const ids = allEvs.map(e => e.id);

    const [seatRes, ticketResultRes] = await Promise.all([
      supabase.from("seat_reports")
        .select("id, event_id, block, row_num, seat_num, lottery_type, fc_history, payment_method, lottery_round, lottery_name, comment, created_at")
        .in("event_id", ids)
        .order("created_at", { ascending: false })
        .limit(500),
      supabase.from("event_ticket_results")
        .select("id, event_id, result, lost_application_count, ticket_count, lottery_type, fc_history, payment_method, seat_type, upgrade_result, comment, seat_block, seat_row, seat_number, stand_direction, stand_floor, other_seat_info, created_at")
        .in("event_id", ids)
        .order("created_at", { ascending: false })
        .limit(1000),
    ]);

    const seatData = (seatRes.data as AnalyticsReport[]) ?? [];
    const ticketResultData = (ticketResultRes.data as TicketResultAnalytics[]) ?? [];

    const sCounts = new Map<string, number>();
    for (const r of seatData) sCounts.set(r.event_id, (sCounts.get(r.event_id) ?? 0) + 1);

    setAnalyticsReports(seatData);
    setTicketResultReports(ticketResultData);
    setSeatCounts(sCounts);

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

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!artist) return;
    setLoading(true);
    setSelectedVenue(null);
    setPastMapOverride(null);
    setSelectedTourEventIds(null);
    loadData(artist);
  }, [artist]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const today = new Date().toISOString().split("T")[0];

  const nearestUpcomingEvent = useMemo(
    () =>
      events
        .filter(ev => ev.date && ev.date >= today)
        .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""))[0] ?? null,
    [events, today],
  );

  // 過去の公演をツアー単位でグループ化（アーティスト名を除いたタイトルをツアー名とみなす）
  const pastTourGroups = useMemo((): PastTourGroup[] => {
    const artistName = artist?.name;
    function stripArtistPrefix(title: string): string {
      if (artistName && title.startsWith(artistName)) {
        const rest = title.slice(artistName.length).trim();
        return rest || title;
      }
      return title;
    }

    const map = new Map<string, { title: string; events: { id: string; date: string | null; venue: string }[] }>();
    for (const ev of events) {
      if (ev.date && ev.date >= today) continue;
      const key = stripArtistPrefix(ev.title);
      if (!map.has(key)) map.set(key, { title: key, events: [] });
      map.get(key)!.events.push({ id: ev.id, date: ev.date, venue: ev.venue });
    }

    const groups = [...map.entries()].map(([key, g]) => ({
      key,
      title: g.title,
      events: [...g.events].sort((a, b) => (a.date ?? "").localeCompare(b.date ?? "")),
    }));

    groups.sort((a, b) => {
      const aLatest = a.events[a.events.length - 1]?.date ?? "";
      const bLatest = b.events[b.events.length - 1]?.date ?? "";
      return bLatest.localeCompare(aLatest);
    });

    return groups;
  }, [events, today, artist?.name]);

  const tourInfo = useMemo(
    () => computeTourInfo(events, today, artist?.name),
    [events, today, artist],
  );

  // Hero等、アーティスト全体集計として使う（過去ツアー選択の影響を受けない）
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

  // 過去の公演タブでツアーが選択されている場合、TrendSectionだけそのツアーのevent群に絞り込む
  const tourScopedTicketResultReports = useMemo(() => {
    if (!selectedTourEventIds) return ticketResultReports;
    const idSet = new Set(selectedTourEventIds);
    return ticketResultReports.filter(r => idSet.has(r.event_id));
  }, [ticketResultReports, selectedTourEventIds]);

  const trendTicketStats = useMemo(
    () => computeTicketResultStats(tourScopedTicketResultReports),
    [tourScopedTicketResultReports],
  );

  const trendArenaStats = useMemo(
    () => computeArenaDetailStats(tourScopedTicketResultReports),
    [tourScopedTicketResultReports],
  );

  const trendUpgradeStats = useMemo(
    () => computeUpgradeDetailStats(tourScopedTicketResultReports),
    [tourScopedTicketResultReports],
  );

  const eventMap = useMemo(() => {
    const m = new Map<string, CrawledEvent>();
    for (const ev of events) m.set(ev.id, ev);
    return m;
  }, [events]);

  // 座席報告タイムライン：ツアー/会場で絞り込まず、アーティスト全体の新着3件（activity感の可視化が目的）
  const seatReportTimeline = useMemo(
    () => ticketResultReports.slice(0, 3),
    [ticketResultReports],
  );

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
    type GroupAcc = {
      dates: string[];
      totalReports: number;
      nearestUpcoming: string | null;
      nearestUpcomingId: string | null;
      latestDate: string | null;
      latestDateId: string | null;
    };
    const map = new Map<string, GroupAcc>();
    for (const ev of events) {
      const entry = map.get(ev.venue);
      const isUpcoming = ev.date != null && ev.date >= today;
      const reports = seatCounts.get(ev.id) ?? 0;
      if (!entry) {
        map.set(ev.venue, {
          dates: ev.date ? [ev.date] : [],
          totalReports: reports,
          nearestUpcoming: isUpcoming ? ev.date! : null,
          nearestUpcomingId: isUpcoming ? ev.id : null,
          latestDate: ev.date,
          latestDateId: ev.date ? ev.id : null,
        });
        continue;
      }
      if (ev.date) entry.dates.push(ev.date);
      entry.totalReports += reports;
      if (isUpcoming && (!entry.nearestUpcoming || ev.date! < entry.nearestUpcoming)) {
        entry.nearestUpcoming = ev.date!;
        entry.nearestUpcomingId = ev.id;
      }
      if (ev.date && (!entry.latestDate || ev.date > entry.latestDate)) {
        entry.latestDate = ev.date;
        entry.latestDateId = ev.id;
      }
    }
    return [...map.entries()]
      .map(([venue, { dates, totalReports, nearestUpcoming, nearestUpcomingId, latestDateId }]) => ({
        venue,
        dates: [...dates].sort(),
        totalReports,
        nearestUpcoming,
        eventId: nearestUpcomingId ?? latestDateId ?? null,
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
      .map(({ venue, dates, totalReports, eventId }) => ({ venue, dates, totalReports, eventId }));
  }, [events, seatCounts, today]);

  // マップ切り替えチップ：各会場の代表event = その会場の直近開催予定 → なければ直近過去公演
  const venueChips = useMemo(
    () =>
      venueGroupsForEvents
        .filter((g): g is VenueGroup & { eventId: string } => g.eventId !== null)
        .slice(0, 4)
        .map(g => ({ venue: g.venue, eventId: g.eventId })),
    [venueGroupsForEvents],
  );

  const activeChip = useMemo(
    () => venueChips.find(c => c.venue === selectedVenue) ?? venueChips[0] ?? null,
    [venueChips, selectedVenue],
  );

  // 過去公演タップ時は、会場チップの選択より優先してその公演を直接指定する
  const mapTargetEventId = pastMapOverride?.eventId ?? activeChip?.eventId ?? null;
  const mapActiveVenue = pastMapOverride?.venue ?? activeChip?.venue ?? null;

  // 選択中会場に属する全event_id（同一会場の複数日公演をまとめて対象にする）
  const venueEventIds = useMemo(() => {
    if (!mapActiveVenue) return [];
    return events.filter(ev => ev.venue === mapActiveVenue).map(ev => ev.id);
  }, [events, mapActiveVenue]);

  // 現地レポ・演出は、選択中会場のevent_id群だけをその場で問い合わせる
  // （アーティスト全体から取得してfilterする方式だと、会場のレポが元の取得件数漏れで0件扱いになるため採用しない）
  useEffect(() => {
    if (venueEventIds.length === 0) {
      setVenueAfterReports([]);
      return;
    }
    let cancelled = false;
    async function loadVenueAfterReports() {
      const { data } = await supabase
        .from("after_reports")
        .select("id, event_id, seat_area_type, seat_block, seat_row, seat_view_photo_paths, center_stage, torokko, kyakukudari, silver_tape_rows, fansa, memo, created_at")
        .in("event_id", venueEventIds)
        .order("created_at", { ascending: false })
        .limit(200);
      if (!cancelled) setVenueAfterReports((data as AfterReportCard[]) ?? []);
    }
    loadVenueAfterReports();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueEventIds.join(",")]);

  const liveEffects = useMemo(
    () => computeLiveEffects(venueAfterReports),
    [venueAfterReports],
  );

  function handleSelectPastEvent(ev: PastTourEvent) {
    setPastMapOverride({ eventId: ev.id, venue: ev.venue });
    setActiveEventTab("current");
  }

  function handleSelectTour(tour: PastTourGroup) {
    setSelectedTourEventIds(tour.events.map(ev => ev.id));
    setPastMapOverride(null);
  }

  function handleSelectVenue(venue: string) {
    setPastMapOverride(null);
    setSelectedVenue(venue);
  }

  const mapEvent = useMemo(() => {
    if (!mapTargetEventId) return null;
    return {
      id: mapTargetEventId,
      reports: analyticsReports.filter(r => r.event_id === mapTargetEventId),
    };
  }, [mapTargetEventId, analyticsReports]);

  const detailHref = mapTargetEventId ? `/events/${mapTargetEventId}` : null;

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
          {/* 現在の公演 / 過去の公演 タブ */}
          <div className="flex border-b border-gray-100 bg-white">
            <button
              type="button"
              onClick={() => setActiveEventTab("current")}
              className={`flex-1 py-3 text-center text-[14px] font-bold transition-colors ${
                activeEventTab === "current"
                  ? "border-b-2 border-[#FF6B9D] text-[#FF6B9D]"
                  : "border-b-2 border-transparent text-gray-400"
              }`}
            >
              現在の公演
            </button>
            <button
              type="button"
              onClick={() => setActiveEventTab("past")}
              className={`flex-1 py-3 text-center text-[14px] font-bold transition-colors ${
                activeEventTab === "past"
                  ? "border-b-2 border-[#FF6B9D] text-[#FF6B9D]"
                  : "border-b-2 border-transparent text-gray-400"
              }`}
            >
              過去の公演
            </button>
          </div>

          {activeEventTab === "current" ? (
            <>
              <div id="trend">
                <TrendSection
                  ticketStats={trendTicketStats}
                  arenaStats={trendArenaStats}
                  upgradeStats={trendUpgradeStats}
                />
                <SeatReportTimelineSection items={seatReportTimeline} eventMap={eventMap} />
              </div>
              <div id="map">
                <MapPreviewSection
                  venues={venueChips}
                  activeVenue={mapActiveVenue}
                  onSelectVenue={handleSelectVenue}
                  topPredictionImageUrl={topPredictionImageUrl}
                  mapEvent={mapEvent}
                  detailHref={detailHref}
                />
              </div>
              <LiveEffectsSection liveEffects={liveEffects} />
              <ReportSection
                reports={venueAfterReports}
                eventMap={eventMap}
                afterHref={afterHref}
              />
            </>
          ) : (
            <PastTourSection
              tours={pastTourGroups}
              onSelectEvent={handleSelectPastEvent}
              onSelectTour={handleSelectTour}
            />
          )}
        </div>
      )}

      <BottomNav active="artist" artistSlug={slug} eventId={mapTargetEventId ?? undefined} />
    </main>
  );
}
