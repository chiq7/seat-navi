"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  MapPin,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { resolveArtist } from "@/lib/artists";
import { getEventsForArtist } from "@/lib/events";
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
import { StickyHeroHeader } from "@/components/common/StickyHeroHeader";
import { fetchVisiblePostAuthors, type PostAuthor } from "@/lib/postAuthors";

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
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: eventId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const justAfterReported = searchParams.get("after_reported") === "1";
  const openPredictionId = searchParams.get("prediction");

  function setPredictionParam(id: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (id) params.set("prediction", id);
    else params.delete("prediction");
    const qs = params.toString();
    router.replace(`/events/${eventId}${qs ? `?${qs}` : ""}`, { scroll: false });
  }

  const [event, setEvent] = useState<CrawledEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [seatReports, setSeatReports] = useState<SeatReport[]>([]);
  const [externalSeatObservations, setExternalSeatObservations] = useState<ExternalSeatObservation[]>([]);
  const [fanSeatPredictions, setFanSeatPredictions] = useState<FanSeatPrediction[]>([]);
  const [predictionAuthorMap, setPredictionAuthorMap] = useState<Map<string, PostAuthor>>(new Map());
  const [relatedEvents, setRelatedEvents] = useState<CrawledEvent[]>([]);
  const [colorMode, setColorMode] = useState<ColorMode>("lottery");
  const [sortOrder, setSortOrder] = useState<"hot" | "new">("hot");
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({});
  const [pickedIds, setPickedIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState(justAfterReported ? "投稿ありがとうございます！" : "");

  useEffect(() => {
    async function load() {
      const [evRes, fanPredictionsRes] = await Promise.all([
        supabase
          .from("events")
          .select("id, title, venue, venue_id, date, genre, lottery_types, artist_slug")
          .eq("id", eventId)
          .single(),
        supabase
          .from("fan_seat_predictions")
          .select("id, event_id, user_id, image_path, comment, prediction_tags, display_name, approved, created_at")
          .eq("event_id", eventId)
          .eq("approved", true)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);
      if (evRes.data) setEvent(evRes.data as CrawledEvent);
      if (fanPredictionsRes.data) {
        const predictions = fanPredictionsRes.data as FanSeatPrediction[];
        setFanSeatPredictions(predictions);
        setPredictionAuthorMap(await fetchVisiblePostAuthors(predictions.map((prediction) => prediction.user_id)));
      }
      setLoading(false);
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

  const artist = event ? resolveArtist(event) : undefined;
  const backHref = artist ? `/artists/${artist.slug}` : "/";

  useEffect(() => {
    if (!event || !artist) return;
    const currentEvent = event;
    const currentArtist = artist;
    let cancelled = false;
    async function loadRelated() {
      const evs = await getEventsForArtist(currentArtist.slug);
      if (!cancelled) setRelatedEvents(evs.length > 0 ? evs : [currentEvent]);
    }
    loadRelated();
    return () => {
      cancelled = true;
    };
  }, [event, artist]);


  const allRelatedEvents = useMemo(
    () => (relatedEvents.length > 0 ? relatedEvents : event ? [event] : []),
    [relatedEvents, event],
  );

  // 同一会場（venue_id一致）×隣接日程（間隔3日以内）でつながる公演群。
  // venue_idがnullの場合は今開いている公演単体のみをグループとする。
  const ADJACENT_GAP_DAYS = 3;
  const groupEventIds = useMemo(() => {
    if (!event) return [];
    if (!event.venue_id) return [event.id];
    const sameVenue = allRelatedEvents.filter((ev) => ev.venue_id === event.venue_id && ev.date);
    const sorted = [...sameVenue].sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
    const groups: CrawledEvent[][] = [];
    let current: CrawledEvent[] = [];
    for (const ev of sorted) {
      if (current.length === 0) {
        current = [ev];
        continue;
      }
      const prevDate = current[current.length - 1].date!;
      const gapDays = Math.round(
        (new Date(ev.date!).getTime() - new Date(prevDate).getTime()) / 86400000,
      );
      if (gapDays <= ADJACENT_GAP_DAYS) {
        current.push(ev);
      } else {
        groups.push(current);
        current = [ev];
      }
    }
    if (current.length > 0) groups.push(current);
    const myGroup = groups.find((g) => g.some((ev) => ev.id === event.id));
    return myGroup ? myGroup.map((ev) => ev.id) : [event.id];
  }, [event, allRelatedEvents]);

  useEffect(() => {
    if (groupEventIds.length === 0) return;
    let cancelled = false;
    async function loadGroupReports() {
      const [seatResult, externalResult] = await Promise.all([
        supabase
          .from("seat_reports")
          .select("id, event_id, block, row_num, seat_num, lottery_type, fc_history, payment_method, lottery_round, lottery_name, comment, created_at")
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
      if (seatResult.data) setSeatReports(seatResult.data as SeatReport[]);
      // 移行適用前や一時障害時も既存の座席マップはそのまま表示する。
      setExternalSeatObservations((externalResult.data as ExternalSeatObservation[] | null) ?? []);
    }
    loadGroupReports();
    return () => {
      cancelled = true;
    };
  }, [groupEventIds]);

  // 座席位置（block+row+seat）ごとの全報告。将来の座席タップ詳細（「この座席の報告 n件」）機能のために
  // 複数報告を保持できる構造だが、タップ詳細UI自体は今回未実装。
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
        {loading ? (
          <div className="zr-container space-y-5 py-8">
            <div className="h-[270px] animate-pulse bg-[#f3e8ee]" />
            <div className="h-[520px] animate-pulse border border-[#ded8dc] bg-white" />
          </div>
        ) : event ? (
          <>
          <section className="community-hero">
              <StickyHeroHeader
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

          <section className="py-8 sm:py-10" aria-labelledby="seat-map-title">
              <div className="zr-container">
                <div className="flex flex-col gap-4 border-b border-[#ded8dc] pb-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="artist-kicker">Live Seat Map</p>
                    <h2 id="seat-map-title" className="artist-heading">みんなの座席報告マップ</h2>
                    <p className="mt-3 text-[12px] font-medium leading-6 text-[#817981]">
                      実際の座席報告を色分け。会場の座席表と照らし合わせて確認できます。
                    </p>
                  </div>
                  <p className="shrink-0 text-[10px] font-black tracking-[0.1em] text-[#817981]">
                    {dedupedSeatReports.length} SEAT REPORTS
                  </p>
                </div>

                <SeatMapColorTabs value={colorMode} onChange={setColorMode} className="border-t-0" />

                <div className="border-x border-b border-[#ded8dc] bg-[#fcfbfc]">
                  <EventArenaMap
                    eventId={eventId}
                    reports={dedupedSeatReports}
                    externalObservations={externalSeatObservations}
                    colorMode={colorMode}
                    mapFullBleed
                  />
                </div>

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
                <div className="mt-6 border border-dashed border-[#efb6ca] bg-[#fff0f5] px-5 py-8 text-center">
                  <Sparkles size={29} strokeWidth={1.5} className="mx-auto text-[#f43679]" />
                  <p className="mt-4 text-[18px] font-black">まだ予想図がありません</p>
                  <p className="mt-2 text-[12px] font-medium text-[#817981]">この会場の最初の予想図を投稿してみよう。</p>
                  <Link
                    href={`/events/${eventId}/fan-seat-prediction`}
                    className="zr-focus mt-4 inline-flex min-h-12 items-center bg-[#f43679] px-6 text-[13px] font-black text-white"
                  >
                    予想図を投稿する
                  </Link>
                </div>
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
