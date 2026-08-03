"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CalendarDays,
  ChevronLeft,
  Crown,
  MapPin,
  Sparkles,
  Ticket,
  WalletCards,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { resolveArtist } from "@/lib/artists";
import { getEventsForArtist } from "@/lib/events";
import type { CrawledEvent, FanSeatPrediction, SeatReport } from "@/lib/types";
import type { ExternalSeatObservation } from "@/lib/external-seats/types";
import type { ColorMode } from "@/lib/arena-map/arenaMapTypes";
import { EventArenaMap } from "@/components/arena-map/EventArenaMap";
import { BottomNav } from "@/components/common/BottomNav";
import { SeatPredictionCard } from "@/components/common/SeatPredictionCard";
import { EventCarouselPicker } from "@/components/common/EventPicker";
import { ShareButton } from "@/components/common/ShareButton";
import { AccountLink } from "@/components/auth/AccountLink";
import { fetchVisiblePostAuthors, type PostAuthor } from "@/lib/postAuthors";

const COLOR_TABS: { value: ColorMode; label: string; Icon: LucideIcon }[] = [
  { value: "lottery", label: "抽選回", Icon: Ticket },
  { value: "fcHistory", label: "FC歴", Icon: Crown },
  { value: "payment", label: "支払い", Icon: WalletCards },
  { value: "upgrade", label: "アプグレ", Icon: Sparkles },
];

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
    <div className="min-h-screen bg-[#f7f5f6] text-[#1c171b]">
      <main className="pb-32">
        {loading ? (
          <div className="zr-container space-y-5 py-8">
            <div className="h-[270px] animate-pulse bg-[#211b20]" />
            <div className="h-[520px] animate-pulse border border-[#ded8dc] bg-white" />
          </div>
        ) : event ? (
          <>
            <section className="bg-[#0d090d] text-white">
              <header className="zr-container flex h-16 items-center justify-between">
                <Link
                  href={backHref}
                  aria-label="アーティストページへ戻る"
                  className="zr-focus flex h-11 w-11 items-center justify-center rounded-full bg-white/8 text-white"
                >
                  <ChevronLeft size={26} strokeWidth={2.7} />
                </Link>
                <div className="flex items-center gap-1">
                  <AccountLink tone="light" iconSize={22} />
                  <ShareButton
                    url={`${typeof window !== "undefined" ? window.location.origin : ""}/events/${eventId}`}
                    text={`${event.venue} ${fmtShortDate(event.date)} の座席表・座席予想 #ちけレポ`}
                    className="zr-focus flex h-10 w-10 items-center justify-center rounded-full text-white transition-colors active:bg-white/15"
                  />
                </div>
              </header>

              <div className="zr-container pb-9 pt-5 sm:pb-12 sm:pt-9">
                <p className="text-[10px] font-black tracking-[0.24em] text-[#ff5b96]">VENUE SEAT GUIDE</p>
                <h1 className="mt-3 max-w-[850px] text-[36px] font-black leading-[1.08] tracking-[-0.055em] sm:text-[58px] lg:text-[72px]">
                  会場の座席表と、<br />みんなのアリーナ予想。
                </h1>
                <p className="mt-5 max-w-[780px] text-[13px] font-bold leading-6 text-white/65 sm:text-[16px]">
                  {event.title}
                </p>

                <div className="mt-7 grid border-y border-white/18 sm:grid-cols-2">
                  <div className="flex items-center gap-3 py-4 sm:border-r sm:border-white/18 sm:pr-5">
                    <CalendarDays size={18} className="shrink-0 text-[#ff5b96]" />
                    <div>
                      <p className="text-[9px] font-black tracking-[0.14em] text-white/42">LIVE DATE</p>
                      <p className="mt-1 text-[16px] font-black">{fmtShortDate(event.date)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 border-t border-white/18 py-4 sm:border-t-0 sm:pl-5">
                    <MapPin size={18} className="shrink-0 text-[#ff5b96]" />
                    <div className="min-w-0">
                      <p className="text-[9px] font-black tracking-[0.14em] text-white/42">VENUE</p>
                      <p className="mt-1 truncate text-[16px] font-black">{event.venue}</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="zr-container border-b border-[#ded8dc] py-7" aria-labelledby="event-picker-title">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="artist-kicker">Select Live Date</p>
                  <h2 id="event-picker-title" className="mt-2 text-[23px] font-black tracking-[-0.04em]">公演日を切り替える</h2>
                </div>
                <p className="shrink-0 text-[10px] font-black text-[#817981]">{allRelatedEvents.length} DATES</p>
              </div>
              <div className="mt-5">
                <EventCarouselPicker
                  events={allRelatedEvents}
                  selectedEventId={eventId}
                  onSelect={(id) => router.push(`/events/${id}`)}
                  artistName={artist?.name}
                />
              </div>
              {event.venue_id && (
                <Link
                  href={`/venues/${event.venue_id}`}
                  className="zr-focus mt-4 inline-flex min-h-11 items-center gap-2 text-[12px] font-black text-[#f43679]"
                >
                  <MapPin size={15} />{event.venue}の会場・座席表をもっと見る →
                </Link>
              )}
            </section>

            <section className="bg-white py-12 sm:py-16" aria-labelledby="seat-map-title">
              <div className="zr-container">
                <div className="flex flex-col gap-5 border-b border-[#ded8dc] pb-6 sm:flex-row sm:items-end sm:justify-between">
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

                <div className="grid grid-cols-4 border-x border-b border-[#ded8dc]">
                  {COLOR_TABS.map(({ value, label, Icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setColorMode(value)}
                      aria-pressed={colorMode === value}
                      className={`zr-focus flex min-h-[66px] flex-col items-center justify-center gap-1.5 border-r border-[#ded8dc] px-1 text-[9px] font-black transition-colors last:border-r-0 sm:min-h-[72px] sm:flex-row sm:text-[11px] ${
                        colorMode === value
                          ? "bg-[#1c171b] text-white"
                          : "bg-white text-[#625a61] hover:bg-[#fff0f5]"
                      }`}
                    >
                      <Icon size={17} strokeWidth={1.8} className={colorMode === value ? "text-[#ff5b96]" : "text-[#f43679]"} />
                      {label}
                    </button>
                  ))}
                </div>

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
                  className="zr-focus mt-5 flex min-h-14 w-full items-center justify-center gap-2 bg-[#f43679] px-6 text-[13px] font-black text-white shadow-[0_12px_28px_rgba(150,16,66,.20)]"
                >
                  <Sparkles size={17} />この会場のアリーナ予想図を投稿する
                </Link>
              </div>
            </section>

            <section className="zr-container border-b border-[#ded8dc] py-12 sm:py-16" aria-labelledby="fan-prediction-title">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="artist-kicker">Fan Prediction</p>
                  <h2 id="fan-prediction-title" className="artist-heading">ファンのアリーナ予想図</h2>
                  <p className="mt-3 text-[12px] font-medium leading-6 text-[#817981]">会場構成を予想して、参考になった図に投票できます。</p>
                </div>
                <div className="grid h-11 shrink-0 grid-cols-2 border border-[#1c171b] bg-white">
                  <button
                    type="button"
                    onClick={() => setSortOrder("hot")}
                    aria-pressed={sortOrder === "hot"}
                    className={`zr-focus min-w-[88px] px-4 text-[11px] font-black ${sortOrder === "hot" ? "bg-[#1c171b] text-white" : "text-[#1c171b]"}`}
                  >
                    有力順
                  </button>
                  <button
                    type="button"
                    onClick={() => setSortOrder("new")}
                    aria-pressed={sortOrder === "new"}
                    className={`zr-focus min-w-[88px] border-l border-[#1c171b] px-4 text-[11px] font-black ${sortOrder === "new" ? "bg-[#1c171b] text-white" : "text-[#1c171b]"}`}
                  >
                    新着順
                  </button>
                </div>
              </div>

              {fanSeatPredictions.length === 0 ? (
                <div className="mt-8 border border-dashed border-[#efb6ca] bg-[#fff0f5] px-5 py-12 text-center">
                  <Sparkles size={29} strokeWidth={1.5} className="mx-auto text-[#f43679]" />
                  <p className="mt-4 text-[18px] font-black">まだ予想図がありません</p>
                  <p className="mt-2 text-[12px] font-medium text-[#817981]">この会場の最初の予想図を投稿してみよう。</p>
                  <Link
                    href={`/events/${eventId}/fan-seat-prediction`}
                    className="zr-focus mt-6 inline-flex min-h-12 items-center bg-[#f43679] px-6 text-[13px] font-black text-white"
                  >
                    予想図を投稿する
                  </Link>
                </div>
              ) : (
                <div className="mt-8 grid gap-5 lg:grid-cols-2">
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
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 bg-[#1c171b] px-5 py-3 text-xs font-bold text-white shadow-lg">
          {toast}
        </div>
      )}

      <BottomNav active="event" artistSlug={artist?.slug} eventId={eventId} />
    </div>
  );
}
