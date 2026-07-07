"use client";

import { use, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Share2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { resolveArtist } from "@/lib/artists";
import { getEventsForArtist } from "@/lib/events";
import type { CrawledEvent, FanSeatPrediction, SeatReport } from "@/lib/types";
import type { ColorMode } from "@/lib/arena-map/arenaMapTypes";
import { ArenaReportMap } from "@/components/arena-map/ArenaReportMap";
import { BottomNav } from "@/components/common/BottomNav";

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

function fmtRelTime(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${mins}分前`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}時間前`;
  return `${Math.floor(hrs / 24)}日前`;
}

function Sparkle({
  size = 8,
  color = "#FF6B9D",
  className = "",
}: {
  size?: number;
  color?: string;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      className={className}
      style={{ flexShrink: 0 }}
    >
      <path d="M12 2L13.8 9.2L21 10.5L13.8 12.5L12 20L10.2 12.5L3 10.5L10.2 9.2L12 2Z" />
    </svg>
  );
}

export default function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: eventId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const justAfterReported = searchParams.get("after_reported") === "1";

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
  const [voteError, setVoteError] = useState("");

  useEffect(() => {
    async function load() {
      const [evRes, reportsRes, fanPredictionsRes] = await Promise.all([
        supabase
          .from("events")
          .select("id, title, venue, venue_id, date, genre, lottery_types, artist_slug")
          .eq("id", eventId)
          .single(),
        supabase
          .from("seat_reports")
          .select("id, event_id, block, row_num, seat_num, lottery_type, fc_history, payment_method, lottery_round, lottery_name, comment, created_at")
          .eq("event_id", eventId)
          .order("created_at", { ascending: false })
          .limit(500),
        supabase
          .from("fan_seat_predictions")
          .select("id, event_id, image_path, comment, prediction_tags, display_name, approved, created_at")
          .eq("event_id", eventId)
          .eq("approved", true)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);
      if (evRes.data) setEvent(evRes.data as CrawledEvent);
      if (reportsRes.data) setSeatReports(reportsRes.data as SeatReport[]);
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

  // Day番号：同一会場内での日付順インデックス（1始まり）
  const dayMap = useMemo(() => {
    const map = new Map<string, number>();
    const source = relatedEvents.length > 0 ? relatedEvents : event ? [event] : [];
    const venueGroups = new Map<string, CrawledEvent[]>();
    for (const ev of source) {
      const v = ev.venue ?? "";
      if (!venueGroups.has(v)) venueGroups.set(v, []);
      venueGroups.get(v)!.push(ev);
    }
    for (const [, evs] of venueGroups) {
      const sorted = [...evs].sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
      sorted.forEach((ev, i) => map.set(ev.id, i + 1));
    }
    return map;
  }, [relatedEvents, event]);

  const allRelatedEvents = useMemo(
    () => (relatedEvents.length > 0 ? relatedEvents : event ? [event] : []),
    [relatedEvents, event],
  );

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

  async function handleShare() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: "アリーナ予想図", url });
      } else {
        await navigator.clipboard.writeText(url);
        setToast("URLをコピーしました");
      }
    } catch {
      // ユーザーがキャンセルした場合は何もしない
    }
  }

  async function handlePick(predId: string) {
    if (pickedIds.has(predId)) return;
    setVoteError("");
    const voterKey = getOrCreateVoterKey();
    const { error } = await supabase.from("fan_seat_prediction_votes").insert({
      id: crypto.randomUUID().replace(/-/g, "").slice(0, 20),
      prediction_id: predId,
      voter_key: voterKey,
    });
    if (error) {
      if (error.code === "23505") {
        setPickedIds((prev) => new Set(prev).add(predId));
        return;
      }
      setVoteError("保存できませんでした。時間をおいて再度お試しください。");
      return;
    }
    setVoteCounts((prev) => ({ ...prev, [predId]: (prev[predId] ?? 0) + 1 }));
    setPickedIds((prev) => new Set(prev).add(predId));
  }

  return (
    <div className="min-h-screen bg-[#FFFAFD] text-[#111827]">
      {/* ヘッダー */}
      <header className="sticky top-0 z-20 border-b border-gray-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[390px] items-center justify-between px-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-10 w-10 items-center justify-center rounded-full text-[#111827] active:bg-gray-100"
          >
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-[18px] font-bold tracking-wide">アリーナ予想図</h1>
          <button
            type="button"
            onClick={handleShare}
            className="flex h-10 w-10 items-center justify-center rounded-full text-[#111827] active:bg-gray-100"
          >
            <Share2 size={22} />
          </button>
        </div>
      </header>

      {/* ライブ情報（現地レポ詳細スタイル） */}
      {event && (
        <div className="bg-white">
          <section className="mx-auto max-w-[390px] px-4 pb-3 pt-3">
            <div className="flex items-start gap-2">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0">
                <rect x="9" y="2" width="6" height="11" rx="3" fill="#FF6B9D" />
                <path d="M5 10a7 7 0 0014 0" stroke="#FF6B9D" strokeWidth="2" strokeLinecap="round" fill="none" />
                <line x1="12" y1="17" x2="12" y2="22" stroke="#FF6B9D" strokeWidth="2" strokeLinecap="round" />
                <line x1="8" y1="22" x2="16" y2="22" stroke="#FF6B9D" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <div className="min-w-0 flex-1">
                {artist?.name ? (
                  <>
                    <p className="text-[15px] font-bold leading-snug text-gray-900">{artist.name}</p>
                    <p className="mt-0.5 text-[12px] leading-snug text-gray-500">{event.title}</p>
                  </>
                ) : (
                  <p className="text-[14px] font-bold leading-snug text-gray-900">{event.title}</p>
                )}
              </div>
              <Sparkle size={9} color="#FBBF24" className="mt-0.5" />
            </div>
          </section>
        </div>
      )}

      <main className="mx-auto max-w-[390px] pb-32 pt-3">
        {loading ? (
          <div className="space-y-3 px-4 pt-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse rounded-[24px] bg-white p-4 shadow-sm">
                <div className="h-4 w-32 rounded bg-gray-200" />
                <div className="mt-3 h-20 rounded bg-gray-100" />
              </div>
            ))}
          </div>
        ) : event ? (
          <>
            {/* 公演選択カード */}
            <section className="mt-1">
              <div
                className="overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                <div className="flex gap-2">
                  {allRelatedEvents.map((ev) => {
                    const isSel = ev.id === eventId;
                    const dayNum = dayMap.get(ev.id) ?? 1;
                    return (
                      <Link
                        key={ev.id}
                        href={`/events/${ev.id}`}
                        className={`relative flex w-[84px] shrink-0 flex-col rounded-lg p-2.5 transition-all active:scale-95 ${
                          isSel
                            ? "border-2 border-[#FF6B9D] bg-[#FFF1F6]"
                            : "border border-gray-200 bg-white"
                        }`}
                      >
                        <p
                          className={`text-[12px] font-bold leading-tight ${
                            isSel ? "text-[#FF6B9D]" : "text-[#111827]"
                          }`}
                        >
                          {fmtShortDate(ev.date)}
                        </p>
                        <p className="mt-0.5 overflow-hidden truncate whitespace-nowrap text-[10px] text-gray-500">
                          {ev.venue}
                        </p>
                        <span
                          className={`mt-1.5 w-fit rounded-full px-1.5 py-px text-[9px] font-bold ${
                            isSel ? "bg-[#FF6B9D] text-white" : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          Day{dayNum}
                        </span>
                      </Link>
                    );
                  })}
                  <div className="w-1 shrink-0" />
                </div>
              </div>
            </section>

            {/* マップカード */}
            <section className="mt-3 overflow-hidden rounded-[24px] border border-gray-100 bg-white p-4 shadow-sm mx-4">
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

              {/* ArenaReportMap */}
              <div className="-mx-4 mt-1">
                <ArenaReportMap
                  eventId={eventId}
                  reports={seatReports}
                  variant="full"
                  colorModeExternal={colorMode}
                  hideShareSection
                  mapFullBleed
                />
              </div>

              {/* スクショ案内カード + 投稿ボタン */}
              <div className="mt-4 flex items-center gap-3 rounded-2xl border border-pink-100 bg-white p-3 shadow-sm">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-[#111827]">スクショで予想を書こう</p>
                  <p className="mt-0.5 text-[11px] leading-snug text-[#4B5563] line-clamp-2">
                    マップをスクショしてスマホの編集で花道・センステを書いて投稿しよう
                  </p>
                </div>
                <Link
                  href={`/events/${eventId}/fan-seat-prediction`}
                  className="shrink-0 rounded-xl bg-[#FF6B9D] px-3 py-2 text-[11px] font-bold text-white transition-opacity active:opacity-80"
                >
                  <span className="block text-center">予想図を</span>
                  <span className="block text-center">投稿する</span>
                </Link>
              </div>
            </section>

            {/* みんなの予想図一覧 */}
            <section className="mt-5 rounded-[24px] border border-pink-100 bg-white/80 p-4 shadow-sm mx-4">
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
              ) : (
                <div className="mt-3 space-y-3">
                  {sortedPredictions.map((prediction) => {
                    const picked = pickedIds.has(prediction.id);
                    const count = voteCounts[prediction.id] ?? 0;
                    return (
                      <article
                        key={prediction.id}
                        className="rounded-[18px] border border-gray-100 bg-white p-2 shadow-sm"
                      >
                        <div className="flex gap-2">
                          <div className="h-[120px] w-[140px] shrink-0 overflow-hidden rounded-[14px] bg-gray-50">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={imageSrc(prediction.image_path)}
                              alt="予想図"
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="flex min-w-0 flex-1 flex-col justify-between py-1">
                            <div className="min-w-0 overflow-hidden">
                              {event && (
                                <p className="mb-1 truncate text-[10px] font-bold text-gray-500">
                                  {event.venue}・{fmtShortDate(event.date)}
                                </p>
                              )}
                              {prediction.prediction_tags.length > 0 && (
                                <div className="mb-1.5 flex flex-wrap gap-1">
                                  {prediction.prediction_tags.map((tag) => (
                                    <span
                                      key={tag}
                                      className="rounded-full bg-[#FFF5F8] px-1.5 py-0.5 text-[9px] font-bold text-[#FF6B9D]"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {prediction.comment && (
                                <p className="line-clamp-2 overflow-hidden text-[11px] leading-snug text-[#111827]">
                                  {prediction.comment}
                                </p>
                              )}
                            </div>
                            <div>
                              <div className="my-1.5 h-px bg-gray-100" />
                              <div className="flex items-center justify-between gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handlePick(prediction.id)}
                                  disabled={picked}
                                  className={`flex h-7 shrink-0 items-center gap-1 rounded-full border px-2 text-[10px] font-semibold transition-opacity ${
                                    picked
                                      ? "border-[#FF6B9D]/40 bg-[#FFF1F6] text-[#FF6B9D] opacity-60"
                                      : "border-[#FF6B9D]/40 bg-[#FFF1F6] text-[#FF6B9D] active:opacity-70"
                                  }`}
                                >
                                  <span>♡</span>
                                  <span>参考</span>
                                  {count > 0 && <span>{count}</span>}
                                </button>
                                <span className="shrink-0 text-[10px] text-[#6B7280]">{fmtRelTime(prediction.created_at)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}

              {voteError && <p className="mt-2 text-[11px] text-red-400">{voteError}</p>}
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
