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
    <section className="mt-3 px-3" id="upcoming-events">
      <h2 className="mb-3 text-[18px] font-bold leading-none text-gray-900">開催予定の公演</h2>
      {events.length === 0 ? (
        <div className="rounded-2xl border border-pink-100 bg-white px-4 py-3 text-center shadow-sm">
          <p className="text-[12px] font-semibold text-gray-500">次回公演 発表待ち</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-pink-100 bg-white shadow-sm">
          {visibleEvents.map((event, index) => {
            const parsed = parseEventTitle(event.title, artistName);
            return (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className={`block px-4 py-3 no-underline active:bg-[#FFF8FB] ${
                  index < visibleEvents.length - 1 ? "border-b border-gray-100" : ""
                }`}
              >
                <div className="flex items-center gap-2 text-[11px] font-semibold text-gray-500">
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays size={13} className="text-[#FF6B9D]" aria-hidden="true" />
                    {formatDate(event.date!)}
                  </span>
                  <span className="inline-flex min-w-0 items-center gap-1">
                    <MapPin size={13} className="shrink-0 text-[#FF6B9D]" aria-hidden="true" />
                    <span className="truncate">{event.venue}</span>
                  </span>
                </div>
                <div className="mt-1 flex items-start gap-1.5">
                  <p className="min-w-0 flex-1 text-[13px] font-bold leading-snug text-gray-900">{parsed.tourName}</p>
                  {parsed.isTestData && (
                    <span className="shrink-0 rounded bg-gray-200 px-1.5 py-0.5 text-[9px] font-bold text-gray-500">
                      テストデータ
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
          {!expanded && events.length > INITIAL_COUNT && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="w-full border-t border-gray-100 py-2.5 text-[12px] font-bold text-[#FF6B9D]"
            >
              もっと見る（他{events.length - INITIAL_COUNT}件）
            </button>
          )}
        </div>
      )}
    </section>
  );
}
