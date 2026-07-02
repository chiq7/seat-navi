import type { MetadataRoute } from "next";

const BASE = "https://tixrepo.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    { url: BASE, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE}/report`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${BASE}/report/live`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${BASE}/report/ticket`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${BASE}/artists/nogizaka46`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
  ];
}
