import type { Metadata } from "next";
import Link from "next/link";
import { Building2, MapPin, MoveRight, Search } from "lucide-react";
import { Header } from "@/components/common/Header";
import { SEO_VENUES } from "@/lib/venueSeo";

const POPULAR_VENUE_IDS = [
  "tokyo-dome",
  "k-arena",
  "yokohama-arena",
  "saitama-super-arena",
  "osaka-jo-hall",
  "budokan",
  "ariake-arena",
  "kyocera-dome",
] as const;

const VENUE_TYPE_GROUPS = [
  {
    id: "stadium",
    label: "スタジアム",
    description: "大規模スタジアムの公演・座席表",
    venueIds: ["zozo-marine", "koshien", "mufg-stadium", "nissan-stadium"],
  },
  {
    id: "dome",
    label: "ドーム",
    description: "ドーム公演の座席表・見え方",
    venueIds: ["tokyo-dome", "kyocera-dome", "vantelin-dome", "paypay-dome", "sapporo-dome", "belluna-dome"],
  },
  {
    id: "arena",
    label: "アリーナ",
    description: "アリーナ会場の公演・座席表",
    venueIds: ["saitama-super-arena", "yokohama-arena", "pia-arena-mm", "ariake-arena", "k-arena", "marine-messe", "miyagi-arena", "hiroshima-arena"],
  },
  {
    id: "hall",
    label: "ホール・その他",
    description: "ホール・多目的会場の公演・座席表",
    venueIds: ["budokan", "yoyogi", "makuhari-messe", "tokyo-garden-theater", "osaka-jo-hall", "edion-arena", "gaishi-hall", "toki-messe"],
  },
] as const;

const venueById = new Map(SEO_VENUES.map((venue) => [venue.id, venue]));

function VenueCards({ venueIds, compact = false }: { venueIds: readonly string[]; compact?: boolean }) {
  return (
    <div className={`grid grid-cols-2 gap-3 ${compact ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
      {venueIds.map((venueId, index) => {
        const venue = venueById.get(venueId);
        if (!venue) return null;

        return (
          <Link
            key={venue.id}
            href={`/venues/${venue.id}`}
            className={`community-card zr-focus group flex flex-col justify-between p-4 transition-colors hover:bg-[#fff0f5] ${compact ? "min-h-[112px]" : "min-h-[128px]"}`}
          >
            <div className="flex items-start justify-between gap-4">
              <Building2 size={compact ? 21 : 23} strokeWidth={1.6} className="text-[#f43679]" />
              <span className="text-[9px] font-black tracking-[0.15em] text-[#958d93]">VENUE {String(index + 1).padStart(2, "0")}</span>
            </div>
            <div className="mt-4">
              <h3 className={`${compact ? "text-[16px] leading-5" : "text-[18px] leading-6"} font-black tracking-[-0.035em]`}>{venue.name}</h3>
              <p className="mt-2 flex items-center gap-2 text-[10px] font-black text-[#f43679]">
                <MapPin size={13} />公演・座席表を見る<MoveRight size={15} className="transition-transform group-hover:translate-x-1" />
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export const metadata: Metadata = {
  title: "ライブ会場一覧・座席表｜公演予定・会場の見え方",
  description:
    "東京ドーム、Kアリーナ横浜、横浜アリーナなど主要ライブ会場の公演予定、座席報告、アリーナ予想を確認できます。",
  alternates: { canonical: "https://tixrepo.com/venues" },
};

export default function VenuesPage() {
  return (
    <main className="community-page pb-16">
      <section className="community-hero">
        <Header title="ライブ会場" backHref="/" backLabel="TOPへ戻る" />
        <div className="zr-container pb-7 pt-4 sm:pb-10 sm:pt-7">
          <p className="community-eyebrow">VENUE DIRECTORY</p>
          <h1 className="community-title mt-3">
            ライブ会場から、<br /><span className="text-[#ef4f87]">公演と座席表を探す。</span>
          </h1>
          <p className="community-subtitle mt-4 max-w-[680px]">
            主要ライブ会場の公演予定、座席報告、アリーナ予想、現地レポをまとめて確認できます。
          </p>
          <Link
            href="/search"
            className="community-secondary-button mt-5"
          >
            <Search size={16} className="text-[#ef4f87]" />会場名で検索する
          </Link>
        </div>
      </section>

      <section className="zr-container py-8 sm:py-10" aria-labelledby="venue-list-title">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="artist-kicker">All Venues</p>
            <h2 id="venue-list-title" className="artist-heading">ライブ会場一覧</h2>
          </div>
          <p className="shrink-0 text-[10px] font-black text-[#817981]">{SEO_VENUES.length} VENUES</p>
        </div>

        <nav className="mt-5 grid grid-cols-2 gap-2 text-[11px] font-black sm:flex" aria-label="会場タイプから探す">
          {[
            ["popular", "よく見られる"],
            ...VENUE_TYPE_GROUPS.map((group) => [group.id, group.label]),
          ].map(([id, label]) => (
            <a key={id} href={`#${id}`} className="community-card zr-focus flex min-h-11 items-center justify-between px-3 text-[#4b4248] transition-colors hover:bg-[#fff0f5] last:col-span-2 sm:flex-1 sm:px-4 sm:last:col-span-1">
              {label}<MoveRight size={14} className="text-[#f43679]" />
            </a>
          ))}
        </nav>

        <section id="popular" className="scroll-mt-5 mt-8 sm:mt-10" aria-labelledby="popular-title">
          <p className="artist-kicker">Popular venues</p>
          <div className="mt-2 flex items-end justify-between gap-4">
            <h2 id="popular-title" className="text-[28px] font-black tracking-[-0.05em] sm:text-[34px]">よく見られる会場</h2>
            <p className="mb-1 text-right text-[10px] font-bold leading-4 text-[#817981]">まずはここから<br className="sm:hidden" />探せます</p>
          </div>
          <div className="mt-4">
            <VenueCards venueIds={POPULAR_VENUE_IDS} compact />
          </div>
        </section>

        <div className="mt-10 space-y-10 sm:mt-12 sm:space-y-12">
          {VENUE_TYPE_GROUPS.map((group) => (
            <section key={group.id} id={group.id} className="scroll-mt-5" aria-labelledby={`${group.id}-title`}>
              <p className="artist-kicker">Venue type</p>
              <div className="mt-2 flex items-end justify-between gap-4">
                <h2 id={`${group.id}-title`} className="text-[28px] font-black tracking-[-0.05em] sm:text-[34px]">{group.label}</h2>
                <p className="mb-1 text-right text-[10px] font-bold leading-4 text-[#817981]">{group.description}</p>
              </div>
              <div className="mt-4">
                <VenueCards venueIds={group.venueIds} />
              </div>
            </section>
          ))}
        </div>
      </section>
    </main>
  );
}

