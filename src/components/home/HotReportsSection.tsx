import { Flame } from "lucide-react";
import SectionHeader from "./SectionHeader";
import UpcomingEventCard, { type UpcomingEvent } from "./UpcomingEventCard";

const cardBackgrounds = [
  "/images/cards/card-red.png",
  "/images/cards/card-blue.png",
  "/images/cards/card-green.png",
  "/images/cards/card-purple.png",
  "/images/cards/card-yellow.png",
];

type HotReportsSectionProps = {
  events: UpcomingEvent[];
  title: string;
  favoriteUserId: string | null;
  favoriteSlugs: ReadonlySet<string>;
};

export default function HotReportsSection({ events, title, favoriteUserId, favoriteSlugs }: HotReportsSectionProps) {

  return (
    <section className="zr-section bg-[#f7f5f6]">
      <div className="zr-container">
      <SectionHeader
        icon={<Flame size={16} color="#FF6B9D" />}
        title={title}
      />
      {events.length > 0 ? (
        <div className="grid border-t border-[#d8d1d6] sm:grid-cols-2 lg:grid-cols-5">
          {events.map((item, index) => (
            <UpcomingEventCard
              key={item.id}
              item={item}
              backgroundImage={cardBackgrounds[index % cardBackgrounds.length]}
              featured
              index={index + 1}
              favoriteUserId={favoriteUserId}
              initialFavorite={favoriteSlugs.has(item.artistSlug)}
            />
          ))}
        </div>
      ) : (
        <div className="border-y border-[#d8d1d6] py-12 text-center">
          <p className="text-[13px] text-gray-400">まだデータがありません</p>
        </div>
      )}
      </div>
    </section>
  );
}
