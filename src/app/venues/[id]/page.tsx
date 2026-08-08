import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, ChevronLeft, MapPin, MoveRight, Users } from "lucide-react";
import { AccountLink } from "@/components/auth/AccountLink";
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
    title: `${venue.name}の座席表・ライブ情報｜公演予定・座席レポ`,
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
    return <p className="community-panel px-4 py-9 text-center text-[12px] font-bold text-[#958d93]">{emptyText}</p>;
  }
  return (
    <div className="grid gap-3">
      {events.map((event, index) => {
        const artist = resolveArtist(event);
        const title = parseEventTitle(event.title, artist?.name).tourName;
        return (
          <Link
            key={event.id}
            href={`/events/${event.id}`}
            className="community-card zr-focus group grid min-h-[96px] gap-3 px-4 py-3 transition-colors hover:bg-[#fff0f5] sm:grid-cols-[150px_1fr_34px] sm:items-center"
          >
            <div>
              <p className="text-[9px] font-black tracking-[0.14em] text-[#958d93]">LIVE {String(index + 1).padStart(2, "0")}</p>
              <p className="mt-2 flex items-center gap-1.5 text-[11px] font-black text-[#f43679]"><CalendarDays size={14} />{fmtDate(event.date)}</p>
            </div>
            <div className="min-w-0">
              <p className="line-clamp-2 text-[15px] font-black leading-6 tracking-[-0.025em] text-[#1c171b]">{title}</p>
              {artist && <p className="mt-1 text-[10px] font-bold text-[#817981]">{artist.name}</p>}
            </div>
            <MoveRight size={18} className="hidden text-[#f43679] transition-transform group-hover:translate-x-1 sm:block" />
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
    <main className="community-page pb-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }}
      />
      <section className="community-hero">
        <header className="zr-container flex h-16 items-center justify-between">
          <Link
            href="/venues"
            aria-label="ライブ会場一覧へ戻る"
            className="zr-focus flex h-11 w-11 items-center justify-center rounded-full bg-white/80 text-[#2b252b] shadow-sm"
          >
            <ChevronLeft size={26} strokeWidth={2.7} />
          </Link>
          <AccountLink iconSize={22} />
        </header>

        <div className="zr-container pb-7 pt-4 sm:pb-10 sm:pt-7">
          <p className="community-eyebrow">VENUE LIVE GUIDE</p>
          <h1 className="community-title mt-3 max-w-[980px]">
            <span className="block">{venue.name}の</span>
            <span className="block text-[#ef4f87]">公演と座席表。</span>
          </h1>
          <p className="community-subtitle mt-4 max-w-[720px]">
            ライブ予定、会場の座席報告、アリーナ予想、現地からの見え方を公演ごとに確認できます。
          </p>
          <div className="mt-5 grid grid-cols-2 rounded-[22px] border border-white/80 bg-white/72 p-4 shadow-sm backdrop-blur-sm">
            <div>
              <p className="text-[9px] font-black tracking-[0.14em] text-[#958d93]">UPCOMING</p>
              <p className="mt-1 text-[27px] font-black">{upcoming.length}</p>
            </div>
            <div className="border-l border-[#eadfe4] pl-5">
              <p className="text-[9px] font-black tracking-[0.14em] text-[#958d93]">PAST LIVE</p>
              <p className="mt-1 text-[27px] font-black">{past.length}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="zr-container">
        <section className="py-8 sm:py-10" aria-labelledby="upcoming-events-title">
          <p className="artist-kicker">Upcoming Live</p>
          <h2 id="upcoming-events-title" className="artist-heading">これから開催される公演</h2>
          <p className="mt-3 flex items-center gap-2 text-[11px] font-bold text-[#817981]"><MapPin size={14} className="text-[#f43679]" />{venue.name}のライブ予定</p>
          <div className="mt-5"><EventList events={upcoming} emptyText="現在、登録されている開催予定はありません" /></div>
        </section>

        {past.length > 0 && (
          <section className="py-8 sm:py-10" aria-labelledby="past-events-title">
            <p className="artist-kicker">Live Archive</p>
            <h2 id="past-events-title" className="artist-heading">過去の公演・座席レポ</h2>
            <div className="mt-5"><EventList events={past.slice(0, 30)} emptyText="過去の公演はありません" /></div>
          </section>
        )}

        {pastArtists.length > 0 && (
          <section className="py-8 sm:py-10" aria-labelledby="venue-artists-title">
            <p className="artist-kicker">Artists Archive</p>
            <h2 id="venue-artists-title" className="artist-heading">この会場で公演したアーティスト</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {pastArtists.map((artist) => (
                <Link
                  key={artist.slug}
                  href={`/artists/${artist.slug}`}
                  className="community-card zr-focus flex min-h-14 items-center gap-2 px-4 text-[12px] font-black"
                >
                  <Users size={14} className="text-[#f43679]" />{artist.name}
                </Link>
              ))}
            </div>
          </section>
        )}

        {profile && (
          <SeoEditorialSection
            title={`${venue.name}とは`}
            profile={profile}
            className="py-8 sm:py-10"
          />
        )}
      </div>
    </main>
  );
}
