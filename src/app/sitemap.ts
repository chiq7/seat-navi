import type { MetadataRoute } from "next";

const BASE = "https://koen-now.com";

const PUBLISHED_ARTIST_SLUGS = [
  "nogizaka46",
  "sakurazaka46",
  "niziu",
  "equal-love",
  "fruits-zipper",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const artistPages: MetadataRoute.Sitemap = PUBLISHED_ARTIST_SLUGS.map((slug) => ({
    url: `${BASE}/artists/${slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [
    {
      url: BASE,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    ...artistPages,
  ];
}
