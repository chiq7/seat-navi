/** Corrections verified against an event-specific official source, not inferred from a title year. */
export const KING_PRINCE_FIREWORKS_2025_DATE_REVIEW = {
  venueId: "zozo-marine",
  sourceUrl: "https://www.universal-music.co.jp/king-and-prince/news/2025-11-15/",
  reviewedAt: "2026-11-14",
  dates: ["2025-11-15", "2025-11-16"],
  correctedRecordIds: ["f6d1d32e59ec93967700", "799829e7f93d7c0cd517"],
} as const;

type EventDateCandidate = { title?: string; venue_id?: string | null; date?: string | null };

/** Only this reviewed event and its two month/day values are covered. Other tours are untouched. */
export function reviewedEventDate(event: EventDateCandidate): string | null {
  if (event.venue_id !== KING_PRINCE_FIREWORKS_2025_DATE_REVIEW.venueId || !event.title || !event.date) return null;
  const title = event.title.normalize("NFKC").replace(/[\s「」『』]/g, "").toLowerCase();
  if (title !== "king&princeとうちあげ花火2025" && title !== "king&princeking&princeとうちあげ花火2025") return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(event.date)) return null;
  return KING_PRINCE_FIREWORKS_2025_DATE_REVIEW.dates.find(date => date.slice(5) === event.date?.slice(5)) ?? null;
}

export function applyReviewedEventDate<T extends EventDateCandidate>(event: T): T {
  const date = reviewedEventDate(event);
  // Keep the existing ID so old links and reports remain attached to the same record.
  return date && date !== event.date ? { ...event, date } : event;
}
