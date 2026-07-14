import type { Metadata } from "next";
import HomeHeader from "@/components/home/HomeHeader";
import HeroBanner from "@/components/home/HeroBanner";
import HotReportsSection from "@/components/home/HotReportsSection";
import UpcomingEventsSection from "@/components/home/UpcomingEventsSection";
import RealtimeFeedSection from "@/components/home/RealtimeFeedSection";
import LoginCta from "@/components/home/LoginCta";

export const metadata: Metadata = {
  title: "ちけレポ｜ライブの当落・座席・現地レポをみんなでシェア",
  description:
    "コンサートのチケット当落、座席位置、アリーナ予想図、現地レポ、セットリストを共有するサイト。ファンの報告から当選率や座席の見え方が分かります。",
  alternates: { canonical: "https://tixrepo.com/" },
  robots: { index: true, follow: true },
};

export default function Home() {
  return (
    <div className="min-h-screen bg-[#FFF8FB]">
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
