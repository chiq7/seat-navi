import type { SupabaseClient } from "@supabase/supabase-js";
import { hasSetlistSongs } from "./setlistHelpers";
import { readSupabasePages } from "./supabase/readPages";
import { publishedSeatSourceEventIds } from "./seatSourceArchive";
import { X_SEAT_POST_MAX_AGE_MS, X_SEAT_POST_PREFIX } from "./external-seats/xSeatPosts";

type PostRow = { id: string; event_id: string; created_at: string | null };
export type IndexSetlist = PostRow & { updated_at: string | null; items: unknown; review_source: unknown };

const postTables = ["seat_reports", "event_ticket_results", "fan_seat_predictions", "external_seat_observations", "after_reports", "setlists"] as const;
type PostTable = typeof postTables[number];
export type PublicEventCounts = Record<PostTable, number>;
const emptyCounts = (): PublicEventCounts => ({ seat_reports: 0, event_ticket_results: 0, fan_seat_predictions: 0,
  external_seat_observations: 0, after_reports: 0, setlists: 0 });

function contributionsQuery(client: SupabaseClient, table: PostTable, all: boolean, now: Date) {
  const columns = table === "setlists" ? "id,event_id,items,review_source,updated_at,created_at"
    : table === "external_seat_observations" ? "id,event_id,created_at:observed_at" : "id,event_id,created_at";
  const query = client.from(table).select(columns, all ? { count: "exact" } : {});
  if (table === "fan_seat_predictions") query.eq("approved", true);
  if (table === "external_seat_observations") {
    const cutoff = new Date(now.getTime() - X_SEAT_POST_MAX_AGE_MS).toISOString();
    // Identical to the visibility window on the event map for normalized X post URLs.
    query.eq("review_status", "approved").eq("seat_area", "arena")
      .or("source_url.is.null,source_url.not.like." + X_SEAT_POST_PREFIX + "*,and(observed_at.gt." + cutoff + ",observed_at.lte." + now.toISOString() + ")");
  }
  return query;
}

/** Public rows only. With IDs, check just one performance; without them, build the whole sitemap. */
export async function readEventContributions(client: SupabaseClient, ids?: readonly string[]) {
  const now = new Date();
  const groups = await Promise.all(postTables.map(async table => {
    if (ids && !ids.length) return [];
    const paged = await readSupabasePages<PostRow>((from, to) => {
      const query = contributionsQuery(client, table, true, now);
      if (ids) query.in("event_id", ids);
      return query.order("id").range(from, to);
    }, Infinity);
    if (paged.error || paged.limited) throw new Error((ids ? "Public contributions unavailable: " : "Sitemap content could not be loaded: ") + table, { cause: paged.error });
    return paged.data;
  }));
  const latest = new Map<string, string | null>();
  // The rendered archive has verified event IDs, but does not record a publication timestamp.
  for (const id of ids ?? publishedSeatSourceEventIds) {
    if (publishedSeatSourceEventIds.has(id)) latest.set(id, null);
  }
  const setlists: IndexSetlist[] = [];
  const reports: PostRow[] = [];
  const counts = emptyCounts();
  groups.forEach((rows, i) => {
    const table = postTables[i];
    for (const row of rows) {
      let modified = row.created_at;
      if (table === "setlists") {
        const record = row as IndexSetlist;
        if (!hasSetlistSongs(record.items)) continue;
        modified = record.updated_at ?? modified;
        setlists.push(record);
      } else if (table === "after_reports") {
        reports.push(row);
      }
      counts[table]++;
      const prior = latest.get(row.event_id);
      if (!prior || (modified && Date.parse(modified) > Date.parse(prior))) latest.set(row.event_id, modified ?? null);
    }
  });
  return { latest, reports, setlists, counts };
}
