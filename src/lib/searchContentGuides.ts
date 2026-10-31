import type { CrawledEvent } from "./types";

const normalizedTitle = (title: string) => title.normalize("NFKC").toUpperCase().replace(/[\s.・“”"'「」]/g, "");
const safeEvents = (events: CrawledEvent[]) => events.filter(event => !event.title.includes("【テストデータ】"));

export function numberITourEvents(events: CrawledEvent[], venueId: string, dates: readonly string[]): CrawledEvent[] {
  return safeEvents(events).filter(event => event.artist_slug === "number-i" && event.venue_id === venueId
    && dates.includes(event.date ?? "") && /^NUMBER_ILIVETOURNO(III|Ⅲ)$/.test(normalizedTitle(event.title)))
    .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? "") || a.id.localeCompare(b.id));
}

export function canSaveSetlist(selectedEventId: string | null, loadedEventId: string | null, dirtyEventId: string | null): boolean {
  return selectedEventId !== null && selectedEventId === loadedEventId && selectedEventId === dirtyEventId;
}
