"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CalendarDays, ChevronLeft, MapPin, Radio } from "lucide-react";
import Link from "next/link";
import { BottomNav } from "@/components/common/BottomNav";
import { ReportEventSelector } from "@/components/report/ReportEventSelector";
import { supabase } from "@/lib/supabase/client";
import { resolveArtist } from "@/lib/artists";
import type { CrawledEvent } from "@/lib/types";
import { AccountLink } from "@/components/auth/AccountLink";

function fmtDate(date: string | null): string {
  if (!date) return "日程未定";
  const [year, month, day] = date.split("-").map(Number);
  const week = ["日", "月", "火", "水", "木", "金", "土"][new Date(year, month - 1, day).getDay()];
  return `${year}.${String(month).padStart(2, "0")}.${String(day).padStart(2, "0")}（${week}）`;
}

export default function ReportEntryPage() {
  return (
    <Suspense fallback={null}>
      <ReportEntryPageInner />
    </Suspense>
  );
}

function ReportEntryPageInner() {
  const searchParams = useSearchParams();
  const [events, setEvents] = useState<CrawledEvent[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const preselectedEventId = searchParams.get("event");
      const preselectedArtistSlug = searchParams.get("artist");
      const { data } = await supabase
        .from("events")
        .select("id, title, venue, venue_id, date, genre, lottery_types, artist_slug")
        .order("date", { ascending: false })
        .limit(50);
      let list = (data as CrawledEvent[]) ?? [];

      let initial: string | undefined;
      if (preselectedEventId) {
        if (list.some((e) => e.id === preselectedEventId)) {
          initial = preselectedEventId;
        } else {
          const { data: single } = await supabase
            .from("events")
            .select("id, title, venue, venue_id, date, genre, lottery_types, artist_slug")
            .eq("id", preselectedEventId)
            .maybeSingle();
          if (single) {
            list = [single as CrawledEvent, ...list];
            initial = preselectedEventId;
          }
        }
      }
      if (!initial && preselectedArtistSlug) {
        initial = list.find(
          (e) => (e.artist_slug ?? resolveArtist(e)?.slug) === preselectedArtistSlug,
        )?.id;
      }
      // 3. パラメータ指定が無い場合は、登録アーティストに一致する直近公演を優先
      if (!initial) {
        initial = list.find((e) => e.artist_slug ?? resolveArtist(e)?.slug)?.id;
      }
      // 4. それも無ければ単純に一番近い公演
      if (!initial && list.length > 0) initial = list[0].id;

      setEvents(list);
      if (initial) setSelectedId(initial);
      setLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()]);

  const selectedEvent = useMemo(
    () => events.find((e) => e.id === selectedId) ?? null,
    [events, selectedId],
  );

  const artist = useMemo(
    () => (selectedEvent ? resolveArtist(selectedEvent) : undefined),
    [selectedEvent],
  );
  const backHref = artist ? `/artists/${artist.slug}` : "/";

  return (
    <main className="community-page pb-20 font-sans">
      <ReportHero artistName={artist?.name} backHref={backHref} selectedEvent={selectedEvent} />

      <section className="zr-container py-6" aria-labelledby="report-event-title">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="artist-kicker">Select Your Live</p>
            <h2 id="report-event-title" className="mt-2 text-[23px] font-black tracking-[-0.04em]">報告する公演</h2>
          </div>
          <Radio size={21} strokeWidth={1.8} className="text-[#f43679]" />
        </div>
        <label className="mt-4 block">
          <span className="sr-only">報告する公演を選択</span>
          <select
            value={selectedId ?? ""}
            onChange={(event) => setSelectedId(event.target.value)}
            disabled={loading}
            className="community-input h-14 w-full px-4 text-[12px] font-black disabled:opacity-50"
          >
            {loading && <option value="">公演を読み込み中...</option>}
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {fmtDate(event.date)}｜{event.venue}｜{event.title}
              </option>
            ))}
          </select>
        </label>
      </section>

      <ReportEventSelector
        selectedEvent={selectedEvent}
        artistName={artist?.name ?? null}
        artistSlug={artist?.slug ?? null}
      />
      <BottomNav active="report" artistSlug={artist?.slug} eventId={selectedEvent?.id} />
    </main>
  );
}

function ReportHero({
  artistName,
  backHref,
  selectedEvent,
}: {
  artistName?: string;
  backHref: string;
  selectedEvent: CrawledEvent | null;
}) {
  return (
    <section className="community-hero relative min-h-[340px] w-full overflow-hidden sm:min-h-[390px]">

      <header className="zr-container relative top-0 z-20 flex h-16 items-center justify-between">
        <Link
          href={backHref}
          aria-label="アーティストページに戻る"
          className="zr-focus flex h-11 w-11 items-center justify-center rounded-full bg-white/80 text-[#2b252b] shadow-sm backdrop-blur-md"
        >
          <ChevronLeft size={26} strokeWidth={2.7} />
        </Link>
        <AccountLink iconSize={22} />
      </header>

      <div className="zr-container relative z-10 pb-6 pt-6 sm:pb-8 sm:pt-8">
        <p className="community-eyebrow">SHARE THE LIVE</p>
        <h1 className="community-title mt-3">
          あなたの一席が、<br /><span className="text-[#ef4f87]">次の誰かのヒントになる。</span>
        </h1>
        <p className="community-subtitle mt-4">
          {artistName ? `${artistName}の当落・座席表・会場の景色をファンへ` : "当落・座席表・会場の景色をファンへ"}
        </p>

        {selectedEvent && (
          <div className="mt-5 grid rounded-[22px] border border-white/80 bg-white/72 px-4 shadow-sm backdrop-blur-sm sm:grid-cols-2">
            <div className="flex items-center gap-3 py-3 sm:border-r sm:border-[#eadfe4] sm:pr-5">
              <CalendarDays size={17} className="shrink-0 text-[#ef4f87]" />
              <p className="text-[12px] font-black">{fmtDate(selectedEvent.date)}</p>
            </div>
            <div className="flex min-w-0 items-center gap-3 border-t border-[#eadfe4] py-3 sm:border-t-0 sm:pl-5">
              <MapPin size={17} className="shrink-0 text-[#ef4f87]" />
              <p className="truncate text-[12px] font-black">{selectedEvent.venue}</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
