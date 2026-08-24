import type { Metadata } from "next";
import Link from "next/link";
import { Building2, MapPin, MoveRight, Search } from "lucide-react";
import { Header } from "@/components/common/Header";
import { InfoListRow } from "@/components/common/InfoListRow";
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

const VENUE_REGION_GROUPS = [
  {
    id: "hokkaido-tohoku",
    label: "北海道・東北",
    description: "北海道・宮城の主要ライブ会場",
    venueIds: ["sapporo-dome", "miyagi-arena"],
  },
  {
    id: "kanto",
    label: "関東",
    description: "東京・神奈川・埼玉・千葉の主要ライブ会場",
    venueIds: ["tokyo-dome", "belluna-dome", "zozo-marine", "mufg-stadium", "nissan-stadium", "saitama-super-arena", "yokohama-arena", "pia-arena-mm", "ariake-arena", "budokan", "yoyogi", "makuhari-messe", "k-arena", "tokyo-garden-theater"],
  },
  {
    id: "hokuriku-koshinetsu",
    label: "北陸・甲信越",
    description: "新潟など北陸・甲信越の主要ライブ会場",
    venueIds: ["toki-messe"],
  },
  {
    id: "tokai",
    label: "東海",
    description: "愛知の主要ライブ会場",
    venueIds: ["vantelin-dome", "gaishi-hall"],
  },
  {
    id: "kansai",
    label: "関西",
    description: "大阪・兵庫の主要ライブ会場",
    venueIds: ["kyocera-dome", "koshien", "osaka-jo-hall", "edion-arena"],
  },
  {
    id: "chugoku-shikoku-kyushu",
    label: "中国・四国・九州",
    description: "広島・福岡の主要ライブ会場",
    venueIds: ["hiroshima-arena", "paypay-dome", "marine-messe"],
  },
] as const;

const venueById = new Map(SEO_VENUES.map((venue) => [venue.id, venue]));

function VenueList({ venueIds }: { venueIds: readonly string[] }) {
  return (
    <div className="border-y border-[#ded8dc] bg-white">
      {venueIds.map((venueId, index) => {
        const venue = venueById.get(venueId);
        if (!venue) return null;

        return (
          <InfoListRow
            key={venue.id}
            href={`/venues/${venue.id}`}
            ariaLabel={`${venue.name}の公演・座席表を見る`}
            className="group"
          >
            <span className="flex flex-col items-center gap-1 text-[#f43679]"><Building2 size={20} strokeWidth={1.7} /><span className="text-[8px] font-black">{String(index + 1).padStart(2, "0")}</span></span>
            <span className="min-w-0"><span className="block truncate text-[15px] font-black tracking-[-0.035em] text-[#4b4148]">{venue.name}</span><span className="mt-1 flex items-center gap-1 text-[10px] font-bold text-[#817981]"><MapPin size={12} />公演・座席表</span></span>
            <MoveRight size={17} className="shrink-0 text-[#f43679] transition-transform group-hover:translate-x-1" />
          </InfoListRow>
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
        <div className="zr-container pb-6 pt-4 sm:pb-9 sm:pt-7">
          <p className="community-eyebrow">VENUE DIRECTORY</p>
          <h1 className="mt-2 text-[28px] font-black tracking-[-0.05em] text-[#4b4148] sm:text-[38px]">ライブ会場・<span className="text-[#ef4f87]">座席表を探す</span></h1>
          <p className="mt-1 text-[11px] font-bold text-[#817981]">公演予定・座席報告・現地レポを会場ごとに確認できます。</p>
          <Link
            href="/search"
            className="community-secondary-button mt-4 min-h-11"
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

        <nav className="mt-4 grid grid-cols-2 border-y border-[#ded8dc] bg-white text-[10px] font-black sm:grid-cols-4" aria-label="地域から会場を探す">
          {[
            ["popular", "よく見られる"],
            ...VENUE_REGION_GROUPS.map((group) => [group.id, group.label]),
          ].map(([id, label]) => (
            <a key={id} href={`#${id}`} className="zr-focus flex min-h-11 items-center justify-between border-b border-r border-[#ded8dc] px-3 text-[#4b4248] transition-colors hover:bg-[#fff8fa] last:col-span-2 sm:last:col-span-1">
              {label}<MoveRight size={13} className="text-[#f43679]" />
            </a>
          ))}
        </nav>

        <section id="popular" className="scroll-mt-5 mt-8 sm:mt-10" aria-labelledby="popular-title">
          <p className="artist-kicker">Popular venues</p>
          <h2 id="popular-title" className="mt-1 text-[22px] font-black tracking-[-0.04em]">よく見られる会場</h2>
          <div className="mt-3">
            <VenueList venueIds={POPULAR_VENUE_IDS} />
          </div>
        </section>

        <div className="mt-10 space-y-10 sm:mt-12 sm:space-y-12">
          {VENUE_REGION_GROUPS.map((group) => (
            <section key={group.id} id={group.id} className="scroll-mt-5" aria-labelledby={`${group.id}-title`}>
              <p className="artist-kicker">Venue Area</p>
              <h2 id={`${group.id}-title`} className="mt-1 text-[22px] font-black tracking-[-0.04em]">{group.label}</h2>
              <p className="mt-1 text-[10px] font-bold text-[#817981]">{group.description}</p>
              <div className="mt-3">
                <VenueList venueIds={group.venueIds} />
              </div>
            </section>
          ))}
        </div>
      </section>
    </main>
  );
}

