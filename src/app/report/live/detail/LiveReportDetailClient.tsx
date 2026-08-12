"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronRight, ExternalLink, MapPinned } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { resolveArtist } from "@/lib/artists";
import { parseEventTitle } from "@/lib/eventTitle";
import type { CrawledEvent } from "@/lib/types";
import { fmtDate } from "@/lib/artistPageHelpers";
import { AccountLink } from "@/components/auth/AccountLink";
import { ShareButton } from "@/components/common/ShareButton";
import { Header } from "@/components/common/Header";
import { PageLoadingShell } from "@/components/common/PageLoadingShell";

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

type Status = "loading" | "ok" | "not-found" | "no-report";

export function LiveReportDetailClient() {
  return (
    <Suspense fallback={<PageLoadingShell title="現地レポ" eyebrow="LIVE REPORT" heading="現地のライブレポ" backHref="/report" backLabel="報告ページに戻る" />}>
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
      <main className="community-page pb-20">
        <section className="community-hero">
          <Header title="現地レポ" backHref="/report" backLabel="報告ページに戻る" />
          <div className="zr-container pb-6 pt-4 sm:pb-9 sm:pt-7">
            <p className="community-eyebrow">LIVE REPORT</p>
            <h1 className="mt-2 text-[28px] font-black tracking-[-0.05em] text-[#4b4148] sm:text-[36px]">現地の<span className="text-[#ef4f87]">ライブレポ</span></h1>
          </div>
        </section>
        <div className="zr-container space-y-4 py-7" aria-busy="true" aria-label="現地レポを読み込み中">
          <div className="animate-pulse border-y border-[#ded8dc] bg-white px-4 py-5">
            <div className="h-3 w-24 bg-[#f2e9ed]" />
            <div className="mt-3 h-6 w-2/3 bg-[#f8f3f5]" />
            <div className="mt-5 h-40 bg-[#fcf8fa]" />
          </div>
          <div className="animate-pulse border-y border-[#ded8dc] bg-white px-4 py-5">
            <div className="h-3 w-20 bg-[#f2e9ed]" />
            <div className="mt-3 h-16 bg-[#f8f3f5]" />
          </div>
        </div>
      </main>
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
    <div className="community-page pb-20 font-sans">
      <section className="community-hero">
        <Header
          title="現地レポ"
          backHref={backHref}
          backLabel="現地レポ一覧へ戻る"
          rightSlot={
            <div className="flex items-center">
              <AccountLink iconSize={22} />
              <ShareButton
                url={`${typeof window !== "undefined" ? window.location.origin : ""}/report/live/detail?reportId=${report.id}`}
                text={`${event.venue} ${fmtDate(event.date)} の現地レポ📸 #ちけレポ`}
                className="zr-focus flex h-11 w-11 items-center justify-center rounded-full text-[#665761] active:bg-[#fff0f5]"
              />
            </div>
          }
        />
        <div className="zr-container pb-9 pt-5">
          <p className="community-eyebrow">LIVE VIEW REPORT</p>
          <h1 className="community-title mt-3">この席から、<br /><span className="text-[#dd8053]">こう見えました。</span></h1>
          <div className="mt-6 rounded-[22px] border border-white/80 bg-white/72 p-4 shadow-sm backdrop-blur-sm">
            <p className="text-[14px] font-black leading-6">{tourName || event.title}</p>
            <p className="mt-1 text-[11px] font-bold text-[#817981]">{artist?.name ?? "アーティスト"} / {event.venue} / {fmtDate(event.date)}</p>
            <p className="mt-1 text-[9px] font-bold text-[#958d93]">投稿日 {fmtPostDate(report.created_at)}{isTestData ? " / テストデータ" : ""}</p>
          </div>
        </div>
      </section>

      <main className="zr-container py-8">
        <section aria-label="現地レポ写真" className="relative aspect-[16/10] w-full overflow-hidden bg-[#f3e8ee]">
          {photos.length > 0 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photos[0]} alt="座席から見た会場の様子" className="h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 overflow-hidden bg-[radial-gradient(circle_at_50%_100%,#f43679_0%,#83536f_32%,#f3e8ee_76%)]">
              <div className="absolute left-1/2 top-[28%] h-16 w-[58%] -translate-x-1/2 border border-white/15 bg-white/5" />
              <div className="absolute inset-x-0 bottom-0 flex flex-wrap justify-center gap-1 px-5 pb-5 opacity-30">
                {Array.from({ length: 80 }).map((_, i) => <span key={i} className="h-1 w-1 rounded-full bg-white" />)}
              </div>
            </div>
          )}
        </section>

        <section className="community-panel mt-9 p-5 sm:p-7" aria-labelledby="seat-view-title">
          <div className="flex items-start justify-between gap-4 border-b border-[#ded8dc] pb-5">
            <div>
              <p className="artist-kicker">Seat View</p>
              <h2 id="seat-view-title" className="artist-heading">この席の見え方</h2>
              {(seatAreaText || blockText || rowSeatParts.length > 0) && (
                <div className="mt-4">
                  <p className="text-[18px] font-black">{[seatAreaText, blockText].filter(Boolean).join(" ") || "座席エリア不明"}</p>
                  {rowSeatParts.length > 0 && <p className="mt-1 text-[12px] font-bold text-[#817981]">{rowSeatParts.join(" / ")}</p>}
                </div>
              )}
            </div>
            {ratingImg && overallLevel && <Image src={ratingImg} alt={`総合評価 ${overallLevel}`} width={96} height={48} className="h-auto w-[86px] shrink-0 object-contain" />}
          </div>

          {meterRows.length > 0 && (
            <div className="divide-y divide-[#ebe7e9]">
              {meterRows.map((m) => {
                const color = METER_COLORS[m.label];
                const value = m.kind === "gauge" ? meterValue(m.raw) : 0;
                return (
                  <div key={m.label} className="grid min-h-[66px] grid-cols-[30px_76px_1fr_42px] items-center gap-2">
                    <Image src={METER_ICONS[m.label]} alt="" width={30} height={30} className="object-contain" />
                    <span className="text-[10px] font-black text-[#544e52]">{m.label}</span>
                    {m.kind === "gauge" ? (
                      <div className="flex gap-1">{Array.from({ length: 5 }).map((_, i) => <span key={i} className="h-2 flex-1" style={{ backgroundColor: i < value ? color : "#e6e0e4" }} />)}</div>
                    ) : <span />}
                    <span className="text-right text-[10px] font-black" style={{ color }}>{m.kind === "gauge" ? meterText(m.raw) : boolText(m.value)}</span>
                  </div>
                );
              })}
            </div>
          )}

          <div className="border-t border-[#ded8dc] pt-5">
            <p className="text-[9px] font-black tracking-[0.18em] text-[#817981]">COMMENT</p>
            <p className="mt-3 break-words text-[13px] font-medium leading-7 text-[#544e52]">{report.memo || "コメントはありません"}</p>
          </div>
          {author?.show_x_on_posts && author.x_handle && (
            <a href={`https://x.com/${author.x_handle}`} target="_blank" rel="noopener noreferrer" className="zr-focus mt-5 inline-flex min-h-11 items-center gap-1.5 border border-[#ded8dc] px-3 text-[10px] font-black text-[#1c171b] no-underline">
              {author.display_name ? `${author.display_name} ` : ""}@{author.x_handle}<ExternalLink size={12} />
            </a>
          )}
        </section>

        {related.length > 0 && (
          <section className="mt-10" aria-labelledby="related-reports-title">
            <p className="artist-kicker">Nearby Reports</p>
            <h2 id="related-reports-title" className="artist-heading">同じブロックの他レポ</h2>
            <div className="mt-5 border-t border-[#1c171b]">
              {related.map((r) => {
                const rArea = r.seat_area_type ? (SEAT_AREA_LABELS[r.seat_area_type] ?? r.seat_area_type) : null;
                const rParts = [rArea, withSuffix(r.seat_block, "ブロック"), withSuffix(r.seat_row, "列"), withSuffix(r.seat_number, "番")].filter((v): v is string => Boolean(v));
                return (
                  <Link key={r.id} href={`/report/live/detail?reportId=${r.id}`} className="zr-focus flex min-h-[76px] items-center gap-3 border-b border-[#ded8dc] py-3 no-underline hover:bg-white">
                    <span className="h-12 w-16 shrink-0 bg-[linear-gradient(135deg,#1a0533_0%,#5b21b6_55%,#f43679_100%)]" />
                    <span className="min-w-0 flex-1"><span className="block text-[12px] font-black">{rParts.length > 0 ? rParts.join(" / ") : "座席情報なし"}</span>{r.memo && <span className="mt-1 block truncate text-[10px] font-medium text-[#817981]">{r.memo}</span>}</span>
                    <ChevronRight size={16} className="text-[#817981]" />
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        <Link href={`/events/${event.id}`} className="zr-focus mt-8 flex min-h-[68px] items-center gap-4 rounded-[20px] border border-[#d9def8] bg-[#eef0ff] px-4 text-[#5165c6]">
          <MapPinned size={24} className="shrink-0 text-[#6176d7]" aria-hidden="true" />
          <span className="min-w-0 flex-1"><span className="block text-[13px] font-black">座席表・アリーナ予想図を見る</span><span className="mt-1 block truncate text-[10px] font-bold text-[#7b84bd]">{event.venue}</span></span>
          <ChevronRight size={18} />
        </Link>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[#ded8dc] bg-white/95 px-4 pb-[max(18px,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
        <Link href={`/report/live?event=${event.id}`} className="zr-focus mx-auto flex min-h-[54px] w-full max-w-[720px] flex-col items-center justify-center bg-[#f43679] text-white">
          <span className="text-[13px] font-black">自分も現地レポを投稿する</span>
          <span className="mt-0.5 text-[9px] font-bold text-white/70">この会場の座席情報をシェア</span>
        </Link>
      </div>
    </div>
  );
}
