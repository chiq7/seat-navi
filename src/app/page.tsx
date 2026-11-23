import type { Metadata } from "next";
import { cache, Suspense } from "react";
import { Calendar, Map, Zap } from "lucide-react";
import HomeVenueDirectory from "@/components/home/HomeVenueDirectory";
import { VENUE_REGION_GROUPS } from "@/lib/venueRegions";
import { SEO_VENUES } from "@/lib/venueSeo";
import { getVenuePhotoCounts } from "@/lib/serverSeatPhotoVenues";
import { getPublicVenueName, getPublicVenueSeatGuideHref } from "@/lib/publicVenueGuides";
import HomeHeader from "@/components/home/HomeHeader";
import HomeFeatureBanners from "@/components/home/HomeFeatureBanners";
import HomeQuickSearch from "@/components/home/HomeQuickSearch";
import HomeHeroPromoBanner from "@/components/home/HomeHeroPromoBanner";
import UpcomingEventsSection from "@/components/home/UpcomingEventsSection";
import RealtimeFeedSection from "@/components/home/RealtimeFeedSection";
import SiteNewsSection from "@/components/home/SiteNewsSection";
import LoginCta from "@/components/home/LoginCta";
import SectionHeader from "@/components/home/SectionHeader";
import SeatDiscoveryCard from "@/components/home/SeatDiscoveryCard";
import seatDiscoveryStyles from "@/components/home/SeatDiscoveryCard.module.css";
import { isSeatDiscoveryPreview, type SeatDiscoveryData } from "@/lib/seatDiscovery";
import { loadSeatDiscovery, loadHomeSeatDiscovery } from "@/lib/serverSeatDiscovery";
import { selectSeatDiscoveryHomeEvents } from "@/lib/homeSeatSelection";
import type { HomeFeedItem } from "@/lib/homeData";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getJstDateString } from "@/lib/artistPageData";
import { getCachedRealtimeFeed, getCachedUpcomingHomeEvents } from "@/lib/serverHomeData";
import { STATIC_PUBLIC_PAGES } from "@/lib/publicPageData";
import { getRequestPublicEventCatalog } from "@/lib/publicEventCatalogContext";
import { HOME_DESCRIPTION, HOME_TITLE } from "@/lib/metadata";

export const metadata: Metadata = {
  title: HOME_TITLE,
  description: HOME_DESCRIPTION,
  alternates: { canonical: "https://tixrepo.com/" },
  robots: { index: true, follow: true },
};

const getHomeUpcomingEvents = cache(getCachedUpcomingHomeEvents);

async function getHomeFavorites() {
  const client = await createSupabaseServerClient({ requireSession: true });
  if (!client) return { userId: null, slugs: new Set<string>() };
  const { data: auth } = await client.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return { userId: null, slugs: new Set<string>() };
  const { data: favorites } = await client
    .from("favorite_artists")
    .select("artist_slug")
    .eq("user_id", userId);
  return {
    userId,
    slugs: new Set((favorites ?? []).map((item: { artist_slug: string }) => item.artist_slug)),
  };
}

async function HomeUpcomingSection() {
  const [upcomingEvents, favoriteState] = await Promise.all([
    getRequestPublicEventCatalog().then(catalog => catalog?.home.events ?? getHomeUpcomingEvents()),
    getHomeFavorites(),
  ]);
  const today = getJstDateString();
  const events = upcomingEvents.filter(event => event.dateIso && event.dateIso >= today);
  const live = STATIC_PUBLIC_PAGES && !favoriteState.userId;
  const discoveryCards = live ? [] : await loadHomeSeatDiscovery(selectSeatDiscoveryHomeEvents(events, favoriteState.slugs)).catch(() => []);
  return (
    <UpcomingEventsSection
      events={events}
      initialDay={today}
      favoriteUserId={favoriteState.userId}
      favoriteSlugs={favoriteState.slugs}
      discoveryCards={discoveryCards}
      venuePhotoCounts={getVenuePhotoCounts()}
      live={live}
    />
  );
}

async function HomeRealtimeSection() {
  const feedItems: HomeFeedItem[] = await getCachedRealtimeFeed(20, getHomeUpcomingEvents());
  return <RealtimeFeedSection items={feedItems} />;
}

function FeaturedEventsSkeleton() {
  return (
    <section className="zr-section bg-section" aria-hidden="true">
      <div className="zr-container">
        <SectionHeader icon={<Map size={16} color="#FF6B9D" />} title="みんなの座席表" />
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-3">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="h-[108px] animate-pulse rounded-[16px] bg-white shadow-sm" />
          ))}
        </div>
      </div>
    </section>
  );
}

function UpcomingEventsSkeleton() {
  return (
    <section className="zr-section bg-white" aria-hidden="true">
      <div className="zr-container">
        <SectionHeader icon={<Calendar size={16} color="#FF6B9D" />} title="開催が近い公演" />
        <div className="grid gap-3 md:grid-cols-2">
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <div key={index} className="h-[92px] animate-pulse rounded-2xl bg-[#faf7f8]" />
          ))}
        </div>
      </div>
    </section>
  );
}

function RealtimeFeedSkeleton() {
  return (
    <section className="mt-3" aria-hidden="true">
      <SectionHeader icon={<Zap size={16} color="#FF6B9D" />} title="リアルタイム速報" />
      <div className="mx-4 divide-y divide-gray-100 rounded-xl border border-gray-100 bg-white shadow-sm">
        {[0, 1, 2].map((index) => (
          <div key={index} className="animate-pulse px-3 py-3">
            <div className="flex items-center gap-1.5">
              <div className="h-5 w-16 rounded bg-pink-100" />
              <div className="h-3 w-20 rounded-full bg-gray-200" />
              <div className="ml-auto h-2.5 w-28 rounded-full bg-gray-100" />
            </div>
            <div className="mt-2.5 h-3 w-4/5 rounded-full bg-gray-100" />
          </div>
        ))}
      </div>
    </section>
  );
}

async function SeatDiscoveryPilot({ state }: { state?: string }) {
  const liveData = await loadSeatDiscovery();
  const isPopulatedSample = state === "populated";
  const isStateTest = state === "empty" || state === "external" || isPopulatedSample;
  const data: SeatDiscoveryData = isPopulatedSample && liveData.events.length
    ? {
        ...liveData, status: "ready", limited: false, externalObservations: [],
        reports: ["A2", "A3", "B2", "B3", "D5", "D6", "E5", "E6", "F5", "F6"].flatMap((block, blockIndex) =>
          Array.from({ length: 12 }, (_, index) => ({
            id: `sample-seat-${blockIndex}-${index}`, event_id: liveData.events[index % liveData.events.length].id,
            block, row_num: 2 + Math.floor(index / 4) * 4, seat_num: 3 + (index % 4) * 7,
            lottery_type: "fc1", lottery_name: null, lottery_round: null, comment: null,
            created_at: "2026-09-20T00:00:00Z",
          }))),
        lottery: { status: "reported", eventIds: liveData.events.map(event => event.id),
          scopeLabel: "京セラ 9/19・9/20", lotteryLabel: "抽選種別合算・報告内", won: 64, lost: 36,
          normalArena: { won: 24, total: 60 }, upgrade: { won: 5, total: 20 } },
      }
    : isStateTest && liveData.status === "ready"
    ? { ...liveData, reports: [], externalObservations: state === "external" ? liveData.externalObservations : [] }
    : liveData;
  return (
    <section className={seatDiscoveryStyles.section} aria-label="座席カードのローカル試作">
      <div className={seatDiscoveryStyles.shell}>
        <p className={seatDiscoveryStyles.previewLabel}>ローカル試作 · {isPopulatedSample ? "サンプル：座席・当選率は架空の表示例" : isStateTest ? "表示テスト" : "実データ"}</p>
        <SeatDiscoveryCard data={data} venuePhotoCounts={getVenuePhotoCounts()} preview />
      </div>
    </section>
  );
}

export default async function Home({ searchParams }: { searchParams: Promise<{ "seat-card-preview"?: string | string[]; "seat-card-state"?: string }> }) {
  const query = await searchParams;
  const preview = isSeatDiscoveryPreview(process.env.NODE_ENV, query["seat-card-preview"]);
  const venueRegions = VENUE_REGION_GROUPS.map(({ id, label }) => ({ id, label }));
  const venueLinks = VENUE_REGION_GROUPS.flatMap(group => group.venueIds.flatMap(id => {
    const venue = SEO_VENUES.find(item => item.id === id);
    const href = getPublicVenueSeatGuideHref(id);
    return venue && href ? [{ id, name: getPublicVenueName(id, venue.name), region: group.id, href }] : [];
  }));
  return (
    <div className="min-h-screen bg-background" data-home-program-day={getJstDateString()}>
      <HomeHeader />
      <main>
        <HomeFeatureBanners />
        <HomeQuickSearch />
        {preview && <Suspense fallback={<FeaturedEventsSkeleton />}><SeatDiscoveryPilot state={query["seat-card-state"]} /></Suspense>}
        <div id="upcoming-events" className="scroll-mt-16"><Suspense fallback={<UpcomingEventsSkeleton />}>
          <HomeUpcomingSection />
        </Suspense></div>
        {STATIC_PUBLIC_PAGES ? <RealtimeFeedSection live /> : (
          <Suspense fallback={<RealtimeFeedSkeleton />}>
            <HomeRealtimeSection />
          </Suspense>
        )}
        <HomeVenueDirectory regions={venueRegions} venues={venueLinks} />
        <HomeHeroPromoBanner />
        <section className="bg-section py-4 sm:py-6" aria-label="マイページ">
          <div className="zr-container max-w-[760px]">
            <LoginCta />
          </div>
        </section>
        <SiteNewsSection />
      </main>
    </div>
  );
}
