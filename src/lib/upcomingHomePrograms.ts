import type { HomePrograms } from "./publicPageData";

/** A cached multi-day card may contain performances that have since ended. */
export function upcomingHomePrograms(data: HomePrograms, today: string): HomePrograms {
  const events = data.events.filter(event => event.dateIso && event.dateIso >= today);
  const discoveryCards = data.discoveryCards.flatMap(card => {
    const remaining = card.events.filter(event => event.date >= today);
    if (!remaining.length) return [];
    if (remaining.length === card.events.length) return [card];
    const selectedEventId = remaining.some(e => e.id === card.selectedEventId) ? card.selectedEventId : remaining[0].id;
    // Multi-day totals cannot be attributed to the dates still on the card.
    return [{ ...card, events: remaining, selectedEventId, lottery: undefined }];
  });
  return { events, discoveryCards };
}
