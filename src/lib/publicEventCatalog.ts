import type { CrawledEvent } from "./types";
import type { VenueActivity } from "./venueActivity";
import { getJstDateString } from "./artistPageData";
import type { HomePrograms, PublicFeed } from "./publicPageData";
import { applyReviewedEventDate, reviewedEventDate } from "./reviewedEventDates";

export { PUBLIC_CATALOG_SCHEDULE } from "./publicCatalogSchedule";
export const PUBLIC_CATALOG_KEY = "public/v1/catalog.json";
export const PUBLIC_CATALOG_ASSET = "/_tixrepo/data/catalog-v1.json";
export const PUBLIC_CATALOG_MAX_BYTES = 2 * 1024 * 1024;
export const PUBLIC_CATALOG_CACHE_SECONDS = 60;
export const PUBLIC_CATALOG_STALE_MS = 45 * 60 * 1000;

export type PublicEventCatalog = {
  version: 1;
  updatedAt: string;
  events: CrawledEvent[];
  home: HomePrograms;
  feed: PublicFeed;
  venueActivity?: Record<string, VenueActivity>;
  eventModifiedAt?: Record<string, string>;
};

export function readPublicEventCatalog(value: unknown): PublicEventCatalog {
  const catalog = value as Partial<PublicEventCatalog> | null;
  if (catalog?.version !== 1 || typeof catalog.updatedAt !== "string" || !Number.isFinite(Date.parse(catalog.updatedAt))
    || !Array.isArray(catalog.events) || catalog.events.length === 0
    || !Array.isArray(catalog.home?.events) || !Array.isArray(catalog.feed)) {
    throw new Error("Public event catalog is incomplete");
  }
  const complete = catalog as PublicEventCatalog;
  const events = complete.events.map(applyReviewedEventDate);
  const snapshotDay = getJstDateString(new Date(complete.updatedAt));
  // A previously published R2/static copy may outlive the database correction.
  // Repair only reviewed dates, preserve IDs and source freshness, and prevent a
  // historical correction from remaining in its precomputed upcoming/news cards.
  const historicalReviewedIds = new Set(events.filter(event => {
    const date = reviewedEventDate(event);
    return date !== null && date < snapshotDay;
  }).map(event => event.id));
  const homeEvents = complete.home.events.filter(event => !historicalReviewedIds.has(event.id));
  let discoveryCards = complete.home.discoveryCards;
  if (Array.isArray(discoveryCards)) {
    const correctedCards = discoveryCards.flatMap(card => {
      const cardEvents = card.events.map(applyReviewedEventDate).filter(event => !historicalReviewedIds.has(event.id));
      if (cardEvents.length === card.events.length && cardEvents.every((event, index) => event === card.events[index])) return [card];
      if (!cardEvents.length) return [];
      const selectedEventId = cardEvents.some(event => event.id === card.selectedEventId) ? card.selectedEventId : cardEvents[0].id;
      // Raw reports are retained; the card scopes them to its remaining events.
      // A precomputed multi-event percentage cannot be narrowed without its rows.
      const lottery = card.lottery && card.lottery.status !== "pending" && cardEvents.length !== card.events.length
        ? { status: "pending" as const, reason: "unverified" as const } : card.lottery;
      return [{ ...card, events: cardEvents, selectedEventId, lottery }];
    });
    if (correctedCards.length !== discoveryCards.length || correctedCards.some((card, index) => card !== discoveryCards[index])) discoveryCards = correctedCards;
  }
  const datesById = new Map(events.map(event => [event.id, reviewedEventDate(event)]));
  const feed = complete.feed.flatMap(item => {
    const eventId = item.href.match(/^\/events\/([^#?]+)(?:[#?]|$)/)?.[1];
    const date = eventId ? datesById.get(eventId) : null;
    if (!date) return [item];
    if (eventId && historicalReviewedIds.has(eventId) && item.source === "editorial" && item.type === "公演情報") return [];
    return [item.date === date ? item : { ...item, date }];
  });
  if (events.every((event, index) => event === complete.events[index])
    && homeEvents.length === complete.home.events.length && discoveryCards === complete.home.discoveryCards && feed.length === complete.feed.length
    && feed.every((item, index) => item === complete.feed[index])) return complete;
  return { ...complete, events, home: { ...complete.home, events: homeEvents, discoveryCards }, feed };
}

export function isPublicEventCatalogStale(updatedAt: string, now = Date.now()) {
  return now - Date.parse(updatedAt) >= PUBLIC_CATALOG_STALE_MS;
}
