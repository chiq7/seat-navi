import type { MetadataRoute } from "next";

export function sitemapXml(entries: MetadataRoute.Sitemap) {
  const entities: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" };
  const escape = (value: string | number) => String(value).replace(/[&<>"']/g, character => entities[character]);
  return ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries.map(({ url, lastModified, changeFrequency, priority }) => [
      "<url>", `  <loc>${escape(url)}</loc>`,
      lastModified && `  <lastmod>${new Date(lastModified).toISOString()}</lastmod>`,
      changeFrequency && `  <changefreq>${escape(changeFrequency)}</changefreq>`,
      priority !== undefined && `  <priority>${priority}</priority>`, "</url>",
    ].filter(Boolean).join("\n")), "</urlset>", ""].join("\n");
}

export const FILTERED_SITEMAP_ASSET = "/_tixrepo/content-sitemap.xml";
