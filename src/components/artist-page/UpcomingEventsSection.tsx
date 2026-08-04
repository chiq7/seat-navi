"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import { parseEventTitle } from "@/lib/eventTitle";
import type { CrawledEvent } from "@/lib/types";

type Props = {
  artistName: string;
  events: CrawledEvent[];
};

function formatDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const weekday = ["日", "月", "火", "水", "木", "金", "土"][new Date(year, month - 1, day).getDay()];
  return `${month}/${day}（${weekday}）`;
}

const INITIAL_COUNT = 3;

export default function UpcomingEventsSection({ artistName, events }: Props) {
  const [expanded, setExpanded] = useState(false);
  const visibleEvents = expanded ? events : events.slice(0, INITIAL_COUNT);

  return (
    <section className="artist-section" id="upcoming-events">
      <p className="artist-kicker">Upcoming Live</p>
      <h2 className="artist-heading">開催予定の公演</h2>
      {events.length === 0 ? (
        <div className="mt-5 border-y border-[#ded8dc] px-4 py-6 text-center">
          <p className="text-[12px] font-semibold text-gray-500">次回公演 発表待ち</p>
        </div>
      ) : (
        <div className="mt-5 border-t border-[#ded8dc]">
          {visibleEvents.map((event) => {
            const parsed = parseEventTitle(event.title, artistName);
            return (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="zr-focus group grid min-h-[96px] grid-cols-[72px_1fr_18px] items-center gap-4 border-b border-[#ded8dc] py-3 no-underline transition-colors hover:bg-white sm:grid-cols-[110px_1fr_22px] sm:px-4"
              >
                <div className="border-r border-[#ded8dc] pr-3 text-[11px] font-semibold text-[#746c73]">
                  <span className="inline-flex flex-col items-start gap-1">
                    <CalendarDays size={13} className="text-[#FF6B9D]" aria-hidden="true" />
                    {formatDate(event.date!)}
                  </span>
                </div>
                <div className="min-w-0">
                  <span className="inline-flex min-w-0 items-center gap-1 text-[10px] text-[#8d858c]">
                    <MapPin size={13} className="shrink-0 text-[#FF6B9D]" aria-hidden="true" />
                    <span className="truncate">{event.venue}</span>
                  </span>
                  <div className="mt-2 flex items-start gap-1.5">
                    <p className="min-w-0 flex-1 text-[14px] font-black leading-snug text-[#1c171b] sm:text-[16px]">{parsed.tourName}</p>
                    {parsed.isTestData && (
                      <span className="shrink-0 rounded bg-gray-200 px-1.5 py-0.5 text-[9px] font-bold text-gray-500">
                        テストデータ
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-[#f43679] transition-transform group-hover:translate-x-1">→</span>
              </Link>
            );
          })}
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
