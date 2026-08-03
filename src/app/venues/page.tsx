import type { Metadata } from "next";
import Link from "next/link";
import { Building2, ChevronLeft, MapPin, MoveRight, Search } from "lucide-react";
import { AccountLink } from "@/components/auth/AccountLink";
import { SEO_VENUES } from "@/lib/venueSeo";

export const metadata: Metadata = {
  title: "ライブ会場一覧｜公演予定・座席情報",
  description:
    "東京ドーム、Kアリーナ横浜、横浜アリーナなど主要ライブ会場の公演予定、座席報告、アリーナ予想を確認できます。",
  alternates: { canonical: "https://tixrepo.com/venues" },
};

export default function VenuesPage() {
  return (
    <main className="min-h-screen bg-[#f7f5f6] pb-16 text-[#1c171b]">
      <section className="bg-[#0d090d] text-white">
        <header className="zr-container flex h-16 items-center justify-between">
          <Link
            href="/"
            aria-label="TOPへ戻る"
            className="zr-focus flex h-11 w-11 items-center justify-center rounded-full bg-white/8 text-white"
          >
            <ChevronLeft size={26} strokeWidth={2.7} />
          </Link>
          <AccountLink tone="light" iconSize={22} />
        </header>
        <div className="zr-container pb-10 pt-5 sm:pb-14 sm:pt-9">
          <p className="text-[10px] font-black tracking-[0.24em] text-[#ff5b96]">VENUE DIRECTORY</p>
          <h1 className="mt-3 text-[39px] font-black leading-[1.08] tracking-[-0.055em] sm:text-[60px] lg:text-[72px]">
            ライブ会場から、<br />公演と座席表を探す。
          </h1>
          <p className="mt-5 max-w-[680px] text-[12px] font-bold leading-6 text-white/62 sm:text-[14px]">
            主要ライブ会場の公演予定、座席報告、アリーナ予想、現地レポをまとめて確認できます。
          </p>
          <Link
            href="/search"
            className="zr-focus mt-7 inline-flex min-h-12 items-center gap-2 border border-white/25 px-5 text-[12px] font-black text-white"
          >
            <Search size={16} className="text-[#ff5b96]" />会場名で検索する
          </Link>
        </div>
      </section>

      <section className="zr-container py-10 sm:py-14" aria-labelledby="venue-list-title">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="artist-kicker">All Venues</p>
            <h2 id="venue-list-title" className="artist-heading">ライブ会場一覧</h2>
          </div>
          <p className="shrink-0 text-[10px] font-black text-[#817981]">{SEO_VENUES.length} VENUES</p>
        </div>

        <div className="mt-8 grid border-l border-t border-[#ded8dc] sm:grid-cols-2 lg:grid-cols-3">
          {SEO_VENUES.map((venue, index) => (
            <Link
              key={venue.id}
              href={`/venues/${venue.id}`}
              className="zr-focus group flex min-h-[148px] flex-col justify-between border-b border-r border-[#ded8dc] bg-white p-5 transition-colors hover:bg-[#fff0f5]"
            >
              <div className="flex items-start justify-between gap-4">
                <Building2 size={23} strokeWidth={1.6} className="text-[#f43679]" />
                <span className="text-[9px] font-black tracking-[0.15em] text-[#958d93]">VENUE {String(index + 1).padStart(2, "0")}</span>
              </div>
              <div className="mt-7">
                <h3 className="text-[18px] font-black leading-6 tracking-[-0.035em]">{venue.name}</h3>
                <p className="mt-2 flex items-center gap-2 text-[10px] font-black text-[#f43679]">
                  <MapPin size={13} />公演・座席表を見る<MoveRight size={15} className="transition-transform group-hover:translate-x-1" />
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

