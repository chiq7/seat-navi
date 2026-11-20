import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import ArtistSeatSearchGuide from "@/components/seo/ArtistSeatSearchGuide";
import PublicAlternateNames from "@/components/seo/PublicAlternateNames";
import { getPublicArtistAlternateNames } from "@/lib/publicAlternateNames";
import { getArtistSeatGuideVenues } from "@/lib/artistSeatGuide";
import { ArtistClient } from "./ArtistClient";
import { getJstDateString } from "@/lib/artistPageData";
import { getSeoArtist, isTestArtist, SITE_URL } from "@/lib/seoData";
import { getArtistSeoProfile } from "@/lib/seoProfiles";
import { buildMeta, seatPhotoTitle } from "@/lib/metadata";
import { serializeJsonLd } from "@/lib/structuredData";
import { getCachedArtistEvents } from "@/lib/serverEventData";
import { getArtistPublicReportCount } from "@/lib/serverArtistContent";
import { getPublicVenueGuideId } from "@/lib/publicVenueGuides";
import { getArtistSeatPhotos, getArtistSeatPhotoVenues, getVenuePhotoCounts } from "@/lib/serverSeatPhotoVenues";
import { SeatPhotoGallery } from "@/components/common/SeatPhotoGallery";

type PageProps = { params: Promise<{ slug: string }> };

// Metadata and the initial gallery must describe the same set of performances.
const readArtistGallery = cache(async (slug: string, name: string) => {
  const events = await getCachedArtistEvents(slug);
  return { events, photos: getArtistSeatPhotos(name, events) };
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const artist = getSeoArtist(slug);
  if (!artist) notFound();
  const names = getPublicArtistAlternateNames(slug, artist.name);
  const titleNames = names.slice(0, 2);
  if (artist.name.length + titleNames.join("・").length > 24) titleNames.splice(1);
  const titleName = titleNames.length ? `${artist.name}（${titleNames.join("・")}）` : artist.name;
  const leadName = names.length ? `${artist.name}（${names.join("・")}）` : artist.name;
  const { photos } = await readArtistGallery(slug, artist.name);
  const title = seatPhotoTitle(`${titleName}のライブ座席表・見え方・当落倍率・セトリまとめ`, photos.length);
  const description = `${leadName}の最新ライブ・ツアーの座席表（シートマップ予想）、各会場での座席からの見え方写真、ファンクラブ当落倍率、セットリスト、現地レポをまとめてチェックできます。`;
  return buildMeta({ path: `/artists/${slug}`, title, description, index: !isTestArtist(artist), follow: true,
    image: `/api/og/artist/${slug}`, imageAlt: `${artist.name}のライブ情報` });
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const artist = getSeoArtist(slug);
  if (!artist) notFound();
  // 公演一覧は公開データなので、ログイン状態ごとにDBを読み直さず共有キャッシュを使う。
  // お気に入りや投稿状態はクライアント側の既存処理をそのまま維持する。
  const { events: initialEvents, photos } = await readArtistGallery(slug, artist.name);
  const publicReportCount = photos.length ? null : await getArtistPublicReportCount(initialEvents);
  const counts = getVenuePhotoCounts();
  const venueIds = new Set(initialEvents.map(event => getPublicVenueGuideId(event.venue_id, event.venue)));
  const venuePhotoCounts = Object.fromEntries(Object.entries(counts).filter(([id]) => venueIds.has(id)));
  const profile = getArtistSeoProfile(slug);
  const alternateNames = getPublicArtistAlternateNames(slug, artist.name);
  const url = `${SITE_URL}/artists/${slug}`;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": profile?.schemaType ?? "MusicGroup",
    "@id": `${url}#artist`,
    name: artist.name,
    ...(alternateNames.length ? { alternateName: alternateNames } : {}),
    url,
    ...(profile && { sameAs: profile.officialUrl, description: profile.summary }),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }} />
      <ArtistClient slug={slug} initialEvents={initialEvents} initialDay={getJstDateString()} photoVenues={getArtistSeatPhotoVenues(slug, initialEvents)}
        photoCount={photos.length} publicReportCount={publicReportCount} venuePhotoCounts={venuePhotoCounts}
        seatPhotos={photos.length > 0 && <section id="artist-seat-photos" className="artist-section scroll-mt-20">
          <h2 className="artist-heading">{artist.name}の公演で撮影された座席写真</h2>
          <SeatPhotoGallery photos={photos} />
          <a className="zr-focus inline-flex min-h-11 items-center font-bold text-[#a41c53] underline" href={`/artists/${slug}/after-reports#artist-seat-reports`}>参加者の座席レポ・投稿写真を見る</a>
        </section>}
        alternateNames={<PublicAlternateNames names={alternateNames} />}
        searchGuide={
        slug === "hana" || slug === "number-i" || getArtistSeatGuideVenues(slug, initialEvents).length > 0
          ? <ArtistSeatSearchGuide slug={slug} events={initialEvents} />
          : undefined
      } />
    </>
  );
}
