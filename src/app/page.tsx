import type { Metadata } from "next";
import { cache, Suspense } from "react";
import { Calendar, Flame, Zap } from "lucide-react";
import HomeHeader from "@/components/home/HomeHeader";
import HeroBanner from "@/components/home/HeroBanner";
import VenueDiscoveryCta from "@/components/home/VenueDiscoveryCta";
import HotReportsSection from "@/components/home/HotReportsSection";
import UpcomingEventsSection from "@/components/home/UpcomingEventsSection";
import RealtimeFeedSection from "@/components/home/RealtimeFeedSection";
import SiteNewsSection from "@/components/home/SiteNewsSection";
import LoginCta from "@/components/home/LoginCta";
import SectionHeader from "@/components/home/SectionHeader";
import {
  getUpcomingHomeEvents,
  selectProvisionalFeaturedEvents,
  type HomeFeedItem,
  type UpcomingEvent,
} from "@/lib/homeData";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCachedRealtimeFeed } from "@/lib/serverHomeData";

export const metadata: Metadata = {
  title: "ちけレポ｜ライブの当落・座席・現地レポをみんなでシェア",
  description:
    "コンサートのチケット当落、座席位置、アリーナ予想図、現地レポ、セットリストを共有するサイト。ファンの報告から当選率や座席の見え方が分かります。",
  alternates: { canonical: "https://tixrepo.com/" },
  robots: { index: true, follow: true },
};

const getHomeRequestContext = cache(async () => {
  const client = await createSupabaseServerClient();
  if (!client) return null;

  return {
    client,
    upcomingEvents: getUpcomingHomeEvents(client),
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
    context.upcomingEvents,
    favoriteStatePromise,
  ]);

  return { upcomingEvents, favoriteState };
});

async function HomeFeaturedSection() {
  const { upcomingEvents, favoriteState } = await getHomeEventState();
  const favoriteSlugs = favoriteState.slugs;
  let featuredEvents: UpcomingEvent[] = [];
  let featuredTitle = "注目の公演";

  if (favoriteSlugs.size > 0) {
    featuredEvents = upcomingEvents
      .filter((event) => favoriteSlugs.has(event.artistSlug))
      .slice(0, 4);
    if (featuredEvents.length > 0) featuredTitle = "推しの公演";
  }

  if (featuredEvents.length === 0) {
    featuredEvents = selectProvisionalFeaturedEvents(upcomingEvents, 4);
  }

  return (
    <HotReportsSection
      events={featuredEvents}
      title={featuredTitle}
      favoriteUserId={favoriteState.userId}
      favoriteSlugs={favoriteSlugs}
    />
  );
}

async function HomeUpcomingSection() {
  const { upcomingEvents, favoriteState } = await getHomeEventState();
  return (
    <UpcomingEventsSection
      events={upcomingEvents}
      favoriteUserId={favoriteState.userId}
      favoriteSlugs={favoriteState.slugs}
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
        <SectionHeader icon={<Flame size={16} color="#FF6B9D" />} title="注目の公演" />
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

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <HomeHeader />
      <main>
        <HeroBanner />
        <Suspense fallback={<FeaturedEventsSkeleton />}>
          <HomeFeaturedSection />
        </Suspense>
        <Suspense fallback={<RealtimeFeedSkeleton />}>
          <HomeRealtimeSection />
        </Suspense>
        <Suspense fallback={<UpcomingEventsSkeleton />}>
          <HomeUpcomingSection />
        </Suspense>
        <section className="bg-section py-8 sm:py-16" aria-label="会場検索とマイページ">
          <div className="zr-container grid grid-cols-2 gap-3 lg:grid-cols-[1.25fr_.75fr] lg:gap-4">
            <VenueDiscoveryCta />
            <LoginCta />
          </div>
        </section>
        <SiteNewsSection />
      </main>
    </div>
  );
}
