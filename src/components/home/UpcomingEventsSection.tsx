import Link from "next/link";
import { Calendar } from "lucide-react";
import SectionHeader from "./SectionHeader";
import UpcomingEventCard, { type UpcomingEvent } from "./UpcomingEventCard";

type UpcomingEventsSectionProps = {
  events: UpcomingEvent[];
  favoriteUserId: string | null;
  favoriteSlugs: ReadonlySet<string>;
};

export default function UpcomingEventsSection({ events, favoriteUserId, favoriteSlugs }: UpcomingEventsSectionProps) {
  const visibleEvents = events.slice(0, 10);

  return (
    <section className="zr-section bg-white">
      <div className="zr-container">
      <SectionHeader
        icon={<Calendar size={16} color="#FF6B9D" />}
        title="開催が近い公演"
      />
      <div className="grid gap-3 md:grid-cols-2 md:gap-x-5">
        {visibleEvents.map((item) => (
          <UpcomingEventCard
            key={item.id}
            item={item}
            favoriteUserId={favoriteUserId}
            initialFavorite={favoriteSlugs.has(item.artistSlug)}
          />
        ))}
      </div>
      {events.length > visibleEvents.length && (
        <div className="mt-7 text-center">
          <Link
            href="/search"
            className="zr-focus inline-flex min-h-11 items-center justify-center rounded-full bg-[#fff0f5] px-5 text-[12px] font-black text-[#d83d72] transition hover:bg-[#ffe2ec]"
          >
            アーティスト・会場から公演を探す
          </Link>
        </div>
      )}
      </div>
    </section>
  );
}
