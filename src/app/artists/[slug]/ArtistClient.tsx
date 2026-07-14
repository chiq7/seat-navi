"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { findArtistBySlug } from "@/lib/artists";
import { getEventsForArtist } from "@/lib/events";
import type { CrawledEvent } from "@/lib/types";
import type { AnalyticsReport, TicketResultAnalytics, AfterReportCard } from "@/lib/artistPageTypes";
import { computeTicketResultStats, computeArenaDetailStats, computeUpgradeDetailStats, computeLiveEffects } from "@/lib/artistPageStats";
import { parseEventTitle } from "@/lib/eventTitle";

import HeroSection from "@/components/artist-page/HeroSection";
import PastTourSection, { type PastTourGroup, type PastTourEvent } from "@/components/artist-page/PastTourSection";
import TrendSection from "@/components/artist-page/TrendSection";
import SeatReportTimelineSection from "@/components/artist-page/SeatReportTimelineSection";
import { type VenueGroup } from "@/components/artist-page/EventSection";
import ReportSection from "@/components/artist-page/ReportSection";
import SeatPredictionPreviewSection from "@/components/artist-page/SeatPredictionPreviewSection";
import LiveEffectsSection from "@/components/artist-page/LiveEffectsSection";
import { BottomNav } from "@/components/common/BottomNav";
import type { TopPrediction } from "@/components/artist-page/SeatPredictionPreviewSection";

export function ArtistClient({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const artist = findArtistBySlug(slug);

  const [events, setEvents] = useState<CrawledEvent[]>([]);
  const [analyticsReports, setAnalyticsReports] = useState<AnalyticsReport[]>([]);
  const [ticketResultReports, setTicketResultReports] = useState<TicketResultAnalytics[]>([]);
  const [seatCounts, setSeatCounts] = useState<Map<string, number>>(new Map());
  const [venueAfterReports, setVenueAfterReports] = useState<AfterReportCard[]>([]);
  const [topPrediction, setTopPrediction] = useState<TopPrediction | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedVenue, setSelectedVenue] = useState<string | null>(null);
  const [activeEventTab, setActiveEventTab] = useState<"current" | "past">("current");
  const [pastMapOverride, setPastMapOverride] = useState<{ eventId: string; venue: string } | null>(null);
  const [selectedTourEventIds, setSelectedTourEventIds] = useState<string[] | null>(null);

  async function loadData(a: NonNullable<ReturnType<typeof findArtistBySlug>>) {
    setFetchError(null);
    setTopPrediction(null);

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
        .select("id, image_path, comment, prediction_tags, created_at")
        .eq("event_id", recentEventId)
        .eq("approved", true);

      type PredRow = { id: string; image_path: string; comment: string | null; prediction_tags: string[]; created_at: string };

      if (predData && predData.length > 0) {
        const predIds = predData.map((p: PredRow) => p.id);
        const { data: voteData } = await supabase
          .from("fan_seat_prediction_votes")
          .select("prediction_id")
          .in("prediction_id", predIds);

        const MIN_VOTES_TO_SHOW = 3;
        const counts = new Map<string, number>();
        for (const v of (voteData ?? []) as { prediction_id: string }[]) {
          counts.set(v.prediction_id, (counts.get(v.prediction_id) ?? 0) + 1);
        }
        const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];

        if (top && top[1] >= MIN_VOTES_TO_SHOW) {
          const topPred = predData.find((p: PredRow) => p.id === top[0]);
          if (topPred) {
            const { data: urlData } = supabase.storage
              .from("fan-seat-predictions")
              .getPublicUrl(topPred.image_path);
            setTopPrediction({
              id: topPred.id,
              imageUrl: urlData.publicUrl,
              comment: topPred.comment,
              tags: topPred.prediction_tags ?? [],
              createdAt: topPred.created_at,
              voteCount: top[1],
            });
          }
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

  // 過去の公演を年単位でグループ化する（ツアー名には依存しない）。
  // 各行のツアー名補助表示・テストデータ判定はPastTourSection側でparseEventTitle()を使って行う
  const pastTourGroups = useMemo((): PastTourGroup[] => {
    const map = new Map<string, { id: string; date: string | null; venue: string; title: string }[]>();
    for (const ev of events) {
      if (ev.date && ev.date >= today) continue;
      const year = (ev.date ?? "").slice(0, 4) || "不明";
      if (!map.has(year)) map.set(year, []);
      map.get(year)!.push({ id: ev.id, date: ev.date, venue: ev.venue, title: ev.title });
    }

    const groups = [...map.entries()].map(([year, evs]) => ({
      key: year,
      title: `${year}年`,
      // 一覧は新しい日付順
      events: [...evs].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "")),
    }));

    // 新しい年が先頭
    groups.sort((a, b) => b.key.localeCompare(a.key));

    return groups;
  }, [events, today]);

  // ヒーローには「次の1公演」の情報だけを使う（複数公演タイトルの最長共通接頭辞は使わない）
  const nextEventTitle = useMemo(
    () =>
      nearestUpcomingEvent
        ? parseEventTitle(nearestUpcomingEvent.title, artist?.name)
        : null,
    [nearestUpcomingEvent, artist?.name],
  );
  // ヒーローの日付表示は nearestUpcomingEvent 単独の日付のみ（複数公演からの期間算出はしない）
  const nextEventDateLabel = useMemo(() => {
    if (!nearestUpcomingEvent?.date) return null;
    return nearestUpcomingEvent.date.replace(/-/g, ".").slice(2);
  }, [nearestUpcomingEvent]);

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
        .select("id, event_id, seat_area_type, seat_block, seat_row, seat_number, seat_view_photo_paths, main_stage, center_stage, fansa_rating, torokko, kyakukudari, silver_tape_rows, fansa, memo, created_at")
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
    <main className="min-h-screen bg-white font-sans text-gray-900">
      <HeroSection
        artistName={artist.name}
        slug={slug}
        tourTitle={nearestUpcomingEvent === null ? "公演発表待機中" : (nextEventTitle?.tourName ?? artist.name)}
        isTestData={nextEventTitle?.isTestData ?? false}
        dateRange={nextEventDateLabel}
        ticketRate={ticketResultStats.rate}
        normalArenaRate={ticketResultStats.normalArenaRate}
        upgradeRate={ticketResultStats.upgradeRate}
        nextEvent={
          nearestUpcomingEvent
            ? { date: nearestUpcomingEvent.date!, venue: nearestUpcomingEvent.venue }
            : null
        }
        countdownDays={countdownDays}
      />

      {fetchError && (
        <div className="mx-3 mt-3 rounded-xl bg-red-50 px-3 py-3 text-sm text-red-600">
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
              {/* ===== 座席データ区画: 全公演の傾向カード + 座席報告タイムライン ===== */}
              <div id="trend">
                <section className="mt-3 px-3">
                  <div className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
                    <TrendSection
                      ticketStats={trendTicketStats}
                      arenaStats={trendArenaStats}
                      upgradeStats={trendUpgradeStats}
                    />
                    {seatReportTimeline.length > 0 && (
                      <div className="mt-3 overflow-hidden rounded-xl border border-gray-100 bg-white p-3">
                        <SeatReportTimelineSection items={seatReportTimeline} eventMap={eventMap} />
                      </div>
                    )}
                  </div>
                </section>
              </div>

              {/* ===== マップ・座席予想区画: 会場選択 + みんなの座席報告マップ + 予想図 + 詳細導線 ===== */}
              <div id="map">
                <SeatPredictionPreviewSection
                  venues={venueChips}
                  activeVenue={mapActiveVenue}
                  onSelectVenue={handleSelectVenue}
                  topPrediction={topPrediction}
                  mapEvent={mapEvent}
                  detailHref={detailHref}
                />
              </div>

              {/* ===== 現地レポ区画: 見出し + この公演で見られた演出 + 投稿一覧 ===== */}
              <ReportSection
                reports={venueAfterReports}
                eventMap={eventMap}
                afterHref={afterHref}
              >
                <LiveEffectsSection liveEffects={liveEffects} />
              </ReportSection>
            </>
          ) : (
            <PastTourSection
              tours={pastTourGroups}
              onSelectEvent={handleSelectPastEvent}
              onSelectTour={handleSelectTour}
              artistName={artist?.name}
            />
          )}
        </div>
      )}

      <BottomNav active="artist" artistSlug={slug} eventId={mapTargetEventId ?? undefined} />
    </main>
  );
}
