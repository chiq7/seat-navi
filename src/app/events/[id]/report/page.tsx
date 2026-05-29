"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { SeatReportForm } from "@/components/SeatReportForm";
import { supabase } from "@/lib/supabase/client";
import { findArtistByKeyword } from "@/lib/artists";
import type { CrawledEvent } from "@/lib/types";

export default function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = use(params);
  const [event, setEvent] = useState<CrawledEvent | null>(null);

  useEffect(() => {
    supabase
      .from("events")
      .select("id, title, venue, venue_id, date, genre, lottery_types")
      .eq("id", eventId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setEvent(data as CrawledEvent);
      });
  }, [eventId]);

  const artist = event ? findArtistByKeyword(event.title) : undefined;

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/90 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Link href={`/events/${eventId}`} className="text-gray-500 hover:text-gray-700">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-base font-bold text-gray-900">{artist?.name ?? "座席を報告"}</h1>
        </div>
      </header>

      <div className="mx-auto max-w-md px-3 pt-4">
        <SeatReportForm eventId={eventId} event={event} />
      </div>
    </div>
  );
}
