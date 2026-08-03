import { Calendar } from "lucide-react";
import SectionHeader from "./SectionHeader";
import UpcomingEventCard, { type UpcomingEvent } from "./UpcomingEventCard";

type UpcomingEventsSectionProps = {
  events: UpcomingEvent[];
  favoriteUserId: string | null;
  favoriteSlugs: ReadonlySet<string>;
};

export default function UpcomingEventsSection({ events, favoriteUserId, favoriteSlugs }: UpcomingEventsSectionProps) {

  return (
    <section className="zr-section bg-white">
      <div className="zr-container">
      <SectionHeader
        icon={<Calendar size={16} color="#FF6B9D" />}
        title="開催が近い公演"
      />
      <div className="grid gap-x-8 border-t border-[#d8d1d6] md:grid-cols-2">
        {events.map((item) => (
          <UpcomingEventCard
            key={item.id}
            item={item}
            favoriteUserId={favoriteUserId}
            initialFavorite={favoriteSlugs.has(item.artistSlug)}
          />
        ))}
      </div>
      </div>
    </section>
  );
}
