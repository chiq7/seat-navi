import type { CrawledEvent } from "@/lib/types";

/** Same artist, venue and adjacent dates only; never pool separate visits to a venue. */
export function eventSeatGroup<T extends Pick<CrawledEvent, "id" | "date" | "artist_slug" | "venue_id">>(events: T[], eventId: string): T[] {
  const target = events.find(event => event.id === eventId);
  if (!target) return [];
  if (!target.venue_id || !target.date) return [target];
  const sorted = events.filter(event => event.venue_id === target.venue_id && event.artist_slug === target.artist_slug && event.date)
    .sort((a, b) => a.date!.localeCompare(b.date!) || a.id.localeCompare(b.id));
  let group: T[] = [];
  for (const event of sorted) {
    if (group.length && (new Date(event.date!).getTime() - new Date(group[group.length - 1].date!).getTime()) / 86400000 > 3) {
      if (group.some(item => item.id === eventId)) return group;
      group = [];
    }
    group.push(event);
  }
  return group.some(item => item.id === eventId) ? group : [target];
}
