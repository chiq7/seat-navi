import HomeHeader from "@/components/home/HomeHeader";
import HeroBanner from "@/components/home/HeroBanner";
import HotReportsSection from "@/components/home/HotReportsSection";
import UpcomingEventsSection from "@/components/home/UpcomingEventsSection";
import RealtimeFeedSection from "@/components/home/RealtimeFeedSection";
import LoginCta from "@/components/home/LoginCta";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <HomeHeader />
      <main>
        <HeroBanner />
        <HotReportsSection />
        <UpcomingEventsSection />
        <RealtimeFeedSection />
        <LoginCta />
        <div className="h-6" />
      </main>
    </div>
  );
}
