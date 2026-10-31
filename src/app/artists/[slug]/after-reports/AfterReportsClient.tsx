"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import ArtistGroupPhoto from "@/components/common/ArtistGroupPhoto";
import { getArtistGroupImage } from "@/lib/artistGroupImages";
import Link from "next/link";
import {
  MapPin,
  SlidersHorizontal,
  SquarePen,
  X,
} from "lucide-react";
import { findArtistBySlug } from "@/lib/artists";
import { fmtDate, seatAreaLabel } from "@/lib/artistPageHelpers";
import { BottomNav } from "@/components/common/BottomNav";
import { Header } from "@/components/common/Header";
import { SelectControl } from "@/components/common/SelectControl";
import { EmptyState } from "@/components/common/EmptyState";
import { ReportTimelineList } from "@/components/artist-page/ReportSection";
import type { InitialAfterReports } from "@/lib/publicArtistContent";
import type { CrawledEvent } from "@/lib/types";
import type { AfterReportCard } from "@/lib/artistPageTypes";
import {
  DEFAULT_ARTIST_HERO_IMAGE,
  resolveArtistHeroImage,
} from "@/lib/artistPageData";

export default function AfterReportsClient({ slug, initial }: { slug: string; initial: InitialAfterReports }) {
  const artist = findArtistBySlug(slug);

  const { events, reports } = initial;
  const authorMap = useMemo(() => new Map(initial.authors.map(author => [author.id, author])), [initial.authors]);
  const [filterDate, setFilterDate] = useState("all");
  const [filterArea, setFilterArea] = useState("all");
  const [filterBlock, setFilterBlock] = useState("all");
  const [heroImageSrc, setHeroImageSrc] = useState(() =>
    resolveArtistHeroImage(artist?.heroImage),
  );

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
    <main className="community-page pb-20 font-sans">
      <section className={getArtistGroupImage(slug) ? "relative overflow-hidden bg-[#8d6578] text-white" : "relative min-h-[274px] overflow-hidden bg-[#8d6578] text-white sm:min-h-[348px]"}>
        {!getArtistGroupImage(slug) && <><Image
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
        <div className="absolute inset-0 bg-gradient-to-b from-[#765065]/48 via-[#8d6578]/18 to-[#8d6578]/92" />
        <div className="absolute inset-x-0 bottom-0 h-[72%] bg-gradient-to-t from-[#8d6578] via-[#8d6578]/84 to-transparent" /></>}

        <Header title="現地レポ" backHref={`/artists/${slug}`} backLabel={`${artist.name}のページへ戻る`} />

        {getArtistGroupImage(slug) && <ArtistGroupPhoto key={slug} slug={slug} name={artist.name} variant="hero" priority />}
        <div className={getArtistGroupImage(slug) ? "zr-container relative z-10 pb-5 pt-5 sm:pb-7" : "zr-container absolute inset-x-0 bottom-0 z-10 pb-5 sm:pb-7"}>
          <p className="text-[10px] font-black tracking-[0.24em] text-[#ffb1cb]">LIVE REPORTS</p>
          <h1 className="mt-2 text-[29px] font-black leading-[1.1] tracking-[-0.05em] sm:text-[44px]">現地レポ・座席からの見え方</h1>
          <p className="mt-2 text-[11px] font-bold text-white/76 sm:text-[13px]">{artist.name}</p>
          <div className="mt-3 grid grid-cols-3 border-y border-white/18 py-2.5 sm:mt-4 sm:py-3">
            <div>
              <p className="text-[9px] font-bold tracking-[0.12em] text-white/42">REPORTS</p>
              <p className="mt-0.5 text-[21px] font-black">{reports.length}</p>
            </div>
            <div className="border-l border-white/18 pl-4">
              <p className="text-[9px] font-bold tracking-[0.12em] text-white/42">PHOTOS</p>
              <p className="mt-0.5 text-[21px] font-black">{photoCount}</p>
            </div>
            <div className="border-l border-white/18 pl-4">
              <p className="text-[9px] font-bold tracking-[0.12em] text-white/42">VENUES</p>
              <p className="mt-0.5 text-[21px] font-black">{new Set(events.map((event) => event.venue)).size}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="zr-container">
        <section className="mt-5 border-y border-[#ded8dc] bg-white py-4 sm:mt-6 sm:px-4 sm:py-5" aria-labelledby="report-filter-title">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="artist-kicker">Find Your View</p>
              <h2 id="report-filter-title" className="mt-1 text-[22px] font-black tracking-[-0.04em]">条件を絞る</h2>
            </div>
            <SlidersHorizontal size={22} strokeWidth={1.8} className="shrink-0 text-[#f43679]" />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <label className="col-span-2 min-w-0 sm:col-span-1">
              <span className="mb-1.5 block text-[9px] font-black tracking-[0.14em] text-[#817981]">公演・会場</span>
              <SelectControl
                value={filterDate}
                onChange={(event) => setFilterDate(event.target.value)}
              >
                <option value="all">すべての公演</option>
                {dateOptions.map((option) => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </SelectControl>
            </label>
            <label className="min-w-0">
              <span className="mb-1.5 block text-[9px] font-black tracking-[0.14em] text-[#817981]">座席エリア</span>
              <SelectControl
                value={filterArea}
                onChange={(event) => setFilterArea(event.target.value)}
              >
                <option value="all">すべてのエリア</option>
                {areaOptions.map((area) => (
                  <option key={area} value={area}>{seatAreaLabel(area)}</option>
                ))}
              </SelectControl>
            </label>
            <label className="min-w-0">
              <span className="mb-1.5 block text-[9px] font-black tracking-[0.14em] text-[#817981]">座席ブロック</span>
              <SelectControl
                value={filterBlock}
                onChange={(event) => setFilterBlock(event.target.value)}
              >
                <option value="all">すべてのブロック</option>
                {blockOptions.map((block) => (
                  <option key={block} value={block}>{block}</option>
                ))}
              </SelectControl>
            </label>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-[11px] font-bold text-[#817981]">
              <span className="text-[18px] font-black text-[#4b4148]">{filteredReports.length}</span> 件の現地レポ
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

        {filteredReports.length === 0 ? (
          <EmptyState
            className="my-8"
            title="この条件の現地レポはまだありません"
            icon={<SquarePen size={18} aria-hidden="true" />}
            actionHref={nextEvent ? `/report/live?event=${nextEvent.id}` : "/report/live"}
            actionLabel="投稿する"
            actionIcon={<SquarePen size={14} aria-hidden="true" />}
            actionTone="primary"
          />
        ) : (
          <div className="pb-10">
            {groupedReports.map((group) => (
              <section key={group.event?.id ?? group.date} className="py-7 sm:py-9">
                <div className="mb-3 flex items-end justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black tracking-[0.18em] text-[#f43679]">
                      {group.event?.date ? fmtDate(group.event.date) : "DATE UNKNOWN"}
                    </p>
                    <h2 className="mt-1 flex items-center gap-2 text-[19px] font-black tracking-[-0.035em] sm:text-[23px]">
                      <MapPin size={18} strokeWidth={2} className="shrink-0 text-[#f43679]" />
                      <span className="truncate">{group.event?.venue ?? "会場不明"}</span>
                    </h2>
                  </div>
                  <p className="shrink-0 text-[10px] font-black text-[#817981]">{group.reports.length} REPORTS</p>
                </div>

                <ReportTimelineList reports={group.reports} authorMap={authorMap} />
              </section>
            ))}
          </div>
        )}
      </div>

      {filteredReports.length > 0 && (
        <Link
          href={nextEvent ? `/report/live?event=${nextEvent.id}` : "/report/live"}
          className="community-primary-button fixed bottom-[82px] right-4 z-40 h-14 gap-2 px-5 md:bottom-24 md:right-8"
        >
          <SquarePen size={18} />投稿する
        </Link>
      )}

      <BottomNav active="after-report" artistSlug={slug} eventId={nextEvent?.id} />
    </main>
  );
}
