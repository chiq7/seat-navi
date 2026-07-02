"use client";

import { useEffect, useState } from "react";
import { Calendar } from "lucide-react";
import SectionHeader from "./SectionHeader";
import UpcomingEventCard from "./UpcomingEventCard";
import { supabase } from "@/lib/supabase/client";
import type { CrawledEvent } from "@/lib/types";

export default function UpcomingEventsSection() {
  const [events, setEvents] = useState<CrawledEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("events")
        .select("id, title, venue, venue_id, date, genre")
        .gte("date", today)
        .order("date", { ascending: true })
        .limit(5);
      setEvents((data as CrawledEvent[]) ?? []);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <section className="mt-5">
      <SectionHeader
        icon={<Calendar size={16} color="#FF6B9D" />}
        title="開催が近い公演"
      />
      {loading ? (
        <div className="flex gap-2.5 overflow-x-auto px-4 pb-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-[88px] w-[104px] shrink-0 animate-pulse rounded-2xl bg-gray-100" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="mx-4 rounded-2xl border border-gray-100 bg-white py-8 text-center shadow-sm">
          <p className="text-[13px] text-gray-400">現在表示できる公演はありません</p>
        </div>
      ) : (
        <div className="flex gap-2.5 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {events.map((event) => (
            <UpcomingEventCard key={event.id} event={event} />
          ))}
          <div className="shrink-0 w-1" />
        </div>
      )}
    </section>
  );
}
