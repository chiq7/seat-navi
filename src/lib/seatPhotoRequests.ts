"use client";

import { anonymousSupabase } from "@/lib/supabase/client";

/** "この席の写真がほしい": how many visitors wait for a photo of each block, and this visitor's own requests. */
const VOTER_KEY_STORAGE = "seat-navi-voter-key";
const REQUESTED_STORAGE = "tixrepo:seat-photo-requests:v1";

function voterKey() {
  const existing = localStorage.getItem(VOTER_KEY_STORAGE);
  if (existing && /^[A-Za-z0-9]{16,64}$/.test(existing)) return existing;
  const created = crypto.randomUUID().replace(/-/g, "").slice(0, 20);
  localStorage.setItem(VOTER_KEY_STORAGE, created);
  return created;
}

function readRequested(): Record<string, string[]> {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(REQUESTED_STORAGE) ?? "{}");
    return stored && typeof stored === "object" ? stored as Record<string, string[]> : {};
  } catch { return {}; }
}
export function hasRequestedSeatPhoto(venueId: string, section: string) {
  try { return (readRequested()[venueId] ?? []).includes(section); } catch { return false; }
}
function rememberRequest(venueId: string, section: string) {
  try {
    const all = readRequested();
    all[venueId] = [...new Set([...(all[venueId] ?? []), section])];
    localStorage.setItem(REQUESTED_STORAGE, JSON.stringify(all));
  } catch { /* storage may be blocked; the server still keeps one row per visitor */ }
}

const countsByVenue = new Map<string, Promise<Map<string, number>>>();
/** Requests per block of one venue, fetched once per page view. */
export function seatPhotoRequestCounts(venueId: string) {
  let pending = countsByVenue.get(venueId);
  if (!pending) {
    pending = Promise.resolve(anonymousSupabase.rpc("seat_photo_request_counts", { p_venue: venueId })).then(({ data, error }) => {
      if (error) throw error;
      return new Map(((data ?? []) as { section: string; requests: number }[]).map(row => [row.section, Number(row.requests)]));
    });
    pending.catch(() => countsByVenue.delete(venueId));
    countsByVenue.set(venueId, pending);
  }
  return pending;
}

export type SeatPhotoRequestResult = { ok: true; count: number } | { ok: false; reason: "rate" | "failed" };
export async function requestSeatPhoto(venueId: string, section: string): Promise<SeatPhotoRequestResult> {
  try {
    const { data, error } = await anonymousSupabase.rpc("seat_photo_request_add", { p_venue: venueId, p_section: section, p_voter: voterKey() });
    if (error) return { ok: false, reason: error.message.includes("rate_limited") ? "rate" : "failed" };
    const count = Number(data) || 1;
    rememberRequest(venueId, section);
    void countsByVenue.get(venueId)?.then(counts => counts.set(section, count)).catch(() => undefined);
    return { ok: true, count };
  } catch { return { ok: false, reason: "failed" }; }
}
