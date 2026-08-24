import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventDetailClient } from "./EventDetailClient";
import { buildEventStructuredData, serializeJsonLd } from "@/lib/structuredData";
import { getVenueSeoProfile } from "@/lib/seoProfiles";
import { getCachedArtistEvents, getCachedCanonicalEventId, getCachedPublicEvent } from "@/lib/serverEventData";
import { buildMeta } from "@/lib/metadata";
import { getCachedEventStats } from "@/lib/serverStatsData";

type PageProps = {
  params: Promise<{ id: string }>;
};

function appendVenueOnce(label: string, venue: string): string {
  return label.includes(venue) ? label : `${label} ${venue}`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id: eventId } = await params;
  const info = await getCachedPublicEvent(eventId);
  if (!info) notFound();

  const { event, artist, tourName, isTestData, dateLabel } = info;
  const artistName = artist?.name ?? event.title;
  const [{ seatReports, predictions }, canonicalEventId] = await Promise.all([
    getCachedEventStats(info),
    getCachedCanonicalEventId(info),
  ]);
  const ogImagePath = `/api/og/event/${eventId}`;
  const title = `${artistName} ${event.venue} ${dateLabel}｜座席表・当落・現地レポ｜ちけレポ`;

  const countParts = [
    seatReports > 0 ? `座席報告${seatReports}件` : null,
    predictions > 0 ? `座席予想${predictions}件` : null,
  ].filter((v): v is string => Boolean(v));
  const countText = countParts.length > 0 ? `${countParts.join("、")}。` : "";
  const descriptionSubject = appendVenueOnce(`${artistName} ${tourName}`, event.venue);
  const description = `${descriptionSubject} ${dateLabel}の${countText}当落、座席位置、アリーナ予想、現地レポを確認できます。`;

  return buildMeta({
    path: `/events/${eventId}`,
    canonicalPath: `/events/${canonicalEventId}`,
    title,
    description,
    index: !isTestData,
    follow: true,
    image: ogImagePath,
    imageAlt: `${artistName} ${event.venue} ${dateLabel}`,
  });
}

export default async function EventDetailPage({ params }: PageProps) {
  const { id } = await params;
  const info = await getCachedPublicEvent(id);
  if (!info) notFound();

  const { event, artist, tourName, dateLabel } = info;
  const artistSlug = artist?.slug ?? event.artist_slug ?? null;
  const [counts, initialRelatedEvents] = await Promise.all([
    getCachedEventStats(info),
    artistSlug ? getCachedArtistEvents(artistSlug) : Promise.resolve([event]),
  ]);
  const venueProfile = event.venue_id ? getVenueSeoProfile(event.venue_id) : null;
  const venueMiniGuide = counts.seatReports === 0 && counts.predictions === 0
    ? {
        venueName: event.venue,
        capacityLabel: venueProfile ? `最大${venueProfile.capacity.toLocaleString("ja-JP")}人` : "会場の座席情報",
        areaLabel: venueProfile ? `${venueProfile.address.region}${venueProfile.address.locality}` : "過去公演のレポを確認できます",
        venueHref: event.venue_id ? `/venues/${event.venue_id}` : null,
        archiveHref: event.venue_id ? `/venues/${event.venue_id}#past-events-title` : null,
      }
    : null;
  const artistName = artist?.name ?? null;
  const eventName = artistName ? `${artistName} ${tourName}` : event.title;
  const description = `${appendVenueOnce(eventName, event.venue)} ${dateLabel}の座席表、当落、アリーナ予想、現地レポ。`;
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
