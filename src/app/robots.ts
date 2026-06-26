import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: "/report/live/detail",
    },
    sitemap: "https://tixrepo.com/sitemap.xml",
  };
}
