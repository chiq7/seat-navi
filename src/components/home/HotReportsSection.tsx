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
    <section className="zr-section bg-[#fff5f8]">
      <div className="zr-container">
      <SectionHeader
        icon={<Flame size={16} color="#FF6B9D" />}
        title={title}
      />
      {events.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 [&>*:last-child:nth-child(odd)]:col-span-2 lg:grid-cols-5 lg:[&>*:last-child:nth-child(odd)]:col-span-1">
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
        <div className="rounded-3xl bg-white py-8 text-center">
          <p className="text-[13px] text-gray-400">まだデータがありません</p>
        </div>
      )}
      </div>
    </section>
  );
}
