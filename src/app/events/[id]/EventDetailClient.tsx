"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  MapPin,
  Sparkles,
  Clock,
  ChevronRight,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { resolveArtist } from "@/lib/artists";
import type { CrawledEvent, FanSeatPrediction, SeatReport } from "@/lib/types";
import type { ExternalSeatObservation } from "@/lib/external-seats/types";
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
import { EmptyState } from "@/components/common/EmptyState";
import { fetchVisiblePostAuthors, type PostAuthor } from "@/lib/postAuthors";
import { focusedSeatPosition, isInteractiveSeatMapPilot, parseSeatReportId, SEAT_MAP_PILOT_EVENT_IDS } from "@/lib/arena-map/seatMapNavigation";
import { eventSeatGroup } from "@/lib/arena-map/eventSeatGroup";
import { isEventPredictionEnabled } from "@/lib/arena-map/eventPredictionInput";
import { readArenaReports } from "@/lib/arena-map/readArenaReports";

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
  venueMiniGuide,
  dayGuideHref = null,
}: {
  params: Promise<{ id: string }>;
  initialEvent: CrawledEvent;
  initialRelatedEvents: CrawledEvent[];
  venueMiniGuide: {
    venueName: string;
    capacityLabel: string;
    areaLabel: string;
    venueHref: string | null;
    archiveHref: string | null;
  } | null;
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
  const [seatReports, setSeatReports] = useState<SeatReport[]>([]);
  const [externalSeatObservations, setExternalSeatObservations] = useState<ExternalSeatObservation[]>([]);
  const [seatReadState, setSeatReadState] = useState<"loading" | "ready" | "error">("loading");
  const [externalReadFailed, setExternalReadFailed] = useState(false);
  const [predictionLimited, setPredictionLimited] = useState(false);
  const [fanSeatPredictions, setFanSeatPredictions] = useState<FanSeatPrediction[]>([]);
  const [predictionAuthorMap, setPredictionAuthorMap] = useState<Map<string, PostAuthor>>(new Map());
  const relatedEvents = initialRelatedEvents;
  const [colorMode, setColorMode] = useState<ColorMode>("lottery");
  const [sortOrder, setSortOrder] = useState<"hot" | "new">("hot");
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({});
  const [pickedIds, setPickedIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState(justAfterReported ? "投稿ありがとうございます！" : "");

  useEffect(() => {
    async function load() {
      const fanPredictionsRes = await supabase
          .from("fan_seat_predictions")
          .select("id, event_id, user_id, image_path, comment, prediction_tags, display_name, approved, created_at")
          .eq("event_id", eventId)
          .eq("approved", true)
          .order("created_at", { ascending: false })
          .limit(20);
      if (fanPredictionsRes.data) {
        const predictions = fanPredictionsRes.data as FanSeatPrediction[];
        setFanSeatPredictions(predictions);
        setPredictionAuthorMap(await fetchVisiblePostAuthors(predictions.map((prediction) => prediction.user_id)));
      }
    }
    load();
  }, [eventId]);

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
    () => (relatedEvents.length > 0 ? relatedEvents : [event]),
    [relatedEvents, event],
  );

  const groupEventIds = useMemo(() => {
    if (interactiveSeatMap) return SEAT_MAP_PILOT_EVENT_IDS;
    const group = eventSeatGroup(allRelatedEvents, event.id);
    return group.length ? group.map(item => item.id) : [event.id];
  }, [event, allRelatedEvents, interactiveSeatMap]);

  useEffect(() => {
    if (groupEventIds.length === 0) return;
    let cancelled = false;
    async function loadGroupReports() {
      setSeatReadState("loading");
      try {
      const paged = isEventPredictionEnabled(eventId) ? await readArenaReports(supabase, groupEventIds) : null;
      const [seatResult, externalResult] = paged ? [paged.seats, paged.external] : await Promise.all([
        supabase
          .from("seat_reports")
          .select(SEAT_REPORT_FIELDS)
          .in("event_id", groupEventIds)
          .order("created_at", { ascending: false })
          .limit(500),
        supabase
          .from("external_seat_observations")
          .select("id, event_id, source_type, source_url, observed_at, seat_area, block, row_min, row_max, seat_min, seat_max, gate, level, confidence, evidence_summary, review_status")
          .in("event_id", groupEventIds)
          .eq("review_status", "approved")
          .eq("seat_area", "arena")
          .order("observed_at", { ascending: false })
          .limit(500),
      ]);
      if (cancelled) return;
      setPredictionLimited(paged?.limited ?? false);
      if (seatResult.error) { setSeatReadState("error"); return; }
      const reports = (seatResult.data ?? []) as SeatReport[];
      // 最新500件の外でも、保存済みの対象報告だけは本人の参加日に限定して取得。
      if (focusSeatReportId && !reports.some(report => report.id === focusSeatReportId && report.event_id === eventId)) {
        const focused = await supabase.from("seat_reports").select(SEAT_REPORT_FIELDS).eq("id", focusSeatReportId).eq("event_id", eventId).maybeSingle();
        if (cancelled) return;
        if (focused.data && !focused.error) reports.push(focused.data as SeatReport);
      }
      setSeatReports(reports);
      setSeatReadState("ready");
      setExternalReadFailed(Boolean(externalResult.error));
      // 移行適用前や一時障害時も既存の座席マップはそのまま表示する。
      setExternalSeatObservations((externalResult.data as ExternalSeatObservation[] | null) ?? []);
      } catch {
        if (!cancelled) setSeatReadState("error");
      }
    }
    loadGroupReports();
    return () => {
      cancelled = true;
    };
  }, [groupEventIds, eventId, focusSeatReportId]);

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

  // マップ表示用：同一座席に複数報告がある場合、選択中の日程の報告を優先し、
  // 無ければ取得順（既存の created_at 降順）のまま先頭のものを採用する。
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

  return (
    <div className="community-page">
      <main className="pb-20">
        {event ? (
          <>
          <section className="community-hero">
              <Header
                title="座席予想"
                backHref={backHref}
                backLabel="アーティストページへ戻る"
                rightSlot={
                  <div className="flex items-center">
                    <AccountLink iconSize={22} />
                    <ShareButton
                      url={`${typeof window !== "undefined" ? window.location.origin : ""}/events/${eventId}`}
                      text={`${event.venue} ${fmtShortDate(event.date)} の座席表・座席予想 #ちけレポ`}
                      className="zr-focus flex h-11 w-11 items-center justify-center rounded-full text-[#665761] transition-colors active:bg-[#fff0f5]"
                    />
                  </div>
                }
              />

              <CompactHeroIntro
                eyebrow="VENUE SEAT GUIDE"
                title="座席表と"
                accent="アリーナ予想"
                subtitle={event.title}
                icon={<Sparkles size={21} strokeWidth={1.8} className="text-[#6176d7]" />}
              >
                <CompactEventSummary date={event.date} venue={event.venue} className="mt-3" />
              </CompactHeroIntro>
            </section>

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
            footer={event.venue_id ? (
                <Link
                  href={`/venues/${event.venue_id}`}
                  className="zr-focus mt-2 inline-flex min-h-11 items-center gap-2 text-[11px] font-black text-[#f43679] sm:text-[12px]"
                >
                  <MapPin size={15} />{event.venue}の会場・座席表をもっと見る →
                </Link>
              ) : null}
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

          {venueMiniGuide ? (
            <section className="zr-container py-6 sm:py-8" aria-labelledby="event-empty-title" data-event-empty-state>
              <p className="artist-kicker">FIRST REPORT</p>
              <h2 id="event-empty-title" className="artist-heading">最初のレポを募集中</h2>
              <div className="mt-4 border-y border-[#ded8dc] bg-white px-4 py-3">
                <p className="truncate text-[14px] font-black text-[#40383d]">
                  {venueMiniGuide.venueHref ? <Link href={venueMiniGuide.venueHref}>{venueMiniGuide.venueName}</Link> : venueMiniGuide.venueName}
                </p>
                <p className="mt-1 truncate text-[10px] font-bold text-[#817981]">{venueMiniGuide.capacityLabel}｜{venueMiniGuide.areaLabel}</p>
              </div>
              {venueMiniGuide.archiveHref && (
                <Link href={venueMiniGuide.archiveHref} className="zr-focus mt-2 inline-flex min-h-10 items-center text-[11px] font-black text-[#7655b2]">
                  過去の座席レポを見る →
                </Link>
              )}
              <Link
                href={`/report/live?event=${encodeURIComponent(eventId)}`}
                className="zr-focus mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#f43679] px-5 text-[12px] font-black text-white"
              >
                <Sparkles size={16} aria-hidden="true" />最初のレポを投稿
              </Link>
            </section>
          ) : (<>
          <section id="seat-map" className="scroll-mt-4 py-8 sm:py-10" aria-labelledby="seat-map-title">
              <div className="zr-container">
                <div className="flex flex-col gap-4 border-b border-[#ded8dc] pb-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="artist-kicker">Live Seat Map</p>
                    <h2 id="seat-map-title" className="artist-heading"><span className="inline-block">みんなの</span><span className="inline-block">座席報告マップ</span></h2>
                    <p className="mt-3 text-[12px] font-medium leading-6 text-[#817981]">
                      {interactiveSeatMap ? `座席報告は${mapDetailEvents.map(ev => fmtShortDate(ev.date)).join("・")}合算` : "実際の座席報告を色分け。会場の座席表と照らし合わせて確認できます。"}
                    </p>
                  </div>
                  <p className="shrink-0 text-[10px] font-black tracking-[0.1em] text-[#817981]">
                    {interactiveSeatMap ? "" : dedupedSeatReports.length > 0
                      ? `${dedupedSeatReports.length} SEAT REPORTS`
                      : "最初の座席レポを募集中"}
                  </p>
                </div>

                {!interactiveSeatMap && <SeatMapColorTabs value={colorMode} onChange={setColorMode} className="border-t-0" />}

                <div className="border-x border-b border-[#ded8dc] bg-[#fcfbfc]">
                  {interactiveSeatMap && seatReadState !== "ready" && <p role={seatReadState === "error" ? "alert" : "status"} className="px-4 py-3 text-center text-[13px]">{seatReadState === "error" ? "座席情報を読み込めません。時間をおいて再読み込みしてください。" : "座席情報を読み込み中…"}</p>}
                  <EventArenaMap
                    key={`${eventId}:${initialSeat ? focusSeatReportId : "overview"}`}
                    eventId={eventId}
                    reports={interactiveSeatMap ? seatReports : dedupedSeatReports}
                    externalObservations={externalSeatObservations}
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
                  <Sparkles size={17} />この会場のアリーナ予想図を投稿する
                </Link>
              </div>
            </section>

          <section className="zr-container py-8 sm:py-10" aria-labelledby="fan-prediction-title">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="artist-kicker">Fan Prediction</p>
                  <h2 id="fan-prediction-title" className="artist-heading">ファンのアリーナ予想図</h2>
                  <p className="mt-3 text-[12px] font-medium leading-6 text-[#817981]">会場構成を予想して、参考になった図に投票できます。</p>
                </div>
                <div className="grid h-11 shrink-0 grid-cols-2 overflow-hidden rounded-full border border-[#eadfe4] bg-white">
                  <button
                    type="button"
                    onClick={() => setSortOrder("hot")}
                    aria-pressed={sortOrder === "hot"}
                    className={`zr-focus min-w-[88px] px-4 text-[11px] font-black ${sortOrder === "hot" ? "bg-[#fff0f5] text-[#c93868]" : "text-[#665a61]"}`}
                  >
                    有力順
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
                      <p className="mb-3 text-[10px] font-black tracking-[0.18em] text-[#f43679]">MOST TRUSTED / 01</p>
                      <SeatPredictionCard
                        eventId={eventId}
                        predictionId={topPrediction.id}
                        imageUrl={imageSrc(topPrediction.image_path)}
                        comment={topPrediction.comment}
                        tags={topPrediction.prediction_tags}
                        venue={event.venue}
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
                      <p className="mb-3 text-[10px] font-black tracking-[0.18em] text-[#817981]">PREDICTION / {String(index + 2).padStart(2, "0")}</p>
                      <SeatPredictionCard
                        eventId={eventId}
                        predictionId={prediction.id}
                        imageUrl={imageSrc(prediction.image_path)}
                        comment={prediction.comment}
                        tags={prediction.prediction_tags}
                        venue={event.venue}
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
