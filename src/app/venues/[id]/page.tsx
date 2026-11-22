import SeatSearchOffer from "@/components/seat-campaign/SeatSearchOffer";
import type { Metadata } from "next";
import { Suspense } from "react";
import { VenueEventReturnLink } from "@/components/venue/VenueProgramLinks";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getJstDateString } from "@/lib/artistPageData";
import { getRequestPublicEventCatalog } from "@/lib/publicEventCatalogContext";
import { VenueActivityDate } from "@/components/venue/VenueProgramLinks";
import { Header } from "@/components/common/Header";
import { EventArenaPhotoMap } from "@/components/arena-map/EventArenaPhotoMap";
import { VenueProgramSummary, VenueProgramNavigation, VenueProgramSections, VenueProgramsProvider } from "@/components/venue/VenueProgramLinks";
import RelatedVenueCards from "@/components/venue/RelatedVenueCards";
import VenueSeatReadingGuide from "@/components/seo/VenueSeatReadingGuide";
import SeoEditorialSection from "@/components/seo/SeoEditorialSection";
import PublicAlternateNames from "@/components/seo/PublicAlternateNames";
import PublicVenueGuide from "@/components/venue/guides/PublicVenueGuide";
import { getVenueSeoProfile } from "@/lib/seoProfiles";
import { serializeJsonLd } from "@/lib/structuredData";
import { SEO_VENUES, findSeoVenue, getVenueEvents } from "@/lib/venueSeo";
import { hasPublicVenueGuide } from "@/lib/publicVenueGuides";
import { buildPublicVenueMetadata, getVenuePageContent } from "@/lib/venuePageMetadata";
import { parseVenueSeatLink, ZOZO_LOWER_THIRD_PAGE } from "@/lib/venueSeatLinks";
import { getVenueArenaPhotoArchives } from "@/data/venueArenaPhotoArchives";
import { SeatSourcePreview } from "@/components/venue/SeatSourceArchive";
import { getSeatSources, seatSourcePermalink, sourceKinds } from "@/lib/seatSourceArchive";
import { ArenaMapsProvider, type ArenaMapPost } from "@/components/venue/ArenaMapsSheet";
import arenaMapPhotos from "@/data/arenaMapPhotos.json";
import { getVenuePhotoCovers } from "@/lib/serverSeatPhotoVenues";
import VenuePhotoStrip from "@/components/venue/VenuePhotoStrip";
import ArenaMapStrip from "@/components/venue/ArenaMapStrip";
import compactStyles from "@/components/venue/VenueCompact.module.css";
import { TokyoDomeGuideNav } from "@/components/venue/TokyoDomeVisitorGuide";
import { Camera, ChevronRight } from "lucide-react";

const SITE_URL = "https://tixrepo.com";


type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export function generateStaticParams() {
  return SEO_VENUES.map((venue) => ({ id: venue.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const venue = findSeoVenue(id);
  if (!venue) notFound();
  return buildPublicVenueMetadata(venue.id, venue.name);
}

export default async function VenuePage({ params, searchParams }: Props) {
  const { id } = await params;
  const venue = findSeoVenue(id);
  if (!venue) notFound();

  const hasGuide = hasPublicVenueGuide(venue.id);
  const sources = getSeatSources("venues", venue.id);
  // Arena-layout posts (one X post per show) open from the arena of the seat map.
  const arenaMaps: ArenaMapPost[] = sources.arena_map.map(post => {
    const row = post.rows[0];
    const [, date = "", title = row.eventLabel] = row.eventLabel.match(/^(\d{4}\/\d{2}\/\d{2})\s+(.+)$/) ?? [];
    const photo = (arenaMapPhotos.posts as Record<string, { media: string; width: number; height: number; user: string }>)[post.sourceId];
    return { id: post.sourceId, url: seatSourcePermalink(row), date, title, eventId: row.eventId,
      image: photo && /^[\w-]+$/.test(photo.media) ? { src: `https://pbs.twimg.com/media/${photo.media}?format=jpg&name=large`, width: photo.width, height: photo.height, user: photo.user } : null };
  });
  const seatTarget = hasGuide ? parseVenueSeatLink(await searchParams) : null;
  const { displayName: publicName, officialName, alternateNames, photos } = getVenuePageContent(venue.id, venue.name);
  const headerName = publicName.split(/[（(]/, 1)[0].trim() || venue.name;
  const photoArchives = getVenueArenaPhotoArchives(venue.id);
  const [events, catalog] = await Promise.all([
    getVenueEvents(venue.id).catch(() => null), getRequestPublicEventCatalog().catch(() => null),
  ]);
  const profile = getVenueSeoProfile(venue.id);
  // 東京ドームを基準にしたスマホ優先レイアウト。検証後に他会場へ広げる。
  const compact = venue.id === "tokyo-dome";
  const venueUrl = `${SITE_URL}/venues/${venue.id}`;
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": profile ? "MusicVenue" : "Place",
        "@id": `${venueUrl}#place`,
        name: officialName,
        ...(alternateNames.length ? { alternateName: alternateNames } : {}),
        url: venueUrl,
        ...(profile
          ? {
              sameAs: profile.officialUrl,
              maximumAttendeeCapacity: profile.capacity,
              ...(profile.openedAt ? { openingDate: profile.openedAt } : {}),
              address: {
                "@type": "PostalAddress",
                postalCode: profile.address.postalCode,
                addressRegion: profile.address.region,
                addressLocality: profile.address.locality,
                streetAddress: profile.address.streetAddress,
                addressCountry: "JP",
              },
            }
          : {}),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "ちけレポ", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "ライブ会場一覧", item: `${SITE_URL}/venues` },
          { "@type": "ListItem", position: 3, name: publicName, item: venueUrl },
        ],
      },
    ],
  };

  return (
    <VenueProgramsProvider venueId={venue.id} initial={{ events, today: getJstDateString(), activity: catalog?.venueActivity?.[venue.id] }}>
    <main className="community-page pb-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }}
      />
      <section className={compact ? `bg-[#fffafb] ${compactStyles.top}` : "community-hero"}>
        <Suspense fallback={<Header title={headerName} breadcrumbLabel={publicName} backHref="/venues" backLabel="ライブ会場一覧へ戻る"
          breadcrumbParents={[{ href: "/venues", label: "ライブ会場一覧" }]} existingBreadcrumbSchema />}>
          <VenueEventReturnLink venueId={venue.id} venueName={publicName} headerName={headerName} />
        </Suspense>

        {compact ? <div className="zr-container pb-1 pt-2 sm:pt-5">
          <h1 className="text-[18px] font-black leading-tight tracking-[-0.03em] text-[#4b4148] sm:text-[32px]"><span className="text-[#ef4f87]">{publicName}</span>の座席表・見え方</h1>
        </div> : <div className="zr-container pb-6 pt-4 sm:pb-9 sm:pt-7">
          <p className="community-eyebrow">VENUE LIVE GUIDE</p>
          <h1 className="mt-2 text-[28px] font-black tracking-[-0.05em] text-[#4b4148] sm:text-[38px]"><span className="text-[#ef4f87]">{publicName}</span>の座席表{hasGuide && <span className="mt-1 block text-[20px] sm:text-[28px]">アクセス・会場ガイド</span>}</h1>
          <p className="mt-2 text-[13px] font-medium leading-6 text-[#6c5c66]">{hasGuide ? "自分の席から、荷物の預け先・売店まで。ライブへ行く日の準備をここで。" : "公演予定・座席報告・現地レポを確認できます。"}</p>
          <PublicAlternateNames names={alternateNames} />
          <VenueActivityDate />
          {sourceKinds.some(kind => sources[kind].length) && <a href="#seat-source-posts"
            className="zr-focus mt-1 flex min-h-11 w-fit items-center text-sm font-bold text-[#8a2850] underline underline-offset-4">座席レポ{sources.seat_view.length}件・アリーナ図{sources.arena_map.length}件を見る ↓</a>}
          <Link href={`/report?venue=${encodeURIComponent(venue.id)}`} className="community-secondary-button mt-3 min-h-11">
            この会場のライブを報告する
          </Link>
          {!hasGuide && <VenueProgramSummary />}
        </div>}
      </section>

      {compact && <TokyoDomeGuideNav />}
      {!compact && <VenueSeatReadingGuide venueId={venue.id} name={publicName} photoPreview={photos} />}
      {hasGuide && <div id="venue-seat-guide" className="scroll-mt-[90px]">
        {!compact && <VenueProgramNavigation venueId={venue.id} />}
        {photoArchives.length > 0 && <div className="zr-container mb-3">
          <a href="#past-arena-photos" className="zr-focus inline-flex min-h-11 items-center rounded-xl border border-[#c784a3] bg-[#fff7fa] px-4 text-sm font-bold text-[#8f2f59]">
            過去公演の配置・写真を見る
          </a>
        </div>}
        {venue.id === "zozo-marine" && <div className="zr-container"><a className="zr-focus inline-flex min-h-11 items-center text-sm font-bold text-[#a62b59] underline" href={ZOZO_LOWER_THIRD_PAGE}>下段3塁側の座席表を見る</a></div>}
        <ArenaMapsProvider posts={compact ? arenaMaps : []}>
          <PublicVenueGuide venue={venue.id} target={seatTarget}
            afterSeats={compact ? <><VenuePhotoStrip photos={getVenuePhotoCovers(venue.id)} count={photos?.count ?? 0} allTargetId="seat-photo-title" /><ArenaMapStrip /></> : undefined} />
        </ArenaMapsProvider>
      </div>}

      {/* Tokyo Dome shows seat posts as photos and arena maps from the seat map, so the post list is left out. */}
      {!compact && <SeatSourcePreview scope="venues" id={venue.id} />}
      {compact && <div className={`${compactStyles.photoList} ${compactStyles.later}`}><VenueSeatReadingGuide venueId={venue.id} name={publicName} photoPreview={photos} gallery /></div>}
      {/* Visitors usually arrive before their show, so the invitation is for any past visit, not today's seat. */}
      {compact && <div className="zr-container pb-3">
        <Link href={`/report?venue=${encodeURIComponent(venue.id)}`} data-report-cta="venue_photo_list" className={`zr-focus ${compactStyles.postCta}`}>
          <Camera size={22} aria-hidden="true" />
          <span><strong>{publicName}の座席写真を投稿</strong><small>過去のライブの1枚でもOK・ログイン不要</small></span>
          <ChevronRight size={18} aria-hidden="true" />
        </Link>
      </div>}
      {photoArchives.length > 0 && <section id="past-arena-photos" className="zr-container scroll-mt-[90px] py-6" aria-labelledby="past-arena-photos-heading">
        <h2 id="past-arena-photos-heading" className="artist-heading">過去公演のアリーナ配置と写真</h2>
        <p className="mt-1 mb-3 text-sm text-[#68525e]">アリーナの配置は公演ごとに変わります。</p>
        {photoArchives.map((archive, index) => <details key={archive.id} open={index === 0} className="mb-3 rounded-xl border border-[#eadfe4] bg-white">
          <summary className="zr-focus cursor-pointer px-4 py-3 text-sm font-bold text-[#653457]">
            {archive.title} <time dateTime={archive.layout.date}>{archive.layout.date.replaceAll("-", "/")}</time>
          </summary>
          <EventArenaPhotoMap layout={archive.layout} eventTitle={archive.title} sectionId={`arena-seat-photos-${archive.id}`}
            mapTitle={archive.kind === "standing" ? "公演当日のスタンディング区画" : undefined} />
        </details>)}
      </section>}

      <div className={compact ? `zr-container ${compactStyles.later}` : "zr-container"}>
        <SeatSearchOffer venueId={venue.id} />
        <VenueProgramSections venueId={venue.id} publicName={publicName} compact={compact} />

        {compact && <div className="pt-4 text-xs text-[#706670]"><PublicAlternateNames names={alternateNames} /><VenueActivityDate /></div>}
        {profile && (
          <SeoEditorialSection
            title={`${publicName}とは`}
            reviewDateLabel="施設情報の出典確認日"
            profile={profile}
            foldSections={compact}
            sourcesElsewhere={compact}
            className="py-8 sm:py-10"
          />
        )}
        <RelatedVenueCards venueId={venue.id} />
      </div>
    </main>
    </VenueProgramsProvider>
  );
}
