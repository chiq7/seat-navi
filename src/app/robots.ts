import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/events/*/fan-seat-prediction"],
    },
    sitemap: "https://tixrepo.com/sitemap.xml",
  };
}
