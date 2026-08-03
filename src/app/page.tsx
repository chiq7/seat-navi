import type { Metadata } from "next";
import { cache, Suspense } from "react";
import { Calendar, Flame, Zap } from "lucide-react";
import HomeHeader from "@/components/home/HomeHeader";
import HeroBanner from "@/components/home/HeroBanner";
import HotReportsSection from "@/components/home/HotReportsSection";
import UpcomingEventsSection from "@/components/home/UpcomingEventsSection";
import RealtimeFeedSection from "@/components/home/RealtimeFeedSection";
import SiteNewsSection from "@/components/home/SiteNewsSection";
import LoginCta from "@/components/home/LoginCta";
import SectionHeader from "@/components/home/SectionHeader";
import {
  getRealtimeFeedItems,
  getUpcomingHomeEvents,
  selectProvisionalFeaturedEvents,
  type HomeFeedItem,
  type UpcomingEvent,
} from "@/lib/homeData";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

async function HomeEventSections() {
  const context = await getHomeRequestContext();
  if (!context) {
    const emptyFavorites = new Set<string>();
    return (
      <>
        <HotReportsSection events={[]} title="注目の公演" favoriteUserId={null} favoriteSlugs={emptyFavorites} />
        <UpcomingEventsSection events={[]} favoriteUserId={null} favoriteSlugs={emptyFavorites} />
      </>
    );
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
  const favoriteSlugs = favoriteState.slugs;
  let featuredEvents: UpcomingEvent[] = [];
  let featuredTitle = "注目の公演";

  if (favoriteSlugs.size > 0) {
    featuredEvents = upcomingEvents
      .filter((event) => favoriteSlugs.has(event.artistSlug))
      .slice(0, 10);
    if (featuredEvents.length > 0) featuredTitle = "推しの公演";
  }

  if (featuredEvents.length === 0) {
    featuredEvents = selectProvisionalFeaturedEvents(upcomingEvents, 5);
  }

  return (
    <>
      <HotReportsSection
        events={featuredEvents}
        title={featuredTitle}
        favoriteUserId={favoriteState.userId}
        favoriteSlugs={favoriteSlugs}
      />
      <UpcomingEventsSection
        events={upcomingEvents}
        favoriteUserId={favoriteState.userId}
        favoriteSlugs={favoriteSlugs}
      />
    </>
  );
}

async function HomeRealtimeSection() {
  const context = await getHomeRequestContext();
  if (!context) return <RealtimeFeedSection items={[]} />;

  const feedItems: HomeFeedItem[] = await getRealtimeFeedItems(
    context.client,
    20,
    context.upcomingEvents,
  );
  return <RealtimeFeedSection items={feedItems} />;
}

function EventSectionsSkeleton() {
  return (
    <div aria-hidden="true">
      <section className="mt-3">
        <SectionHeader icon={<Flame size={16} color="#FF6B9D" />} title="注目の公演" />
        <div className="flex w-full gap-2 overflow-hidden px-3">
          {[0, 1, 2].map((index) => (
            <div key={index} className="h-[132px] w-[135px] shrink-0 animate-pulse rounded-[16px] bg-white shadow-sm">
              <div className="h-[76px] rounded-t-[16px] bg-pink-100" />
              <div className="mx-3 mt-2 h-2 rounded-full bg-gray-100" />
              <div className="mx-2 mt-2 h-5 rounded-full bg-pink-100" />
            </div>
          ))}
        </div>
      </section>
      <section className="mt-3">
        <SectionHeader icon={<Calendar size={16} color="#FF6B9D" />} title="開催が近い公演" />
        <div className="flex w-full gap-2 overflow-hidden px-3">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="h-[104px] w-[104px] shrink-0 animate-pulse rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
              <div className="h-2 w-10 rounded-full bg-gray-100" />
              <div className="mt-3 h-3 w-16 rounded-full bg-gray-200" />
              <div className="mt-2 h-2 w-20 rounded-full bg-gray-100" />
              <div className="mt-3 h-3 w-12 rounded-full bg-pink-100" />
            </div>
          ))}
        </div>
      </section>
    </div>
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
    <div className="min-h-screen bg-[#f7f5f6]">
      <HomeHeader />
      <main>
        <h1 className="sr-only">ライブチケットの当落・座席・現地レポを共有する ちけレポ</h1>
        <HeroBanner />
        <Suspense fallback={<EventSectionsSkeleton />}>
          <HomeEventSections />
        </Suspense>
        <Suspense fallback={<RealtimeFeedSkeleton />}>
          <HomeRealtimeSection />
        </Suspense>
        <LoginCta />
        <SiteNewsSection />
        <div className="h-6" />
      </main>
    </div>
  );
}
