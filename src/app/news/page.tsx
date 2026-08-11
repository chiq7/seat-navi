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
    <main className="community-page pb-16">
      <section className="community-hero">
        <Header title="お知らせ" backHref="/" backLabel="TOPへ戻る" />
        <div className="zr-container pb-10 pt-5 sm:pb-14 sm:pt-9">
          <Megaphone size={28} strokeWidth={1.6} className="text-[#ef4f87]" aria-hidden="true" />
          <p className="community-eyebrow mt-6">TIXREPO JOURNAL</p>
          <h1 className="community-title mt-3">ちけレポからの、<br /><span className="text-[#ef4f87]">新しいお知らせ。</span></h1>
          <p className="community-subtitle mt-5">イベント開催、機能更新、サービスの使い方をお知らせします。</p>
        </div>
      </section>
      <section className="zr-container py-10 sm:py-14" aria-labelledby="site-news-title">
        <div className="flex items-end justify-between gap-4">
          <div><p className="artist-kicker">Latest News</p><h2 id="site-news-title" className="artist-heading">最新のお知らせ</h2></div>
          <p className="text-[10px] font-black text-[#817981]">{SITE_NEWS.length} ARTICLES</p>
        </div>
        <div className="mt-7"><SiteNewsList posts={SITE_NEWS} /></div>
      </section>
    </main>
  );
}
