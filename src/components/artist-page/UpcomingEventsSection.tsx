"use client";

import { useState } from "react";
import type { CrawledEvent } from "@/lib/types";
import { EventListRow } from "@/components/common/EventListRow";
import { EmptyState } from "@/components/common/EmptyState";
import { CalendarDays } from "lucide-react";

type Props = {
  artistName: string;
  events: CrawledEvent[];
};

const INITIAL_COUNT = 3;

export default function UpcomingEventsSection({ artistName, events }: Props) {
  const [expanded, setExpanded] = useState(false);
  const visibleEvents = expanded ? events : events.slice(0, INITIAL_COUNT);

  return (
    <section className="artist-section" id="upcoming-events">
      <p className="artist-kicker">Upcoming Live</p>
      <h2 className="artist-heading">開催予定の公演</h2>
      {events.length === 0 ? (
        <EmptyState
          className="mt-5"
          title="次回公演は発表待ちです"
          icon={<CalendarDays size={18} aria-hidden="true" />}
        />
      ) : (
        <div className="mt-5 border-t border-[#ded8dc]">
          {visibleEvents.map((event) => (
            <EventListRow key={event.id} event={event} artistName={artistName} secondary={event.venue} />
          ))}
          {!expanded && events.length > INITIAL_COUNT && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="zr-focus min-h-12 w-full border-b border-[#ded8dc] text-[12px] font-bold text-[#f43679]"
            >
              もっと見る（他{events.length - INITIAL_COUNT}件）
            </button>
          )}
        </div>
      )}
    </section>
  );
}
