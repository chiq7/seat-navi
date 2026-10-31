import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MapPin, MoveRight, Users } from "lucide-react";
import { Header } from "@/components/common/Header";
import { InfoListRow } from "@/components/common/InfoListRow";
import { VenueProgramJump, VenueProgramList } from "@/components/venue/VenueProgramLinks";
import VenueSeatReadingGuide from "@/components/seo/VenueSeatReadingGuide";
import SeoEditorialSection from "@/components/seo/SeoEditorialSection";
import PublicVenueGuide from "@/components/venue/guides/PublicVenueGuide";
import { resolveArtist } from "@/lib/artists";
import { getVenueSeoProfile } from "@/lib/seoProfiles";
import { serializeJsonLd } from "@/lib/structuredData";
import { SEO_VENUES, findSeoVenue, getVenueEvents, splitVenueEvents } from "@/lib/venueSeo";
import { buildPublicVenueMetadata, getPublicVenueName, hasPublicVenueGuide } from "@/lib/publicVenueGuides";

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
  return buildPublicVenueMetadata(venue.id, venue.name, profile?.metaDescription);
}

export default async function VenuePage({ params }: Props) {
  const { id } = await params;
  const venue = findSeoVenue(id);
  if (!venue) notFound();

  const hasGuide = hasPublicVenueGuide(venue.id);
  const publicName = getPublicVenueName(venue.id, venue.name);
  const eventRead = await getVenueEvents(venue.id).then(events => ({events, available: true})).catch(() => ({events: [], available: false}));
  const events = eventRead.events;
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
          {!hasGuide && eventRead.available && <div className="mt-4 grid grid-cols-2 border-y border-white/85 bg-white/65 px-1 backdrop-blur-sm sm:max-w-[420px]">
            <div>
              <p className="text-[9px] font-black tracking-[0.14em] text-[#958d93]">UPCOMING</p>
              <p className="mt-0.5 text-[23px] font-black">{upcoming.length}</p>
            </div>
            <div className="border-l border-[#eadfe4] pl-5">
              <p className="text-[9px] font-black tracking-[0.14em] text-[#958d93]">PAST LIVE</p>
              <p className="mt-0.5 text-[23px] font-black">{past.length}</p>
            </div>
          </div>}
        </div>
      </section>

      <VenueSeatReadingGuide venueId={venue.id} />
      {hasGuide && <div id="venue-seat-guide" className="scroll-mt-[90px]">
        {eventRead.available && <VenueProgramJump venueId={venue.id} upcomingCount={upcoming.length} pastCount={past.length} />}
        <PublicVenueGuide venue={venue.id} />
      </div>}


      <div className="zr-container">
        <section className="py-8 sm:py-10" aria-labelledby="upcoming-events-title">
          <p className="artist-kicker">Upcoming Live</p>
          <h2 id="upcoming-events-title" className="artist-heading scroll-mt-[90px]">これからの公演・アーティスト {eventRead.available && <small>（{upcoming.length}件）</small>}</h2>
          <p className="mt-2 flex items-center gap-2 text-[11px] font-bold text-[#817981]"><MapPin size={14} className="text-[#f43679]" />{publicName}のライブ予定</p>
          <div className="mt-3">{eventRead.available ? <VenueProgramList venueId={venue.id} events={upcoming} emptyText="現在、登録されている開催予定はありません" initialCount={3} /> : <p role="status">公演一覧を読み込めませんでした。<a className="zr-focus ml-2 inline-flex min-h-11 items-center font-bold underline" href={`/venues/${venue.id}#upcoming-events-title`}>もう一度読み込む</a></p>}</div>
        </section>

        {past.length > 0 && (
          <section className="py-8 sm:py-10" aria-labelledby="past-events-title">
            <p className="artist-kicker">Live Archive</p>
            <h2 id="past-events-title" className="artist-heading scroll-mt-[90px]">過去の公演・座席レポ</h2>
            <div className="mt-3"><VenueProgramList venueId={venue.id} events={past.slice(0, 30)} emptyText="過去の公演はありません" /></div>
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
            title={`${publicName}とは`}
            profile={profile}
            className="py-8 sm:py-10"
          />
        )}
      </div>
    </main>
  );
}
