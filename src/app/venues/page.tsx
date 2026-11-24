import { seatPhotoTitle } from "@/lib/metadata";
import { buildFileImageMetadata } from "@/lib/fileImageMetadata";
import Link from "next/link";
import { Building2, Camera, MapPin, MoveRight, Search } from "lucide-react";
import { Header } from "@/components/common/Header";
import { InfoListRow } from "@/components/common/InfoListRow";
import { getPublicVenueName, getPublicVenueSeatGuideHref, hasPublicVenueGuide } from "@/lib/publicVenueGuides";
import { getVenuePhotoCounts, getDirectorySeatPhotos } from "@/lib/serverSeatPhotoVenues";
import { SeatPhotoGallery } from "@/components/common/SeatPhotoGallery";
import { SEO_VENUES } from "@/lib/venueSeo";
import { VENUE_REGION_GROUPS } from "@/lib/venueRegions";

const venueById = new Map(SEO_VENUES.map((venue) => [venue.id, venue]));
const listedIds = new Set<string>();
const regions: { id: string; label: string; description: string; venueIds: string[] }[] = VENUE_REGION_GROUPS.map(group => ({
  ...group,
  venueIds: group.venueIds.filter(id => {
    if (!venueById.has(id) || listedIds.has(id)) return false;
    listedIds.add(id);
    return true;
  }),
}));
const photoCountByVenue = getVenuePhotoCounts();
const directoryPhotos = getDirectorySeatPhotos();
const ungrouped = SEO_VENUES.filter(venue => !listedIds.has(venue.id));
if (ungrouped.length) {
  const venueIds = ungrouped.map(venue => venue.id);
  regions.push({ id: "other", label: "その他の地域", description: "", venueIds });
  for (const id of venueIds) listedIds.add(id);
}

function VenueList({ venueIds }: { venueIds: readonly string[] }) {
  return (
    <div className="border-y border-[#ded8dc] bg-white">
      {venueIds.map((venueId, index) => {
        const venue = venueById.get(venueId);
        if (!venue) return null;
        const name = getPublicVenueName(venue.id, venue.name);
        const hasGuide = hasPublicVenueGuide(venue.id);

        return (
          <InfoListRow
            key={venue.id}
            href={getPublicVenueSeatGuideHref(venue.id) ?? `/venues/${venue.id}`}
            ariaLabel={`${name}の公演・座席表を見る`}
            className="group"
          >
            <span className="flex flex-col items-center gap-1 text-[#f43679]"><Building2 size={20} strokeWidth={1.7} /><span className="text-[8px] font-black">{String(index + 1).padStart(2, "0")}</span></span>
            <span className="min-w-0"><span className="block text-[15px] font-black leading-6 tracking-[-0.035em] text-[#4b4148]">{name}</span><span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] font-bold text-[#706670]"><span className="inline-flex items-center gap-1"><MapPin size={12} />{hasGuide ? "座席・設備・アクセス" : "公演・座席レポ"}</span>{(photoCountByVenue[venue.id] ?? 0) > 0 && <span className="inline-flex items-center gap-1 text-[#a62b59]"><Camera size={13} aria-hidden="true" />写真あり・{photoCountByVenue[venue.id]}枚</span>}{(photoCountByVenue[venue.id] ?? 0) === 0 && <span className="inline-flex items-center gap-1 text-[#8a7f87]"><Camera size={13} aria-hidden="true" />写真はまだありません</span>}</span></span>
            <MoveRight size={17} className="shrink-0 text-[#f43679] transition-transform group-hover:translate-x-1" />
          </InfoListRow>
        );
      })}
    </div>
  );
}

export const metadata = buildFileImageMetadata({
  path: "/venues",
  title: seatPhotoTitle("ライブ会場一覧・座席表｜公演予定・会場の見え方", new Set(directoryPhotos.map(photo => photo.image)).size),
  description: "東京ドーム、京セラドーム大阪、バンテリンドームナゴヤなど主要ライブ会場の座席表、トイレ・ロッカー・売店、アクセスと公演予定を確認できます。",
});

export default function VenuesPage() {
  return (
    <main className="community-page pb-16">
      <section className="community-hero">
        <Header title="ライブ会場" backHref="/" backLabel="TOPへ戻る" />
        <div className="zr-container pb-6 pt-4 sm:pb-9 sm:pt-7">
          <h1 className="mt-2 text-[28px] font-black tracking-[-0.05em] text-[#4b4148] sm:text-[38px]">ライブ会場・<span className="text-[#ef4f87]">座席表を探す</span></h1>
          <p className="mt-1 text-[13px] font-medium leading-6 text-[#6c5c66]">会場を選ぶと、座席表・写真・設備を確認できます。</p>
          <Link
            href="/search"
            className="community-secondary-button mt-4 min-h-11"
          >
            <Search size={16} className="text-[#ef4f87]" />会場名で検索する
          </Link>
        </div>
      </section>

      <section className="zr-container scroll-mt-20 py-6 sm:py-8" aria-labelledby="venue-list-title">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 id="venue-list-title" className="artist-heading">座席表・写真を探す</h2>
          </div>
          <p data-venue-total={listedIds.size} className="shrink-0 text-[12px] font-bold text-[#706670]">{listedIds.size}会場</p>
        </div>
        <p className="mt-2 text-[13px] leading-6 text-[#6c5c66]">「写真あり」の会場は、地図の印から写真を開けます。</p>

        <nav id="popular" className="mt-4 grid grid-cols-2 border-y border-[#ded8dc] bg-white text-[10px] font-black sm:grid-cols-3" aria-label="地域から会場を探す">
          {regions.map(({id, label}) => (
            <a key={id} href={`#${id}`} className="zr-focus flex min-h-11 items-center justify-between border-b border-r border-[#ded8dc] px-3 text-[#4b4248] transition-colors hover:bg-[#fff8fa]">
              {label}<MoveRight size={13} className="text-[#f43679]" />
            </a>
          ))}
        </nav>

        <div className="mt-10 space-y-10 sm:mt-12 sm:space-y-12">
          {regions.map((group) => (
            <section key={group.id} id={group.id} className="scroll-mt-5" aria-labelledby={`${group.id}-title`}>
              
              <h2 id={`${group.id}-title`} className="mt-1 text-[22px] font-black tracking-[-0.04em]">{group.label}のライブ会場</h2>
              <p className="mt-1 text-[10px] font-bold text-[#817981]">{group.description}</p>
              <div className="mt-3">
                <VenueList venueIds={group.venueIds} />
              </div>
            </section>
          ))}
        </div>
      </section>
      <section id="seat-photos" aria-labelledby="venue-photos-title" className="zr-container scroll-mt-20 py-6">
        <h2 id="venue-photos-title" className="artist-heading">会場の座席からの見え方写真</h2>
        <SeatPhotoGallery photos={directoryPhotos} />
      </section>
    </main>
  );
}

