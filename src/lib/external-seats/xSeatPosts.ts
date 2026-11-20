import type { ExternalSeatObservation } from "./types";

export const X_SEAT_POST_PREFIX = "https://x.com/i/web/status/";
export const X_SEAT_POST_EVIDENCE = "Xの公開座席投稿";
export const X_SEAT_POST_MAX_AGE_MS = 20 * 60 * 60 * 1000;
export const X_ARENA_WITHOUT_BLOCK = "ARENA";

export function isXSeatPostBlock(block: string): boolean {
  return block === X_ARENA_WITHOUT_BLOCK || /^[A-Z](?:[1-9]\d?)?$/.test(block);
}

export function formatXSeatPostLocation(block: string, row: number | null, seat: number | null): string {
  const area = block === X_ARENA_WITHOUT_BLOCK ? "アリーナ" : `アリーナ${block}ブロック`;
  const position = [row ? `${row}列` : "", seat ? `${seat}番` : ""].filter(Boolean).join(" ");
  return position ? `${area} ${position}` : area;
}

export function normalizeXSeatPostUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
    if (!["x.com", "www.x.com", "twitter.com", "www.twitter.com"].includes(url.hostname)) return null;
    const postId = url.pathname.match(/^\/(?:[A-Za-z0-9_]{1,15}|i\/web)\/status\/(\d{15,19})\/?$/)?.[1];
    return postId ? X_SEAT_POST_PREFIX + postId : null;
  } catch {
    return null;
  }
}

export function isXSeatPostUrl(value: string | null | undefined): value is string {
  return Boolean(value && value.startsWith(X_SEAT_POST_PREFIX) && normalizeXSeatPostUrl(value) === value);
}

export function isCurrentXSeatPost(verifiedAt: string, now = Date.now()): boolean {
  const age = now - Date.parse(verifiedAt);
  return age >= 0 && age < X_SEAT_POST_MAX_AGE_MS;
}

export function xSeatPostSources(observations: readonly ExternalSeatObservation[], now = Date.now()) {
  return observations.flatMap(item => {
    if (item.source_type !== "other" || item.review_status !== "approved" || item.seat_area !== "arena"
      || !item.block || !isXSeatPostBlock(item.block) ||
      !isXSeatPostUrl(item.source_url) || !isCurrentXSeatPost(item.observed_at, now)) return [];
    return [{ ...item, block: item.block, source_url: item.source_url }];
  });
}
