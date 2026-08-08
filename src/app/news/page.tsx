import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, Megaphone } from "lucide-react";
import { AccountLink } from "@/components/auth/AccountLink";
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
        <header className="zr-container flex h-16 items-center justify-between">
          <Link href="/" aria-label="TOPへ戻る" className="zr-focus flex h-11 w-11 items-center justify-center rounded-full bg-white/80 text-[#2b252b] shadow-sm"><ChevronLeft size={26} /></Link>
          <AccountLink iconSize={22} />
        </header>
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
