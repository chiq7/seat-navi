"use client";
// Which buttons people press (GA4 event "ui_click"), to decide what to improve first.
// Only fixed names from this file and fixed route slugs are sent: never text people typed, never a full URL.
import { trackEvent } from "./analytics";

export type PageType = "venue" | "event" | "artist" | "home" | "search" | "share" | "other";

export function pageTypeOf(path: string): PageType {
  if (path === "/") return "home";
  if (path.startsWith("/venues/")) return "venue";
  if (path.startsWith("/events/")) return "event";
  if (path.startsWith("/artists/")) return "artist";
  if (path.startsWith("/search")) return "search";
  if (path.startsWith("/s/")) return "share";
  return "other";
}

function venueOf(path: string): string | undefined {
  const id = path.match(/^\/venues\/([a-z0-9-]{1,64})\/?$/)?.[1];
  return id ?? undefined;
}

const NAME = /^[a-z0-9_]{1,40}$/;

/** A button press, by its fixed name ("map_close", "photo_next", ...). */
export function trackUi(name: string) {
  if (typeof window === "undefined" || !NAME.test(name)) return;
  const path = window.location.pathname;
  trackEvent("ui_click", { ui_name: name, page_type: pageTypeOf(path), venue_id: venueOf(path) });
}

/** The phone full-screen seat map was opened, or closed after `seconds`. */
export function trackSeatMapFullscreen(action: "open" | "close", seconds?: number) {
  if (typeof window === "undefined") return;
  const venue = venueOf(window.location.pathname);
  if (!venue) return;
  trackEvent("seat_map_fullscreen", { venue_id: venue, map_action: action,
    ...(seconds !== undefined && Number.isFinite(seconds) ? { duration_sec: Math.max(0, Math.min(3600, Math.round(seconds))) } : {}) });
}

/**
 * Buttons recognised by what they already are (data attributes, labels), so the components need no
 * tracking code: the first match from the pressed element upwards gives the name.
 * Order matters: more specific entries first.
 */
export const UI_TARGETS: readonly (readonly [string, string])[] = [
  // Full-screen seat map
  ["button[aria-label='座席表を閉じる']", "map_close"],
  ["[data-seat-share-open]", "seat_share_open"],
  ["[data-mini-map]", "mini_map"],
  ["[data-back-to-seat]", "back_to_seat"],
  ["[data-level-hint]", "level_hint"],
  ["[data-arena-maps-button]", "arena_maps"],
  ["[data-zone-id]", "zone_tag"],
  // Photo board
  ["[data-seat-photo-sheet-tab]", "photo_sheet_open"],
  ["button[aria-label='写真をたたむ']", "photo_sheet_fold"],
  ["button[aria-label='前の写真']", "photo_prev"],
  ["button[aria-label='次の写真']", "photo_next"],
  ["button[aria-label^='前の区画']", "block_prev"],
  ["button[aria-label^='次の区画']", "block_next"],
  ["button[aria-label$='を大きく見る']", "photo_enlarge"],
  ["button[aria-label='列ごとの番号']", "row_list"],
  ["[data-seat-photo-sheet] button", "photo_sheet_button"],
  // Seat map in the page
  ["[data-open-seat-map]", "map_open_button"],
  ["[data-map-preview]", "map_preview"],
  ["button[aria-label$='を拡大']", "zoom_in"],
  ["button[aria-label$='を縮小']", "zoom_out"],
  // Photos elsewhere
  ["a[href*='x.com/'][href*='/status/']", "photo_original_post"],
  ["#dome-photos a[href^='#']", "venue_all_photos"],
  ["#dome-photos a", "photo_strip_tile"],
  ["[data-seat-photo-preview]", "photo_card_open"],
  // In-page navigation (seats / facilities / access / ...)
  ["a[href='#venue-seats']", "nav_seats"],
  ["a[href='#venue-facilities']", "nav_facilities"],
  ["a[href='#venue-access']", "nav_access"],
  ["a[href='#venue-prep']", "nav_prep"],
  ["a[href='#venue-faq']", "nav_faq"],
  ["a[href='#upcoming-events-title'], a[href$='#upcoming-events-title']", "nav_events"],
];

/** The name for a pressed element: its own data-track, else the first UI_TARGETS match. */
export function uiNameFor(element: Element | null): string | null {
  if (!element) return null;
  const own = element.closest<HTMLElement>("[data-track]")?.dataset.track;
  if (own && NAME.test(own)) return own;
  for (const [selector, name] of UI_TARGETS) if (element.closest(selector)) return name;
  return null;
}
