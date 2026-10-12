import type { UpcomingEvent } from "./homeData";
import { getJstDateString } from "./artistPageData";

export function selectSeatDiscoveryHomeEvents(events: UpcomingEvent[], favorites: ReadonlySet<string>, limit = 4, today = getJstDateString()) {
  const seen = new Set<string>();
  return events.filter(event => event.dateIso && event.dateIso >= today)
    .sort((a, b) => Number(favorites.has(b.artistSlug)) - Number(favorites.has(a.artistSlug)) || a.dateIso!.localeCompare(b.dateIso!) || a.id.localeCompare(b.id))
    .filter(event => { if (seen.has(event.artistSlug)) return false; seen.add(event.artistSlug); return true; })
    .slice(0, Math.max(0, Math.min(4, limit)));
}
