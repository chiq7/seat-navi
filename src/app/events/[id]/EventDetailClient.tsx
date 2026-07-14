"use client";

import { use, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { resolveArtist } from "@/lib/artists";
import { getEventsForArtist } from "@/lib/events";
import type { CrawledEvent, FanSeatPrediction, SeatReport } from "@/lib/types";
import type { ColorMode } from "@/lib/arena-map/arenaMapTypes";
import { EventArenaMap } from "@/components/arena-map/EventArenaMap";
import { BottomNav } from "@/components/common/BottomNav";
import { SeatPredictionCard } from "@/components/common/SeatPredictionCard";
import { EventInfoRow } from "@/components/common/EventInfoRow";
import { EventCarouselPicker } from "@/components/common/EventPicker";
import { ShareButton } from "@/components/common/ShareButton";

const COLOR_TABS: { value: ColorMode; label: string }[] = [
  { value: "lottery",   label: "🎫 抽選回" },
  { value: "fcHistory", label: "👑 FC歴" },
  { value: "payment",   label: "💳 支払い" },
  { value: "upgrade",   label: "⭐ アプグレ" },
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
  const [fanSeatPredictions, setFanSeatPredictions] = useState<FanSeatPrediction[]>([]);
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
          .select("id, event_id, image_path, comment, prediction_tags, display_name, approved, created_at")
          .eq("event_id", eventId)
          .eq("approved", true)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);
      if (evRes.data) setEvent(evRes.data as CrawledEvent);
      if (fanPredictionsRes.data) setFanSeatPredictions(fanPredictionsRes.data as FanSeatPrediction[]);
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
      const { data } = await supabase
        .from("seat_reports")
        .select("id, event_id, block, row_num, seat_num, lottery_type, fc_history, payment_method, lottery_round, lottery_name, comment, created_at")
        .in("event_id", groupEventIds)
        .order("created_at", { ascending: false })
        .limit(500);
      if (!cancelled && data) setSeatReports(data as SeatReport[]);
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
    <div className="min-h-screen bg-[#FFF8FB] text-[#111827]">
      {/* ヘッダー */}
      <header className="sticky top-0 z-20 border-b border-gray-100 bg-white/95 backdrop-blur">
        <div className="flex h-14 items-center justify-between px-4">
          <Link
            href={backHref}
            className="flex h-10 w-10 items-center justify-center rounded-full text-[#111827] active:bg-gray-100"
          >
            <ChevronLeft size={24} />
          </Link>
          <h1 className="text-[18px] font-bold tracking-wide">アリーナ予想図</h1>
          {event ? (
            <ShareButton
              url={`${window.location.origin}/events/${eventId}`}
              text={`${event.venue} ${fmtShortDate(event.date)} の座席予想・座席報告🎫 #ちけレポ`}
              className="flex h-10 w-10 items-center justify-center rounded-full text-[#111827] transition-colors active:bg-gray-100"
            />
          ) : (
            <div className="h-10 w-10" />
          )}
        </div>
      </header>

      <main className="pb-32 pt-3">
        {loading ? (
          <div className="space-y-3 px-3 pt-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse rounded-[24px] bg-white p-4 shadow-sm">
                <div className="h-4 w-32 rounded bg-gray-200" />
                <div className="mt-3 h-20 rounded bg-gray-100" />
              </div>
            ))}
          </div>
        ) : event ? (
          <>
            {/* 公演情報 + 公演選択カード */}
            <section className="mx-3 overflow-hidden border border-gray-100 bg-white p-3 shadow-sm">
              <EventInfoRow title={event.title} artistName={artist?.name ?? null} />
              <div className="mb-1 mt-0.5 border-t border-gray-100" />
              <EventCarouselPicker
                events={allRelatedEvents}
                selectedEventId={eventId}
                onSelect={(id) => router.push(`/events/${id}`)}
                artistName={artist?.name}
              />
            </section>

            {/* マップカード */}
            <section className="mt-3 overflow-hidden border border-gray-100 bg-white px-3 pt-3 shadow-sm mx-3">
              {/* 見出し */}
              <div>
                <Image
                  src="/images/arena-prediction/seat-report-map-logo.png"
                  alt="みんなの座席報告マップ"
                  width={2396}
                  height={232}
                  className="h-[40px] w-auto max-w-full object-contain"
                />
              </div>

              {/* 区切り線: タイトル段 / ボタン・ナビ段 */}
              <div className="-mx-3 mt-3 border-t-2 border-gray-200" />

              {/* 色分けタブ */}
              <div className="mt-3 flex gap-1">
                {COLOR_TABS.map((tab) => (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => setColorMode(tab.value)}
                    className={`flex-1 rounded-xl py-1.5 text-[11px] font-semibold transition-all active:scale-95 ${
                      colorMode === tab.value
                        ? "bg-[#FF6B9D] text-white"
                        : "border border-gray-200 bg-white text-[#111827]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* ArenaReportMap（共通部品: SVG描画・PNG保存はEventArenaMapが再利用） */}
              <div className="-mx-3 mt-1">
                <EventArenaMap
                  eventId={eventId}
                  reports={dedupedSeatReports}
                  colorMode={colorMode}
                  mapFullBleed
                />
              </div>
            </section>

            {/* 投稿ボタン（fan-seat-predictionの投稿ボタンと同じ横長CTAデザイン） */}
            <div className="mt-3 mx-3">
              <Link
                href={`/events/${eventId}/fan-seat-prediction`}
                className="flex h-9 w-full items-center justify-center rounded-xl bg-[#FF6B9D] text-[13px] font-bold text-white shadow-[0_8px_20px_rgba(255,107,157,0.25)] transition-opacity active:opacity-80"
              >
                予想図を投稿する
              </Link>
            </div>

            {/* 座席予想1位の投稿（特別枠） */}
            {topPrediction && (
              <section className="mt-3 mx-3">
                <SeatPredictionCard
                  eventId={eventId}
                  predictionId={topPrediction.id}
                  imageUrl={imageSrc(topPrediction.image_path)}
                  comment={topPrediction.comment}
                  tags={topPrediction.prediction_tags}
                  venue={event?.venue ?? null}
                  dateLabel={fmtShortDate(event?.date ?? null)}
                  createdAt={topPrediction.created_at}
                  likeCount={voteCounts[topPrediction.id] ?? 0}
                  liked={pickedIds.has(topPrediction.id)}
                  rank={1}
                  onLiked={() => {
                    setVoteCounts((prev) => ({ ...prev, [topPrediction.id]: (prev[topPrediction.id] ?? 0) + 1 }));
                    setPickedIds((prev) => new Set(prev).add(topPrediction.id));
                  }}
                  open={openPredictionId === topPrediction.id}
                  onOpenChange={(isOpen) => setPredictionParam(isOpen ? topPrediction.id : null)}
                />
              </section>
            )}

            {/* みんなの予想図一覧 */}
            <section className="mt-3 rounded-[24px] border border-pink-100 bg-white/80 p-3 shadow-sm mx-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Image
                    src="/images/arena-prediction/fan-prediction-logo.png"
                    alt="みんなの予想図"
                    width={2286}
                    height={282}
                    className="h-[40px] w-auto max-w-full object-contain"
                  />
                </div>
                <div className="flex h-9 shrink-0 items-center rounded-full border border-gray-200 bg-white p-1">
                  <button
                    type="button"
                    onClick={() => setSortOrder("hot")}
                    className={`h-7 rounded-full px-4 text-[12px] font-bold transition-colors ${
                      sortOrder === "hot" ? "bg-[#FF6B9D] text-white" : "text-[#111827]"
                    }`}
                  >
                    有力順
                  </button>
                  <button
                    type="button"
                    onClick={() => setSortOrder("new")}
                    className={`h-7 rounded-full px-4 text-[12px] font-bold transition-colors ${
                      sortOrder === "new" ? "bg-[#FF6B9D] text-white" : "text-[#111827]"
                    }`}
                  >
                    新着順
                  </button>
                </div>
              </div>

              {fanSeatPredictions.length === 0 ? (
                <div className="mt-4 rounded-[18px] border border-dashed border-pink-200 bg-[#FFF5F8] px-4 py-8 text-center">
                  <p className="text-[15px] font-bold text-[#111827]">まだ予想図がありません</p>
                  <p className="mt-1 text-[13px] text-[#6B7280]">最初の予想図を投稿してみよう</p>
                  <Link
                    href={`/events/${eventId}/fan-seat-prediction`}
                    className="mt-4 inline-flex h-10 items-center rounded-full bg-[#FF6B9D] px-6 text-[14px] font-bold text-white shadow-sm"
                  >
                    予想図を投稿する
                  </Link>
                </div>
              ) : otherPredictions.length > 0 ? (
                <div className="mt-3 space-y-3">
                  {otherPredictions.map((prediction) => (
                    <SeatPredictionCard
                      key={prediction.id}
                      eventId={eventId}
                      predictionId={prediction.id}
                      imageUrl={imageSrc(prediction.image_path)}
                      comment={prediction.comment}
                      tags={prediction.prediction_tags}
                      venue={event?.venue ?? null}
                      dateLabel={fmtShortDate(event?.date ?? null)}
                      createdAt={prediction.created_at}
                      likeCount={voteCounts[prediction.id] ?? 0}
                      liked={pickedIds.has(prediction.id)}
                      onLiked={() => {
                        setVoteCounts((prev) => ({ ...prev, [prediction.id]: (prev[prediction.id] ?? 0) + 1 }));
                        setPickedIds((prev) => new Set(prev).add(prediction.id));
                      }}
                      open={openPredictionId === prediction.id}
                      onOpenChange={(isOpen) => setPredictionParam(isOpen ? prediction.id : null)}
                    />
                  ))}
                </div>
              ) : null}
            </section>
          </>
        ) : (
          <div className="pt-16 text-center text-sm text-gray-500">公演が見つかりません</div>
        )}
      </main>

      {toast && (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-gray-900 px-5 py-3 text-xs font-semibold text-white shadow-lg">
          {toast}
        </div>
      )}

      <BottomNav active="event" artistSlug={artist?.slug} eventId={eventId} />
    </div>
  );
}
