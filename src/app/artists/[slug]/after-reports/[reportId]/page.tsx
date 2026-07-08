"use client";

import { use, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { findArtistBySlug, resolveArtist } from "@/lib/artists";
import type { CrawledEvent } from "@/lib/types";
import { fmtDate } from "@/lib/artistPageHelpers";

// メインステージのメーターは対応する実データ列が無いため対象外
const METER_ICONS: Record<string, string> = {
  "センステ": "/images/reports/local-report-detail/center-stage-icon.png",
  "トロッコ": "/images/reports/local-report-detail/trolley-icon.png",
  "客降り": "/images/reports/local-report-detail/aisle-walk-icon.png",
};

const METER_COLORS: Record<string, string> = {
  "センステ": "#A78BFA",
  "トロッコ": "#FB7185",
  "客降り": "#2DD4BF",
};

const SEAT_AREA_LABELS: Record<string, string> = {
  arena: "アリーナ",
  stand_1f: "1階スタンド",
  stand_2f: "2階スタンド",
  stand_3f_or_higher: "3階以上",
  other_unknown: "その他",
};

type ReportDetail = {
  id: string;
  event_id: string;
  seat_area_type: string | null;
  seat_block: string | null;
  seat_row: string | null;
  seat_number: string | null;
  seat_view_photo_paths: string[] | null;
  center_stage: string | null;
  torokko: string | null;
  kyakukudari: string | null;
  memo: string | null;
  created_at: string;
};

function withSuffix(v: string | null | undefined, suffix: string): string | null {
  if (!v) return null;
  return v.endsWith(suffix) ? v : `${v}${suffix}`;
}

function photoUrl(path: string): string {
  return supabase.storage.from("after-report-photos").getPublicUrl(path).data.publicUrl;
}

function meterValue(raw: string | null): number {
  if (!raw || raw === "なし") return 0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function meterText(raw: string | null): string {
  if (!raw || raw === "なし") return "なし";
  return `${raw}/5`;
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

type Status = "loading" | "ok" | "not-found";

export default function AfterReportDetailPage({
  params,
}: {
  params: Promise<{ slug: string; reportId: string }>;
}) {
  const { slug, reportId } = use(params);
  const artist = findArtistBySlug(slug);

  const [status, setStatus] = useState<Status>("loading");
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [event, setEvent] = useState<CrawledEvent | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!artist) { setStatus("not-found"); return; }
    let cancelled = false;

    async function load() {
      const { data: reportData } = await supabase
        .from("after_reports")
        .select("id, event_id, seat_area_type, seat_block, seat_row, seat_number, seat_view_photo_paths, center_stage, torokko, kyakukudari, memo, created_at")
        .eq("id", reportId)
        .maybeSingle();
      if (cancelled) return;
      if (!reportData) { setStatus("not-found"); return; }

      const { data: eventData } = await supabase
        .from("events")
        .select("id, title, venue, venue_id, date, genre, lottery_types, artist_slug")
        .eq("id", (reportData as ReportDetail).event_id)
        .maybeSingle();
      if (cancelled) return;
      if (!eventData) { setStatus("not-found"); return; }

      const ev = eventData as CrawledEvent;
      const belongsToArtist = (ev.artist_slug ?? resolveArtist(ev)?.slug) === slug;
      if (!belongsToArtist) { setStatus("not-found"); return; }

      setReport(reportData as ReportDetail);
      setEvent(ev);
      setStatus("ok");
    }

    load();
    return () => { cancelled = true; };
  }, [artist, reportId, slug]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#FF6B9D] border-t-transparent" />
      </div>
    );
  }

  if (status === "not-found" || !report || !event) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50">
        <p className="text-sm text-gray-500">現地レポが見つかりません</p>
        <Link
          href={`/artists/${slug}/after-reports`}
          className="rounded-full bg-[#FF6B9D] px-5 py-2.5 text-xs font-bold text-white"
        >
          現地レポ一覧に戻る
        </Link>
      </div>
    );
  }

  const photos = (report.seat_view_photo_paths ?? []).map(photoUrl);
  const seatAreaText = report.seat_area_type ? (SEAT_AREA_LABELS[report.seat_area_type] ?? report.seat_area_type) : null;
  const blockText = withSuffix(report.seat_block, "ブロック");
  const rowSeatParts = [withSuffix(report.seat_row, "列"), withSuffix(report.seat_number, "番")].filter(
    (v): v is string => Boolean(v),
  );

  const meterEntries = (["センステ", "トロッコ", "客降り"] as const)
    .map((label) => {
      const raw = label === "センステ" ? report.center_stage : label === "トロッコ" ? report.torokko : report.kyakukudari;
      return { label, raw };
    })
    .filter((m) => m.raw !== null);

  return (
    <div className="min-h-screen bg-[#FAFAFA] font-sans">
      <div className="mx-auto w-full max-w-[390px] bg-[#FAFAFA] pb-36">
        {/* ヘッダー */}
        <header className="sticky top-0 z-30 flex h-[44px] items-center justify-center border-b border-gray-100 bg-white">
          <Link
            href={`/artists/${slug}/after-reports`}
            className="absolute left-2 flex h-8 w-8 items-center justify-center text-gray-700 active:bg-gray-50"
          >
            <ChevronLeft size={18} strokeWidth={2.5} />
          </Link>
          <h1 className="text-[13px] font-bold tracking-wide text-gray-900">現地レポ詳細</h1>
        </header>

        {/* ライブ情報 */}
        <section className="bg-white px-4 pb-3.5 pt-3">
          <div className="flex items-start gap-2">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0">
              <rect x="9" y="2" width="6" height="11" rx="3" fill="#FF6B9D" />
              <path d="M5 10a7 7 0 0014 0" stroke="#FF6B9D" strokeWidth="2" strokeLinecap="round" fill="none" />
              <line x1="12" y1="17" x2="12" y2="22" stroke="#FF6B9D" strokeWidth="2" strokeLinecap="round" />
              <line x1="8" y1="22" x2="16" y2="22" stroke="#FF6B9D" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <h2 className="flex-1 text-[14px] font-bold leading-snug text-gray-900">{event.title}</h2>
            <Sparkle size={9} color="#FBBF24" className="mt-0.5" />
          </div>

          <div className="mt-2 flex gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-[#FFF1F6] px-2.5 py-1 text-[11px] font-semibold text-[#FF6B9D]">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="4" width="18" height="18" rx="3" stroke="#FF6B9D" strokeWidth="2.2" />
                <path d="M8 2v4M16 2v4M3 10h18" stroke="#FF6B9D" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
              {fmtDate(event.date)}
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-600">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#6B7280" opacity="0.75" />
                <circle cx="12" cy="9" r="2.5" fill="white" />
              </svg>
              {event.venue}
            </span>
          </div>
        </section>

        {/* 投稿写真 / ステージ写真 */}
        <section className="px-4 pt-3">
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
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-[11px] font-semibold text-white/70">写真はありません</p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* この席の見え方カード */}
        <section className="mt-3 px-4">
          <div className="relative overflow-hidden rounded-2xl border border-[#FECDD3] shadow-[0_2px_12px_rgba(255,107,157,0.06)]">
            {/* 背景画像（カード全体） */}
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: "url('/images/reports/local-report-detail/review-section-bg.png')",
                backgroundSize: "100% 100%",
              }}
            />

            {/* コンテンツ */}
            <div className="relative z-10">
              {/* カードタイトル */}
              <div className="flex items-center justify-center gap-2 px-4 pb-2.5 pt-3.5">
                <Sparkle size={9} color="#FBBF24" />
                <h3 className="text-[13px] font-bold text-gray-900">この席の見え方</h3>
                <Sparkle size={9} color="#FBBF24" />
              </div>

              {/* 座席情報 + 総合評価（総合評価はsatisfactionが実データで存在しないため非表示） */}
              {(seatAreaText || blockText || rowSeatParts.length > 0) && (
                <div className="flex items-center justify-center gap-4 px-4 pb-3.5 pt-1">
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
                </div>
              )}

              <div className="mx-4 h-px bg-gradient-to-r from-transparent via-[#FECDD3] to-transparent" />

              {/* 見え方・見やすさ + メーター（メインステージは対応データが無いため対象外） */}
              <div className="px-6 pb-3 pt-3">
                <p className="mb-3 text-center text-[10px] font-bold tracking-wide text-gray-400">
                  見え方・見やすさ
                </p>
                <div className="space-y-3">
                  {meterEntries.map((m) => {
                    const value = meterValue(m.raw);
                    const color = METER_COLORS[m.label];
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

        {/* 同じブロックの他レポ：座席ブロック表記の揺れにより信頼できる突合が難しいため今回は後回し */}

        {/* アリーナ予想図リンク */}
        <section className="mt-3 px-4">
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
          href="/report/live"
          className="flex h-[54px] w-full flex-col items-center justify-center rounded-full bg-[#FF6B9D] shadow-[0_8px_24px_rgba(255,107,157,0.35)] active:opacity-90"
        >
          <span className="text-[14px] font-bold text-white">自分も現地レポを投稿する</span>
          <span className="mt-0.5 text-[10px] text-white/75">あなたの座席情報もシェアしよう</span>
        </Link>
      </div>
    </div>
  );
}
