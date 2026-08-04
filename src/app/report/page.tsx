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
    <main className="min-h-screen bg-[#f7f5f6] pb-20 font-sans text-[#1c171b]">
      <ReportHero artistName={artist?.name} backHref={backHref} selectedEvent={selectedEvent} />

      <section className="zr-container border-b border-[#ded8dc] py-5" aria-labelledby="report-event-title">
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
            className="zr-focus h-14 w-full border border-[#cfc8cc] bg-white px-4 text-[12px] font-black text-[#1c171b] disabled:opacity-50"
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
    <section className="relative min-h-[340px] w-full overflow-hidden bg-[#0d090d] text-white sm:min-h-[390px]">
      <div className="absolute inset-0 opacity-75" style={{ background: "radial-gradient(circle at 76% 18%, rgba(244,54,121,.72), transparent 24%), radial-gradient(circle at 22% 38%, rgba(60,160,190,.28), transparent 28%), linear-gradient(135deg, #0d090d 0%, #25101d 55%, #080608 100%)" }} />
      <div className="absolute inset-0" style={{ backgroundImage: "repeating-linear-gradient(112deg, transparent 0 40px, rgba(255,255,255,.035) 41px 42px)" }} />

      <header className="zr-container relative top-0 z-20 flex h-16 items-center justify-between">
        <Link
          href={backHref}
          aria-label="アーティストページに戻る"
          className="zr-focus flex h-11 w-11 items-center justify-center rounded-full bg-black/20 text-white backdrop-blur-md"
        >
          <ChevronLeft size={26} strokeWidth={2.7} />
        </Link>
        <AccountLink tone="light" iconSize={22} />
      </header>

      <div className="zr-container relative z-10 pb-6 pt-6 sm:pb-8 sm:pt-8">
        <p className="text-[10px] font-black tracking-[0.24em] text-[#ff5b96]">SHARE THE LIVE</p>
        <h1 className="mt-3 text-[39px] font-black leading-[1.08] tracking-[-0.055em] sm:text-[60px] lg:text-[74px]">
          あなたの一席が、<br />次の誰かのヒントになる。
        </h1>
        <p className="mt-4 text-[12px] font-bold leading-6 text-white/62 sm:text-[15px]">
          {artistName ? `${artistName}の当落・座席表・会場の景色をファンへ` : "当落・座席表・会場の景色をファンへ"}
        </p>

        {selectedEvent && (
          <div className="mt-5 grid border-y border-white/18 sm:grid-cols-2">
            <div className="flex items-center gap-3 py-3 sm:border-r sm:border-white/18 sm:pr-5">
              <CalendarDays size={17} className="shrink-0 text-[#ff5b96]" />
              <p className="text-[12px] font-black">{fmtDate(selectedEvent.date)}</p>
            </div>
            <div className="flex min-w-0 items-center gap-3 border-t border-white/18 py-3 sm:border-t-0 sm:pl-5">
              <MapPin size={17} className="shrink-0 text-[#ff5b96]" />
              <p className="truncate text-[12px] font-black">{selectedEvent.venue}</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
