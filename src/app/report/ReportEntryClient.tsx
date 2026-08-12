"use client";

import { useEffect, useMemo, useState } from "react";
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

type Props = {
  initialEventId: string | null;
  initialArtistSlug: string | null;
};

export function ReportEntryClient({ initialEventId, initialArtistSlug }: Props) {
  const [events, setEvents] = useState<CrawledEvent[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setEvents([]);
      setSelectedId(null);
      try {
        let anchorEvent: CrawledEvent | null = null;
        if (initialEventId && !initialArtistSlug) {
          const { data } = await supabase
            .from("events")
            .select("id, title, venue, venue_id, date, genre, lottery_types, artist_slug")
            .eq("id", initialEventId)
            .maybeSingle();
          anchorEvent = (data as CrawledEvent) ?? null;
        }

        const targetArtistSlug = initialArtistSlug
          ?? (anchorEvent?.artist_slug ?? (anchorEvent ? resolveArtist(anchorEvent)?.slug : null));
        let list: CrawledEvent[];
        if (targetArtistSlug) {
          list = (await getEventsForArtist(targetArtistSlug)).sort((a, b) =>
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
        if (initialEventId) {
          if (list.some((event) => event.id === initialEventId)) initial = initialEventId;
          else if (anchorEvent) {
            list = [anchorEvent, ...list];
            initial = initialEventId;
          }
        }
        if (!initial && targetArtistSlug) {
          initial = list.find(
            (event) => (event.artist_slug ?? resolveArtist(event)?.slug) === targetArtistSlug,
          )?.id;
        }

        if (!cancelled) {
          setEvents(list);
          setSelectedId(initial ?? null);
        }
      } catch {
        // 公演取得に失敗しても、投稿先カードと戻る導線は残す。
        if (!cancelled) {
          setEvents([]);
          setSelectedId(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [initialArtistSlug, initialEventId]);

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedId) ?? null,
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
      <ReportEventSelector selectedEvent={selectedEvent} artistName={artist?.name ?? null} artistSlug={artist?.slug ?? null} />
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
        {selectedEvent && <CompactEventSummary date={selectedEvent.date} venue={selectedEvent.venue} className="mt-3" />}
      </CompactHeroIntro>
    </section>
  );
}
