import type { MetadataRoute } from "next";
import { getSeoSitemapData, SITE_URL } from "@/lib/seoData";

export const revalidate = 86400;

function sitemapEntry(
  url: string,
  lastModified?: string,
  extras?: Pick<MetadataRoute.Sitemap[number], "changeFrequency" | "priority">,
): MetadataRoute.Sitemap[number] {
  return { url, ...(lastModified ? { lastModified } : {}), ...extras };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const data = await getSeoSitemapData();

  return [
    sitemapEntry(`${SITE_URL}/`, undefined, { changeFrequency: "daily", priority: 1 }),
    ...data.artists.map((artist) =>
      sitemapEntry(`${SITE_URL}/artists/${artist.slug}`, artist.lastModified, {
        changeFrequency: "weekly",
        priority: 0.8,
      }),
    ),
    ...data.events.map((event) =>
      sitemapEntry(`${SITE_URL}/events/${event.id}`, event.lastModified, {
        changeFrequency: "weekly",
        priority: 0.8,
      }),
    ),
    ...data.setlistArtists.map((artist) =>
      sitemapEntry(`${SITE_URL}/artists/${artist.slug}/setlist`, artist.lastModified, {
        changeFrequency: "weekly",
        priority: 0.7,
      }),
    ),
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
