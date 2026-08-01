import type { Metadata } from "next";
import { Megaphone } from "lucide-react";
import { Header } from "@/components/common/Header";
import SiteNewsList from "@/components/news/SiteNewsList";
import { SITE_NEWS } from "@/lib/siteNews";

export const metadata: Metadata = {
  title: "ちけレポからのお知らせ｜ちけレポ",
  description: "ちけレポ運営からのイベント開催、機能更新、サービスに関するお知らせです。",
  alternates: { canonical: "https://tixrepo.com/news" },
  robots: { index: true, follow: true },
};

export default function SiteNewsPage() {
  return (
    <div className="min-h-screen bg-[#FFF8FB]">
      <Header title="ちけレポからのお知らせ" backHref="/" />
      <main className="px-4 py-5">
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-pink-100 bg-white px-4 py-4 shadow-sm">
          <Megaphone size={20} className="mt-0.5 shrink-0 text-[#FF6B9D]" aria-hidden="true" />
          <div>
            <h1 className="text-[17px] font-bold text-gray-900">ちけレポからのお知らせ</h1>
            <p className="mt-1 text-[12px] leading-5 text-gray-500">
              ちけレポ主催イベント、サービスの更新などをお知らせします。
            </p>
          </div>
        </div>
        <SiteNewsList posts={SITE_NEWS} />
      </main>
    </div>
  );
}
