import type { Metadata } from "next";
import HomeHeader from "@/components/home/HomeHeader";
import HeroBanner from "@/components/home/HeroBanner";
import HotReportsSection from "@/components/home/HotReportsSection";
import UpcomingEventsSection from "@/components/home/UpcomingEventsSection";
import RealtimeFeedSection from "@/components/home/RealtimeFeedSection";
import LoginCta from "@/components/home/LoginCta";
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

export default async function Home() {
  const client = await createSupabaseServerClient();
  let upcomingEvents: UpcomingEvent[] = [];
  let featuredEvents: UpcomingEvent[] = [];
  let feedItems: HomeFeedItem[] = [];
  let featuredTitle = "注目の公演";

  if (client) {
    const [upcoming, authResult] = await Promise.all([
      getUpcomingHomeEvents(client),
      client.auth.getUser(),
    ]);
    upcomingEvents = upcoming;

    const userId = authResult.data.user?.id;
    if (userId) {
      const { data: favorites } = await client
        .from("favorite_artists")
        .select("artist_slug")
        .eq("user_id", userId);
      const favoriteSlugs = new Set(
        (favorites ?? []).map((item: { artist_slug: string }) => item.artist_slug),
      );
      featuredEvents = upcomingEvents
        .filter((event) => favoriteSlugs.has(event.artistSlug))
        .slice(0, 10);
      if (featuredEvents.length > 0) featuredTitle = "推しの公演";
    }

    if (featuredEvents.length === 0) {
      featuredEvents = selectProvisionalFeaturedEvents(upcomingEvents, 5);
    }
    feedItems = await getRealtimeFeedItems(client, 20, upcomingEvents);
  }

  return (
    <div className="min-h-screen bg-[#FFF8FB]">
      <HomeHeader />
      <main>
        <HeroBanner />
        <HotReportsSection events={featuredEvents} title={featuredTitle} />
        <UpcomingEventsSection events={upcomingEvents} />
        <RealtimeFeedSection items={feedItems} />
        <LoginCta />
        <div className="h-6" />
      </main>
    </div>
  );
}
