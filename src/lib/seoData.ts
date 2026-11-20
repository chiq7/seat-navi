import { cache } from "react";
import { ARTISTS, findArtistBySlug, resolveArtist, type Artist } from "@/lib/artists";
import { catalogEventsForArtist, queryEventsForArtist } from "@/lib/events";
import { isArtistOnlyEventTitle, parseEventTitle } from "@/lib/eventTitle";
import { getEventWithArtist, getGroupedEventIds, getPredictionCount, getSeatReportCount, type EventOgInfo } from "@/lib/og/eventOgData";
import { getReportOgInfo, type ReportOgInfo } from "@/lib/og/reportOgData";
import { supabase } from "@/lib/supabase/client";
import type { CrawledEvent } from "@/lib/types";
import { dedupeVenueEventsForDisplay, getSamePerformanceEventIds } from "@/lib/eventDisplay";
import { readEventContributions } from "@/lib/eventIndexContent";
import { canIndexEvent, performanceEditorialContent } from "@/lib/eventPublication";
import { canIndexLiveReport } from "@/lib/liveReportSeo";
import { applyReviewedEventDate } from "@/lib/reviewedEventDates";
import type { PublicEventCatalog } from "@/lib/publicEventCatalog";
import { getPublicVenueGuideId } from "@/lib/publicVenueGuides";
import { latestRealTime } from "@/lib/venueActivity";
import { seatSourcePublicationDates } from "@/lib/seatSourceArchive";
import archiveArtistsWithSongs from "@/lib/archiveArtistsWithSongs.json";
import type { SupabaseClient } from "@supabase/supabase-js";

import { hasSetlistSongs, readSetlistReviewSource } from "@/lib/setlistHelpers";
import { canIndexPerformanceSetlist } from "@/lib/setlistSeo";
import { getJstDateString } from "@/lib/artistPageData";
import { readSupabasePages } from "@/lib/supabase/readPages";

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
  return event.artist_slug === "test"
    || parseEventTitle(event.title, artist?.name).isTestData
    || isArtistOnlyEventTitle(event.title, artist?.name);
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

export const getEventSeoCounts = cache(async (info: EventOgInfo): Promise<{ seatReports: number; predictions: number }> => {
  const groupedIds = await getGroupedEventIds(
    info.event,
    info.event.artist_slug ?? info.artist?.slug ?? null,
  );
  const [seatReports, predictions] = await Promise.all([
    getSeatReportCount(groupedIds),
    getPredictionCount(info.event.id),
  ]);
  return { seatReports, predictions };
});

export async function getArtistContentCounts(slug: string): Promise<{ setlists: number; afterReports: number }> {
  const artist = getSeoArtist(slug);
  if (!artist) return { setlists: 0, afterReports: 0 };

  const events = await queryEventsForArtist(supabase, slug, { throwOnError: true });
  const eventIds = events.map((event) => event.id);
  if (eventIds.length === 0) return { setlists: 0, afterReports: 0 };

  const [setlistResult, reportResult] = await Promise.all([
    supabase.from("setlists").select("event_id, items").in("event_id", eventIds),
    supabase.from("after_reports").select("event_id").in("event_id", eventIds),
  ]);
  if (setlistResult.error || reportResult.error) {
    throw new Error("Public content counts could not be loaded", { cause: setlistResult.error ?? reportResult.error });
  }
  const eventMap = new Map(events.map((event) => [event.id, event]));
  return {
    setlists: getPublicContentRows(((setlistResult.data as { event_id: string; items: unknown }[]) ?? []).filter(row => hasSetlistSongs(row.items)), eventMap)
      .filter((entry) => entry.artistSlug === slug).length,
    afterReports: getPublicContentRows((reportResult.data as { event_id: string }[]) ?? [], eventMap)
      .filter((entry) => entry.artistSlug === slug).length,
  };
}

export async function getArtistNewsCount(slug: string): Promise<number> {
  if (!getSeoArtist(slug)) return 0;
  const { count, error } = await supabase
    .from("official_news_public")
    .select("artist_slug", { count: "exact", head: true })
    .eq("artist_slug", slug);
  if (error) throw new Error("Public news count could not be loaded", { cause: error });
  return count ?? 0;
}

type SitemapEventRow = CrawledEvent & { created_at: string | null };
type NewsTimestampRow = { id: string; artist_slug: string; created_at: string | null };

export type SeoSitemapData = {
  artists: { slug: string; lastModified?: string }[];
  newsArtists: { slug: string; lastModified?: string }[];
  events: { id: string; lastModified?: string }[];
  venueLastModified: Map<string, string>;
  setlistArtists: { slug: string; lastModified?: string }[];
  setlistEvents: { slug: string; id: string; lastModified?: string }[];
  afterReportArtists: { slug: string; lastModified?: string }[];
  reports: { id: string; lastModified?: string }[];
};

function keepLatest(map: Map<string, string>, key: string, value: string | null | undefined) {
  if (!value || !Number.isFinite(Date.parse(value))) return;
  const current = map.get(key);
  if (!current || Date.parse(value) > Date.parse(current)) map.set(key, value);
}

export async function getSeoSitemapData(client: SupabaseClient = supabase, collected?: Awaited<ReturnType<typeof readEventContributions>>, activity?: Pick<PublicEventCatalog, "eventModifiedAt" | "venueActivity"> | null): Promise<SeoSitemapData> {
  const [eventsResult, content, newsResult] = await Promise.all([
    readSupabasePages<SitemapEventRow>((from, to) =>
      client.from("events").select("id, title, venue, venue_id, date, genre, artist_slug, created_at", { count: "exact" }).order("id").range(from, to), Infinity,
    ),
    collected ?? readEventContributions(client),
    readSupabasePages<NewsTimestampRow>((from, to) =>
      client.from("official_news_public").select("id, artist_slug, created_at", { count: "exact" }).order("id").range(from, to), Infinity,
    ),
  ]);

  const readFailure = [eventsResult, newsResult].find(result => result.error);
  if (readFailure) throw new Error("Sitemap content could not be loaded", { cause: readFailure.error });

  if (eventsResult.limited || newsResult.limited) throw new Error("Sitemap source rows are incomplete");
  const allEvents = eventsResult.data.map(applyReviewedEventDate);
  const eventMap = new Map(allEvents.map(event => [event.id, event]));
  const publicEvents = allEvents.filter((event) => !isTestEvent(event));
  // 非代表URLのcanonicalとsitemapを矛盾させない。DB行や既存URLは削除しない。
  const canonicalPublicEvents = dedupeVenueEventsForDisplay(publicEvents);
  const eventsByDate = Map.groupBy(publicEvents, event => event.date);
  const eventArtistSlug = new Map<string, string>();
  for (const event of publicEvents) {
    const slug = getPublicEventArtistSlug(event);
    if (slug) eventArtistSlug.set(event.id, slug);
  }

  const latestByEvent = content.latest;
  const latestSetlistByArtist = new Map<string, string>();
  const latestReportByArtist = new Map<string, string>();
  const artistsWithSetlists = new Set<string>(archiveArtistsWithSongs.filter(slug => getSeoArtist(slug) && !isTestArtist(slug)));
  const setlistEvents: SeoSitemapData["setlistEvents"] = [];
  const today = getJstDateString();
  const artistsWithReports = new Set<string>();
  const artistEventIds = new Map<string, Set<string>>();
  function visibleToArtist(slug: string, id: string) {
    if (!artistEventIds.has(slug)) {
      artistEventIds.set(slug, new Set(catalogEventsForArtist(publicEvents, slug).map(event => event.id)));
    }
    return artistEventIds.get(slug)!.has(id);
  }

  const publicSetlists = getPublicContentRows(
    content.setlists,
    eventMap,
  );
  for (const { row, artistSlug: slug } of publicSetlists) {
    const modified = row.updated_at ?? row.created_at;
    if (!slug) continue;
    if (visibleToArtist(slug, row.event_id)) {
      artistsWithSetlists.add(slug);
      keepLatest(latestSetlistByArtist, slug, modified);
    }
    const event = eventMap.get(row.event_id);
    if (event && findArtistBySlug(slug) && canIndexPerformanceSetlist(event, row.items, Boolean(readSetlistReviewSource(row.review_source)), today)) {
      setlistEvents.push({ slug, id: event.id, lastModified: modified ?? undefined });
    }
  }

  const publicReportEntries = getPublicContentRows(
    content.reports,
    eventMap,
  );
  const publicReports: typeof content.reports = [];
  for (const { row, artistSlug: slug } of publicReportEntries) {
    const event = eventMap.get(row.event_id)!;
    if (canIndexLiveReport(event, resolveArtist(event)?.name, false)) publicReports.push(row);
    if (!slug || !visibleToArtist(slug, row.event_id)) continue;
    artistsWithReports.add(slug);
    keepLatest(latestReportByArtist, slug, row.created_at);
  }

  const latestByArtist = new Map<string, string>();
  const venueLastModified = new Map(Object.entries(seatSourcePublicationDates.venues));
  for (const [id, record] of Object.entries(activity?.venueActivity ?? {})) {
    keepLatest(venueLastModified, id, latestRealTime(record.updatedAt, record.changeObservedAt));
  }
  for (const event of publicEvents) {
    const venueId = getPublicVenueGuideId(event.venue_id, event.venue);
    if (venueId) keepLatest(venueLastModified, venueId, latestRealTime(event.created_at, latestByEvent.get(event.id), activity?.eventModifiedAt?.[event.id]));
    const slug = eventArtistSlug.get(event.id);
    if (!slug) continue;
    // 公演日は更新日ではない。投稿更新かevents行の作成日時だけをlastmodに使う。
    keepLatest(latestByArtist, slug, latestByEvent.get(event.id) ?? event.created_at);
  }

  const latestNewsByArtist = new Map<string, string>();
  const artistsWithNews = new Set<string>();
  for (const news of newsResult.data) {
    if (!findArtistBySlug(news.artist_slug) || isTestArtist(news.artist_slug)) continue;
    artistsWithNews.add(news.artist_slug);
    keepLatest(latestNewsByArtist, news.artist_slug, news.created_at);
  }

  const artists = ARTISTS.filter((artist) => !isTestArtist(artist)).map((artist) => ({
    slug: artist.slug,
    ...(latestByArtist.get(artist.slug) ? { lastModified: latestByArtist.get(artist.slug) } : {}),
  }));

  return {
    artists,
    venueLastModified,
    newsArtists: [...artistsWithNews].map(slug => ({
      slug,
      lastModified: latestNewsByArtist.get(slug),
    })),
    events: canonicalPublicEvents.flatMap(event => {
      const ids = getSamePerformanceEventIds(eventsByDate.get(event.date) ?? [], event);
      const editorial = performanceEditorialContent(event, ids, eventArtistSlug.get(event.id) ?? null);
      if (!canIndexEvent(event, editorial, ids.some(id => latestByEvent.has(id)))) return [];
      const latest = latestRealTime(editorial.reviewedAt, ...ids.flatMap(id => [
        eventMap.get(id)?.created_at, latestByEvent.get(id), seatSourcePublicationDates.events[id], activity?.eventModifiedAt?.[id],
      ]));
      return [{ id: event.id, lastModified: latest }];
    }),
    setlistArtists: [...artistsWithSetlists].map((slug) => ({
      slug,
      ...(latestSetlistByArtist.get(slug) ? { lastModified: latestSetlistByArtist.get(slug) } : {}),
    })),
    setlistEvents,
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
