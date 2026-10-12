import type { CrawledEvent } from "@/lib/types";
import { validateEventDaySummary, type EventDaySummary } from "./eventDaySummary";

export type EventDayPublication = {
  status: "candidate" | "needs-review" | "verified" | "published";
  identity: { eventId: string; artistSlug: string; artistName: string; date: string; venueId: string; eventTitle: string };
  review: { reviewedAt: string; sourceUrls: string[]; notes: string[] } | null;
  summary: EventDaySummary;
};

export function eventDayGuidePath(eventId: string): string {
  return `/events/${encodeURIComponent(eventId)}/day-guide`;
}

function isCalendarDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) &&
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}

/** Exact event identity preserves separate dates/sessions. Candidates are never public. */
export function matchPublishedEventDay(
  event: CrawledEvent,
  resolvedArtistSlug: string | null,
  publications: readonly EventDayPublication[],
): EventDayPublication | null {
  const matches = publications.filter(publication => {
    const { identity, summary, review } = publication;
    return publication.status === "published" && review !== null &&
      isCalendarDate(review.reviewedAt) && isCalendarDate(identity.date) &&
      identity.eventId === event.id && identity.artistSlug === resolvedArtistSlug &&
      identity.date === event.date && identity.venueId === event.venue_id &&
      identity.eventTitle === event.title &&
      summary.artist === identity.artistName && summary.state !== "past-example" && summary.date === identity.date &&
      summary.venueSlug === identity.venueId && summary.venue === event.venue &&
      summary.eventHref === `/events/${event.id}` &&
      summary.sources.every(source => review.sourceUrls.includes(source.url) &&
        isCalendarDate(source.checkedAt) && source.checkedAt <= review.reviewedAt) &&
      validateEventDaySummary(summary).length === 0;
  });
  // Conflicting editorial records are held, never resolved by array order.
  return matches.length === 1 ? matches[0] : null;
}
