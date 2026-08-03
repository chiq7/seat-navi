"use client";

import { use, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Camera,
  ChevronLeft,
  MapPin,
  SlidersHorizontal,
  Sparkles,
  SquarePen,
  X,
} from "lucide-react";
import { findArtistBySlug } from "@/lib/artists";
import { getEventsForArtist } from "@/lib/events";
import { supabase } from "@/lib/supabase/client";
import type { CrawledEvent } from "@/lib/types";
import type { AfterReportCard } from "@/lib/artistPageTypes";
import { fmtDate, seatAreaLabel } from "@/lib/artistPageHelpers";
import {
  blockRowText,
  getReportPhotoUrl,
  overallBadgeLabel,
  structureBadgeLabels,
} from "@/lib/afterReportCard";
import { BottomNav } from "@/components/common/BottomNav";
import { PostAuthorLink } from "@/components/common/PostAuthorLink";
import { AccountLink } from "@/components/auth/AccountLink";
import { fetchVisiblePostAuthors, type PostAuthor } from "@/lib/postAuthors";
import {
  DEFAULT_ARTIST_HERO_IMAGE,
  resolveArtistHeroImage,
} from "@/lib/artistPageData";

function fmtPostDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function ReportMedia({ photoUrl, index }: { photoUrl: string | null; index: number }) {
  const [imgError, setImgError] = useState(false);
  const positions = ["28%", "46%", "72%", "55%"];

  if (photoUrl && !imgError) {
    return (
      <div className="relative aspect-[4/3] overflow-hidden bg-[#1c171b]">
        {/* Supabaseの投稿画像URLは実行時に決まるため、通常のimgで表示する。 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoUrl}
          alt="座席から見た会場の写真"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  return (
    <div
      className="relative aspect-[4/3] overflow-hidden bg-[#100716]"
      aria-label="会場写真なし"
      style={{
        background:
          `radial-gradient(circle at ${positions[index % positions.length]} 22%, rgba(255,255,255,.88) 0 3px, transparent 4px), ` +
          "linear-gradient(118deg, rgba(244,54,121,.72), transparent 38%), " +
          "repeating-linear-gradient(90deg, rgba(255,91,150,.8) 0 1px, transparent 1px 7px), " +
          "linear-gradient(180deg, #2b1230, #050306)",
      }}
    >
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-4 pb-3 pt-12">
        <p className="text-[9px] font-black tracking-[0.2em] text-white/55">LIVE VIEW REPORT</p>
      </div>
    </div>
  );
}

export default function AfterReportsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const artist = findArtistBySlug(slug);

  const [events, setEvents] = useState<CrawledEvent[]>([]);
  const [reports, setReports] = useState<AfterReportCard[]>([]);
  const [authorMap, setAuthorMap] = useState<Map<string, PostAuthor>>(new Map());
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState("all");
  const [filterArea, setFilterArea] = useState("all");
  const [filterBlock, setFilterBlock] = useState("all");
  const [heroImageSrc, setHeroImageSrc] = useState(() =>
    resolveArtistHeroImage(artist?.heroImage),
  );

  async function loadData(a: NonNullable<ReturnType<typeof findArtistBySlug>>) {
    const allEvs = await getEventsForArtist(a.slug);
    setEvents(allEvs);
    if (allEvs.length === 0) {
      setLoading(false);
      return;
    }
    const ids = allEvs.map((event) => event.id);
    const { data: repData } = await supabase
      .from("after_reports")
      .select("id, event_id, user_id, seat_area_type, seat_block, seat_row, seat_number, seat_view_photo_paths, main_stage, center_stage, fansa_rating, torokko, kyakukudari, silver_tape_rows, fansa, memo, created_at")
      .in("event_id", ids)
      .order("created_at", { ascending: false })
      .limit(500);
    const nextReports = (repData as AfterReportCard[]) ?? [];
    setReports(nextReports);
    setAuthorMap(await fetchVisiblePostAuthors(nextReports.map((report) => report.user_id)));
    setLoading(false);
  }

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!artist) {
      setLoading(false);
      return;
    }
    setHeroImageSrc(resolveArtistHeroImage(artist.heroImage));
    loadData(artist);
  }, [artist]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const eventMap = useMemo(() => {
    const map = new Map<string, CrawledEvent>();
    for (const event of events) map.set(event.id, event);
    return map;
  }, [events]);

  const today = new Date().toISOString().split("T")[0];
  const nextEvent = useMemo(
    () =>
      events
        .filter((event) => event.date && event.date >= today)
        .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""))[0] ?? events[0],
    [events, today],
  );

  const dateOptions = useMemo(() => {
    const seen = new Set<string>();
    const options: { id: string; label: string; date: string }[] = [];
    for (const report of reports) {
      const event = eventMap.get(report.event_id);
      if (event && !seen.has(event.id)) {
        seen.add(event.id);
        options.push({ id: event.id, label: `${fmtDate(event.date)} ${event.venue}`, date: event.date ?? "" });
      }
    }
    return options.sort((a, b) => b.date.localeCompare(a.date));
  }, [reports, eventMap]);

  const areaOptions = useMemo(() => {
    const areas = new Set<string>();
    for (const report of reports) {
      if (filterDate !== "all" && report.event_id !== filterDate) continue;
      if (report.seat_area_type) areas.add(report.seat_area_type);
    }
    return [...areas];
  }, [reports, filterDate]);

  const blockOptions = useMemo(() => {
    const blocks = new Set<string>();
    for (const report of reports) {
      if (filterDate !== "all" && report.event_id !== filterDate) continue;
      if (filterArea !== "all" && report.seat_area_type !== filterArea) continue;
      if (report.seat_block) blocks.add(report.seat_block);
    }
    return [...blocks].sort();
  }, [reports, filterDate, filterArea]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (filterArea !== "all" && !areaOptions.includes(filterArea)) setFilterArea("all");
  }, [areaOptions, filterArea]);

  useEffect(() => {
    if (filterBlock !== "all" && !blockOptions.includes(filterBlock)) setFilterBlock("all");
  }, [blockOptions, filterBlock]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const filteredReports = useMemo(
    () =>
      reports.filter((report) => {
        if (filterDate !== "all" && report.event_id !== filterDate) return false;
        if (filterArea !== "all" && report.seat_area_type !== filterArea) return false;
        if (filterBlock !== "all" && report.seat_block !== filterBlock) return false;
        return true;
      }),
    [reports, filterDate, filterArea, filterBlock],
  );

  const groupedReports = useMemo(() => {
    const groups = new Map<string, { event: CrawledEvent | undefined; date: string; reports: AfterReportCard[] }>();
    for (const report of filteredReports) {
      const event = eventMap.get(report.event_id);
      if (!groups.has(report.event_id)) {
        groups.set(report.event_id, { event, date: event?.date ?? "", reports: [] });
      }
      groups.get(report.event_id)!.reports.push(report);
    }
    return [...groups.values()].sort((a, b) => b.date.localeCompare(a.date));
  }, [filteredReports, eventMap]);

  const hasActiveFilters = filterDate !== "all" || filterArea !== "all" || filterBlock !== "all";
  const photoCount = reports.filter((report) => report.seat_view_photo_paths?.length).length;

  if (!artist) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-[#817981]">アーティストが見つかりません</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f5f6] pb-24 font-sans text-[#1c171b]">
      <section className="relative min-h-[356px] overflow-hidden bg-[#0d090d] text-white sm:min-h-[410px]">
        <Image
          src={heroImageSrc}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
          style={{ objectPosition: "center 26%" }}
          onError={() => {
            if (heroImageSrc !== DEFAULT_ARTIST_HERO_IMAGE) setHeroImageSrc(DEFAULT_ARTIST_HERO_IMAGE);
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/15 to-[#0d090d]" />
        <div className="absolute inset-x-0 bottom-0 h-[70%] bg-gradient-to-t from-[#0d090d] via-[#0d090d]/82 to-transparent" />

        <header className="zr-container relative z-10 flex h-16 items-center justify-between">
          <Link
            href={`/artists/${slug}`}
            aria-label={`${artist.name}のページへ戻る`}
            className="zr-focus flex h-11 w-11 items-center justify-center rounded-full bg-black/20 text-white backdrop-blur-md"
          >
            <ChevronLeft size={26} strokeWidth={2.7} />
          </Link>
          <AccountLink tone="light" iconSize={22} />
        </header>

        <div className="zr-container absolute inset-x-0 bottom-0 z-10 pb-7">
          <p className="text-[10px] font-black tracking-[0.24em] text-[#ff5b96]">LIVE REPORT ARCHIVE</p>
          <h1 className="mt-3 text-[36px] font-black leading-[1.08] tracking-[-0.05em] sm:text-[54px]">
            現地で見えた、<br />本当の景色。
          </h1>
          <p className="mt-4 text-[12px] font-bold text-white/65 sm:text-[14px]">
            {artist.name}の座席からの見え方・会場写真・ライブ演出
          </p>
          <div className="mt-5 grid grid-cols-3 border-y border-white/18 py-4">
            <div>
              <p className="text-[9px] font-bold tracking-[0.12em] text-white/42">REPORTS</p>
              <p className="mt-1 text-[25px] font-black">{reports.length}</p>
            </div>
            <div className="border-l border-white/18 pl-4">
              <p className="text-[9px] font-bold tracking-[0.12em] text-white/42">PHOTOS</p>
              <p className="mt-1 text-[25px] font-black">{photoCount}</p>
            </div>
            <div className="border-l border-white/18 pl-4">
              <p className="text-[9px] font-bold tracking-[0.12em] text-white/42">VENUES</p>
              <p className="mt-1 text-[25px] font-black">{new Set(events.map((event) => event.venue)).size}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="zr-container">
        <section className="border-b border-[#ded8dc] py-7" aria-labelledby="report-filter-title">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="artist-kicker">Find Your View</p>
              <h2 id="report-filter-title" className="mt-2 text-[23px] font-black tracking-[-0.04em]">座席・会場で絞り込む</h2>
            </div>
            <SlidersHorizontal size={22} strokeWidth={1.8} className="shrink-0 text-[#f43679]" />
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            <label className="min-w-0">
              <span className="mb-1.5 block text-[9px] font-black tracking-[0.14em] text-[#817981]">公演・会場</span>
              <select
                value={filterDate}
                onChange={(event) => setFilterDate(event.target.value)}
                className="zr-focus h-12 w-full min-w-0 border border-[#cfc8cc] bg-white px-3 text-[12px] font-bold text-[#1c171b]"
              >
                <option value="all">すべての公演</option>
                {dateOptions.map((option) => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="min-w-0">
              <span className="mb-1.5 block text-[9px] font-black tracking-[0.14em] text-[#817981]">座席エリア</span>
              <select
                value={filterArea}
                onChange={(event) => setFilterArea(event.target.value)}
                className="zr-focus h-12 w-full min-w-0 border border-[#cfc8cc] bg-white px-3 text-[12px] font-bold text-[#1c171b]"
              >
                <option value="all">すべてのエリア</option>
                {areaOptions.map((area) => (
                  <option key={area} value={area}>{seatAreaLabel(area)}</option>
                ))}
              </select>
            </label>
            <label className="min-w-0">
              <span className="mb-1.5 block text-[9px] font-black tracking-[0.14em] text-[#817981]">座席ブロック</span>
              <select
                value={filterBlock}
                onChange={(event) => setFilterBlock(event.target.value)}
                className="zr-focus h-12 w-full min-w-0 border border-[#cfc8cc] bg-white px-3 text-[12px] font-bold text-[#1c171b]"
              >
                <option value="all">すべてのブロック</option>
                {blockOptions.map((block) => (
                  <option key={block} value={block}>{block}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-[11px] font-bold text-[#817981]">
              <span className="text-[18px] font-black text-[#1c171b]">{filteredReports.length}</span> 件の現地レポ
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setFilterDate("all");
                  setFilterArea("all");
                  setFilterBlock("all");
                }}
                className="zr-focus flex min-h-11 items-center gap-1.5 text-[11px] font-black text-[#f43679]"
              >
                <X size={15} />条件をクリア
              </button>
            )}
          </div>
        </section>

        {loading ? (
          <div className="grid gap-px border-x border-b border-[#ded8dc] bg-[#ded8dc] sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((index) => (
              <div key={index} className="animate-pulse bg-white p-4">
                <div className="aspect-[4/3] bg-[#eee9ec]" />
                <div className="mt-4 h-4 w-2/3 bg-[#eee9ec]" />
                <div className="mt-2 h-3 w-full bg-[#f3eff1]" />
              </div>
            ))}
          </div>
        ) : filteredReports.length === 0 ? (
          <section className="border-b border-[#ded8dc] py-16 text-center">
            <Camera size={31} strokeWidth={1.5} className="mx-auto text-[#f43679]" />
            <p className="mt-4 text-[18px] font-black">この条件の現地レポはまだありません</p>
            <p className="mt-2 text-[12px] font-medium text-[#817981]">座席からの見え方を、次のファンへ残しませんか。</p>
            <Link
              href={nextEvent ? `/report?event=${nextEvent.id}` : `/report?artist=${slug}`}
              className="zr-focus mt-6 inline-flex min-h-12 items-center gap-2 bg-[#f43679] px-6 text-[13px] font-black text-white"
            >
              <SquarePen size={17} />現地レポを投稿する
            </Link>
          </section>
        ) : (
          <div className="pb-10">
            {groupedReports.map((group) => (
              <section key={group.event?.id ?? group.date} className="border-b border-[#ded8dc] py-10">
                <div className="mb-5 flex items-end justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black tracking-[0.18em] text-[#f43679]">
                      {group.event?.date ? fmtDate(group.event.date) : "DATE UNKNOWN"}
                    </p>
                    <h2 className="mt-2 flex items-center gap-2 text-[20px] font-black tracking-[-0.035em] sm:text-[25px]">
                      <MapPin size={18} strokeWidth={2} className="shrink-0 text-[#f43679]" />
                      <span className="truncate">{group.event?.venue ?? "会場不明"}</span>
                    </h2>
                  </div>
                  <p className="shrink-0 text-[10px] font-black text-[#817981]">{group.reports.length} REPORTS</p>
                </div>

                <div className="grid border-l border-t border-[#ded8dc] sm:grid-cols-2 lg:grid-cols-3">
                  {group.reports.map((report, index) => {
                    const blockRow = blockRowText(report);
                    const photoUrl = getReportPhotoUrl(report);
                    const overallBadge = overallBadgeLabel(report);
                    const structureBadges = structureBadgeLabels(report);
                    const comment = report.memo?.trim() || null;

                    return (
                      <article key={report.id} className="group flex min-w-0 flex-col border-b border-r border-[#ded8dc] bg-white">
                        <Link href={`/report/live/detail?reportId=${report.id}`} className="zr-focus block no-underline">
                          <ReportMedia photoUrl={photoUrl} index={index} />
                          <div className="p-4">
                            <div className="flex min-h-6 flex-wrap items-center gap-1.5">
                              {overallBadge && (
                                <span className="inline-flex items-center gap-1 bg-[#f43679] px-2 py-1 text-[9px] font-black text-white">
                                  <Sparkles size={10} />{overallBadge}
                                </span>
                              )}
                              {structureBadges.map((label) => (
                                <span key={label} className="border border-[#efc5d4] px-2 py-1 text-[9px] font-black text-[#c91558]">
                                  {label}
                                </span>
                              ))}
                            </div>
                            <p className="mt-3 text-[17px] font-black tracking-[-0.03em] text-[#1c171b]">
                              {blockRow ?? "座席情報なし"}
                            </p>
                            <p className={`mt-2 line-clamp-2 min-h-[40px] text-[12px] font-medium leading-5 ${comment ? "text-[#625a61]" : "text-[#aaa2a8]"}`}>
                              {comment ?? "この座席の見え方を詳しく見る"}
                            </p>
                            <div className="mt-4 flex items-center justify-between border-t border-[#eee9ec] pt-3">
                              <span className="text-[9px] font-bold tracking-[0.08em] text-[#958d93]">POSTED {fmtPostDate(report.created_at)}</span>
                              <span className="text-[10px] font-black text-[#f43679]">詳細を見る →</span>
                            </div>
                          </div>
                        </Link>
                        {report.user_id && authorMap.get(report.user_id) && (
                          <div className="mt-auto border-t border-[#eee9ec] px-4 py-3">
                            <PostAuthorLink author={authorMap.get(report.user_id)} />
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {!loading && filteredReports.length > 0 && (
        <Link
          href={nextEvent ? `/report?event=${nextEvent.id}` : `/report?artist=${slug}`}
          className="zr-focus fixed bottom-[82px] right-4 z-40 flex h-14 items-center gap-2 bg-[#f43679] px-5 text-[12px] font-black text-white shadow-[0_14px_35px_rgba(150,16,66,.28)] md:bottom-24 md:right-8"
        >
          <SquarePen size={18} />投稿する
        </Link>
      )}

      <BottomNav active="after-report" artistSlug={slug} eventId={nextEvent?.id} />
    </main>
  );
}
