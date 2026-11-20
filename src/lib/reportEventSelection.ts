import { resolveArtist } from "./artists";
import { dedupeVenueEventsForDisplay, findDisplayedEventRepresentative } from "./eventDisplay";
import { getPerformanceSessionMarker } from "./eventIdentity";
import { VENUES, getVenueIdAliases } from "./eventCrawlerConfig";
import { getPublicVenueGuideId, getPublicVenueName } from "./publicVenueGuides";
import { venuePageDisplayNames } from "./venuePageDisplayNames";
import type { CrawledEvent } from "./types";

const preferredVenueNames: Readonly<Partial<Record<string, string>>> = venuePageDisplayNames;
const sessionOrder = new Intl.Collator("ja", { numeric: true });

export type ReportContext = { event: string | null; venue: string | null; artist: string | null };
export type ReportOptions = {
  events: CrawledEvent[];
  selectedEventId: string | null;
  venueName: string | null;
  unavailableEvent: boolean;
};

export function selectReportEvents(publicEvents: readonly CrawledEvent[], context: ReportContext): ReportOptions {
  const requestedVenue = context.venue;
  const venue = requestedVenue ? VENUES.find(v => getVenueIdAliases(v.id).includes(requestedVenue)) : undefined;
  const venueIds = venue ? getVenueIdAliases(venue.id) : [];
  const venueName = venue ? (preferredVenueNames[venue.id] ?? getPublicVenueName(venue.id, venue.name)) : null;
  const anchor = context.event ? publicEvents.find(e => e.id === context.event) : undefined;
  const artistOf = (e: CrawledEvent) => e.artist_slug ?? resolveArtist(e)?.slug;
  const artist = context.artist || (anchor && artistOf(anchor));
  const matches = publicEvents.filter(e =>
    (!context.venue || (venue && (venueIds.includes(e.venue_id) || getPublicVenueGuideId(e.venue_id, e.venue) === venue.id))) &&
    (!artist || artistOf(e) === artist));
  // Group by day before deduplicating to keep work bounded on the all-events picker.
  const byDay = new Map<string, CrawledEvent[]>();
  for (const row of matches) {
    const key = row.date ?? "";
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(row);
  }
  const events = Array.from(byDay.values()).flatMap(rows => dedupeVenueEventsForDisplay(rows).sort((a, b) =>
    sessionOrder.compare(a.venue, b.venue)
    || sessionOrder.compare(getPerformanceSessionMarker(a.title) ?? "", getPerformanceSessionMarker(b.title) ?? "")
    || sessionOrder.compare(a.title, b.title)));
  const selected = anchor && matches.includes(anchor) ? anchor : null;
  if (selected && !events.some(row => row.id === selected.id)) {
    const representative = findDisplayedEventRepresentative(events, selected);
    if (representative) events[events.indexOf(representative)] = selected;
    else events.push(selected);
  }
  return { events, selectedEventId: selected?.id ?? null, venueName, unavailableEvent: context.event !== null && !selected };
}
