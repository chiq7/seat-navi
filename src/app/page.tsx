import type { Metadata } from "next";
import { cache, Suspense } from "react";
import { Calendar, Map, Zap } from "lucide-react";
import HomeVenueDirectory from "@/components/home/HomeVenueDirectory";
import { VENUE_REGION_GROUPS } from "@/lib/venueRegions";
import { SEO_VENUES } from "@/lib/venueSeo";
import { getPublicVenueName, getPublicVenueSeatGuideHref } from "@/lib/publicVenueGuides";
import HomeHeader from "@/components/home/HomeHeader";
import HeroBanner from "@/components/home/HeroBanner";
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
import {
  type HomeFeedItem,
  type UpcomingEvent,
} from "@/lib/homeData";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getJstDateString } from "@/lib/artistPageData";
import { getCachedRealtimeFeed, getCachedUpcomingHomeEvents } from "@/lib/serverHomeData";

export const metadata: Metadata = {
  title: "ちけレポ｜ライブの座席表・当落・現地レポ",
  description:
    "ライブ・コンサートの座席表、座席報告、アリーナ予想図、チケット当落、現地レポ、セットリストを共有。会場別の座席検索やアクセス・ロッカー情報と、ファンの投稿から席の見え方を確認できます。",
  alternates: { canonical: "https://tixrepo.com/" },
  robots: { index: true, follow: true },
};

const getHomeRequestContext = cache(async () => {
  const client = await createSupabaseServerClient();
  if (!client) return null;

  return {
    client,
    auth: client.auth.getUser(),
  };
});

const getHomeEventState = cache(async () => {
  const context = await getHomeRequestContext();
  if (!context) {
    return {
      upcomingEvents: [] as UpcomingEvent[],
      favoriteState: { userId: null, slugs: new Set<string>() },
    };
  }

  const favoriteStatePromise = context.auth.then(async (authResult) => {
    const userId = authResult.data.user?.id;
    if (!userId) return { userId: null, slugs: new Set<string>() };

    const { data: favorites } = await context.client
      .from("favorite_artists")
      .select("artist_slug")
      .eq("user_id", userId);
    return {
      userId,
      slugs: new Set((favorites ?? []).map((item: { artist_slug: string }) => item.artist_slug)),
    };
  });

  const [upcomingEvents, favoriteState] = await Promise.all([
    getCachedUpcomingHomeEvents(),
    favoriteStatePromise,
  ]);

  return { upcomingEvents: upcomingEvents.filter(event => event.dateIso && event.dateIso >= getJstDateString()), favoriteState };
});

async function HomeUpcomingSection() {
  const { upcomingEvents, favoriteState } = await getHomeEventState();
  const discoveryCards = await loadHomeSeatDiscovery(selectSeatDiscoveryHomeEvents(upcomingEvents, favoriteState.slugs)).catch(() => []);
  return (
    <UpcomingEventsSection
      events={upcomingEvents}
      favoriteUserId={favoriteState.userId}
      favoriteSlugs={favoriteState.slugs}
      discoveryCards={discoveryCards}
    />
  );
}

async function HomeRealtimeSection() {
  const feedItems: HomeFeedItem[] = await getCachedRealtimeFeed(20);
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
        <SeatDiscoveryCard data={data} preview />
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
    <div className="min-h-screen bg-background">
      <HomeHeader />
      <main>
        <HeroBanner />
        <HomeVenueDirectory featured regions={venueRegions} venues={venueLinks} />
        {preview && <Suspense fallback={<FeaturedEventsSkeleton />}><SeatDiscoveryPilot state={query["seat-card-state"]} /></Suspense>}
        <Suspense fallback={<UpcomingEventsSkeleton />}>
          <HomeUpcomingSection />
        </Suspense>
        <Suspense fallback={<RealtimeFeedSkeleton />}>
          <HomeRealtimeSection />
        </Suspense>
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
