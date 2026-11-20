import manifest from "../data/seatSourceArchive.json";
import publicationDates from "../data/seatSourcePublicationDates.json";

export const seatSourcePublicationDates: { venues: Record<string, string>; events: Record<string, string> } = publicationDates;

export type SeatSourceKind = "seat_view" | "arena_map";
export type SeatSourceRow = {
  kind: SeatSourceKind;
  venueId: string;
  eventId: string | null;
  sourceId: string;
  sourceUrl?: string;
  position: string;
  note: string;
  eventLabel: string;
  photoNumber: number | null;
};
export type SeatSourceGroup = { sourceId: string; rows: SeatSourceRow[] };
type Scope = "venues" | "events";
type Groups = Record<SeatSourceKind, SeatSourceGroup[]>;

export const sourceKinds = ["seat_view", "arena_map"] as const;
export const sourceKindNames: Record<SeatSourceKind, string> = { seat_view: "座席レポ", arena_map: "アリーナ図" };

export function seatSourcePermalink(row: SeatSourceRow) {
  const post = row.sourceUrl?.match(/^https:\/\/x\.com\/([A-Za-z0-9_]{1,15})\/status\/(\d{1,20})$/);
  if (post && post[2] === row.sourceId) return post[0];
  return `https://x.com/i/web/status/${row.sourceId}`;
}

export function groupSeatSources(rows: readonly SeatSourceRow[]): Groups {
  const byKind = { seat_view: new Map<string, SeatSourceGroup>(), arena_map: new Map<string, SeatSourceGroup>() };
  for (const row of rows) {
    const samePost = byKind[row.kind].get(row.sourceId);
    if (samePost) samePost.rows.push(row);
    else byKind[row.kind].set(row.sourceId, { sourceId: row.sourceId, rows: [row] });
  }
  // X status IDs sort by posting time. No publication date is inferred for the concert.
  function groups(kind: SeatSourceKind) {
    const posts = [...byKind[kind].values()].sort((a, b) =>
      b.sourceId.length - a.sourceId.length || b.sourceId.localeCompare(a.sourceId));
    for (const post of posts) post.rows.sort((a, b) => (a.photoNumber ?? 5) - (b.photoNumber ?? 5));
    return posts;
  }
  return { seat_view: groups("seat_view"), arena_map: groups("arena_map") };
}

export const sourcePreviewLimit = 2;
export const sourcePageSize = 12;

export function sourcePageHref(base: string, kind: SeatSourceKind, page: number) {
  return `${base}/seat-sources?kind=${kind}${page === 1 ? "" : "&page=" + page}`;
}

const rows = manifest as SeatSourceRow[];
export const publishedSeatSourceEventIds: ReadonlySet<string> = new Set(
  rows.flatMap(row => row.eventId ? [row.eventId] : []),
);
const cache = new Map<string, Groups>();
export function getSeatSources(scope: Scope, id: string) {
  const key = scope + "/" + id;
  let grouped = cache.get(key);
  if (!grouped) {
    grouped = groupSeatSources(rows.filter(row => (scope === "venues" ? row.venueId : row.eventId) === id));
    if (grouped.seat_view.length || grouped.arena_map.length) cache.set(key, grouped);
  }
  return grouped;
}
