"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { findArtistBySlug } from "@/lib/artists";
import { getEventsForArtist } from "@/lib/events";
import type { CrawledEvent } from "@/lib/types";
import type { AfterReportCard } from "@/lib/artistPageTypes";
import { fmtDate, seatAreaLabel } from "@/lib/artistPageHelpers";
import { BottomNav } from "@/components/common/BottomNav";

function withSuffix(v: string | null | undefined, suffix: string): string | null {
  if (!v) return null;
  return v.endsWith(suffix) ? v : `${v}${suffix}`;
}

function fmtShortDate(d: string | null | undefined): string {
  if (!d) return "";
  const parts = d.split("-").map(Number);
  return `${parts[1]}/${parts[2]}`;
}

function seatInfoText(report: AfterReportCard, ev: CrawledEvent | undefined): string | null {
  const parts = [withSuffix(report.seat_block, "ブロック"), withSuffix(report.seat_row, "列")].filter(
    (v): v is string => Boolean(v),
  );
  const venueDate = ev ? `${ev.venue}・${fmtShortDate(ev.date)}` : null;
  const all = [...parts, venueDate].filter((v): v is string => Boolean(v));
  return all.length > 0 ? all.join("　") : null;
}

export default function AfterReportsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const artist = findArtistBySlug(slug);

  const [events, setEvents] = useState<CrawledEvent[]>([]);
  const [reports, setReports] = useState<AfterReportCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState("all");
  const [filterArea, setFilterArea] = useState("all");
  const [filterBlock, setFilterBlock] = useState("all");

  async function loadData(a: NonNullable<ReturnType<typeof findArtistBySlug>>) {
    const allEvs = await getEventsForArtist(a.slug);
    setEvents(allEvs);
    if (allEvs.length === 0) { setLoading(false); return; }
    const ids = allEvs.map(e => e.id);
    const { data: repData, error: repError } = await supabase
      .from("after_reports")
      .select("id, event_id, seat_area_type, seat_block, seat_row, seat_view_photo_paths, center_stage, torokko, kyakukudari, silver_tape_rows, fansa, memo, created_at")
      .in("event_id", ids)
      .order("created_at", { ascending: false })
      .limit(500);
    setReports((repData as AfterReportCard[]) ?? []);
    setLoading(false);
  }

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!artist) { setLoading(false); return; }
    loadData(artist);
  }, [artist]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const eventMap = useMemo(() => {
    const m = new Map<string, CrawledEvent>();
    for (const ev of events) m.set(ev.id, ev);
    return m;
  }, [events]);

  const today = new Date().toISOString().split("T")[0];

  const nextEvent = useMemo(
    () =>
      events
        .filter(ev => ev.date && ev.date >= today)
        .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""))[0] ?? events[0],
    [events, today],
  );

  const dateOptions = useMemo(() => {
    const seen = new Set<string>();
    const opts: { id: string; label: string; date: string }[] = [];
    for (const r of reports) {
      const ev = eventMap.get(r.event_id);
      if (ev && !seen.has(ev.id)) {
        seen.add(ev.id);
        opts.push({ id: ev.id, label: `${fmtDate(ev.date)} ${ev.venue}`, date: ev.date ?? "" });
      }
    }
    return opts.sort((a, b) => b.date.localeCompare(a.date));
  }, [reports, eventMap]);

  const areaOptions = useMemo(() => {
    const areas = new Set<string>();
    for (const r of reports) if (r.seat_area_type) areas.add(r.seat_area_type);
    return [...areas];
  }, [reports]);

  const blockOptions = useMemo(() => {
    const blocks = new Set<string>();
    for (const r of reports) if (r.seat_block) blocks.add(r.seat_block);
    return [...blocks].sort();
  }, [reports]);

  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      if (filterDate !== "all" && r.event_id !== filterDate) return false;
      if (filterArea !== "all" && r.seat_area_type !== filterArea) return false;
      if (filterBlock !== "all" && r.seat_block !== filterBlock) return false;
      return true;
    });
  }, [reports, filterDate, filterArea, filterBlock]);

  if (!artist) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-gray-500">アーティストが見つかりません</p>
      </div>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-[390px] bg-[#F3F4F6] pb-24 font-sans text-gray-900">
      <header className="sticky top-0 z-30 flex h-[44px] items-center justify-center border-b border-gray-100 bg-white">
        <Link
          href={`/artists/${slug}`}
          className="absolute left-2 flex h-8 w-8 items-center justify-center text-gray-700"
        >
          <ChevronLeft size={18} strokeWidth={2.5} />
        </Link>
        <h1 className="text-[13px] font-bold tracking-wide text-gray-900">
          {artist.name} 現地レポ
        </h1>
      </header>

      <div className="flex gap-2 px-4 py-3">
        <select
          value={filterDate}
          onChange={e => setFilterDate(e.target.value)}
          className="min-w-0 flex-1 truncate rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-[12px] font-semibold text-gray-700"
        >
          <option value="all">すべての公演日</option>
          {dateOptions.map(opt => (
            <option key={opt.id} value={opt.id}>{opt.label}</option>
          ))}
        </select>
        <select
          value={filterArea}
          onChange={e => setFilterArea(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-[12px] font-semibold text-gray-700"
        >
          <option value="all">エリア</option>
          {areaOptions.map(a => (
            <option key={a} value={a}>{seatAreaLabel(a)}</option>
          ))}
        </select>
        <select
          value={filterBlock}
          onChange={e => setFilterBlock(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-[12px] font-semibold text-gray-700"
        >
          <option value="all">ブロック</option>
          {blockOptions.map(b => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#FF6B9D] border-t-transparent" />
        </div>
      ) : filteredReports.length === 0 ? (
        <p className="py-12 text-center text-sm text-gray-400">現地レポはまだありません</p>
      ) : (
        <div className="mx-4 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          {filteredReports.map((report, index) => {
            const ev = eventMap.get(report.event_id);
            const text =
              report.memo?.trim() ||
              (ev ? `${fmtDate(ev.date)} ${ev.venue}` : "現地レポ");
            const seatInfo = seatInfoText(report, ev);
            return (
              <div
                key={report.id}
                className="grid min-h-11 grid-cols-[56px_1fr_18px] items-center gap-3 border-b border-gray-100 px-2.5 py-1.5 last:border-b-0"
              >
                <ReportThumb index={index} />
                <div className="min-w-0">
                  {seatInfo && (
                    <p className="truncate text-[12px] font-bold text-gray-700">{seatInfo}</p>
                  )}
                  <p className="truncate text-[14px] font-medium text-gray-900">{text}</p>
                </div>
                <ChevronRight size={19} strokeWidth={2.2} className="text-gray-500" />
              </div>
            );
          })}
        </div>
      )}

      <BottomNav active="after-report" artistSlug={slug} eventId={nextEvent?.id} />
    </main>
  );
}

function ReportThumb({ index }: { index: number }) {
  const positions = ["30%", "45%", "70%", "52%"];
  return (
    <div className="h-[34px] w-14 overflow-hidden rounded-md bg-[#100716]">
      <div
        className="h-full w-full"
        style={{
          background:
            `radial-gradient(circle at ${positions[index % positions.length]} 22%, rgba(255,255,255,0.9) 0 3px, transparent 4px), ` +
            "linear-gradient(115deg, rgba(255,107,157,0.7), transparent 36%), " +
            "repeating-linear-gradient(90deg, rgba(255,107,157,0.95) 0 1px, transparent 1px 6px), " +
            "linear-gradient(180deg, #2b1230, #050306)",
        }}
      />
    </div>
  );
}
