import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // OGP画像は /api/og/ 配下にあるため、API全体は塞がず実行系だけを除外する。
      disallow: ["/api/cron/", "/events/*/fan-seat-prediction"],
    },
    sitemap: "https://tixrepo.com/sitemap.xml",
  };
}
