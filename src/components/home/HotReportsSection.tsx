"use client";

import { useEffect, useState } from "react";
import { Flame } from "lucide-react";
import SectionHeader from "./SectionHeader";
import UpcomingEventCard, { type UpcomingEvent } from "./UpcomingEventCard";
import { getHotHomeEvents } from "@/lib/homeData";

const cardBackgrounds = [
  "/images/cards/card-red.png",
  "/images/cards/card-blue.png",
  "/images/cards/card-green.png",
  "/images/cards/card-purple.png",
  "/images/cards/card-yellow.png",
];

export default function HotReportsSection() {
  const [events, setEvents] = useState<UpcomingEvent[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getHotHomeEvents().then((rows) => {
      if (!cancelled) setEvents(rows);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="mt-3">
      <SectionHeader
        icon={<Flame size={16} color="#FF6B9D" />}
        title="報告急増中の公演"
      />
      {events && events.length > 0 ? (
        <div className="flex w-full gap-2 overflow-x-auto px-3 pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&>a]:w-[150px]">
          {events.map((item, index) => (
            <UpcomingEventCard
              key={item.id}
              item={item}
              backgroundImage={cardBackgrounds[index % cardBackgrounds.length]}
              legacyHot
            />
          ))}
          <div className="shrink-0 w-1" />
        </div>
      ) : (
        <div className="px-4 py-8 text-center">
          <p className="text-[13px] text-gray-400">まだデータがありません</p>
        </div>
      )}
    </section>
  );
}
