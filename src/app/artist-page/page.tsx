import ArtistPageBottomNav from "@/components/artist-page/ArtistPageBottomNav";
import EventSection from "@/components/artist-page/EventSection";
import HeroSection from "@/components/artist-page/HeroSection";
import LiveEffectsSection from "@/components/artist-page/LiveEffectsSection";
import MapPreviewSection from "@/components/artist-page/MapPreviewSection";
import ReportSection from "@/components/artist-page/ReportSection";
import TrendSection from "@/components/artist-page/TrendSection";

export default function ArtistPreviewPage() {
  return (
    <main className="mx-auto min-h-screen max-w-[390px] bg-white font-sans text-gray-900">
      <HeroSection />
      <div className="bg-gradient-to-b from-white via-[#FFF8FB] to-white pb-24">
        <div id="trend">
          <TrendSection />
        </div>
        <div id="map">
          <MapPreviewSection />
        </div>
        <LiveEffectsSection />
        <div id="reports">
          <ReportSection />
        </div>
        <EventSection />
      </div>
      <ArtistPageBottomNav />
    </main>
  );
}
