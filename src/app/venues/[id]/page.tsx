import SeatSearchOffer from "@/components/seat-campaign/SeatSearchOffer";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getJstDateString } from "@/lib/artistPageData";
import { Header } from "@/components/common/Header";
import { VenueProgramSummary, VenueProgramNavigation, VenueProgramSections, VenueProgramsProvider } from "@/components/venue/VenueProgramLinks";
import VenueSeatReadingGuide from "@/components/seo/VenueSeatReadingGuide";
import SeoEditorialSection from "@/components/seo/SeoEditorialSection";
import PublicVenueGuide from "@/components/venue/guides/PublicVenueGuide";
import { getVenueSeoProfile } from "@/lib/seoProfiles";
import { serializeJsonLd } from "@/lib/structuredData";
import { SEO_VENUES, findSeoVenue, getVenueEvents } from "@/lib/venueSeo";
import { buildPublicVenueMetadata, getPublicVenueName, hasPublicVenueGuide } from "@/lib/publicVenueGuides";
import { parseVenueSeatLink, ZOZO_LOWER_THIRD_PAGE } from "@/lib/venueSeatLinks";

const SITE_URL = "https://tixrepo.com";


type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export function generateStaticParams() {
  return SEO_VENUES.map((venue) => ({ id: venue.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const venue = findSeoVenue(id);
  if (!venue) return { title: "会場が見つかりません" };
  const profile = getVenueSeoProfile(venue.id);
  return buildPublicVenueMetadata(venue.id, venue.name, profile?.metaDescription);
}

export default async function VenuePage({ params, searchParams }: Props) {
  const { id } = await params;
  const venue = findSeoVenue(id);
  if (!venue) notFound();

  const hasGuide = hasPublicVenueGuide(venue.id);
  const seatTarget = hasGuide ? parseVenueSeatLink(await searchParams) : null;
  const publicName = getPublicVenueName(venue.id, venue.name);
  const events = await getVenueEvents(venue.id).catch(() => null);
  const profile = getVenueSeoProfile(venue.id);
  const venueUrl = `${SITE_URL}/venues/${venue.id}`;
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": profile ? "MusicVenue" : "Place",
        "@id": `${venueUrl}#place`,
        name: publicName,
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
    <VenueProgramsProvider venueId={venue.id} initial={{ events, today: getJstDateString() }}>
    <main className="community-page pb-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }}
      />
      <section className="community-hero">
        <Header title={publicName} backHref="/venues" backLabel="ライブ会場一覧へ戻る" />

        <div className="zr-container pb-6 pt-4 sm:pb-9 sm:pt-7">
          <p className="community-eyebrow">VENUE LIVE GUIDE</p>
          <h1 className="mt-2 text-[28px] font-black tracking-[-0.05em] text-[#4b4148] sm:text-[38px]"><span className="text-[#ef4f87]">{publicName}</span>の座席表{hasGuide && <span className="mt-1 block text-[20px] sm:text-[28px]">アクセス・会場ガイド</span>}</h1>
          <p className="mt-2 text-[13px] font-medium leading-6 text-[#6c5c66]">{hasGuide ? "自分の席から、荷物の預け先・売店まで。ライブへ行く日の準備をここで。" : "公演予定・座席報告・現地レポを確認できます。"}</p>
          {!hasGuide && <VenueProgramSummary />}
        </div>
      </section>

      <VenueSeatReadingGuide venueId={venue.id} />
      {hasGuide && <div id="venue-seat-guide" className="scroll-mt-[90px]">
        <VenueProgramNavigation venueId={venue.id} />
        {venue.id === "zozo-marine" && <div className="zr-container"><a className="zr-focus inline-flex min-h-11 items-center text-sm font-bold text-[#a62b59] underline" href={ZOZO_LOWER_THIRD_PAGE}>下段3塁側の座席表を見る</a></div>}
        <PublicVenueGuide venue={venue.id} target={seatTarget} />
      </div>}


      <div className="zr-container">
        <SeatSearchOffer venueId={venue.id} />
        <VenueProgramSections venueId={venue.id} publicName={publicName} />

        {profile && (
          <SeoEditorialSection
            title={`${publicName}とは`}
            profile={profile}
            className="py-8 sm:py-10"
          />
        )}
      </div>
    </main>
    </VenueProgramsProvider>
  );
}
