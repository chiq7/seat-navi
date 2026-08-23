"use client";

import { useMemo, useState } from "react";
import { Radio } from "lucide-react";
import { BottomNav } from "@/components/common/BottomNav";
import { ReportEventSelector } from "@/components/report/ReportEventSelector";
import { resolveArtist } from "@/lib/artists";
import type { CrawledEvent } from "@/lib/types";
import { CompactEventPickerSection } from "@/components/common/CompactEventPickerSection";
import { CompactEventSummary } from "@/components/common/CompactEventSummary";
import { CompactHeroIntro } from "@/components/common/CompactHeroIntro";
import { Header } from "@/components/common/Header";

type Props = {
  initialEvents: CrawledEvent[];
  initialSelectedId: string | null;
};

export function ReportEntryClient({ initialEvents, initialSelectedId }: Props) {
  const events = initialEvents;
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId);

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
        loading={false}
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
