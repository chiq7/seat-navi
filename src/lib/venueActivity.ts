import { getPublicVenueGuideId } from "./publicVenueGuides";
import type { CrawledEvent } from "./types";

export type VenueActivity = { updatedAt?: string; changeObservedAt?: string };
type EventRow = CrawledEvent & { created_at?: string | null };

export function latestRealTime(...values: (string | null | undefined)[]) {
  let latest: number | undefined;
  for (const value of values) {
    const time = value ? Date.parse(value) : NaN;
    if (Number.isFinite(time) && (latest === undefined || time > latest)) latest = time;
  }
  return latest === undefined ? undefined : new Date(latest).toISOString();
}

function eventChanged(a: CrawledEvent, b: CrawledEvent) {
  return a.title !== b.title || a.date !== b.date || a.venue !== b.venue || a.venue_id !== b.venue_id
    || a.artist_slug !== b.artist_slug || a.genre !== b.genre
    || JSON.stringify(a.lottery_types ?? []) !== JSON.stringify(b.lottery_types ?? []);
}

/** Preserve the first observed update time across unchanged scheduler runs. */
export function collectEventModificationTimes(events: EventRow[], previous: {
  events: CrawledEvent[]; eventModifiedAt?: Record<string, string>;
} | null, scannedAt: string) {
  const result: Record<string, string> = {};
  const prior = new Map(previous?.events.map(event => [event.id, event]));
  for (const event of events) {
    const before = prior.get(event.id);
    const changed = before && eventChanged(before, event);
    const modified = latestRealTime(event.created_at, previous?.eventModifiedAt?.[event.id],
      changed || (previous && !before && !event.created_at) ? scannedAt : undefined);
    if (modified) result[event.id] = modified;
  }
  return result;
}

/** The scheduler's scan time is evidence only when two complete public catalogs differ. */
export function collectVenueActivity(events: EventRow[], latestByEvent: ReadonlyMap<string, string | null>,
  previous: { events: CrawledEvent[]; venueActivity?: Record<string, VenueActivity> } | null, scannedAt: string) {
  const activity: Record<string, VenueActivity> = {};
  const prior = new Map(previous?.events.map(event => [event.id, event]));
  const ids = new Set<string>();
  for (const [id, value] of Object.entries(previous?.venueActivity ?? {})) activity[id] = { ...value };
  function markObserved(event: CrawledEvent) {
    const id = getPublicVenueGuideId(event.venue_id, event.venue);
    if (id) (activity[id] ??= {}).changeObservedAt = latestRealTime(activity[id]?.changeObservedAt, scannedAt);
  }
  for (const event of events) {
    ids.add(event.id);
    const id = getPublicVenueGuideId(event.venue_id, event.venue);
    if (id) {
      const updated = latestRealTime(activity[id]?.updatedAt, event.created_at, latestByEvent.get(event.id));
      if (updated) (activity[id] ??= {}).updatedAt = updated;
    }
    const before = prior.get(event.id);
    if (before && eventChanged(before, event)) {
      markObserved(before);
      markObserved(event);
    } else if (previous && !before && !event.created_at) {
      markObserved(event);
    }
  }
  for (const before of prior.values()) if (!ids.has(before.id)) markObserved(before);
  return activity;
}
