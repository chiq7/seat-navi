"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { BottomNav } from "@/components/common/BottomNav";
import { ReportEventSelector } from "@/components/report/ReportEventSelector";
import { supabase } from "@/lib/supabase/client";
import { resolveArtist } from "@/lib/artists";
import type { CrawledEvent } from "@/lib/types";

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
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("events")
        .select("id, title, venue, venue_id, date, genre, lottery_types, artist_slug")
        .gte("date", today)
        .order("date", { ascending: true })
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

  return (
    <main className="mx-auto min-h-screen max-w-[390px] bg-white pb-28 font-sans text-[#111827]">
      <ReportHero artistName={artist?.name} />
      <ReportEventSelector
        selectedEvent={selectedEvent}
        artistName={artist?.name ?? null}
        artistSlug={artist?.slug ?? null}
      />
      <BottomNav active="report" artistSlug={artist?.slug} eventId={selectedEvent?.id} />
    </main>
  );
}

function ReportHero({ artistName }: { artistName?: string }) {
  return (
    <section className="relative h-[286px] w-full overflow-hidden">
      <Image
        src="/images/report/backgrounds/report-hero-choice-a-bg1.png"
        alt=""
        fill
        priority
        sizes="(max-width: 390px) 100vw, 390px"
        className="object-cover object-[center_62%]"
      />
      <div className="absolute inset-0 bg-white/22" />

      <header className="absolute left-0 right-0 top-0 z-10 flex h-16 items-center justify-between px-4">
        <Link
          href="/"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/40"
        >
          <ChevronLeft size={24} strokeWidth={2.5} className="text-[#111827]" />
        </Link>
        <h1 className="absolute left-1/2 -translate-x-1/2 truncate px-14 text-[18px] font-bold tracking-[0.02em] text-[#111827]">
          {artistName || "報告する"}
        </h1>
        <div className="h-10 w-10" />
      </header>

      <div className="relative z-10 px-6 pt-[76px] text-center">
        <p className="text-[24px] font-bold leading-[1.45] text-[#111827]">
          あなたの報告が、
          <br />
          次の参戦の<span className="text-[#FF6B9D]">ヒント</span>になる
        </p>
        <p className="mt-3 text-[13px] text-[#374151]">
          当落・座席・現地の様子をみんなで共有しよう
        </p>
      </div>

    </section>
  );
}
