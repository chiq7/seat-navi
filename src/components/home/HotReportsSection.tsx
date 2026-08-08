import { ChevronDown, Flame } from "lucide-react";
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
  const visibleEvents = events.slice(0, 4);
  const remainingEvents = events.slice(4);

  return (
    <section className="zr-section bg-[#fff5f8]">
      <div className="zr-container">
      <SectionHeader
        icon={<Flame size={16} color="#FF6B9D" />}
        title={title}
      />
      {events.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 [&>*:last-child:nth-child(odd)]:col-span-2 lg:grid-cols-5 lg:[&>*:last-child:nth-child(odd)]:col-span-1">
          {visibleEvents.map((item, index) => (
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
      {remainingEvents.length > 0 && (
        <details className="group mt-5">
          <summary className="zr-focus mx-auto flex min-h-11 w-fit cursor-pointer list-none items-center gap-2 rounded-full bg-white px-5 text-[12px] font-black text-[#d83d72]">
            残り{remainingEvents.length}件を見る
            <ChevronDown size={15} className="transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
            {remainingEvents.map((item, index) => (
              <UpcomingEventCard
                key={item.id}
                item={item}
                backgroundImage={cardBackgrounds[(index + 4) % cardBackgrounds.length]}
                featured
                index={index + 5}
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
