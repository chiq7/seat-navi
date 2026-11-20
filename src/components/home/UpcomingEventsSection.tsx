"use client";

import { Calendar, ChevronDown } from "lucide-react";
import SectionHeader from "./SectionHeader";
import UpcomingEventCard, { type UpcomingEvent } from "./UpcomingEventCard";
import SeatDiscoveryCard from "./SeatDiscoveryCard";
import type { SeatDiscoveryData } from "@/lib/seatDiscovery";
import FavoriteArtistButton from "@/components/auth/FavoriteArtistButton";
import { formatPublicDataTime, publicPageDataPaths, publicPageRefreshSeconds, type HomePrograms } from "@/lib/publicPageData";
import { useFreshPublicData } from "@/lib/useFreshPublicData";

type UpcomingEventsSectionProps = {
  events: UpcomingEvent[];
  favoriteUserId: string | null;
  favoriteSlugs: ReadonlySet<string>;
  discoveryCards?: SeatDiscoveryData[];
  live?: boolean;
};

export default function UpcomingEventsSection({ events: initialEvents, favoriteUserId, favoriteSlugs, discoveryCards: initialCards = [], live }: UpcomingEventsSectionProps) {
  const { data: { events, discoveryCards }, failed, staleAt, retry } = useFreshPublicData<HomePrograms>(
    live ? publicPageDataPaths.upcoming : undefined,
    publicPageRefreshSeconds.upcoming,
    { events: initialEvents, discoveryCards: initialCards },
  );
  const displayed = new Set(discoveryCards.flatMap(card => card.events.map(event => event.id)));
  const otherEvents = events.filter(event => !displayed.has(event.id));
  const visibleEvents = discoveryCards.length ? [] : otherEvents.slice(0, 5);
  const remainingEvents = discoveryCards.length ? otherEvents : otherEvents.slice(5);

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
      <div className="grid gap-3 md:grid-cols-2 md:gap-x-5">
        {discoveryCards.map(data => <SeatDiscoveryCard key={data.selectedEventId} data={data} favoriteControl={<FavoriteArtistButton artistSlug={data.artistSlug} initialUserId={favoriteUserId} initialFavorite={favoriteSlugs.has(data.artistSlug)} />} />)}
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
        <details className="group mt-5">
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
