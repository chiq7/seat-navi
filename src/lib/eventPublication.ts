import type { CrawledEvent } from "./types";
import { getEventArenaPhotoLayout } from "./eventArenaPhotos";
import { EVENT_DAY_PUBLICATIONS } from "../data/eventDayPublications";
import { eventDayGuidePath, matchPublishedEventDay } from "./eventDayPublication";
import { getSeatSources, publishedSeatSourceEventIds } from "./seatSourceArchive";

export function hasConfirmedPerformanceDate(event: Pick<CrawledEvent, "date" | "title">) {
  if (!event.date || !/^\d{4}-\d{2}-\d{2}$/.test(event.date) || /開催日未確認|日程未定/.test(event.title)) return false;
  const time = Date.parse(event.date + "T00:00:00Z");
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === event.date;
}

/** Only count editorial content that the event page actually renders. */
export function performanceEditorialContent(event: CrawledEvent, ids: readonly string[], artistSlug: string | null) {
  const sourceIds = [...new Set([event.id, ...ids])].filter(id => publishedSeatSourceEventIds.has(id));
  const views = new Set<string>(), maps = new Set<string>();
  for (const id of sourceIds) {
    const sources = getSeatSources("events", id);
    for (const post of sources.seat_view) views.add(post.sourceId);
    for (const post of sources.arena_map) maps.add(post.sourceId);
  }
  let layout = getEventArenaPhotoLayout(event);
  if (!layout) {
    for (const id of ids) {
      if (id !== event.id) layout = getEventArenaPhotoLayout({ ...event, id });
      if (layout) break;
    }
  }
  const day = matchPublishedEventDay(event, artistSlug, EVENT_DAY_PUBLICATIONS);
  return { sourceIds, seatPosts: views.size, mapPosts: maps.size, layout,
    dayHref: day ? eventDayGuidePath(event.id) : null, reviewedAt: day?.review?.reviewedAt };
}

export function canIndexEvent(event: CrawledEvent, staticContent: ReturnType<typeof performanceEditorialContent>, hasPublicPosts: boolean) {
  return hasConfirmedPerformanceDate(event)
    && Boolean(hasPublicPosts || staticContent.seatPosts || staticContent.mapPosts || staticContent.layout || staticContent.dayHref);
}
