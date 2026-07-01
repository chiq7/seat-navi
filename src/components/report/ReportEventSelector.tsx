"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronRight, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { findArtistByKeyword } from "@/lib/artists";
import type { CrawledEvent } from "@/lib/types";

function fmtShortDate(d: string | null): string {
  if (!d) return "日程未定";
  const [, m, day] = d.split("-").map(Number);
  const w = ["日", "月", "火", "水", "木", "金", "土"][new Date(d).getDay()];
  return `${m}/${day}(${w})`;
}

type CardLinkProps = {
  href: string | null;
  children: React.ReactNode;
};

function CardLink({ href, children }: CardLinkProps) {
  if (href) {
    return (
      <Link
        href={href}
        className="flex items-center gap-4 rounded-[24px] border border-[#F3F4F6] bg-white p-4 shadow-sm transition-transform active:scale-[0.99]"
      >
        {children}
      </Link>
    );
  }
  return (
    <div className="flex cursor-default items-center gap-4 rounded-[24px] border border-[#F3F4F6] bg-white p-4 opacity-40 shadow-sm">
      {children}
    </div>
  );
}

export function ReportEventSelector() {
  const [events, setEvents] = useState<CrawledEvent[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("events")
        .select("id, title, venue, venue_id, date, genre, lottery_types")
        .gte("date", today)
        .order("date", { ascending: true })
        .limit(50);
      const list = (data as CrawledEvent[]) ?? [];
      setEvents(list);
      if (list.length > 0) setSelectedId(list[0].id);
      setLoading(false);
    }
    load();
  }, []);

  const selectedEvent = useMemo(
    () => events.find((e) => e.id === selectedId) ?? null,
    [events, selectedId],
  );

  const artistSlug = useMemo(
    () => (selectedEvent ? (findArtistByKeyword(selectedEvent.title)?.slug ?? null) : null),
    [selectedEvent],
  );

  const dayMap = useMemo(() => {
    const map = new Map<string, number>();
    const venueGroups = new Map<string, CrawledEvent[]>();
    for (const ev of events) {
      const v = ev.venue ?? "";
      if (!venueGroups.has(v)) venueGroups.set(v, []);
      venueGroups.get(v)!.push(ev);
    }
    for (const [, evs] of venueGroups) {
      const sorted = [...evs].sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
      sorted.forEach((ev, i) => map.set(ev.id, i + 1));
    }
    return map;
  }, [events]);

  const arenaHref = selectedEvent ? `/events/${selectedEvent.id}/fan-seat-prediction` : null;
  const liveHref = "/report/live";
  const setlistHref = artistSlug ? `/artists/${artistSlug}/setlist` : null;

  return (
    <>
      {/* 公演を選択 */}
      <section className="mt-5">
        <p className="mb-2 px-4 text-[13px] font-bold text-[#111827]">公演を選択</p>

        {loading ? (
          <div className="flex gap-2 px-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-[72px] w-[128px] shrink-0 animate-pulse rounded-lg bg-gray-100" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <p className="px-4 text-[12px] text-gray-400">公演情報が見つかりませんでした</p>
        ) : (
          <div className="overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex gap-2">
              {events.map((ev) => {
                const isSel = ev.id === selectedId;
                const dayNum = dayMap.get(ev.id) ?? 1;
                return (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => setSelectedId(ev.id)}
                    className={`relative flex w-[128px] shrink-0 flex-col rounded-lg p-2.5 text-left transition-all active:scale-95 ${
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
                  </button>
                );
              })}
              <div className="w-1 shrink-0" />
            </div>
          </div>
        )}
      </section>

      {/* 報告タイプカード */}
      <div className="mt-5 px-4">
        <div className="mb-3 flex items-center gap-1.5">
          <Sparkles size={17} strokeWidth={2} className="text-[#FF6B9D]" />
          <h2 className="text-[18px] font-bold text-[#111827]">報告する内容を選んでください</h2>
        </div>

        <div className="space-y-3">
          {/* 当落・座席を報告 */}
          <CardLink href="/report/ticket">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[18px]">
              <Image
                src="/images/report/icons/report-ticket-seat-icon1.png"
                alt=""
                width={64}
                height={64}
                className="h-full w-full object-cover object-center"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[17px] font-bold leading-tight text-[#111827]">当落・座席を報告</p>
              <p className="mt-1 text-[13px] leading-snug text-[#6B7280]">
                当選・落選、抽選種別、座席情報をまとめて共有
              </p>
              <p className="mt-1 text-[11px] font-semibold text-[#FF6B9D]">当落・座席レポートページへ</p>
            </div>
            <ChevronRight size={20} strokeWidth={2} className="shrink-0 text-[#D1D5DB]" />
          </CardLink>

          {/* アリーナ予想図を投稿 */}
          <CardLink href={arenaHref}>
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[18px]">
              <Image
                src="/images/report/icons/report-arena-prediction-icon1.png"
                alt=""
                width={64}
                height={64}
                className="h-full w-full object-cover object-center"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[17px] font-bold leading-tight text-[#111827]">アリーナ予想図を投稿</p>
              <p className="mt-1 text-[13px] leading-snug text-[#6B7280]">
                座席ドットを見て、花道・センステ予想を共有
              </p>
              <p className={`mt-1 text-[11px] font-semibold ${arenaHref ? "text-[#FF6B9D]" : "text-[#6B7280]"}`}>
                {arenaHref ? "アリーナ予想投稿ページへ" : "公演を選択してください"}
              </p>
            </div>
            {arenaHref && <ChevronRight size={20} strokeWidth={2} className="shrink-0 text-[#D1D5DB]" />}
          </CardLink>

          {/* 現地レポを投稿 */}
          <CardLink href={liveHref}>
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[18px]">
              <Image
                src="/images/report/icons/report-local-icon1.png"
                alt=""
                width={64}
                height={64}
                className="h-full w-full object-cover object-center"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[17px] font-bold leading-tight text-[#111827]">現地レポを投稿</p>
              <p className="mt-1 text-[13px] leading-snug text-[#6B7280]">
                会場の混雑、グッズ列、雰囲気を共有
              </p>
              <p className={`mt-1 text-[11px] font-semibold ${liveHref ? "text-[#FF6B9D]" : "text-[#6B7280]"}`}>
                {liveHref ? "現地レポフォームページへ" : "公演を選択してください"}
              </p>
            </div>
            {liveHref && <ChevronRight size={20} strokeWidth={2} className="shrink-0 text-[#D1D5DB]" />}
          </CardLink>

          {/* セトリを投稿 */}
          <CardLink href={setlistHref}>
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[18px]">
              <Image
                src="/images/report/icons/report-setlist-icon1.png"
                alt=""
                width={64}
                height={64}
                className="h-full w-full object-cover object-center"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[17px] font-bold leading-tight text-[#111827]">セトリを投稿</p>
              <p className="mt-1 text-[13px] leading-snug text-[#6B7280]">曲順やMC、演出メモを共有</p>
              <p className={`mt-1 text-[11px] font-semibold ${setlistHref ? "text-[#FF6B9D]" : "text-[#6B7280]"}`}>
                {setlistHref ? "セトリの投稿掲載ページへ" : "公演を選択してください"}
              </p>
            </div>
            {setlistHref && <ChevronRight size={20} strokeWidth={2} className="shrink-0 text-[#D1D5DB]" />}
          </CardLink>
        </div>
      </div>
    </>
  );
}
