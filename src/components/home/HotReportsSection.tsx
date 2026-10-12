import { Flame } from "lucide-react";
import SectionHeader from "./SectionHeader";
import UpcomingEventCard, { type UpcomingEvent } from "./UpcomingEventCard";
import { EmptyState } from "@/components/common/EmptyState";

type HotReportsSectionProps = {
  events: UpcomingEvent[];
  title: string;
  favoriteUserId: string | null;
  favoriteSlugs: ReadonlySet<string>;
};

export default function HotReportsSection({ events, title, favoriteUserId, favoriteSlugs }: HotReportsSectionProps) {
  const visibleEvents = events.slice(0, 4);

  return (
    <section className="zr-section bg-[#fff5f8]">
      <div className="zr-container">
      <SectionHeader
        icon={<Flame size={16} color="#FF6B9D" />}
        title={title}
      />
      {events.length > 0 ? (
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-3">
          {visibleEvents.map((item, index) => (
            <UpcomingEventCard
              key={item.id}
              item={item}
              featured
              index={index + 1}
              favoriteUserId={favoriteUserId}
              initialFavorite={favoriteSlugs.has(item.artistSlug)}
            />
          ))}
        </div>
      ) : (
        <EmptyState title="注目の公演を準備しています" icon={<Flame size={18} aria-hidden="true" />} />
      )}
      </div>
    </section>
  );
}
