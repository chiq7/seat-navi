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
    <main className="min-h-screen bg-[#f7f5f6] pb-16 text-[#1c171b]">
      <section className="bg-[#0d090d] text-white">
        <header className="zr-container flex h-16 items-center justify-between">
          <Link href="/" aria-label="TOPへ戻る" className="zr-focus flex h-11 w-11 items-center justify-center rounded-full bg-white/8"><ChevronLeft size={26} /></Link>
          <AccountLink tone="light" iconSize={22} />
        </header>
        <div className="zr-container pb-10 pt-5 sm:pb-14 sm:pt-9">
          <Megaphone size={28} strokeWidth={1.6} className="text-[#ff5b96]" aria-hidden="true" />
          <p className="mt-6 text-[10px] font-black tracking-[0.24em] text-[#ff5b96]">TIXREPO JOURNAL</p>
          <h1 className="mt-3 text-[39px] font-black leading-[1.08] tracking-[-0.055em] sm:text-[60px]">ちけレポからの、<br />新しいお知らせ。</h1>
          <p className="mt-5 text-[12px] font-bold leading-6 text-white/62 sm:text-[14px]">イベント開催、機能更新、サービスの使い方をお知らせします。</p>
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
