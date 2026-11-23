import type { MetadataRoute } from "next";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSeoSitemapData, SITE_URL } from "@/lib/seoData";
import type { readEventContributions } from "@/lib/eventIndexContent";
import { getPublicVenueGuideUpdatedAt, PUBLIC_VENUE_GUIDE_UPDATED_AT } from "@/lib/publicVenueGuides";
import { VENUES } from "@/lib/eventCrawlerConfig";
import { EVENT_DAY_PUBLICATIONS } from "@/data/eventDayPublications";
import { eventDayGuidePath, matchPublishedEventDay } from "@/lib/eventDayPublication";
import type { EventOgInfo } from "@/lib/og/eventOgData";
import { performanceSetlistPath } from "@/lib/setlistSeo";
import { SITE_NEWS } from "@/lib/siteNews";
import { latestRealTime } from "@/lib/venueActivity";
import type { PublicEventCatalog } from "@/lib/publicEventCatalog";

function sitemapEntry(
  url: string,
  lastModified?: string,
  extras?: Pick<MetadataRoute.Sitemap[number], "changeFrequency" | "priority">,
): MetadataRoute.Sitemap[number] {
  return { url, ...(lastModified ? { lastModified: new Date(lastModified).toISOString() } : {}), ...extras };
}

export async function getSitemapEntries(
  getPublicEvent: (eventId: string) => Promise<EventOgInfo | null>,
  client?: SupabaseClient,
  contributions?: Awaited<ReturnType<typeof readEventContributions>>,
  activity?: Pick<PublicEventCatalog, "eventModifiedAt" | "venueActivity"> | null,
): Promise<MetadataRoute.Sitemap> {
  const data = await getSeoSitemapData(client, contributions, activity);
  const guides = await Promise.all(EVENT_DAY_PUBLICATIONS.filter(p => p.status === "published").map(async publication => {
    const info = await getPublicEvent(publication.identity.eventId);
    return info && !info.isTestData && matchPublishedEventDay(info.event, info.artist?.slug ?? info.event.artist_slug ?? null, EVENT_DAY_PUBLICATIONS)
      ? sitemapEntry(`${SITE_URL}${eventDayGuidePath(info.event.id)}`, publication.review?.reviewedAt, { changeFrequency: "weekly", priority: 0.7 })
      : null;
  }));

  return [
    sitemapEntry(`${SITE_URL}/`, undefined, { changeFrequency: "daily", priority: 1 }),
    sitemapEntry(`${SITE_URL}/about`, "2026-10-12", { changeFrequency: "monthly", priority: 0.6 }),
    sitemapEntry(`${SITE_URL}/news`, SITE_NEWS.map(post => post.publishedAt).sort().at(-1)),
    ...SITE_NEWS.map(post => sitemapEntry(`${SITE_URL}/news/${post.slug}`, post.publishedAt)),
    sitemapEntry(`${SITE_URL}/venues`, PUBLIC_VENUE_GUIDE_UPDATED_AT, { changeFrequency: "weekly", priority: 0.8 }),
    ...VENUES.map((venue) =>
      sitemapEntry(`${SITE_URL}/venues/${venue.id}`, latestRealTime(getPublicVenueGuideUpdatedAt(venue.id), data.venueLastModified.get(venue.id)), {
        changeFrequency: "daily",
        priority: 0.8,
      }),
    ),
    ...data.artists.map((artist) =>
      sitemapEntry(`${SITE_URL}/artists/${artist.slug}`, artist.lastModified, {
        changeFrequency: "weekly",
        priority: 0.8,
      }),
    ),
    ...data.newsArtists.map((artist) =>
      sitemapEntry(`${SITE_URL}/artists/${artist.slug}/news`, artist.lastModified, {
        changeFrequency: "daily",
        priority: 0.7,
      }),
    ),
    ...data.events.map((event) =>
      sitemapEntry(`${SITE_URL}/events/${event.id}`, event.lastModified, {
        changeFrequency: "weekly",
        priority: 0.8,
      }),
    ),
    ...guides.filter((guide): guide is MetadataRoute.Sitemap[number] => guide !== null),
    ...data.setlistArtists.map((artist) =>
      sitemapEntry(`${SITE_URL}/artists/${artist.slug}/setlist`, artist.lastModified, {
        changeFrequency: "weekly",
        priority: 0.7,
      }),
    ),
    ...data.setlistEvents.map(event => sitemapEntry(`${SITE_URL}${performanceSetlistPath(event.slug, event.id)}`, event.lastModified)),
    ...data.afterReportArtists.map((artist) =>
      sitemapEntry(`${SITE_URL}/artists/${artist.slug}/after-reports`, artist.lastModified, {
        changeFrequency: "weekly",
        priority: 0.7,
      }),
    ),
    ...data.reports.map((report) =>
      sitemapEntry(
        `${SITE_URL}/report/live/detail?reportId=${encodeURIComponent(report.id)}`,
        report.lastModified,
        { changeFrequency: "monthly", priority: 0.6 },
      ),
    ),
    sitemapEntry(`${SITE_URL}/terms`, "2026-07-14", { changeFrequency: "yearly", priority: 0.3 }),
    sitemapEntry(`${SITE_URL}/privacy`, "2026-07-14", { changeFrequency: "yearly", priority: 0.3 }),
    sitemapEntry(`${SITE_URL}/contact`, "2026-07-14", { changeFrequency: "yearly", priority: 0.3 }),
  ];
}
