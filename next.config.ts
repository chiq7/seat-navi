import type { NextConfig } from "next";
import { HTML_LIMITED_BOT_UA_RE } from "next/dist/shared/lib/router/utils/html-bots.js";
import { prepareArchiveSongIndex } from "./scripts/prepareArchiveSongIndex.mjs";

prepareArchiveSongIndex();

const nextConfig: NextConfig = {
  // Keep robots in the initial head for Search and URL Inspection; preserve the preview crawlers too.
  htmlLimitedBots: new RegExp(HTML_LIMITED_BOT_UA_RE.source + "|Googlebot|Google-InspectionTool|meta-externalagent|meta-externalfetcher", "i"),
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "sibjmyabcwpojtzbnqnc.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "sibjmyabcwpojtzbnqnc.supabase.co",
        pathname: "/storage/v1/object/sign/**",
      },
    ],
  },
};

export default nextConfig;
