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
    <section className="mt-3">
      <SectionHeader
        icon={<Flame size={16} color="#FF6B9D" />}
        title={title}
      />
      {events.length > 0 ? (
        <div className="flex w-full gap-2 overflow-x-auto px-3 pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {events.map((item, index) => (
            <UpcomingEventCard
              key={item.id}
              item={item}
              backgroundImage={cardBackgrounds[index % cardBackgrounds.length]}
              featured
              favoriteUserId={favoriteUserId}
              initialFavorite={favoriteSlugs.has(item.artistSlug)}
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
