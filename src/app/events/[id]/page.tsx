import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventDetailClient } from "./EventDetailClient";
import { getCachedSeoEvent, getEventSeoCounts, SITE_URL } from "@/lib/seoData";
import { buildEventStructuredData, serializeJsonLd } from "@/lib/structuredData";
import { getVenueSeoProfile } from "@/lib/seoProfiles";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { queryEventsForArtist } from "@/lib/events";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id: eventId } = await params;
  const info = await getCachedSeoEvent(eventId);
  if (!info) notFound();

  const { event, artist, tourName, isTestData, dateLabel } = info;
  const artistName = artist?.name ?? event.title;
  const { seatReports, predictions } = await getEventSeoCounts(info);
  const ogImagePath = `/api/og/event/${eventId}`;
  const title = `${artistName} ${event.venue} ${dateLabel}｜座席表・当落・現地レポ｜ちけレポ`;

  const countParts = [
    seatReports > 0 ? `座席報告${seatReports}件` : null,
    predictions > 0 ? `座席予想${predictions}件` : null,
  ].filter((v): v is string => Boolean(v));
  const countText = countParts.length > 0 ? `${countParts.join("、")}。` : "";
  const description = `${artistName} ${tourName} ${event.venue} ${dateLabel}の${countText}当落、座席位置、アリーナ予想、現地レポを確認できます。`;

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/events/${eventId}` },
    robots: { index: !isTestData, follow: true },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/events/${eventId}`,
      type: "website",
      images: [{ url: ogImagePath, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImagePath],
    },
  };
}

export default async function EventDetailPage({ params }: PageProps) {
  const { id } = await params;
  const info = await getCachedSeoEvent(id);
  if (!info) notFound();

  const { event, artist, tourName, dateLabel } = info;
  const serverClient = await createSupabaseServerClient();
  const artistSlug = artist?.slug ?? event.artist_slug ?? null;
  const [counts, initialRelatedEvents] = await Promise.all([
    getEventSeoCounts(info),
    serverClient && artistSlug ? queryEventsForArtist(serverClient, artistSlug) : Promise.resolve([event]),
  ]);
  const venueProfile = event.venue_id ? getVenueSeoProfile(event.venue_id) : null;
  const venueMiniGuide = counts.seatReports === 0 && counts.predictions === 0 && venueProfile && event.venue_id
    ? {
        venueName: event.venue,
        capacityLabel: `最大${venueProfile.capacity.toLocaleString("ja-JP")}人`,
        areaLabel: `${venueProfile.address.region}${venueProfile.address.locality}`,
        venueHref: `/venues/${event.venue_id}`,
        archiveHref: `/venues/${event.venue_id}#past-events-title`,
      }
    : null;
  const artistName = artist?.name ?? null;
  const eventName = artistName ? `${artistName} ${tourName}` : event.title;
  const description = `${eventName} ${event.venue} ${dateLabel}の座席表、当落、アリーナ予想、現地レポ。`;
  const structuredData = buildEventStructuredData({
    id,
    name: eventName,
    description,
    startDate: event.date,
    venue: event.venue,
    venueId: event.venue_id,
    artistName,
    artistSlug: artist?.slug ?? event.artist_slug ?? null,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }}
      />
      <EventDetailClient
        params={params}
        initialEvent={event}
        initialRelatedEvents={initialRelatedEvents.length > 0 ? initialRelatedEvents : [event]}
        venueMiniGuide={venueMiniGuide}
      />
    </>
  );
}
