import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { EventDetailClient } from "./EventDetailClient";
import { EventTourDates } from "./EventTourDates";
import { EventVenuePhotos } from "./EventVenuePhotos";
import { SeatSourcePreview } from "@/components/venue/SeatSourceArchive";
import { getSeatSources } from "@/lib/seatSourceArchive";
import PublicAlternateNames from "@/components/seo/PublicAlternateNames";
import { getEventVenueAlternateNames, getEventVenueForAlternateNames, getPublicVenueAlternateNames } from "@/lib/publicAlternateNames";
import { EventArenaPhotoMap } from "@/components/arena-map/EventArenaPhotoMap";
import { getEventVenuePhotoPreview, getRenderedEventPhotos } from "@/lib/serverSeatPhotoVenues";
import { buildEventStructuredData, serializeJsonLd } from "@/lib/structuredData";
import { getVenueSeoProfile } from "@/lib/seoProfiles";
import { getCachedArtistEvents, getCachedCanonicalEventId, getCachedPublicEvent, getCachedSamePerformanceEventIds } from "@/lib/serverEventData";
import { buildMeta } from "@/lib/metadata";
import { getEventPageText } from "@/lib/eventPageMetadata";
import { getCachedEventStats } from "@/lib/serverStatsData";
import { canIndexEvent, hasConfirmedPerformanceDate, performanceEditorialContent } from "@/lib/eventPublication";
import { getEventDisplayVenueName, getPublicVenueSeatGuideHref } from "@/lib/publicVenueGuides";
import { getRequestPublicEventCatalog, getFallbackEventIndex } from "@/lib/publicEventCatalogContext";
import { readEventContributions, type IndexSetlist } from "@/lib/eventIndexContent";
import { readSetlistReviewSource } from "@/lib/setlistHelpers";
import { canIndexPerformanceSetlist, performanceSetlistPath } from "@/lib/setlistSeo";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { isTestEvent } from "@/lib/seoData";
import { describePublicEvent } from "@/lib/og/eventOgData";
import { findDisplayedEventRepresentative, getSamePerformanceEventIds } from "@/lib/eventDisplay";
import { catalogEventsForArtist } from "@/lib/events";
import { isPublicEventCatalogStale } from "@/lib/publicEventCatalog";
import { getJstDateString } from "@/lib/artistPageData";
import type { CrawledEvent } from "@/lib/types";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

const getPageEvent = cache(async (id: string) => {
  const catalog = await getRequestPublicEventCatalog();
  const event = catalog?.events.find(candidate => candidate.id === id);
  if (event && catalog) return { info: describePublicEvent(event), catalog };
  const info = await getCachedPublicEvent(id);
  if (!info) notFound();
  return { info, catalog: null };
});

const getContributionState = cache(async (performanceKey: string) => {
  const client = createSupabasePublicClient(AbortSignal.timeout(5000));
  if (!client) return null;
  try { return await readEventContributions(client, JSON.parse(performanceKey)); }
  catch { return null; }
});

const getPerformance = cache(async (id: string) => {
  const { info, catalog } = await getPageEvent(id);
  const event = info.event;
  const sameDate = catalog?.events.filter(row => row.date === event.date && !isTestEvent(row));
  const ids = sameDate ? getSamePerformanceEventIds(sameDate, event) : await getCachedSamePerformanceEventIds(info);
  const canonicalId = !event.date ? id : sameDate ? findDisplayedEventRepresentative(sameDate, event)?.id ?? id : await getCachedCanonicalEventId(info);
  const editorial = performanceEditorialContent(event, ids, info.artist?.slug ?? event.artist_slug ?? null);
  return { info, catalog, ids, canonicalId, editorial, key: JSON.stringify(ids.slice().sort()) };
});

function eventPhotoPresentation(event: CrawledEvent, editorial: ReturnType<typeof performanceEditorialContent>, live: Awaited<ReturnType<typeof getContributionState>>) {
  const reportCount = live ? live.counts.seat_reports + live.counts.after_reports : null;
  const venue = getEventVenuePhotoPreview(event.venue_id, event.venue);
  return { venue, reportCount, ...getRenderedEventPhotos(editorial.layout, venue, reportCount) };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id: eventId } = await params;
  const { info, canonicalId: canonicalEventId, editorial, key } = await getPerformance(eventId);

  const { event, artist, isTestData, dateLabel } = info;
  const artistName = artist?.name ?? event.title;
  const isPublic = !isTestData && !isTestEvent(event) && eventId === canonicalEventId && hasConfirmedPerformanceDate(event);
  const live = await getContributionState(key);
  let index = isPublic && canIndexEvent(event, editorial, false);
  if (isPublic && !index) {
    if (live) index = canIndexEvent(event, editorial, live.latest.size > 0);
    else {
      const known = await getFallbackEventIndex(canonicalEventId);
      if (known === null) throw new Error("Public contribution reader unavailable");
      index = known;
    }
  }
  const venueName = getEventDisplayVenueName(event.venue_id, event.venue);
  const ogImagePath = `/api/og/event/${eventId}`;
  const photos = eventPhotoPresentation(event, editorial, live);
  const { title, description } = getEventPageText(event, artist?.name, photos.count);

  return buildMeta({
    path: `/events/${eventId}`,
    canonicalPath: `/events/${canonicalEventId}`,
    title,
    description,
    index,
    follow: true,
    image: ogImagePath,
    imageAlt: `${artistName} ${venueName} ${dateLabel}`,
  });
}

export default async function EventDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { info, catalog, ids: samePerformanceEventIds, editorial, key } = await getPerformance(id);

  const { event, artist } = info;
  const venueName = getEventDisplayVenueName(event.venue_id, event.venue);
  const arenaPhotoLayout = editorial.layout;
  const venueGuideHref = getPublicVenueSeatGuideHref(event.venue_id, event.venue);
  const alternateNames = getEventVenueAlternateNames(event);
  const live = await getContributionState(key);
  const { venue: photoVenue, reportCount, count: photoCount, showPreview } = eventPhotoPresentation(event, editorial, live);
  const catalogVenue = getEventVenueForAlternateNames(event);
  const locationGuide = catalogVenue && !catalogVenue.guideId ? null : photoVenue;
  const artistSlug = artist?.slug ?? event.artist_slug ?? null;
  const [counts, initialRelatedEvents] = catalog
    ? [null, artistSlug ? catalogEventsForArtist(catalog.events, artistSlug) : [event]] as const
    : await Promise.all([getCachedEventStats(info), artistSlug ? getCachedArtistEvents(artistSlug) : Promise.resolve([event])]);
  const awaitingReports = Boolean(event.date && event.date >= getJstDateString() && live
    && reportCount === 0 && !editorial.seatPosts && !editorial.mapPosts && !arenaPhotoLayout
    && !live.counts.external_seat_observations && !live.counts.fan_seat_predictions);
  const venueProfile = event.venue_id ? getVenueSeoProfile(event.venue_id) : null;
  const venueHref = venueGuideHref?.split("#")[0] ?? null;
  const venueMiniGuide = !counts || (counts.seatReports === 0 && counts.predictions === 0 && !counts.hasExternalArena)
    ? {
        venueName,
        capacityLabel: venueProfile ? `最大${venueProfile.capacity.toLocaleString("ja-JP")}人` : "会場の座席情報",
        areaLabel: venueProfile ? `${venueProfile.address.region}${venueProfile.address.locality}` : "",
        archiveHref: venueHref && photoVenue && getSeatSources("venues", photoVenue.id).seat_view.length
          ? `${venueHref}#dome-photos` : null,
      }
    : null;
  const artistName = artist?.name ?? null;
  const { name: eventName, description } = getEventPageText(event, artist?.name, photoCount);
  const structuredData = buildEventStructuredData({
    id,
    name: eventName,
    description,
    startDate: event.date,
    endDate: event.date,
    venue: venueName,
    venueId: locationGuide?.id ?? null,
    venueAlternateNames: locationGuide ? getPublicVenueAlternateNames(locationGuide.id, event.venue) : alternateNames,
    venueAddress: locationGuide ? getVenueSeoProfile(locationGuide.id)?.address : null,
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
        key={id}
        params={params}
        initialEvent={event}
        initialRelatedEvents={initialRelatedEvents.length > 0 ? initialRelatedEvents : [event]}
        samePerformanceEventIds={samePerformanceEventIds}
        contributionCounts={live?.counts ?? null}
        setlistHref={eventSetlistHref(artistSlug, event, live?.setlists ?? [])}
        venueSeatHref={venueGuideHref}
        liveReportIds={live?.reports.map(row => row.id) ?? []}
        arenaPhotoCount={arenaPhotoLayout?.photos.length ?? 0}
        featuredPhotoBlock={arenaPhotoLayout?.featuredPhotoBlock}
        sourceSeatCount={editorial.seatPosts}
        sourceMapCount={editorial.mapPosts}
        seatSourceGuide={editorial.sourceIds.length ? editorial.sourceIds.map((id, i) =>
          <SeatSourcePreview key={id} scope="events" id={id} sectionId={i ? "seat-source-posts-" + id : "seat-source-posts"} />) : null}
        tourDates={<EventTourDates event={event} related={initialRelatedEvents} />}
        venuePhotoGuide={photoVenue ? <EventVenuePhotos eventId={id} venue={photoVenue} awaitingReports={awaitingReports} showPreview={showPreview} /> : null}
        arenaPhotoMap={arenaPhotoLayout ? <EventArenaPhotoMap key={event.id} layout={arenaPhotoLayout} eventTitle={event.title} /> : undefined}
        venueMiniGuide={venueMiniGuide}
        venueAlternateNames={<PublicAlternateNames names={alternateNames} />}
        catalogUpdatedAt={catalog?.updatedAt}
        catalogStale={catalog ? isPublicEventCatalogStale(catalog.updatedAt) : false}
        dayGuideHref={editorial.dayHref}
      />
    </>
  );
}

/** The verified per-show setlist page when this show has one, else the setlist list opened on this show. */
function eventSetlistHref(artistSlug: string | null, event: CrawledEvent, setlists: readonly IndexSetlist[]) {
  if (!artistSlug) return undefined;
  const own = setlists.find(row => row.event_id === event.id);
  if (own && readSetlistReviewSource(own.review_source) && canIndexPerformanceSetlist(event, own.items, true, getJstDateString())) {
    return performanceSetlistPath(artistSlug, event.id);
  }
  const shown = own ?? setlists[0];
  return shown ? `/artists/${encodeURIComponent(artistSlug)}/setlist?event=${encodeURIComponent(shown.event_id)}` : undefined;
}
