"use client";

/**
 * "この席の写真がほしい": how many visitors wait for a photo of each block, and this visitor's own requests.
 * Talks to the two database functions with plain fetch, so the venue page does not load the Supabase SDK (~220KB).
 */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const VOTER_KEY_STORAGE = "seat-navi-voter-key";
const REQUESTED_STORAGE = "tixrepo:seat-photo-requests:v1";

async function rpc<T>(name: string, body: Record<string, string>): Promise<T> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new Error(typeof data === "object" && data && "message" in data ? String(data.message) : `rpc_${response.status}`);
  return data as T;
}

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
    pending = rpc<{ section: string; requests: number }[]>("seat_photo_request_counts", { p_venue: venueId })
      .then(rows => new Map((rows ?? []).map(row => [row.section, Number(row.requests)])));
    pending.catch(() => countsByVenue.delete(venueId));
    countsByVenue.set(venueId, pending);
  }
  return pending;
}

export type SeatPhotoRequestResult = { ok: true; count: number } | { ok: false; reason: "rate" | "failed" };
export async function requestSeatPhoto(venueId: string, section: string): Promise<SeatPhotoRequestResult> {
  try {
    const count = Number(await rpc<number>("seat_photo_request_add", { p_venue: venueId, p_section: section, p_voter: voterKey() })) || 1;
    rememberRequest(venueId, section);
    void countsByVenue.get(venueId)?.then(counts => counts.set(section, count)).catch(() => undefined);
    return { ok: true, count };
  } catch (error) {
    return { ok: false, reason: error instanceof Error && error.message.includes("rate_limited") ? "rate" : "failed" };
  }
}
