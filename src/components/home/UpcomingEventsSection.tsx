"use client";

import { Calendar, ChevronDown } from "lucide-react";
import SectionHeader from "./SectionHeader";
import UpcomingEventCard, { type UpcomingEvent } from "./UpcomingEventCard";
import SeatDiscoveryCard from "./SeatDiscoveryCard";
import type { SeatDiscoveryData } from "@/lib/seatDiscovery";
import FavoriteArtistButton from "@/components/auth/FavoriteArtistButton";
import { formatPublicDataTime, publicPageDataPaths, publicPageRefreshSeconds, type HomePrograms } from "@/lib/publicPageData";
import { useFreshPublicData } from "@/lib/useFreshPublicData";
import { useJstDay } from "@/lib/useJstDay";
import { upcomingHomePrograms } from "@/lib/upcomingHomePrograms";

type UpcomingEventsSectionProps = {
  events: UpcomingEvent[];
  favoriteUserId: string | null;
  favoriteSlugs: ReadonlySet<string>;
  discoveryCards?: SeatDiscoveryData[];
  venuePhotoCounts?: Readonly<Record<string, number>>;
  live?: boolean;
  initialDay?: string;
};

export default function UpcomingEventsSection({ events: initialEvents, favoriteUserId, favoriteSlugs, discoveryCards: initialCards = [], venuePhotoCounts, live, initialDay }: UpcomingEventsSectionProps) {
  const today = useJstDay(initialDay);
  const { data, failed, staleAt, retry } = useFreshPublicData<HomePrograms>(
    live ? publicPageDataPaths.upcoming : undefined,
    publicPageRefreshSeconds.upcoming,
    { events: initialEvents, discoveryCards: initialCards },
  );
  const { events, discoveryCards } = upcomingHomePrograms(data, today);
  const displayed = new Set(discoveryCards.flatMap(card => card.events.map(event => event.id)));
  const otherEvents = events.filter(event => !displayed.has(event.id));
  const visibleEvents = discoveryCards.length ? [] : otherEvents.slice(0, 2);
  const remainingEvents = discoveryCards.length ? otherEvents : otherEvents.slice(2);
  const visibleCards = discoveryCards.slice(0, 2);
  const remainingCards = discoveryCards.slice(2);

  return (
    <section className="bg-white py-6 sm:py-9">
      <div className="zr-container">
      <SectionHeader
        icon={<Calendar size={16} color="#FF6B9D" />}
        title="開催が近い公演"
      />
      {failed && <p className="mb-2 text-sm" role="status">最新の公演を確認できませんでした。<button type="button" className="zr-focus ml-2 min-h-11 underline" onClick={retry}>再試行</button></p>}
      {staleAt && <p className="mb-2 text-sm" role="status">{formatPublicDataTime(staleAt)}時点の公演予定です。</p>}
      {staleAt && events.length === 0 && <p className="text-sm">保存分に開催予定はありません。</p>}
      {!staleAt && !failed && !events.length && !discoveryCards.length && <p className="text-sm text-[#706670]">現在、掲載中の開催予定はありません。</p>}
      <div className="grid gap-3 md:grid-cols-2 md:gap-x-5">
        {visibleCards.map(data => <SeatDiscoveryCard key={data.artistSlug} data={data} venuePhotoCounts={venuePhotoCounts} favoriteControl={<FavoriteArtistButton artistSlug={data.artistSlug} initialUserId={favoriteUserId} initialFavorite={favoriteSlugs.has(data.artistSlug)} />} />)}
        {visibleEvents.map((item) => (
          <UpcomingEventCard
            key={item.id}
            item={item}
            venuePhotoCounts={venuePhotoCounts}
            favoriteUserId={favoriteUserId}
            initialFavorite={favoriteSlugs.has(item.artistSlug)}
          />
        ))}
      </div>
      {(remainingEvents.length > 0 || remainingCards.length > 0) && (
        <details className="group mt-5">
          <summary className="zr-focus mx-auto flex min-h-11 w-fit cursor-pointer list-none items-center justify-center gap-2 rounded-full bg-[#fff0f5] px-5 text-[12px] font-black text-[#d83d72] transition hover:bg-[#ffe2ec]">
            ほかの公演を見る（{remainingCards.length + remainingEvents.length}件）
            <ChevronDown size={15} className="transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {remainingCards.map(data => <SeatDiscoveryCard key={data.artistSlug} data={data} venuePhotoCounts={venuePhotoCounts} favoriteControl={<FavoriteArtistButton artistSlug={data.artistSlug} initialUserId={favoriteUserId} initialFavorite={favoriteSlugs.has(data.artistSlug)} />} />)}
            {remainingEvents.map((item) => (
              <UpcomingEventCard
                key={item.id}
                item={item}
            venuePhotoCounts={venuePhotoCounts}
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
