import { Calendar, ChevronDown } from "lucide-react";
import SectionHeader from "./SectionHeader";
import UpcomingEventCard, { type UpcomingEvent } from "./UpcomingEventCard";

type UpcomingEventsSectionProps = {
  events: UpcomingEvent[];
  favoriteUserId: string | null;
  favoriteSlugs: ReadonlySet<string>;
};

export default function UpcomingEventsSection({ events, favoriteUserId, favoriteSlugs }: UpcomingEventsSectionProps) {
  const visibleEvents = events.slice(0, 10);
  const remainingEvents = events.slice(10);

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
      {remainingEvents.length > 0 && (
        <details className="group mt-7">
          <summary className="zr-focus mx-auto flex min-h-11 w-fit cursor-pointer list-none items-center justify-center gap-2 rounded-full bg-[#fff0f5] px-5 text-[12px] font-black text-[#d83d72] transition hover:bg-[#ffe2ec]">
            残り{remainingEvents.length}件の公演を見る
            <ChevronDown size={15} className="transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {remainingEvents.map((item) => (
              <UpcomingEventCard
                key={item.id}
                item={item}
                favoriteUserId={favoriteUserId}
                initialFavorite={favoriteSlugs.has(item.artistSlug)}
              />
            ))}
          </div>
        </details>
      )}
      </div>
    </section>
  );
}
