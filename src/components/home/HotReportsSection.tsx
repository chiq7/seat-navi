"use client";

import { useEffect, useState } from "react";
import { Flame } from "lucide-react";
import SectionHeader from "./SectionHeader";
import UpcomingEventCard, { type UpcomingEvent } from "./UpcomingEventCard";
import { getFeaturedHomeEvents, getUpcomingHomeEvents } from "@/lib/homeData";
import { supabase } from "@/lib/supabase/client";

const cardBackgrounds = [
  "/images/cards/card-red.png",
  "/images/cards/card-blue.png",
  "/images/cards/card-green.png",
  "/images/cards/card-purple.png",
  "/images/cards/card-yellow.png",
];

export default function HotReportsSection() {
  const [events, setEvents] = useState<UpcomingEvent[] | null>(null);
  const [title, setTitle] = useState("注目の公演");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;
      if (userId) {
        const { data: favorites } = await supabase
          .from("favorite_artists")
          .select("artist_slug")
          .eq("user_id", userId);
        const slugs = new Set((favorites ?? []).map((item: { artist_slug: string }) => item.artist_slug));
        if (slugs.size > 0) {
          const rows = (await getUpcomingHomeEvents()).filter((event) => slugs.has(event.artistSlug)).slice(0, 10);
          if (rows.length > 0) {
            if (!cancelled) { setTitle("推しの公演"); setEvents(rows); }
            return;
          }
        }
      }
      const rows = await getFeaturedHomeEvents();
      if (!cancelled) { setTitle("注目の公演"); setEvents(rows); }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="mt-3">
      <SectionHeader
        icon={<Flame size={16} color="#FF6B9D" />}
        title={title}
      />
      {events && events.length > 0 ? (
        <div className="flex w-full gap-2 overflow-x-auto px-3 pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&>a]:w-[150px]">
          {events.map((item, index) => (
            <UpcomingEventCard
              key={item.id}
              item={item}
              backgroundImage={cardBackgrounds[index % cardBackgrounds.length]}
              featured
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
