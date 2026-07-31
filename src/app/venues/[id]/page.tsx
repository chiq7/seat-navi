import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/common/Header";
import SeoEditorialSection from "@/components/seo/SeoEditorialSection";
import { resolveArtist } from "@/lib/artists";
import { fmtDate } from "@/lib/artistPageHelpers";
import { parseEventTitle } from "@/lib/eventTitle";
import { getVenueSeoProfile } from "@/lib/seoProfiles";
import { serializeJsonLd } from "@/lib/structuredData";
import { SEO_VENUES, findSeoVenue, getVenueEvents, splitVenueEvents } from "@/lib/venueSeo";
import type { CrawledEvent } from "@/lib/types";

const SITE_URL = "https://tixrepo.com";

type Props = { params: Promise<{ id: string }> };

export function generateStaticParams() {
  return SEO_VENUES.map((venue) => ({ id: venue.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const venue = findSeoVenue(id);
  if (!venue) return { title: "会場が見つかりません" };
  const profile = getVenueSeoProfile(venue.id);
  const canonical = `${SITE_URL}/venues/${venue.id}`;
  return {
    title: `${venue.name}のライブ・座席情報｜公演予定・座席レポ`,
    description: profile?.metaDescription ?? `${venue.name}で開催されるライブ・コンサートの公演予定、座席報告、当落レポ、アリーナ予想をまとめて確認できます。`,
    alternates: { canonical },
    openGraph: {
      title: `${venue.name}のライブ・座席情報`,
      description: `${venue.name}の公演予定と座席・当落レポを確認できます。`,
      url: canonical,
    },
  };
}

function EventList({ events, emptyText }: { events: CrawledEvent[]; emptyText: string }) {
  if (events.length === 0) {
    return <p className="rounded-xl bg-white px-4 py-6 text-center text-[12px] text-gray-400">{emptyText}</p>;
  }
  return (
    <div className="space-y-2">
      {events.map((event) => {
        const artist = resolveArtist(event);
        const title = parseEventTitle(event.title, artist?.name).tourName;
        return (
          <Link
            key={event.id}
            href={`/events/${event.id}`}
            className="block rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm transition-transform active:scale-[0.99]"
          >
            <p className="text-[11px] font-bold text-[#FF6B9D]">{fmtDate(event.date)}</p>
            <p className="mt-1 text-[14px] font-bold leading-5 text-gray-900">{title}</p>
            {artist && <p className="mt-1 text-[11px] text-gray-500">{artist.name}</p>}
          </Link>
        );
      })}
    </div>
  );
}

export default async function VenuePage({ params }: Props) {
  const { id } = await params;
  const venue = findSeoVenue(id);
  if (!venue) notFound();

  const events = await getVenueEvents(venue.id);
  const { upcoming, past } = splitVenueEvents(events);
  const profile = getVenueSeoProfile(venue.id);
  const pastArtists = Array.from(
    new Map(
      past.flatMap((event) => {
        const artist = resolveArtist(event);
        return artist ? [[artist.slug, artist] as const] : [];
      }),
    ).values(),
  ).slice(0, 30);
  const venueUrl = `${SITE_URL}/venues/${venue.id}`;
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": profile ? "MusicVenue" : "Place",
        "@id": `${venueUrl}#place`,
        name: venue.name,
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
          { "@type": "ListItem", position: 3, name: venue.name, item: venueUrl },
        ],
      },
    ],
  };

  return (
    <main className="min-h-screen bg-[#FFF8FB] pb-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }}
      />
      <Header title={venue.name} backHref="/venues" />
      <div className="px-4 pt-5">
        <h1 className="text-xl font-bold leading-8 text-gray-900">{venue.name}のライブ・座席情報</h1>
        <p className="mt-2 text-[12px] leading-6 text-gray-500">
          {venue.name}で開催されるライブ・コンサートの公演予定と、みんなの当落・座席・現地レポを公演ごとに確認できます。
        </p>

        {profile && (
          <SeoEditorialSection
            title={`${venue.name}とは`}
            profile={profile}
            className="mt-6"
          />
        )}

        <section className="mt-6">
          <h2 className="mb-3 text-[16px] font-bold text-gray-900">これから開催される公演</h2>
          <EventList events={upcoming} emptyText="現在、登録されている開催予定はありません" />
        </section>

        {past.length > 0 && (
          <section className="mt-7">
            <h2 className="mb-3 text-[16px] font-bold text-gray-900">過去の公演・座席レポ</h2>
            <EventList events={past.slice(0, 30)} emptyText="過去の公演はありません" />
          </section>
        )}

        {pastArtists.length > 0 && (
          <section className="mt-7">
            <h2 className="mb-3 text-[16px] font-bold text-gray-900">この会場で公演したアーティスト</h2>
            <div className="flex flex-wrap gap-2">
              {pastArtists.map((artist) => (
                <Link
                  key={artist.slug}
                  href={`/artists/${artist.slug}`}
                  className="rounded-full border border-pink-100 bg-white px-3 py-2 text-[11px] font-bold text-gray-700 shadow-sm"
                >
                  {artist.name}
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
