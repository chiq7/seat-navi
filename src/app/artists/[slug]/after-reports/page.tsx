"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { findArtistBySlug } from "@/lib/artists";
import { getEventsForArtist } from "@/lib/events";
import { supabase } from "@/lib/supabase/client";
import { parseEventTitle } from "@/lib/eventTitle";
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
import { Header } from "@/components/common/Header";
import { ReportThumb } from "@/components/artist-page/ReportThumb";
import { EventInfoRow } from "@/components/common/EventInfoRow";
import { PostAuthorLink } from "@/components/common/PostAuthorLink";
import { fetchVisiblePostAuthors, type PostAuthor } from "@/lib/postAuthors";

function fmtShortDate(d: string | null | undefined): string {
  if (!d) return "";
  const parts = d.split("-").map(Number);
  return `${parts[1]}/${parts[2]}`;
}

function fmtPostDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
}

/** 神席/良席バッジは背景画像で表現する */
function overallBadgeBgImage(label: string | null): string | null {
  if (label === "神席") return "/images/after-reports/kamiseki-bg1.png";
  if (label === "良席") return "/images/after-reports/ryoseki-bg1.png";
  return null;
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

  async function loadData(a: NonNullable<ReturnType<typeof findArtistBySlug>>) {
    const allEvs = await getEventsForArtist(a.slug);
    setEvents(allEvs);
    if (allEvs.length === 0) { setLoading(false); return; }
    const ids = allEvs.map(e => e.id);
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

  // ページ上部のEventInfoRow: 「公演」プルダウンで特定公演が選ばれていればその公演、
  // 「すべて」選択時はnextEvent（直近/代表公演）を表示する。
  const headerEvent = filterDate !== "all" ? eventMap.get(filterDate) : nextEvent;

  // レポートが存在する公演だけを選択肢に出す
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
    for (const r of reports) {
      if (filterDate !== "all" && r.event_id !== filterDate) continue;
      if (r.seat_area_type) areas.add(r.seat_area_type);
    }
    return [...areas];
  }, [reports, filterDate]);

  const blockOptions = useMemo(() => {
    const blocks = new Set<string>();
    for (const r of reports) {
      if (filterDate !== "all" && r.event_id !== filterDate) continue;
      if (filterArea !== "all" && r.seat_area_type !== filterArea) continue;
      if (r.seat_block) blocks.add(r.seat_block);
    }
    return [...blocks].sort();
  }, [reports, filterDate, filterArea]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (filterArea !== "all" && !areaOptions.includes(filterArea)) {
      setFilterArea("all");
    }
  }, [areaOptions, filterArea]);

  useEffect(() => {
    if (filterBlock !== "all" && !blockOptions.includes(filterBlock)) {
      setFilterBlock("all");
    }
  }, [blockOptions, filterBlock]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      if (filterDate !== "all" && r.event_id !== filterDate) return false;
      if (filterArea !== "all" && r.seat_area_type !== filterArea) return false;
      if (filterBlock !== "all" && r.seat_block !== filterBlock) return false;
      return true;
    });
  }, [reports, filterDate, filterArea, filterBlock]);

  const groupedReports = useMemo(() => {
    const groups = new Map<string, { ev: CrawledEvent | undefined; date: string; reports: AfterReportCard[] }>();
    for (const r of filteredReports) {
      const ev = eventMap.get(r.event_id);
      if (!groups.has(r.event_id)) {
        groups.set(r.event_id, { ev, date: ev?.date ?? "", reports: [] });
      }
      groups.get(r.event_id)!.reports.push(r);
    }
    return [...groups.values()].sort((a, b) => b.date.localeCompare(a.date));
  }, [filteredReports, eventMap]);

  if (!artist) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-gray-500">アーティストが見つかりません</p>
      </div>
    );
  }

  const headerParsed = headerEvent ? parseEventTitle(headerEvent.title, artist.name) : null;

  return (
    <main className="min-h-screen bg-[#FFF8FB] pb-24 font-sans text-gray-900">
      <Header title={`${artist.name} 現地レポ`} backHref={`/artists/${slug}`} />

      {headerEvent && headerParsed && (
        <div className="mx-3 mt-3 overflow-hidden rounded-2xl border border-gray-100 bg-white px-3 py-0.5 shadow-sm">
          <EventInfoRow
            title={headerParsed.tourName}
            artistName={artist.name}
            isTestData={headerParsed.isTestData}
            venue={headerEvent.venue}
            dateLabel={fmtShortDate(headerEvent.date)}
          />
        </div>
      )}

      <div className="grid grid-cols-3 gap-1.5 px-3 py-3">
        <select
          value={filterDate}
          onChange={e => setFilterDate(e.target.value)}
          className="w-full min-w-0 truncate rounded-lg border border-gray-200 bg-white px-1.5 py-1.5 text-[12px] font-semibold text-gray-700"
        >
          <option value="all">公演</option>
          {dateOptions.map(opt => (
            <option key={opt.id} value={opt.id}>{opt.label}</option>
          ))}
        </select>
        <select
          value={filterArea}
          onChange={e => setFilterArea(e.target.value)}
          className="w-full min-w-0 truncate rounded-lg border border-gray-200 bg-white px-1.5 py-1.5 text-[12px] font-semibold text-gray-700"
        >
          <option value="all" hidden>エリア</option>
          {areaOptions.map(a => (
            <option key={a} value={a}>{seatAreaLabel(a)}</option>
          ))}
        </select>
        <select
          value={filterBlock}
          onChange={e => setFilterBlock(e.target.value)}
          className="w-full min-w-0 truncate rounded-lg border border-gray-200 bg-white px-1.5 py-1.5 text-[12px] font-semibold text-gray-700"
        >
          <option value="all" hidden>ブロック</option>
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
        <div className="space-y-3">
          {groupedReports.map((group, gi) => {
            return (
            <div key={gi} className="px-3">
              <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                <p className="px-3 pt-2 text-[13px] font-bold text-gray-900">
                  {group.ev ? `${fmtDate(group.ev.date)} ${group.ev.venue}` : "会場・日付不明"}
                </p>
                <div className="mb-1 mt-1.5 border-t border-gray-100" />
                {group.reports.map((report, index) => {
                  const blockRow = blockRowText(report);
                  const photoUrl = getReportPhotoUrl(report);
                  const overallBadge = overallBadgeLabel(report);
                  const structureBadges = structureBadgeLabels(report);
                  const comment = report.memo?.trim() || null;
                  const bgImage = overallBadgeBgImage(overallBadge);
                  return (
                    <div key={report.id} className="border-b border-gray-100 last:border-b-0">
                    <Link
                      href={`/report/live/detail?reportId=${report.id}`}
                      className="flex min-h-[104px] items-stretch gap-2 overflow-hidden no-underline"
                    >
                      <div className="self-center">
                        <ReportThumb index={index} photoUrl={photoUrl} />
                      </div>
                      {/* 写真を除いた右側カラム(最外wrapper): 2px分だけ白枠を残し、背景は少しズームして端の黒みを隠す */}
                      <div
                        className="m-0.5 flex min-w-0 flex-1 items-center self-stretch rounded-lg"
                        style={
                          bgImage
                            ? {
                                backgroundImage: `url('${bgImage}')`,
                                backgroundSize: "104%",
                                backgroundPosition: "center top",
                                height: "100%",
                              }
                            : undefined
                        }
                      >
                        {/* テキストの可読性用に内側だけpaddingを持たせる(背景の見え方は縮まない) */}
                        <div className="min-w-0 flex-1 px-2 py-1.5">
                          {/* 1行目: バッジ(常に高さを確保し、無い場合は非表示にして高さだけ残す) */}
                          <div
                            className={`flex max-w-[70%] min-h-[20px] flex-wrap items-center justify-start gap-0.5 ${structureBadges.length > 0 ? "" : "invisible"}`}
                          >
                            {(structureBadges.length > 0 ? structureBadges : ["-"]).map((label) => (
                              <span
                                key={label}
                                className="rounded-full bg-[#FFF1F6] px-1.5 py-0.5 text-[10px] font-bold text-[#FF6B9D]"
                              >
                                {label}
                              </span>
                            ))}
                          </div>
                          {/* 2行目: 座席情報 */}
                          <p className="mt-1 truncate text-[14px] font-bold text-gray-900">
                            {blockRow ?? "座席情報なし"}
                          </p>
                          {/* 3行目: コメント(1行でも2行でも高さが変わらないよう2行分を確保) */}
                          <p
                            className={`mt-1 line-clamp-2 min-h-[33px] text-[12px] leading-snug text-gray-500 ${comment ? "" : "invisible"}`}
                          >
                            {comment || " "}
                          </p>
                          {/* 4行目: 投稿日 */}
                          <p className="mt-1 text-[9px] text-gray-400">
                            投稿日 {fmtPostDate(report.created_at)}
                          </p>
                        </div>
                      </div>
                    </Link>
                    {report.user_id && authorMap.get(report.user_id) && (
                      <div className="px-3 pb-2">
                        <PostAuthorLink author={authorMap.get(report.user_id)} />
                      </div>
                    )}
                    </div>
                  );
                })}
              </div>
            </div>
            );
          })}
        </div>
      )}

      <BottomNav active="after-report" artistSlug={slug} eventId={nextEvent?.id} />
    </main>
  );
}
