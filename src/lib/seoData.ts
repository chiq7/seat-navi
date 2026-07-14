import { cache } from "react";
import { ARTISTS, findArtistBySlug, resolveArtist, type Artist } from "@/lib/artists";
import { getEventsForArtist } from "@/lib/events";
import { parseEventTitle } from "@/lib/eventTitle";
import { getEventWithArtist, getGroupedEventIds, getPredictionCount, getSeatReportCount, type EventOgInfo } from "@/lib/og/eventOgData";
import { getReportOgInfo, type ReportOgInfo } from "@/lib/og/reportOgData";
import { supabase } from "@/lib/supabase/client";
import type { CrawledEvent } from "@/lib/types";

export const SITE_URL = "https://tixrepo.com";

export function isTestArtist(
  artist:
    | (Pick<Artist, "slug"> & { artist_slug?: string | null })
    | { slug?: string | null; artist_slug?: string | null }
    | string
    | null
    | undefined,
): boolean {
  if (typeof artist === "string") return artist === "test";
  return artist?.slug === "test" || artist?.artist_slug === "test";
}

export function isTestEvent(event: Pick<CrawledEvent, "artist_slug" | "title">): boolean {
  const artist = resolveArtist(event);
  return event.artist_slug === "test" || parseEventTitle(event.title, artist?.name).isTestData;
}

function getPublicEventArtistSlug(event: Pick<CrawledEvent, "artist_slug" | "title">): string | null {
  if (isTestEvent(event)) return null;
  const slug = event.artist_slug ?? resolveArtist(event)?.slug ?? null;
  return slug && !isTestArtist(slug) ? slug : null;
}

function getPublicContentRows<T extends { event_id: string }>(
  rows: T[],
  eventMap: Map<string, CrawledEvent>,
): { row: T; artistSlug: string | null }[] {
  return rows.flatMap((row) => {
    const event = eventMap.get(row.event_id);
    if (!event || isTestEvent(event)) return [];
    return [{ row, artistSlug: getPublicEventArtistSlug(event) }];
  });
}

export function getSeoArtist(slug: string): Artist | null {
  return findArtistBySlug(slug) ?? null;
}

export const getCachedSeoEvent = cache(async (eventId: string): Promise<EventOgInfo | null> => {
  const info = await getEventWithArtist(eventId);
  if (!info) return null;
  return { ...info, isTestData: isTestEvent(info.event) };
});

export const getCachedSeoReport = cache(async (reportId: string): Promise<ReportOgInfo | null> => {
  const info = await getReportOgInfo(reportId);
  if (!info) return null;
  return { ...info, isTestData: isTestEvent(info.event) };
});

export async function getEventSeoCounts(info: EventOgInfo): Promise<{ seatReports: number; predictions: number }> {
  const groupedIds = await getGroupedEventIds(
    info.event,
    info.event.artist_slug ?? info.artist?.slug ?? null,
  );
  const [seatReports, predictions] = await Promise.all([
    getSeatReportCount(groupedIds),
    getPredictionCount(info.event.id),
  ]);
  return { seatReports, predictions };
}

export async function getArtistContentCounts(slug: string): Promise<{ setlists: number; afterReports: number }> {
  const artist = getSeoArtist(slug);
  if (!artist) return { setlists: 0, afterReports: 0 };

  const events = await getEventsForArtist(slug);
  const eventIds = events.map((event) => event.id);
  if (eventIds.length === 0) return { setlists: 0, afterReports: 0 };

  const [setlistResult, reportResult] = await Promise.all([
    supabase.from("setlists").select("event_id").in("event_id", eventIds),
    supabase.from("after_reports").select("event_id").in("event_id", eventIds),
  ]);
  const eventMap = new Map(events.map((event) => [event.id, event]));
  return {
    setlists: getPublicContentRows((setlistResult.data as { event_id: string }[]) ?? [], eventMap)
      .filter((entry) => entry.artistSlug === slug).length,
    afterReports: getPublicContentRows((reportResult.data as { event_id: string }[]) ?? [], eventMap)
      .filter((entry) => entry.artistSlug === slug).length,
  };
}

type SitemapEventRow = CrawledEvent & { created_at: string | null };
type TimestampRow = { event_id: string; created_at: string | null };
type SetlistTimestampRow = TimestampRow & { updated_at: string | null };
type ReportTimestampRow = TimestampRow & { id: string };

export type SeoSitemapData = {
  artists: { slug: string; lastModified?: string }[];
  events: { id: string; lastModified?: string }[];
  setlistArtists: { slug: string; lastModified?: string }[];
  afterReportArtists: { slug: string; lastModified?: string }[];
  reports: { id: string; lastModified?: string }[];
};

function keepLatest(map: Map<string, string>, key: string, value: string | null | undefined) {
  if (!value) return;
  const current = map.get(key);
  if (!current || value > current) map.set(key, value);
}

export async function getSeoSitemapData(): Promise<SeoSitemapData> {
  const [eventsResult, setlistsResult, reportsResult, seatsResult, predictionsResult] = await Promise.all([
    supabase.from("events").select("id, title, venue, venue_id, date, genre, artist_slug, created_at").limit(10000),
    supabase.from("setlists").select("event_id, created_at, updated_at").limit(10000),
    supabase.from("after_reports").select("id, event_id, created_at").limit(10000),
    supabase.from("seat_reports").select("event_id, created_at").limit(10000),
    supabase.from("fan_seat_predictions").select("event_id, created_at").eq("approved", true).limit(10000),
  ]);

  const allEvents = (eventsResult.data as SitemapEventRow[]) ?? [];
  const eventMap = new Map<string, CrawledEvent>(allEvents.map((event) => [event.id, event]));
  const publicEvents = allEvents.filter((event) => !isTestEvent(event));
  const eventArtistSlug = new Map<string, string>();
  for (const event of publicEvents) {
    const slug = getPublicEventArtistSlug(event);
    if (slug) eventArtistSlug.set(event.id, slug);
  }

  const latestByEvent = new Map<string, string>();
  const latestSetlistByArtist = new Map<string, string>();
  const latestReportByArtist = new Map<string, string>();
  const artistsWithSetlists = new Set<string>();
  const artistsWithReports = new Set<string>();

  const publicSetlists = getPublicContentRows(
    (setlistsResult.data as SetlistTimestampRow[]) ?? [],
    eventMap,
  );
  for (const { row, artistSlug: slug } of publicSetlists) {
    const modified = row.updated_at ?? row.created_at;
    keepLatest(latestByEvent, row.event_id, modified);
    if (!slug) continue;
    artistsWithSetlists.add(slug);
    keepLatest(latestSetlistByArtist, slug, modified);
  }

  const publicReportEntries = getPublicContentRows(
    (reportsResult.data as ReportTimestampRow[]) ?? [],
    eventMap,
  );
  const publicReports: ReportTimestampRow[] = [];
  for (const { row, artistSlug: slug } of publicReportEntries) {
    publicReports.push(row);
    keepLatest(latestByEvent, row.event_id, row.created_at);
    if (!slug) continue;
    artistsWithReports.add(slug);
    keepLatest(latestReportByArtist, slug, row.created_at);
  }

  for (const row of [
    ...((seatsResult.data as TimestampRow[]) ?? []),
    ...((predictionsResult.data as TimestampRow[]) ?? []),
  ]) {
    if (eventMap.has(row.event_id)) keepLatest(latestByEvent, row.event_id, row.created_at);
  }

  const latestByArtist = new Map<string, string>();
  for (const event of publicEvents) {
    const slug = eventArtistSlug.get(event.id);
    if (!slug) continue;
    keepLatest(latestByArtist, slug, latestByEvent.get(event.id) ?? event.date);
  }

  const artists = ARTISTS.filter((artist) => !isTestArtist(artist)).map((artist) => ({
    slug: artist.slug,
    ...(latestByArtist.get(artist.slug) ? { lastModified: latestByArtist.get(artist.slug) } : {}),
  }));

  return {
    artists,
    events: publicEvents.map((event) => ({
      id: event.id,
      ...(latestByEvent.get(event.id) || event.date
        ? { lastModified: latestByEvent.get(event.id) ?? event.date ?? undefined }
        : {}),
    })),
    setlistArtists: [...artistsWithSetlists].map((slug) => ({
      slug,
      ...(latestSetlistByArtist.get(slug) ? { lastModified: latestSetlistByArtist.get(slug) } : {}),
    })),
    afterReportArtists: [...artistsWithReports].map((slug) => ({
      slug,
      ...(latestReportByArtist.get(slug) ? { lastModified: latestReportByArtist.get(slug) } : {}),
    })),
    reports: publicReports.map((report) => ({
      id: report.id,
      ...(report.created_at ? { lastModified: report.created_at } : {}),
    })),
  };
}
