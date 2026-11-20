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

const MAX_STAND_LABEL_LENGTH = 20;

function standLabel(value: string | null | undefined): string | null {
  const label = value?.trim();
  return label && label.length <= MAX_STAND_LABEL_LENGTH ? label : null;
}

/** スタンド・階層席の表示名。例: "LEVEL3 1列"、"4階 Fブロック GATE29 9列"。 */
export function formatXStandSeatLocation(level: string, block: string | null, gate: string | null,
  row: number | null, seat: number | null): string {
  const blockLabel = standLabel(block);
  const gateLabel = standLabel(gate);
  return [
    level.trim(),
    blockLabel ? (/^[A-Z](?:[1-9]\d?)?$/.test(blockLabel) ? `${blockLabel}ブロック` : blockLabel) : "",
    gateLabel ?? "",
    row ? `${row}列` : "",
    seat ? `${seat}番` : "",
  ].filter(Boolean).join(" ");
}

/** Xの公開投稿のうち、承認済み・確認から20時間以内のスタンド・階層席。座席図には描かず一覧だけに使う。 */
export function xStandSeatPostSources(observations: readonly ExternalSeatObservation[], now = Date.now()) {
  return observations.flatMap(item => {
    const level = standLabel(item.level);
    if (item.source_type !== "other" || item.review_status !== "approved" || item.seat_area !== "stand"
      || !level || !isXSeatPostUrl(item.source_url) || !isCurrentXSeatPost(item.observed_at, now)) return [];
    return [{ ...item, level, source_url: item.source_url }];
  });
}

export function xSeatPostSources(observations: readonly ExternalSeatObservation[], now = Date.now()) {
  return observations.flatMap(item => {
    if (item.source_type !== "other" || item.review_status !== "approved" || item.seat_area !== "arena"
      || !item.block || !isXSeatPostBlock(item.block) ||
      !isXSeatPostUrl(item.source_url) || !isCurrentXSeatPost(item.observed_at, now)) return [];
    return [{ ...item, block: item.block, source_url: item.source_url }];
  });
}
