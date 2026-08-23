import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarDays, MapPin, MoveRight, Users } from "lucide-react";
import { Header } from "@/components/common/Header";
import { InfoListRow } from "@/components/common/InfoListRow";
import SeoEditorialSection from "@/components/seo/SeoEditorialSection";
import { resolveArtist } from "@/lib/artists";
import { parseEventTitle } from "@/lib/eventTitle";
import { getVenueSeoProfile } from "@/lib/seoProfiles";
import { serializeJsonLd } from "@/lib/structuredData";
import { SEO_VENUES, findSeoVenue, getVenueEvents, splitVenueEvents } from "@/lib/venueSeo";
import type { CrawledEvent } from "@/lib/types";

const SITE_URL = "https://tixrepo.com";

type Props = { params: Promise<{ id: string }> };

function formatVenueEventDate(date: string | null): string {
  if (!date) return "日程未定";
  const [year, month, day] = date.split("-").map(Number);
  return `${year}.${month}.${day}`;
}

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

function EventList({ events, emptyText, initialCount = 6 }: { events: CrawledEvent[]; emptyText: string; initialCount?: number }) {
  if (events.length === 0) {
    return <p className="border-y border-dashed border-[#ded8dc] bg-white px-4 py-7 text-center text-[12px] font-bold text-[#958d93]">{emptyText}</p>;
  }
  const renderEvents = (rows: CrawledEvent[], offset = 0) => rows.map((event, localIndex) => {
        const index = offset + localIndex;
        const artist = resolveArtist(event);
        const title = parseEventTitle(event.title, artist?.name).tourName;
        return (
          <InfoListRow
            key={event.id}
            href={`/events/${event.id}`}
            ariaLabel={`${title}の公演・座席情報を見る`}
            className="group"
          >
            <div>
              <p className="text-[9px] font-black tracking-[0.14em] text-[#958d93]">LIVE {String(index + 1).padStart(2, "0")}</p>
              <p className="mt-1 flex items-center gap-1 text-[10px] font-black text-[#f43679] sm:mt-2 sm:gap-1.5 sm:text-[11px]"><CalendarDays size={13} />{formatVenueEventDate(event.date)}</p>
            </div>
            <div className="min-w-0">
              <p className="line-clamp-2 text-[14px] font-black leading-5 tracking-[-0.025em] text-[#4b4148]">{title}</p>
              {artist && <p className="mt-1 text-[10px] font-bold text-[#817981]">{artist.name}</p>}
            </div>
            <MoveRight size={17} className="shrink-0 text-[#f43679] transition-transform group-hover:translate-x-1" />
          </InfoListRow>
        );
      });
  const visibleEvents = events.slice(0, initialCount);
  const remainingEvents = events.slice(initialCount);

  return (
    <div>
      <div className="border-y border-[#ded8dc] bg-white">{renderEvents(visibleEvents)}</div>
      {remainingEvents.length > 0 && (
        <details className="group mt-4">
          <summary className="zr-focus mx-auto flex min-h-11 w-fit cursor-pointer list-none items-center rounded-full bg-[#fff0f5] px-5 text-[12px] font-black text-[#c93868]">
            残り{remainingEvents.length}件を見る
          </summary>
          <div className="mt-4 border-y border-[#ded8dc] bg-white">{renderEvents(remainingEvents, initialCount)}</div>
        </details>
      )}
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
        <Header title={venue.name} backHref="/venues" backLabel="ライブ会場一覧へ戻る" />

        <div className="zr-container pb-6 pt-4 sm:pb-9 sm:pt-7">
          <p className="community-eyebrow">VENUE LIVE GUIDE</p>
          <h1 className="mt-2 text-[28px] font-black tracking-[-0.05em] text-[#4b4148] sm:text-[38px]"><span className="text-[#ef4f87]">{venue.name}</span>の座席表</h1>
          <p className="mt-1 text-[11px] font-bold text-[#817981]">公演予定・座席報告・現地レポを確認できます。</p>
          <div className="mt-4 grid grid-cols-2 border-y border-white/85 bg-white/65 px-1 backdrop-blur-sm sm:max-w-[420px]">
            <div>
              <p className="text-[9px] font-black tracking-[0.14em] text-[#958d93]">UPCOMING</p>
              <p className="mt-0.5 text-[23px] font-black">{upcoming.length}</p>
            </div>
            <div className="border-l border-[#eadfe4] pl-5">
              <p className="text-[9px] font-black tracking-[0.14em] text-[#958d93]">PAST LIVE</p>
              <p className="mt-0.5 text-[23px] font-black">{past.length}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="zr-container">
        <section className="py-8 sm:py-10" aria-labelledby="upcoming-events-title">
          <p className="artist-kicker">Upcoming Live</p>
          <h2 id="upcoming-events-title" className="artist-heading">これから開催される公演</h2>
          <p className="mt-2 flex items-center gap-2 text-[11px] font-bold text-[#817981]"><MapPin size={14} className="text-[#f43679]" />{venue.name}のライブ予定</p>
          <div className="mt-3"><EventList events={upcoming} emptyText="現在、登録されている開催予定はありません" initialCount={5} /></div>
        </section>

        {past.length > 0 && (
          <section className="py-8 sm:py-10" aria-labelledby="past-events-title">
            <p className="artist-kicker">Live Archive</p>
            <h2 id="past-events-title" className="artist-heading">過去の公演・座席レポ</h2>
            <div className="mt-3"><EventList events={past.slice(0, 30)} emptyText="過去の公演はありません" /></div>
          </section>
        )}

        {pastArtists.length > 0 && (
          <section className="py-8 sm:py-10" aria-labelledby="venue-artists-title">
            <p className="artist-kicker">Artists Archive</p>
            <h2 id="venue-artists-title" className="artist-heading">この会場で公演したアーティスト</h2>
            <div className="mt-3 border-y border-[#ded8dc] bg-white">
              {pastArtists.slice(0, 8).map((artist) => (
                <InfoListRow
                  key={artist.slug}
                  href={`/artists/${artist.slug}`}
                  ariaLabel={`${artist.name}のアーティストページを見る`}
                >
                  <Users size={16} className="justify-self-center text-[#f43679]" /><span className="truncate text-[14px] font-black text-[#4b4148]">{artist.name}</span><MoveRight size={17} className="text-[#f43679]" />
                </InfoListRow>
              ))}
            </div>
            {pastArtists.length > 8 && (
              <details className="group mt-4">
                <summary className="zr-focus mx-auto flex min-h-11 w-fit cursor-pointer list-none items-center rounded-full bg-[#fff0f5] px-5 text-[12px] font-black text-[#c93868]">残り{pastArtists.length - 8}組を見る</summary>
                <div className="mt-4 border-y border-[#ded8dc] bg-white">
                  {pastArtists.slice(8).map((artist) => (
                    <InfoListRow key={artist.slug} href={`/artists/${artist.slug}`} ariaLabel={`${artist.name}のアーティストページを見る`}>
                      <Users size={16} className="justify-self-center text-[#f43679]" /><span className="truncate text-[14px] font-black text-[#4b4148]">{artist.name}</span><MoveRight size={17} className="text-[#f43679]" />
                    </InfoListRow>
                  ))}
                </div>
              </details>
            )}
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
