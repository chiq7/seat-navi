"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronRight, ExternalLink } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { resolveArtist } from "@/lib/artists";
import { parseEventTitle } from "@/lib/eventTitle";
import type { CrawledEvent } from "@/lib/types";
import { fmtDate } from "@/lib/artistPageHelpers";
import { Header } from "@/components/common/Header";
import { EventInfoRow } from "@/components/common/EventInfoRow";
import { ShareButton } from "@/components/common/ShareButton";

const RATING_IMAGES: Record<number, string> = {
  5: "/images/reports/overall-rating/rating-5-kamiseki.png",
  4: "/images/reports/overall-rating/rating-4-ryoseki.png",
  3: "/images/reports/overall-rating/rating-3-futsu.png",
  2: "/images/reports/overall-rating/rating-2-bimyo.png",
  1: "/images/reports/overall-rating/rating-1-kyomu.png",
};

// 表示順: メインステージ→センステ→ファンサ→トロッコ→客降り→銀テ
const METER_ICONS: Record<string, string> = {
  "メインステージ": "/images/reports/local-report-detail/main-stage-icon.png",
  "センステ": "/images/reports/local-report-detail/center-stage-icon.png",
  "ファンサ": "/images/reports/local-report-detail/fanservice-icon.png",
  "トロッコ": "/images/reports/local-report-detail/trolley-icon.png",
  "客降り": "/images/reports/local-report-detail/aisle-walk-icon.png",
  "銀テ": "/images/reports/local-report-detail/silver-tape-icon.png",
};

const METER_COLORS: Record<string, string> = {
  "メインステージ": "#FF6B9D",
  "センステ": "#A78BFA",
  "ファンサ": "#F472B6",
  "トロッコ": "#FB7185",
  "客降り": "#2DD4BF",
  "銀テ": "#FBBF24",
};

const SEAT_AREA_LABELS: Record<string, string> = {
  arena: "アリーナ",
  stand_1f: "1階スタンド",
  stand_2f: "2階スタンド",
  stand_3f_or_higher: "3階以上",
  other_unknown: "その他",
};

type ReportRow = {
  id: string;
  user_id: string | null;
  event_id: string;
  seat_area_type: string | null;
  seat_block: string | null;
  seat_row: string | null;
  seat_number: string | null;
  seat_view_photo_paths: string[] | null;
  main_stage: string | null;
  center_stage: string | null;
  fansa_rating: string | null;
  torokko: string | null;
  kyakukudari: string | null;
  silver_tape_rows: number | null;
  memo: string | null;
  created_at: string;
};

type PublicAuthor = {
  display_name: string | null;
  x_handle: string | null;
  show_x_on_posts: boolean;
};

type RelatedReport = {
  id: string;
  seat_area_type: string | null;
  seat_block: string | null;
  seat_row: string | null;
  seat_number: string | null;
  memo: string | null;
};

function withSuffix(v: string | null | undefined, suffix: string): string | null {
  if (!v) return null;
  return v.endsWith(suffix) ? v : `${v}${suffix}`;
}

function photoUrl(path: string): string {
  return supabase.storage.from("after-report-photos").getPublicUrl(path).data.publicUrl;
}

function fmtPostDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
}

function meterValue(raw: string | null): number {
  if (!raw || raw === "なし") return 0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function meterText(raw: string | null): string {
  if (raw === null) return "未評価";
  if (raw === "なし") return "なし";
  return `${raw}/5`;
}

/** "1"〜"5" を数値化。"なし"・未入力は評価なし(null)扱い */
function ratingLevel(raw: string | null): number | null {
  if (!raw || raw === "なし") return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 1 && n <= 5 ? n : null;
}

function boolText(v: boolean | null): string {
  return v === true ? "あり" : v === false ? "なし" : "わからない";
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

type Status = "loading" | "ok" | "not-found" | "no-report";

export function LiveReportDetailClient() {
  return (
    <Suspense fallback={null}>
      <LiveReportDetailPageInner />
    </Suspense>
  );
}

function LiveReportDetailPageInner() {
  const searchParams = useSearchParams();
  const reportId = searchParams.get("reportId");

  const [status, setStatus] = useState<Status>("loading");
  const [report, setReport] = useState<ReportRow | null>(null);
  const [event, setEvent] = useState<CrawledEvent | null>(null);
  const [related, setRelated] = useState<RelatedReport[]>([]);
  const [author, setAuthor] = useState<PublicAuthor | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!reportId) { setStatus("no-report"); return; }
    let cancelled = false;

    async function load() {
      setAuthor(null);
      const { data: reportData } = await supabase
        .from("after_reports")
        .select("id, user_id, event_id, seat_area_type, seat_block, seat_row, seat_number, seat_view_photo_paths, main_stage, center_stage, fansa_rating, torokko, kyakukudari, silver_tape_rows, memo, created_at")
        .eq("id", reportId)
        .maybeSingle();
      if (cancelled) return;
      if (!reportData) { setStatus("not-found"); return; }
      const r = reportData as ReportRow;

      if (r.user_id) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("display_name, x_handle, show_x_on_posts")
          .eq("id", r.user_id)
          .maybeSingle();
        if (!cancelled) setAuthor((profileData as PublicAuthor | null) ?? null);
      }

      const { data: eventData } = await supabase
        .from("events")
        .select("id, title, venue, venue_id, date, genre, lottery_types, artist_slug")
        .eq("id", r.event_id)
        .maybeSingle();
      if (cancelled) return;
      if (!eventData) { setStatus("not-found"); return; }

      let relatedRows: RelatedReport[] = [];
      if (r.seat_block) {
        const { data: relatedData } = await supabase
          .from("after_reports")
          .select("id, seat_area_type, seat_block, seat_row, seat_number, memo")
          .eq("event_id", r.event_id)
          .eq("seat_block", r.seat_block)
          .neq("id", r.id)
          .order("created_at", { ascending: false })
          .limit(3);
        relatedRows = (relatedData as RelatedReport[]) ?? [];
      }
      if (cancelled) return;

      setReport(r);
      setEvent(eventData as CrawledEvent);
      setRelated(relatedRows);
      setStatus("ok");
    }

    load();
    return () => { cancelled = true; };
  }, [reportId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#FF6B9D] border-t-transparent" />
      </div>
    );
  }

  if (status === "not-found") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50">
        <p className="text-sm text-gray-500">現地レポが見つかりません</p>
        <Link
          href="/report"
          className="rounded-full bg-[#FF6B9D] px-5 py-2.5 text-xs font-bold text-white"
        >
          現地レポトップに戻る
        </Link>
      </div>
    );
  }

  if (status === "no-report") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 px-6 text-center">
        <p className="text-sm text-gray-500">見るレポが指定されていません</p>
        <Link
          href="/report"
          className="rounded-full bg-[#FF6B9D] px-5 py-2.5 text-xs font-bold text-white"
        >
          現地レポトップに戻る
        </Link>
      </div>
    );
  }

  if (!report || !event) return null;

  const artist = resolveArtist(event);
  const backHref = artist ? `/artists/${artist.slug}/after-reports` : "/report";
  const photos = (report.seat_view_photo_paths ?? []).slice(0, 1).map(photoUrl);
  const { tourName, isTestData } = parseEventTitle(event.title, artist?.name);

  // 総合評価バッジ: メインステージとセンステの高い方で判定。どちらも未入力ならバッジ非表示
  const mainLevel = ratingLevel(report.main_stage);
  const centerLevel = ratingLevel(report.center_stage);
  const overallLevel = mainLevel !== null || centerLevel !== null ? Math.max(mainLevel ?? 0, centerLevel ?? 0) : null;
  const ratingImg = overallLevel ? RATING_IMAGES[overallLevel] : null;

  const seatAreaText = report.seat_area_type ? (SEAT_AREA_LABELS[report.seat_area_type] ?? report.seat_area_type) : null;
  const blockText = withSuffix(report.seat_block, "ブロック");
  const rowSeatParts = [withSuffix(report.seat_row, "列"), withSuffix(report.seat_number, "番")].filter(
    (v): v is string => Boolean(v),
  );

  // 表示順: メインステージ→センステ→ファンサ→トロッコ→客降り→銀テ
  // ファンサはメインステージ等と同じ5段階、銀テのみ あり/なし/わからない のbooleanで扱う
  const silverTape = report.silver_tape_rows === 1 ? true : report.silver_tape_rows === 0 ? false : null;
  const meterRows: (
    | { kind: "gauge"; label: string; raw: string | null }
    | { kind: "boolean"; label: string; value: boolean | null }
  )[] = [
    { kind: "gauge" as const, label: "メインステージ", raw: report.main_stage },
    { kind: "gauge" as const, label: "センステ", raw: report.center_stage },
    { kind: "gauge" as const, label: "ファンサ", raw: report.fansa_rating },
    { kind: "gauge" as const, label: "トロッコ", raw: report.torokko },
    { kind: "gauge" as const, label: "客降り", raw: report.kyakukudari },
    { kind: "boolean" as const, label: "銀テ", value: silverTape },
  ].filter((m) => (m.kind === "gauge" ? m.raw !== null : m.value !== null));

  return (
    <div className="min-h-screen bg-[#FAFAFA] font-sans">
      <div className="w-full bg-[#FAFAFA] pb-36">

        {/* ヘッダー */}
        <Header
          title="現地レポ詳細"
          backHref={backHref}
          rightSlot={
            <ShareButton
              url={`${typeof window !== "undefined" ? window.location.origin : ""}/report/live/detail?reportId=${report.id}`}
              text={`${event.venue} ${fmtDate(event.date)} の現地レポ📸 #ちけレポ`}
            />
          }
        />

        {/* ライブ情報（公演情報は他ページと共通のEventInfoRowで統一） */}
        <section className="bg-white px-3 py-2">
          <EventInfoRow
            title={tourName}
            artistName={artist?.name ?? null}
            isTestData={isTestData}
            venue={event.venue}
            dateLabel={fmtDate(event.date)}
          />
          <p className="mt-1.5 text-[10px] text-gray-400">投稿日 {fmtPostDate(report.created_at)}</p>
          {author?.show_x_on_posts && author.x_handle && (
            <a
              href={`https://x.com/${author.x_handle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-bold text-gray-700 no-underline"
            >
              {author.display_name ? `${author.display_name} ` : ""}@{author.x_handle}
              <ExternalLink size={11} />
            </a>
          )}
        </section>

        {/* 投稿写真 */}
        <section className="px-3 pt-3">
          <div className="relative h-[190px] w-full overflow-hidden rounded-2xl">
            {photos.length > 0 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photos[0]} alt="現地レポ写真" className="h-full w-full object-cover" />
            ) : (
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(135deg, #1a0533 0%, #2d1b69 28%, #5b21b6 58%, #c026d3 80%, #f472b6 100%)",
                }}
              >
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  <div className="h-1.5 w-36 rounded-full bg-white/10" />
                  <div className="h-14 w-52 rounded-lg border border-white/10 bg-white/5" />
                </div>
                <div className="absolute bottom-0 left-[28%] h-3/4 w-1.5 origin-bottom -rotate-[18deg] bg-gradient-to-t from-pink-400/25 to-transparent blur-[3px]" />
                <div className="absolute bottom-0 left-1/2 h-full w-2 bg-gradient-to-t from-purple-400/35 to-transparent blur-[4px]" />
                <div className="absolute bottom-0 right-[28%] h-3/4 w-1.5 origin-bottom rotate-[18deg] bg-gradient-to-t from-pink-300/25 to-transparent blur-[3px]" />
                <div className="absolute bottom-3 left-0 right-0 flex flex-wrap justify-center gap-px px-6 opacity-25">
                  {Array.from({ length: 90 }).map((_, i) => (
                    <div key={i} className="h-1 w-1 rounded-full bg-white" />
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* この席の見え方カード */}
        <section className="mt-3 px-3">
          <div className="relative overflow-hidden rounded-2xl border border-[#FECDD3] shadow-[0_2px_12px_rgba(255,107,157,0.06)]">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: "url('/images/reports/local-report-detail/review-section-bg.png')",
                backgroundSize: "100% 100%",
              }}
            />

            <div className="relative z-10">
              <div className="flex items-center justify-center gap-2 px-4 pb-2.5 pt-3.5">
                <Sparkle size={9} color="#FBBF24" />
                <h3 className="text-[13px] font-bold text-gray-900">この席の見え方</h3>
                <Sparkle size={9} color="#FBBF24" />
              </div>

              {/* 座席情報 + 総合評価（satisfactionが無い場合はバッジ非表示） */}
              {(seatAreaText || blockText || rowSeatParts.length > 0 || ratingImg) && (
                <div className="flex items-center justify-center gap-4 px-4 pb-3.5 pt-1">
                  {(seatAreaText || blockText || rowSeatParts.length > 0) && (
                    <div>
                      <p className="text-[17px] font-bold tracking-wide text-gray-900">
                        {[seatAreaText, blockText].filter(Boolean).join(" ")}
                      </p>
                      {rowSeatParts.length > 0 && (
                        <p className="mt-0.5 text-[12px] font-semibold text-gray-500">
                          {rowSeatParts.join(" / ")}
                        </p>
                      )}
                    </div>
                  )}
                  {ratingImg && overallLevel && (
                    <div className="w-[96px] shrink-0">
                      <Image
                        src={ratingImg}
                        alt={`総合評価 ${overallLevel}`}
                        width={96}
                        height={48}
                        className="h-auto w-full object-contain"
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="mx-4 h-px bg-gradient-to-r from-transparent via-[#FECDD3] to-transparent" />

              {/* 見え方・見やすさ + ファンサ・銀テ */}
              <div className="px-6 pb-3 pt-3">
                <p className="mb-3 text-center text-[10px] font-bold tracking-wide text-gray-400">
                  見え方・見やすさ
                </p>
                <div className="space-y-3">
                  {meterRows.map((m) => {
                    const color = METER_COLORS[m.label];
                    const value = m.kind === "gauge" ? meterValue(m.raw) : 0;
                    return (
                      <div
                        key={m.label}
                        className="grid items-center gap-x-2"
                        style={{ gridTemplateColumns: "36px 90px 1fr 52px" }}
                      >
                        <div className="flex items-center justify-center">
                          <Image
                            src={METER_ICONS[m.label]}
                            alt=""
                            width={38}
                            height={38}
                            className="object-contain"
                          />
                        </div>
                        <span className="whitespace-nowrap text-[11px] font-semibold text-gray-700">
                          {m.label}
                        </span>
                        {m.kind === "gauge" ? (
                          <>
                            <div className="flex gap-[3px]">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <div
                                  key={i}
                                  className="h-[9px] w-[17px] rounded-full"
                                  style={{ backgroundColor: i < value ? color : "#E5E7EB" }}
                                />
                              ))}
                            </div>
                            <span className="text-right text-[11px] font-bold" style={{ color }}>
                              {meterText(m.raw)}
                            </span>
                          </>
                        ) : (
                          <>
                            <div />
                            <span
                              className="rounded-full px-2 py-0.5 text-right text-[11px] font-bold"
                              style={{ color }}
                            >
                              {boolText(m.value)}
                            </span>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mx-4 h-px bg-gradient-to-r from-transparent via-[#FECDD3] to-transparent" />

              {/* コメント */}
              <div className="px-4 pb-4 pt-3">
                <p className="mb-2 text-center text-[10px] font-bold tracking-wide text-gray-400">コメント</p>
                <div className="rounded-xl border border-pink-100 bg-white/80 px-3 py-2.5">
                  <p className="break-words text-center text-[12px] leading-relaxed text-gray-700">
                    {report.memo || "コメントはありません"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 同じブロックの他レポ */}
        {related.length > 0 && (
          <section className="mt-3 px-3">
            <div className="mb-2.5 flex items-center justify-between">
              <h3 className="text-[13px] font-bold text-gray-900">同じブロックの他レポ</h3>
            </div>
            <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              {related.map((r, i) => {
                const rArea = r.seat_area_type ? (SEAT_AREA_LABELS[r.seat_area_type] ?? r.seat_area_type) : null;
                const rParts = [rArea, withSuffix(r.seat_block, "ブロック"), withSuffix(r.seat_row, "列"), withSuffix(r.seat_number, "番")]
                  .filter((v): v is string => Boolean(v));
                return (
                  <Link
                    key={r.id}
                    href={`/report/live/detail?reportId=${r.id}`}
                    className={`flex w-full items-center gap-3 p-3 no-underline active:bg-gray-50 ${i > 0 ? "border-t border-gray-100" : ""}`}
                  >
                    <div
                      className="h-[54px] w-[72px] shrink-0 rounded-lg"
                      style={{ background: "linear-gradient(135deg, #1a0533 0%, #2d1b69 45%, #c026d3 100%)" }}
                    />
                    <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
                      <p className="text-[12px] font-bold text-gray-900">
                        {rParts.length > 0 ? rParts.join(" / ") : "座席情報なし"}
                      </p>
                      {r.memo && (
                        <p className="line-clamp-1 text-left text-[10px] text-gray-500">{r.memo}</p>
                      )}
                    </div>
                    <ChevronRight size={14} className="shrink-0 text-gray-300" />
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* アリーナ予想図リンク */}
        <section className="mt-3 px-3">
          <Link
            href={`/events/${event.id}`}
            className="flex w-full items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] active:bg-gray-50"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF2FF]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z" stroke="#6366F1" strokeWidth="1.5" fill="none" strokeLinejoin="round" />
                <path d="M9 3v15M15 6v15" stroke="#6366F1" strokeWidth="1.5" />
              </svg>
            </div>
            <div className="flex-1 text-left">
              <p className="text-[13px] font-bold text-gray-900">アリーナ予想図を見る</p>
              <p className="text-[10px] text-gray-400">{event.venue}</p>
            </div>
            <ChevronRight size={16} className="shrink-0 text-gray-300" />
          </Link>
        </section>
      </div>

      {/* Fixed CTA */}
      <div
        className="fixed bottom-0 left-1/2 z-50 w-full max-w-[390px] -translate-x-1/2 px-4 pb-6 pt-4"
        style={{ background: "linear-gradient(to top, white 72%, rgba(255,255,255,0))" }}
      >
        <Link
          href={`/report/live?event=${event.id}`}
          className="flex h-[54px] w-full flex-col items-center justify-center rounded-full bg-[#FF6B9D] shadow-[0_8px_24px_rgba(255,107,157,0.35)] active:opacity-90"
        >
          <span className="text-[14px] font-bold text-white">自分も現地レポを投稿する</span>
          <span className="mt-0.5 text-[10px] text-white/75">あなたの座席情報もシェアしよう</span>
        </Link>
      </div>
    </div>
  );
}
