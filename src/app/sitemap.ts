import { getSitemapEntries } from "@/lib/sitemap";
import { getCachedPublicEvent } from "@/lib/serverEventData";

export const dynamic = "force-dynamic";

export default function sitemap() {
  return getSitemapEntries(getCachedPublicEvent);
}
