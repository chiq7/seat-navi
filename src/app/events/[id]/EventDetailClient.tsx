"use client";

import { use, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Sparkles,
  Camera,
  Clock,
  ChevronRight,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { getEventDisplayVenueName } from "@/lib/publicVenueGuides";
import { resolveArtist } from "@/lib/artists";
import type { CrawledEvent, FanSeatPrediction, SeatReport } from "@/lib/types";
import type { ExternalSeatObservation } from "@/lib/external-seats/types";
import { isCurrentXSeatPost, isXSeatPostUrl } from "@/lib/external-seats/xSeatPosts";
import type { ColorMode } from "@/lib/arena-map/arenaMapTypes";
import { EventArenaMap } from "@/components/arena-map/EventArenaMap";
import { SeatMapColorTabs } from "@/components/arena-map/SeatMapColorTabs";
import { BottomNav } from "@/components/common/BottomNav";
import { SeatPredictionCard } from "@/components/common/SeatPredictionCard";
import { CompactEventPickerSection } from "@/components/common/CompactEventPickerSection";
import { CompactEventSummary } from "@/components/common/CompactEventSummary";
import { CompactHeroIntro } from "@/components/common/CompactHeroIntro";
import { ShareButton } from "@/components/common/ShareButton";
import { AccountLink } from "@/components/auth/AccountLink";
import { Header } from "@/components/common/Header";
import PriorityPerformanceGuide from "@/components/seo/PriorityPerformanceGuide";
import PerformanceTicketTiming from "@/components/seo/PerformanceTicketTiming";
import PerformanceSeatLinks from "@/components/seo/PerformanceSeatLinks";
import { matchPriorityPerformance } from "@/data/priorityPerformances";
import { EmptyState } from "@/components/common/EmptyState";
import { fetchVisiblePostAuthors, type PostAuthor } from "@/lib/postAuthors";
import { focusedSeatPosition, isInteractiveSeatMapPilot, parseSeatReportId, SEAT_MAP_PILOT_EVENT_IDS } from "@/lib/arena-map/seatMapNavigation";
import { isEventPredictionEnabled } from "@/lib/arena-map/eventPredictionInput";
import { readArenaReports } from "@/lib/arena-map/readArenaReports";
import { formatPublicDataTime } from "@/lib/publicPageData";
import type { PublicEventCounts } from "@/lib/eventIndexContent";

const SEAT_REPORT_FIELDS = "id, event_id, block, row_num, seat_num, lottery_type, fc_history, payment_method, lottery_round, lottery_name, comment, created_at";

const VOTER_KEY_STORAGE = "seat-navi-voter-key";

function getOrCreateVoterKey(): string {
  const existing = localStorage.getItem(VOTER_KEY_STORAGE);
  if (existing) return existing;
  const created = crypto.randomUUID().replace(/-/g, "").slice(0, 20);
  localStorage.setItem(VOTER_KEY_STORAGE, created);
  return created;
}

function imageSrc(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return supabase.storage.from("fan-seat-predictions").getPublicUrl(path).data.publicUrl;
}

function fmtShortDate(d: string | null): string {
  if (!d) return "日程未定";
  const [y, m, day] = d.split("-").map(Number);
  const w = ["日", "月", "火", "水", "木", "金", "土"][new Date(y, m - 1, day).getDay()];
  return `${m}/${day}(${w})`;
}

export function EventDetailClient({
  params,
  initialEvent,
  initialRelatedEvents,
  samePerformanceEventIds,
  arenaPhotoMap,
  seatSourceGuide,
  liveReportIds = [],
  contributionCounts = null,
  setlistEventId,
  sourceSeatCount = 0,
  sourceMapCount = 0,
  arenaPhotoCount,
  featuredPhotoBlock,
  venuePhotoGuide,
  tourDates,
  venueMiniGuide: initialVenueMiniGuide,
  venueAlternateNames,
  catalogUpdatedAt,
  catalogStale,
  dayGuideHref = null,
}: {
  params: Promise<{ id: string }>;
  initialEvent: CrawledEvent;
  initialRelatedEvents: CrawledEvent[];
  samePerformanceEventIds: string[];
  arenaPhotoMap?: ReactNode;
  seatSourceGuide?: ReactNode;
  liveReportIds?: string[];
  contributionCounts?: PublicEventCounts | null;
  setlistEventId?: string;
  sourceSeatCount?: number;
  sourceMapCount?: number;
  arenaPhotoCount?: number;
  featuredPhotoBlock?: string;
  venuePhotoGuide?: ReactNode;
  tourDates?: ReactNode;
  venueMiniGuide: {
    venueName: string;
    capacityLabel: string;
    areaLabel: string;
    archiveHref: string | null;
  } | null;
  venueAlternateNames?: ReactNode;
  catalogUpdatedAt?: string;
  catalogStale?: boolean;
  dayGuideHref?: string | null;
}) {
  const { id: eventId } = use(params);
  const interactiveSeatMap = isInteractiveSeatMapPilot(eventId);
  const router = useRouter();
  const searchParams = useSearchParams();
  const justAfterReported = searchParams.get("after_reported") === "1";
  const openPredictionId = searchParams.get("prediction");
  const focusSeatReportId = interactiveSeatMap ? parseSeatReportId(searchParams.get("seat_report")) : null;

  function setPredictionParam(id: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (id) params.set("prediction", id);
    else params.delete("prediction");
    const qs = params.toString();
    router.replace(`/events/${eventId}${qs ? `?${qs}` : ""}`, { scroll: false });
  }

  const event = initialEvent;
  const venueName = getEventDisplayVenueName(event.venue_id, event.venue);
  const currentPerformanceIds = useMemo(() => [...new Set([eventId, ...samePerformanceEventIds])], [eventId, samePerformanceEventIds]);
  const [seatReports, setSeatReports] = useState<SeatReport[]>([]);
  const [externalSeatObservations, setExternalSeatObservations] = useState<ExternalSeatObservation[]>([]);
  const [seatReadState, setSeatReadState] = useState<"loading" | "ready" | "error">("loading");
  const [externalReadFailed, setExternalReadFailed] = useState(false);
  const [predictionLimited, setPredictionLimited] = useState(false);
  const [fanSeatPredictions, setFanSeatPredictions] = useState<FanSeatPrediction[]>([]);
  const [predictionsReady, setPredictionsReady] = useState(false);
  const [predictionAuthorMap, setPredictionAuthorMap] = useState<Map<string, PostAuthor>>(new Map());
  const relatedEvents = initialRelatedEvents;
  const [colorMode, setColorMode] = useState<ColorMode>("lottery");
  const [sortOrder, setSortOrder] = useState<"hot" | "new">("hot");
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({});
  const [pickedIds, setPickedIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState(justAfterReported ? "投稿ありがとうございます！" : "");

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setPredictionsReady(false);
      setFanSeatPredictions([]);
      const fanPredictionsRes = await supabase
          .from("fan_seat_predictions")
          .select("id, event_id, user_id, image_path, comment, prediction_tags, display_name, approved, created_at")
          .in("event_id", currentPerformanceIds)
          .eq("approved", true)
          .order("created_at", { ascending: false })
          .limit(20).abortSignal(controller.signal);
      if (controller.signal.aborted) return;
      if (fanPredictionsRes.data) {
        const predictions = fanPredictionsRes.data as FanSeatPrediction[];
        setFanSeatPredictions(predictions);
        const authors = await fetchVisiblePostAuthors(predictions.map(prediction => prediction.user_id));
        if (controller.signal.aborted) return;
        setPredictionAuthorMap(authors);
      }
      setPredictionsReady(!fanPredictionsRes.error);
    }
    void load();
    return () => controller.abort();
  }, [currentPerformanceIds]);

  useEffect(() => {
    if (fanSeatPredictions.length === 0) return;
    const key = getOrCreateVoterKey();
    const ids = fanSeatPredictions.map((p) => p.id);
    supabase
      .from("fan_seat_prediction_votes")
      .select("prediction_id, voter_key")
      .in("prediction_id", ids)
      .then(({ data }) => {
        if (!data) return;
        const counts: Record<string, number> = {};
        const picked = new Set<string>();
        for (const row of data as { prediction_id: string; voter_key: string }[]) {
          counts[row.prediction_id] = (counts[row.prediction_id] ?? 0) + 1;
          if (row.voter_key === key) picked.add(row.prediction_id);
        }
        setVoteCounts(counts);
        setPickedIds(picked);
      });
  }, [fanSeatPredictions]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const artist = resolveArtist(event);
  const backHref = artist ? `/artists/${artist.slug}` : "/";


  const allRelatedEvents = useMemo(
    () => [event, ...relatedEvents.filter(item => !currentPerformanceIds.includes(item.id))],
    [relatedEvents, event, currentPerformanceIds],
  );

  const groupEventIds = useMemo(() => {
    if (interactiveSeatMap) return SEAT_MAP_PILOT_EVENT_IDS;
    return currentPerformanceIds;
  }, [currentPerformanceIds, interactiveSeatMap]);

  useEffect(() => {
    if (groupEventIds.length === 0) return;
    let cancelled = false;
    const controller = new AbortController();
    const deadline = catalogUpdatedAt ? setTimeout(() => {
      controller.abort();
      setSeatReadState("error");
    }, 5000) : undefined;
    async function loadGroupReports() {
      setSeatReadState("loading");
      setSeatReports([]);
      setExternalSeatObservations([]);
      try {
      const paged = isEventPredictionEnabled(eventId) ? await readArenaReports(supabase, groupEventIds) : null;
      const [seatResult, externalResult] = paged ? [paged.seats, paged.external] : await Promise.all([
        supabase
          .from("seat_reports")
          .select(SEAT_REPORT_FIELDS)
          .in("event_id", groupEventIds)
          .order("created_at", { ascending: false })
          .limit(500).abortSignal(controller.signal),
        supabase
          .from("external_seat_observations")
          .select("id, event_id, source_type, source_url, observed_at, seat_area, block, row_min, row_max, seat_min, seat_max, gate, level, confidence, evidence_summary, review_status")
          .in("event_id", groupEventIds)
          .eq("review_status", "approved")
          // スタンドはXの公開投稿だけが公開対象（RLSで制限）。座席図の描画はアリーナのみ。
          .in("seat_area", ["arena", "stand"])
          .order("observed_at", { ascending: false })
          .limit(500).abortSignal(controller.signal),
      ]);
      if (cancelled || controller.signal.aborted) return;
      setPredictionLimited(paged?.limited ?? false);
      if (seatResult.error) { setSeatReadState("error"); return; }
      const reports = (seatResult.data ?? []) as SeatReport[];
      // 最新500件の外でも、保存済みの対象報告だけは本人の参加日に限定して取得。
      if (focusSeatReportId && !reports.some(report => report.id === focusSeatReportId && report.event_id === eventId)) {
        const focused = await supabase.from("seat_reports").select(SEAT_REPORT_FIELDS).eq("id", focusSeatReportId).eq("event_id", eventId).abortSignal(controller.signal).maybeSingle();
        if (cancelled || controller.signal.aborted) return;
        if (focused.data && !focused.error) reports.push(focused.data as SeatReport);
      }
      setSeatReports(reports.filter(report => groupEventIds.includes(report.event_id)));
      setSeatReadState("ready");
      setExternalReadFailed(Boolean(externalResult.error));
      // 移行適用前や一時障害時も既存の座席マップはそのまま表示する。
      setExternalSeatObservations(((externalResult.data as ExternalSeatObservation[] | null) ?? []).filter(item => groupEventIds.includes(item.event_id)));
      } catch {
        if (!cancelled) setSeatReadState("error");
      } finally {
        clearTimeout(deadline);
      }
    }
    loadGroupReports();
    return () => {
      cancelled = true;
      clearTimeout(deadline);
      controller.abort();
    };
  }, [groupEventIds, eventId, focusSeatReportId, catalogUpdatedAt]);

  // 位置数の集計には重複を除く。限定適用中の詳細マップには全日程の元報告を渡す。
  const seatReportsByPosition = useMemo(() => {
    const map = new Map<string, SeatReport[]>();
    for (const r of seatReports) {
      const key = `${r.block}:${r.row_num}:${r.seat_num}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return map;
  }, [seatReports]);

  // 通常図は同一公演回の保存IDだけ。限定合算図では選択日を優先する。
  const dedupedSeatReports = useMemo(() => {
    const result: SeatReport[] = [];
    for (const reps of seatReportsByPosition.values()) {
      result.push(reps.find((r) => r.event_id === eventId) ?? reps[0]);
    }
    return result;
  }, [seatReportsByPosition, eventId]);
  const initialSeat = focusedSeatPosition(seatReports, eventId, focusSeatReportId);
  const mapDetailEvents = allRelatedEvents.filter(ev => groupEventIds.includes(ev.id) && ev.date).map(ev => ({ id: ev.id, date: ev.date! }));

  const sortedPredictions = useMemo(
    () =>
      [...fanSeatPredictions].sort((a, b) => {
        if (sortOrder === "hot") {
          const diff = (voteCounts[b.id] ?? 0) - (voteCounts[a.id] ?? 0);
          if (diff !== 0) return diff;
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }),
    [fanSeatPredictions, voteCounts, sortOrder],
  );

  const topPredictionId = useMemo(() => {
    let topId: string | null = null;
    let topCount = 0;
    for (const p of fanSeatPredictions) {
      const c = voteCounts[p.id] ?? 0;
      if (c > topCount) {
        topCount = c;
        topId = p.id;
      }
    }
    return topId;
  }, [fanSeatPredictions, voteCounts]);

  const topPrediction = useMemo(
    () => (topPredictionId ? fanSeatPredictions.find((p) => p.id === topPredictionId) ?? null : null),
    [fanSeatPredictions, topPredictionId],
  );

  const otherPredictions = useMemo(
    () => sortedPredictions.filter((p) => p.id !== topPredictionId),
    [sortedPredictions, topPredictionId],
  );

  const officialSeatMap = event ? matchPriorityPerformance(event)?.seatMapSource : undefined;
  const catalogReadFailed = Boolean(catalogUpdatedAt) && seatReadState === "error";
  const reportsReady = !catalogUpdatedAt || (seatReadState === "ready" && !externalReadFailed && predictionsReady);
  const externalForEvent = externalSeatObservations.filter(item =>
    !isXSeatPostUrl(item.source_url) || (currentPerformanceIds.includes(item.event_id) && isCurrentXSeatPost(item.observed_at)));
  const hasReports = (seatReadState === "ready" && (seatReports.length > 0 || externalForEvent.length > 0))
    || (predictionsReady && fanSeatPredictions.length > 0);
  const summary = [
    ["座席レポ", sourceSeatCount + Math.max(contributionCounts?.seat_reports ?? 0, seatReports.length)],
    ["アリーナ図の投稿", sourceMapCount],
    ["アリーナ配置図", arenaPhotoMap ? 1 : 0],
    ["当落報告", contributionCounts?.event_ticket_results ?? 0],
    ["セトリ", contributionCounts?.setlists ?? 0],
    ["現地レポ", contributionCounts?.after_reports ?? liveReportIds.length],
    ["配置予想", Math.max(contributionCounts?.fan_seat_predictions ?? 0, fanSeatPredictions.length)],
    ["外部の座席情報", Math.max(contributionCounts?.external_seat_observations ?? 0, externalForEvent.length)],
    ["当日案内", dayGuideHref ? 1 : 0],
  ] as const;
  const published = summary.filter(([, count]) => count > 0);
  const confirmedEmpty = contributionCounts !== null && published.length === 0;
  // Catalog-backed pages can render the venue link while live report counts are pending.
  const venueMiniGuide = !catalogUpdatedAt || !hasReports ? initialVenueMiniGuide : null;

  return (
    <div className="community-page">
      <main className="pb-[calc(104px+env(safe-area-inset-bottom))]">
        {event ? (
          <>
          <section className="community-hero">
              <Header
                title="座席表"
                breadcrumbLabel={event.title} breadcrumbParents={artist ? [{ href: backHref, label: artist.name }] : []} existingBreadcrumbSchema
                backHref={backHref}
                backLabel="アーティストページへ戻る"
                rightSlot={
                  <div className="flex items-center">
                    <AccountLink iconSize={22} />
                    <ShareButton
                      url={`${typeof window !== "undefined" ? window.location.origin : ""}/events/${eventId}`}
                      text={`${venueName} ${fmtShortDate(event.date)} の座席表・配置予想 #ちけレポ`}
                      className="zr-focus flex h-11 w-11 items-center justify-center rounded-full text-[#665761] transition-colors active:bg-[#fff0f5]"
                    />
                  </div>
                }
              />

              <CompactHeroIntro
                eyebrow="座席ガイド"
                title={officialSeatMap || published.length || !confirmedEmpty ? "公演の" : venueMiniGuide ? "座席情報を" : "座席表と"}
                accent={officialSeatMap ? "座席表" : published.length || !confirmedEmpty ? "座席・ライブ情報" : venueMiniGuide ? "募集中" : "アリーナ予想"}
                subtitle={event.title}
                icon={<Sparkles size={21} strokeWidth={1.8} className="text-[#6176d7]" />}
              >
                <CompactEventSummary date={event.date} venue={venueName} className="mt-3" />
                {venueAlternateNames}
                {published.length > 0 && <p data-event-content-summary className="mt-2 text-sm font-bold">
                  この公演の{published.map(([label, count]) => `${label}${count}件`).join("・")}
                </p>}
                {artist && setlistEventId && <Link className="zr-focus mr-2 inline-flex min-h-11 items-center text-sm font-bold underline"
                  href={`/artists/${artist.slug}/setlist?event=${encodeURIComponent(setlistEventId)}`}>この公演のセトリを見る</Link>}
                {seatSourceGuide && <a href="#seat-source-posts" data-event-seat-source-summary className="zr-focus mr-2 mt-3 inline-flex min-h-11 items-center rounded-xl border border-[#d5adbd] bg-white px-4 text-sm font-bold text-[#85274d]">
                  {[sourceSeatCount > 0 && `座席レポ${sourceSeatCount}件`, sourceMapCount > 0 && `アリーナ図の投稿${sourceMapCount}件`].filter(Boolean).join("・")}を見る
                </a>}
                {arenaPhotoMap && <a href="#arena-seat-photos" className="zr-focus mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#8a2850] px-4 text-sm font-bold text-white">
                  <Camera size={17} aria-hidden="true" />この公演のアリーナ図・{featuredPhotoBlock ? featuredPhotoBlock + "の" : "座席"}写真を見る
                </a>}
                {catalogUpdatedAt && (catalogStale || catalogReadFailed) && (
                  <p className="mt-3 text-xs" role="status">
                    公演情報は{formatPublicDataTime(catalogUpdatedAt)}時点です。
                    {catalogReadFailed && "最新の座席報告を取得できません。"}
                  </p>
                )}
              </CompactHeroIntro>
            </section>

          {venueMiniGuide && (
            <section id="seat-map" className="zr-container scroll-mt-4 pt-5" aria-labelledby="event-empty-title" data-event-empty-state={confirmedEmpty || undefined}>
              
              <h2 id="event-empty-title" className="artist-heading">{confirmedEmpty && reportsReady ? "座席の報告を募集中" : "会場の座席情報"}</h2>
              {confirmedEmpty && reportsReady && <p className="mt-3 text-[13px] leading-6 text-[#71636c]">この公演の座席報告はまだありません。</p>}
              <div className="mt-4 border-y border-[#ded8dc] bg-white px-4 py-3">
                <p className="text-[14px] font-black text-[#40383d]">{venueMiniGuide.venueName}</p>
                <p className="mt-1 truncate text-[10px] font-bold text-[#817981]">{[venueMiniGuide.capacityLabel, venueMiniGuide.areaLabel].filter(Boolean).join("｜")}</p>
              </div>
              {venueMiniGuide.archiveHref && (
                <Link data-event-venue-archive href={venueMiniGuide.archiveHref} className="zr-focus mt-2 inline-flex min-h-11 items-center text-[11px] font-black text-[#7655b2]">
                  過去の座席レポを見る →
                </Link>
              )}
              <Link
                href={`/report/ticket?event=${encodeURIComponent(eventId)}`}
                className="zr-focus mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#f43679] px-5 text-[12px] font-black text-white"
              >
                <Sparkles size={16} aria-hidden="true" />座席を報告
              </Link>
            </section>
          )}
          {venuePhotoGuide}
          {tourDates}
          {!arenaPhotoMap && <div className="zr-container pt-4" data-event-map-pending>
            <p className="rounded-lg bg-[#f8f3f6] px-3 py-2 text-sm text-[#634c59]">
              <strong>この公演のアリーナ配置図は準備中です。</strong>
              {sourceMapCount > 0 && " 下の「アリーナ図の投稿」で元投稿を確認できます。"}
            </p>
          </div>}
          {seatSourceGuide}
          {liveReportIds.length > 0 && <section className="zr-container py-5" aria-label="この公演の現地レポ">
            <h2 className="artist-heading">参加者の現地レポ</h2>
            <ul className="mt-2">{liveReportIds.map((id, i) => <li key={id}>
              <Link prefetch={false} className="zr-focus inline-flex min-h-11 items-center font-bold text-[#8a2850] underline" href={`/report/live/detail?reportId=${encodeURIComponent(id)}`}>
                {venueName}の現地レポを読む{liveReportIds.length > 1 ? `（${i + 1}）` : ""}
              </Link>
            </li>)}</ul>
          </section>}

          <CompactEventPickerSection
            headingId="event-picker-title"
            title="公演を切り替える"
            side={
              <p className="text-[10px] font-black text-[#817981]">
                {allRelatedEvents.length}公演
              </p>
            }
            events={allRelatedEvents}
            selectedEventId={eventId}
            onSelect={(id) => router.push(`/events/${id}`)}
            artistName={artist?.name}
            footer={<PerformanceSeatLinks event={event} officialSeatMap={officialSeatMap} arenaPhotoCount={arenaPhotoCount} venueGuideInBanner={Boolean(venuePhotoGuide)} />}
          />

          {dayGuideHref && <section className="zr-container pt-5" aria-label="公演当日の案内">
            <Link href={dayGuideHref} data-event-day-guide-link
              className="zr-focus flex min-h-16 items-center gap-3 rounded-2xl border border-[#e9bfd1] bg-[#fff6fa] px-4 py-3 text-[#8e2858]">
              <Clock size={24} aria-hidden="true" className="shrink-0" />
              <span className="min-w-0 flex-1"><span className="block text-[15px] font-black">当日まとめを見る</span>
                <span className="mt-1 block text-[12px] font-medium leading-5">グッズ・FCブースの時間と場所、引換締切</span></span>
              <ChevronRight size={20} aria-hidden="true" className="shrink-0" />
            </Link>
          </section>}

          <PerformanceTicketTiming event={event} />
          <PriorityPerformanceGuide event={event} />
          {arenaPhotoMap}
          {!venueMiniGuide && (<>
          <section id="seat-map" className="scroll-mt-4 py-8 sm:py-10" aria-labelledby="seat-map-title">
              <div className="zr-container">
                <div className="flex flex-col gap-4 border-b border-[#ded8dc] pb-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    
                    <h2 id="seat-map-title" className="artist-heading"><span className="inline-block">みんなの</span><span className="inline-block">座席表</span></h2>
                    <p className="mt-3 text-[12px] font-medium leading-6 text-[#817981]">
                      {interactiveSeatMap ? `座席報告は${mapDetailEvents.map(ev => fmtShortDate(ev.date)).join("・")}合算` : `${fmtShortDate(event.date)}の座席報告です。実際の配置は公演の座席表で確認してください。`}
                    </p>
                  </div>
                  <p className="shrink-0 text-[10px] font-black tracking-[0.1em] text-[#817981]">
                    {interactiveSeatMap ? "" : dedupedSeatReports.length > 0
                      ? `座席報告${dedupedSeatReports.length}件`
                      : externalForEvent.length > 0 ? `外部の座席情報${externalForEvent.length}件` : confirmedEmpty ? "最初の座席レポを募集中" : ""}
                  </p>
                </div>

                {!interactiveSeatMap && <SeatMapColorTabs value={colorMode} onChange={setColorMode} className="border-t-0" />}

                <div className="border-x border-b border-[#ded8dc] bg-[#fcfbfc]">
                  {interactiveSeatMap && seatReadState !== "ready" && <p role={seatReadState === "error" ? "alert" : "status"} className="px-4 py-3 text-center text-[13px]">{seatReadState === "error" ? "座席情報を読み込めません。時間をおいて再読み込みしてください。" : "座席情報を読み込み中…"}</p>}
                  <EventArenaMap
                    key={`${eventId}:${initialSeat ? focusSeatReportId : "overview"}`}
                    eventId={eventId}
                    reports={interactiveSeatMap ? seatReports : dedupedSeatReports}
                    externalObservations={externalForEvent}
                    colorMode={colorMode}
                    mapFullBleed
                    interactive={interactiveSeatMap}
                    detailEvents={mapDetailEvents}
                    initialSeat={initialSeat}
                    unverifiedConditions={interactiveSeatMap}
                    predictionReadState={seatReadState === "ready" && !externalReadFailed ? "ready" : "unavailable"}
                    predictionLimited={predictionLimited}
                    initialPrediction={searchParams.get("seat_view") === "prediction"}
                    initialCandidate={searchParams.get("seat_candidate") ?? ""}
                  />
                </div>

                {interactiveSeatMap && seatReadState === "ready" && focusSeatReportId && !initialSeat && <p role="status" className="mt-2 text-[12px] text-[#71636c]">指定した報告の位置を確認できません。ほかの点は図で確認できます。</p>}
                {interactiveSeatMap && externalReadFailed && <p role="status" className="mt-2 text-[12px] text-[#71636c]">外部参考情報は読み込めていません。</p>}
                {interactiveSeatMap && <Link href={`/report/ticket?event=${encodeURIComponent(eventId)}`} className="zr-focus mt-3 flex min-h-11 items-center justify-center rounded-lg bg-[#bd2865] px-3 text-[13px] font-bold text-white">＋ {fmtShortDate(event.date)}の座席を報告</Link>}

                <Link
                  href={`/events/${eventId}/fan-seat-prediction`}
                  className="zr-focus mt-4 flex min-h-12 w-full items-center justify-center gap-2 bg-[#f43679] px-6 text-[13px] font-black text-white shadow-[0_12px_28px_rgba(150,16,66,.20)]"
                >
                  <Sparkles size={17} />配置予想を投稿する
                </Link>
              </div>
            </section>

          <section className="zr-container py-8 sm:py-10" aria-labelledby="fan-prediction-title">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  
                  <h2 id="fan-prediction-title" className="artist-heading">みんなの配置予想</h2>
                  <p className="mt-3 text-[12px] font-medium leading-6 text-[#817981]">会場構成を予想して、参考になった図に投票できます。</p>
                </div>
                <div className="grid h-11 shrink-0 grid-cols-2 overflow-hidden rounded-full border border-[#eadfe4] bg-white">
                  <button
                    type="button"
                    onClick={() => setSortOrder("hot")}
                    aria-pressed={sortOrder === "hot"}
                    className={`zr-focus min-w-[88px] px-4 text-[11px] font-black ${sortOrder === "hot" ? "bg-[#fff0f5] text-[#c93868]" : "text-[#665a61]"}`}
                  >
                    参考になった順
                  </button>
                  <button
                    type="button"
                    onClick={() => setSortOrder("new")}
                    aria-pressed={sortOrder === "new"}
                    className={`zr-focus min-w-[88px] border-l border-[#eadfe4] px-4 text-[11px] font-black ${sortOrder === "new" ? "bg-[#fff0f5] text-[#c93868]" : "text-[#665a61]"}`}
                  >
                    新着順
                  </button>
                </div>
              </div>

              {fanSeatPredictions.length === 0 ? (
                <EmptyState
                  className="mt-6"
                  title="まだ予想図がありません"
                  icon={<Sparkles size={18} aria-hidden="true" />}
                  actionHref={`/events/${eventId}/fan-seat-prediction`}
                  actionLabel="予想図を投稿"
                  actionTone="primary"
                />
              ) : (
                <div className="mt-6 grid gap-5 lg:grid-cols-2">
                  {topPrediction && (
                    <div className="min-w-0">
                      <p className="mb-3 text-[10px] font-black tracking-[0.18em] text-[#f43679]">参考になった図</p>
                      <SeatPredictionCard
                        eventId={eventId}
                        predictionId={topPrediction.id}
                        imageUrl={imageSrc(topPrediction.image_path)}
                        comment={topPrediction.comment}
                        tags={topPrediction.prediction_tags}
                        venue={venueName}
                        dateLabel={fmtShortDate(event.date)}
                        createdAt={topPrediction.created_at}
                        likeCount={voteCounts[topPrediction.id] ?? 0}
                        liked={pickedIds.has(topPrediction.id)}
                        rank={1}
                        author={topPrediction.user_id ? predictionAuthorMap.get(topPrediction.user_id) : null}
                        onLiked={() => {
                          setVoteCounts((prev) => ({ ...prev, [topPrediction.id]: (prev[topPrediction.id] ?? 0) + 1 }));
                          setPickedIds((prev) => new Set(prev).add(topPrediction.id));
                        }}
                        open={openPredictionId === topPrediction.id}
                        onOpenChange={(isOpen) => setPredictionParam(isOpen ? topPrediction.id : null)}
                      />
                    </div>
                  )}
                  {otherPredictions.map((prediction, index) => (
                    <div key={prediction.id} className="min-w-0">
                      <p className="mb-3 text-[10px] font-black tracking-[0.18em] text-[#817981]">配置予想 {index + 2}</p>
                      <SeatPredictionCard
                        eventId={eventId}
                        predictionId={prediction.id}
                        imageUrl={imageSrc(prediction.image_path)}
                        comment={prediction.comment}
                        tags={prediction.prediction_tags}
                        venue={venueName}
                        dateLabel={fmtShortDate(event.date)}
                        createdAt={prediction.created_at}
                        likeCount={voteCounts[prediction.id] ?? 0}
                        liked={pickedIds.has(prediction.id)}
                        author={prediction.user_id ? predictionAuthorMap.get(prediction.user_id) : null}
                        onLiked={() => {
                          setVoteCounts((prev) => ({ ...prev, [prediction.id]: (prev[prediction.id] ?? 0) + 1 }));
                          setPickedIds((prev) => new Set(prev).add(prediction.id));
                        }}
                        open={openPredictionId === prediction.id}
                        onOpenChange={(isOpen) => setPredictionParam(isOpen ? prediction.id : null)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>)}
          </>
        ) : (
          <div className="zr-container py-24 text-center text-sm font-bold text-[#817981]">公演が見つかりません</div>
        )}
      </main>

      {toast && (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[#704e60] px-5 py-3 text-xs font-bold text-white shadow-lg">
          {toast}
        </div>
      )}

      <BottomNav active="event" artistSlug={artist?.slug} eventId={eventId} />
    </div>
  );
}

