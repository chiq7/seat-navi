import { getSitemapEntries } from "@/lib/sitemap";
import { getCachedPublicEvent } from "@/lib/serverEventData";

export const revalidate = 86400;

export default function sitemap() {
  return getSitemapEntries(getCachedPublicEvent);
}
