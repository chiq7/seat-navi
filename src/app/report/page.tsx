"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Radio } from "lucide-react";
import { BottomNav } from "@/components/common/BottomNav";
import { ReportEventSelector } from "@/components/report/ReportEventSelector";
import { supabase } from "@/lib/supabase/client";
import { resolveArtist } from "@/lib/artists";
import type { CrawledEvent } from "@/lib/types";
import { CompactEventPickerSection } from "@/components/common/CompactEventPickerSection";
import { CompactEventSummary } from "@/components/common/CompactEventSummary";
import { CompactHeroIntro } from "@/components/common/CompactHeroIntro";
import { Header } from "@/components/common/Header";
import { getEventsForArtist } from "@/lib/events";

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
      let list: CrawledEvent[];
      if (preselectedArtistSlug) {
        list = (await getEventsForArtist(preselectedArtistSlug)).sort((a, b) =>
          (b.date ?? "").localeCompare(a.date ?? ""),
        );
      } else {
        const { data } = await supabase
          .from("events")
          .select("id, title, venue, venue_id, date, genre, lottery_types, artist_slug")
          .order("date", { ascending: false })
          .limit(50);
        list = (data as CrawledEvent[]) ?? [];
      }

      let initial: string | undefined;
      if (preselectedEventId) {
        if (list.some((e) => e.id === preselectedEventId)) {
          initial = preselectedEventId;
        } else if (!preselectedArtistSlug) {
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

      setEvents(list);
      // TOPや共通ナビからの /report は中立状態にする。URLで公演または
      // アーティストが明示された場合だけ、その文脈を引き継ぐ。
      setSelectedId(initial ?? null);
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
  const backLabel = artist ? "アーティストページに戻る" : "TOPへ戻る";

  return (
    <main className="community-page pb-20 font-sans">
      <ReportHero artistName={artist?.name} backHref={backHref} backLabel={backLabel} selectedEvent={selectedEvent} />

      <CompactEventPickerSection
        headingId="report-event-title"
        title="報告する公演"
        side={<Radio size={19} strokeWidth={1.8} className="text-[#f43679]" aria-hidden="true" />}
        events={events}
        selectedEventId={selectedId}
        onSelect={setSelectedId}
        loading={loading}
        eyebrow="SELECT YOUR LIVE"
        includeTitle
      />

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
  backLabel,
  selectedEvent,
}: {
  artistName?: string;
  backHref: string;
  backLabel: string;
  selectedEvent: CrawledEvent | null;
}) {
  return (
    <section className="community-hero relative w-full overflow-hidden">

      <Header title="報告" backHref={backHref} backLabel={backLabel} />

      <CompactHeroIntro
        eyebrow="SHARE THE LIVE"
        title="ライブを"
        accent="報告する"
        subtitle={artistName ? `${artistName}の当落・座席・現地情報を共有` : "当落・座席・現地情報を共有"}
        icon={<Radio size={21} strokeWidth={1.8} className="text-[#ef4f87]" />}
        className="relative z-10"
      >
        {selectedEvent && (
          <CompactEventSummary
            date={selectedEvent.date}
            venue={selectedEvent.venue}
            className="mt-3"
          />
        )}
      </CompactHeroIntro>
    </section>
  );
}
