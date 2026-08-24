"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { findArtistBySlug } from "@/lib/artists";
import { getEventsForArtist } from "@/lib/events";
import { queryLatestOfficialNewsForArtist } from "@/lib/officialNews";
import type { CrawledEvent, OfficialNews } from "@/lib/types";
import type { AnalyticsReport, TicketResultAnalytics, AfterReportCard } from "@/lib/artistPageTypes";
import { computeTicketResultStats, computeArenaDetailStats, computeUpgradeDetailStats, computeLiveEffects } from "@/lib/artistPageStats";
import { parseEventTitle } from "@/lib/eventTitle";
import {
  daysUntilJstDate,
  getJstDateString,
  getPastEvents,
  getUpcomingEvents,
  selectNextEvent,
  selectPredictionEventId,
} from "@/lib/artistPageData";

import HeroSection from "@/components/artist-page/HeroSection";
import PastTourSection, { type PastTourGroup, type PastTourEvent } from "@/components/artist-page/PastTourSection";
import TrendSection from "@/components/artist-page/TrendSection";
import SeatReportTimelineSection from "@/components/artist-page/SeatReportTimelineSection";
import { type VenueGroup } from "@/components/artist-page/EventSection";
import ReportSection from "@/components/artist-page/ReportSection";
import SeatPredictionPreviewSection from "@/components/artist-page/SeatPredictionPreviewSection";
import LiveEffectsSection from "@/components/artist-page/LiveEffectsSection";
import OfficialNewsSection from "@/components/artist-page/OfficialNewsSection";
import UpcomingEventsSection from "@/components/artist-page/UpcomingEventsSection";
import { BottomNav } from "@/components/common/BottomNav";
import type { TopPrediction } from "@/components/artist-page/SeatPredictionPreviewSection";
import SeoEditorialSection from "@/components/seo/SeoEditorialSection";
import ArtistActionHub from "@/components/artist-page/ArtistActionHub";
import ArtistBoardPreview from "@/components/artist-page/ArtistBoardPreview";
import { fetchVisiblePostAuthors, type PostAuthor } from "@/lib/postAuthors";
import { getArtistSeoProfile } from "@/lib/seoProfiles";

/**
 * 公演データ以外は端末側で取得するため、初回だけ下部に軽い骨組みを出す。
 * ページ全体をスピナーで止めず、ヒーロー・主要導線・公演一覧は先に触れる状態にする。
 */
function ArtistDetailsPlaceholder() {
  return (
    <div className="space-y-6 py-8" aria-busy="true" aria-label="当落・座席データを読み込み中">
      <div className="animate-pulse border-y border-[#ded8dc] bg-white px-4 py-5">
        <div className="h-3 w-24 bg-[#f2e9ed]" />
        <div className="mt-3 h-7 w-44 bg-[#f2e9ed]" />
        <div className="mt-5 grid grid-cols-3 gap-3">
          {[0, 1, 2].map((item) => <div key={item} className="h-16 bg-[#f8f3f5]" />)}
        </div>
      </div>
      <div className="animate-pulse border-y border-[#ded8dc] bg-white px-4 py-5">
        <div className="h-3 w-20 bg-[#f2e9ed]" />
        <div className="mt-3 h-6 w-36 bg-[#f2e9ed]" />
        <div className="mt-5 h-24 bg-[#f8f3f5]" />
      </div>
    </div>
  );
}

export function ArtistClient({
  params,
  initialEvents,
}: {
  params: Promise<{ slug: string }>;
  initialEvents: CrawledEvent[];
}) {
  const { slug } = use(params);
  const artist = findArtistBySlug(slug);
  const seoProfile = getArtistSeoProfile(slug);

  const [events, setEvents] = useState<CrawledEvent[]>(initialEvents);
  const [analyticsReports, setAnalyticsReports] = useState<AnalyticsReport[]>([]);
  const [ticketResultReports, setTicketResultReports] = useState<TicketResultAnalytics[]>([]);
  const [seatCounts, setSeatCounts] = useState<Map<string, number>>(new Map());
  const [venueAfterReports, setVenueAfterReports] = useState<AfterReportCard[]>([]);
  const [officialNews, setOfficialNews] = useState<OfficialNews[]>([]);
  const [topPrediction, setTopPrediction] = useState<TopPrediction | null>(null);
  const [postAuthorMap, setPostAuthorMap] = useState<Map<string, PostAuthor>>(new Map());
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedVenue, setSelectedVenue] = useState<string | null>(null);
  const [activeEventTab, setActiveEventTab] = useState<"current" | "past">("current");
  const [pastMapOverride, setPastMapOverride] = useState<{ eventId: string; venue: string } | null>(null);
  const [selectedTourEventIds, setSelectedTourEventIds] = useState<string[] | null>(null);

  const loadData = useCallback(async (a: NonNullable<ReturnType<typeof findArtistBySlug>>) => {
    setFetchError(null);
    setTopPrediction(null);
    setPostAuthorMap(new Map());
    setOfficialNews([]);

    try {
      const allEvs = initialEvents.length > 0
        ? initialEvents
        : await getEventsForArtist(a.slug);
      setEvents(allEvs);

      queryLatestOfficialNewsForArtist(a.slug, 3).then((result) => setOfficialNews(result.data));

      if (allEvs.length === 0) return;

      const ids = allEvs.map(e => e.id);

      const [seatRes, ticketResultRes] = await Promise.all([
        supabase.from("seat_reports")
          .select("id, event_id, block, row_num, seat_num, lottery_type, fc_history, payment_method, lottery_round, lottery_name, comment, created_at")
          .in("event_id", ids)
          .order("created_at", { ascending: false })
          .limit(500),
        supabase.from("event_ticket_results")
          .select("id, event_id, user_id, result, lost_application_count, ticket_count, lottery_type, fc_history, payment_method, seat_type, upgrade_result, comment, seat_block, seat_row, seat_number, stand_direction, stand_floor, other_seat_info, created_at")
          .in("event_id", ids)
          .order("created_at", { ascending: false })
          .limit(1000),
      ]);

      const seatData = (seatRes.data as AnalyticsReport[]) ?? [];
      const ticketResultData = (ticketResultRes.data as TicketResultAnalytics[]) ?? [];
      const ticketAuthors = await fetchVisiblePostAuthors(ticketResultData.map((report) => report.user_id));
      setPostAuthorMap((current) => new Map([...current, ...ticketAuthors]));

      const sCounts = new Map<string, number>();
      for (const r of seatData) sCounts.set(r.event_id, (sCounts.get(r.event_id) ?? 0) + 1);

      setAnalyticsReports(seatData);
      setTicketResultReports(ticketResultData);
      setSeatCounts(sCounts);
    } catch {
      setFetchError("データを読み込めませんでした。時間をおいてもう一度お試しください。");
    } finally {
      setLoading(false);
    }
  }, [initialEvents]);

  useEffect(() => {
    if (!artist) return;
    setLoading(true);
    setSelectedVenue(null);
    setPastMapOverride(null);
    setSelectedTourEventIds(null);
    loadData(artist);
  }, [artist, loadData]);

  const today = getJstDateString();

  const upcomingEvents = useMemo(
    () => getUpcomingEvents(events, today),
    [events, today],
  );

  const nearestUpcomingEvent = useMemo(
    () => selectNextEvent(events, today),
    [events, today],
  );

  // 過去の公演を年単位でグループ化する（ツアー名には依存しない）。
  // 各行のツアー名補助表示・テストデータ判定はPastTourSection側でparseEventTitle()を使って行う
  const pastTourGroups = useMemo((): PastTourGroup[] => {
    const map = new Map<string, { id: string; date: string | null; venue: string; title: string }[]>();
    for (const ev of getPastEvents(events, today)) {
      const year = (ev.date ?? "").slice(0, 4) || "不明";
      if (!map.has(year)) map.set(year, []);
      map.get(year)!.push({ id: ev.id, date: ev.date, venue: ev.venue, title: ev.title });
    }

    const groups = [...map.entries()].map(([year, evs]) => ({
      key: year,
      title: `${year}年`,
      // 一覧は新しい日付順
      events: [...evs].sort(
        (a, b) => (b.date ?? "").localeCompare(a.date ?? "") || a.id.localeCompare(b.id),
      ),
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
    return daysUntilJstDate(nearestUpcomingEvent?.date, today);
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
        .select("id, event_id, user_id, seat_area_type, seat_block, seat_row, seat_number, seat_view_photo_paths, main_stage, center_stage, fansa_rating, torokko, kyakukudari, silver_tape_rows, fansa, memo, created_at")
        .in("event_id", venueEventIds)
        .order("created_at", { ascending: false })
        .limit(200);
      const reports = (data as AfterReportCard[]) ?? [];
      const authors = await fetchVisiblePostAuthors(reports.map((report) => report.user_id));
      if (!cancelled) {
        setVenueAfterReports(reports);
        setPostAuthorMap((current) => new Map([...current, ...authors]));
      }
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

  const predictionTargetEventId = useMemo(
    () => selectPredictionEventId(events, today, mapTargetEventId),
    [events, today, mapTargetEventId],
  );

  useEffect(() => {
    setTopPrediction(null);
    if (!predictionTargetEventId) return;
    let cancelled = false;

    async function loadTopPrediction() {
      const { data: predData } = await supabase
        .from("fan_seat_predictions")
        .select("id, user_id, image_path, comment, prediction_tags, created_at")
        .eq("event_id", predictionTargetEventId)
        .eq("approved", true);

      type PredRow = { id: string; user_id: string | null; image_path: string; comment: string | null; prediction_tags: string[]; created_at: string };
      const predictions = (predData ?? []) as PredRow[];
      if (predictions.length === 0 || cancelled) return;

      const { data: voteData } = await supabase
        .from("fan_seat_prediction_votes")
        .select("prediction_id")
        .in("prediction_id", predictions.map((prediction) => prediction.id));
      if (cancelled) return;

      const counts = new Map<string, number>();
      for (const vote of (voteData ?? []) as { prediction_id: string }[]) {
        counts.set(vote.prediction_id, (counts.get(vote.prediction_id) ?? 0) + 1);
      }
      const top = predictions
        .map((prediction) => ({ prediction, votes: counts.get(prediction.id) ?? 0 }))
        .sort((a, b) => b.votes - a.votes || a.prediction.id.localeCompare(b.prediction.id))[0];
      if (!top || top.votes < 3) return;

      const { data: urlData } = supabase.storage
        .from("fan-seat-predictions")
        .getPublicUrl(top.prediction.image_path);
      const author = top.prediction.user_id
        ? (await fetchVisiblePostAuthors([top.prediction.user_id])).get(top.prediction.user_id) ?? null
        : null;
      if (cancelled) return;
      setTopPrediction({
        id: top.prediction.id,
        imageUrl: urlData.publicUrl,
        comment: top.prediction.comment,
        tags: top.prediction.prediction_tags ?? [],
        createdAt: top.prediction.created_at,
        voteCount: top.votes,
        author,
      });
    }

    loadTopPrediction();
    return () => { cancelled = true; };
  }, [predictionTargetEventId]);

  const detailHref = mapTargetEventId ? `/events/${mapTargetEventId}` : null;
  const reportSelectorHref = `/report?artist=${encodeURIComponent(slug)}`;
  const ticketReportHref = mapTargetEventId
    ? `/report/ticket?event=${encodeURIComponent(mapTargetEventId)}`
    : "/report/ticket";
  const liveReportHref = mapTargetEventId
    ? `/report/live?event=${encodeURIComponent(mapTargetEventId)}`
    : "/report/live";

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
    <main className="min-h-screen bg-background font-sans text-foreground">
      <HeroSection
        key={artist.slug}
        artistName={artist.name}
        slug={slug}
        heroImage={artist.heroImage}
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
        <div className="zr-container mt-4 border-l-2 border-red-500 bg-red-50 px-4 py-3 text-sm text-red-600">
          {fetchError}
        </div>
      )}

      <div className="pb-20">
          <div className="zr-container">
            <ArtistActionHub artistName={artist.name} slug={slug} />

            <section className="py-2" aria-label="公演の表示切り替え">
              <div className="flex items-center gap-2 rounded-full bg-white p-1.5 shadow-sm">
                <button
                  type="button"
                  onClick={() => setActiveEventTab("current")}
                  aria-pressed={activeEventTab === "current"}
                  className={`zr-focus min-h-11 flex-1 rounded-full px-3 text-[12px] font-black transition-colors ${activeEventTab === "current" ? "bg-[#ef4f87] text-white shadow-sm" : "text-[#846d79] hover:bg-[#fff1f6]"}`}
                >
                  これからの公演
                </button>
                <button
                  type="button"
                  onClick={() => setActiveEventTab("past")}
                  aria-pressed={activeEventTab === "past"}
                  className={`zr-focus min-h-11 flex-1 rounded-full px-3 text-[12px] font-black transition-colors ${activeEventTab === "past" ? "bg-[#ef4f87] text-white shadow-sm" : "text-[#846d79] hover:bg-[#fff1f6]"}`}
                >
                  過去の公演
                </button>
              </div>
            </section>
          </div>

          {activeEventTab === "current" ? (
            <div className="zr-container">
              <UpcomingEventsSection artistName={artist.name} events={upcomingEvents} />

              {loading ? <ArtistDetailsPlaceholder /> : <>
              {/* ===== 座席データ区画: 全公演の傾向カード + 座席報告タイムライン ===== */}
              <div id="ticket-data">
                <section className="artist-section">
                  <p className="artist-kicker">Ticket & Seat Data</p>
                  <h2 className="artist-heading">当落・座席データ</h2>
                  {ticketResultReports.length > 0 ? (
                  <div className="mt-6 grid gap-4 lg:grid-cols-[1.25fr_.75fr]">
                    <TrendSection
                      ticketStats={trendTicketStats}
                      arenaStats={trendArenaStats}
                      upgradeStats={trendUpgradeStats}
                    />
                    <div className="min-w-0 border-t border-[#ded8dc] pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                      <SeatReportTimelineSection
                        items={seatReportTimeline}
                        eventMap={eventMap}
                        reportHref={ticketReportHref}
                        authorMap={postAuthorMap}
                      />
                    </div>
                  </div>
                  ) : (
                    <div className="mt-5 flex min-h-[72px] items-center justify-between gap-4 border-y border-[#ded8dc] bg-white px-3 py-3 sm:px-4">
                      <div className="min-w-0">
                        <p className="text-[13px] font-black text-[#4b4148]">当落・座席レポはまだありません</p>
                        <p className="mt-1 text-[10px] font-bold text-[#817981]">最初のレポから当選率が集計されます</p>
                      </div>
                      <Link href={ticketReportHref} className="zr-focus shrink-0 text-[11px] font-black text-[#e84a80]">報告する →</Link>
                    </div>
                  )}
                </section>
              </div>

              {/* ===== マップ・座席予想区画: 会場選択 + みんなの座席報告マップ + 予想図 + 詳細導線 ===== */}
              <div>
                <SeatPredictionPreviewSection
                  venues={venueChips}
                  activeVenue={mapActiveVenue}
                  onSelectVenue={handleSelectVenue}
                  topPrediction={topPrediction}
                  mapEvent={mapEvent}
                  detailHref={detailHref}
                  emptyPostHref={reportSelectorHref}
                />
              </div>

              {/* ===== 現地レポ区画: 見出し + この公演で見られた演出 + 投稿一覧 ===== */}
              <ReportSection
                reports={venueAfterReports}
                eventMap={eventMap}
                afterHref={afterHref}
                reportHref={liveReportHref}
                authorMap={postAuthorMap}
              >
                <LiveEffectsSection liveEffects={liveEffects} />
              </ReportSection>

              <ArtistBoardPreview artistSlug={slug} artistName={artist.name} />
              </>}
            </div>
          ) : (
            <div className="zr-container py-8"><PastTourSection
              tours={pastTourGroups}
              onSelectEvent={handleSelectPastEvent}
              onSelectTour={handleSelectTour}
              artistName={artist?.name}
            /></div>
          )}

          {!loading && <div className="zr-container"><OfficialNewsSection news={officialNews} moreHref={`/artists/${slug}/news`} /></div>}
          {!loading && seoProfile && artist && (
            <SeoEditorialSection
              title={`${artist.name}とは`}
              profile={seoProfile}
              className="zr-container mt-10"
            />
          )}
      </div>

      <BottomNav active="artist" artistSlug={slug} eventId={mapTargetEventId ?? undefined} />
    </main>
  );
}
