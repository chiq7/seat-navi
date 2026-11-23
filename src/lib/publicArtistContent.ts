import type { SupabaseClient } from "@supabase/supabase-js";
import type { CrawledEvent } from "@/lib/types";
import type { AfterReportCard } from "@/lib/artistPageTypes";
import type { PostAuthor } from "@/lib/postAuthors";
import { hasSetlistSongs, readSetlistReviewSource, type EditableItem, type SetlistReviewSource } from "@/lib/setlistHelpers";
import { excludeHiddenLiveReports } from "@/data/hiddenLiveReports";

export type SetlistRecord = { event_id: string; items: EditableItem[]; source?: SetlistReviewSource | null };
export type InitialSetlist = { eventId: string | null; items: EditableItem[]; source: SetlistReviewSource | null };
export type InitialAfterReports = {
  events: CrawledEvent[];
  reports: AfterReportCard[];
  authors: PostAuthor[];
};

/** Explicit links keep their performance, including an empty upcoming submission target. */
export function selectInitialSetlist(
  events: CrawledEvent[], records: SetlistRecord[], today: string, requestedEventId?: string,
): InitialSetlist {
  const allowed = new Set(events.map(event => event.id));
  const byEvent = new Map(records.filter(row => allowed.has(row.event_id)).map(row => [row.event_id, row]));
  const requested = events.find(event => event.id === requestedEventId);
  if (requestedEventId !== undefined && !requested) return { eventId: null, items: [], source: null };
  const upcoming = events.filter(event => event.date && event.date >= today)
    .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? "") || a.id.localeCompare(b.id));
  const past = events.filter(event => event.date && event.date < today)
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "") || a.id.localeCompare(b.id));
  // Without a requested show, open the latest past show that has songs (verified first), so visitors see a
  // finished setlist instead of the empty next show. The picker still reaches upcoming shows for editing.
  const withSongs = past.filter(event => hasSetlistSongs(byEvent.get(event.id)?.items));
  const latestWithSongs = withSongs.find(event => byEvent.get(event.id)?.source) ?? withSongs[0];
  const eventId = (requested ?? latestWithSongs ?? upcoming[0] ?? past[0])?.id ?? null;
  const record = eventId ? byEvent.get(eventId) : undefined;
  return { eventId, items: record?.items ?? [], source: record?.source ?? null };
}

export async function queryPublicSetlists(client: SupabaseClient, events: CrawledEvent[]): Promise<SetlistRecord[]> {
  if (!events.length) return [];
  const { data, error } = await client.from("setlists").select("event_id, items, review_source").in("event_id", events.map(event => event.id));
  if (error) throw new Error("Public setlists could not be loaded", { cause: error });
  const allowed = new Set(events.map(event => event.id));
  return (data ?? []).filter(row => allowed.has(row.event_id)).map(row => {
    if (!Array.isArray(row.items)) throw new Error("Public setlist items are unavailable");
    return { event_id: row.event_id as string, items: row.items as EditableItem[], source: readSetlistReviewSource(row.review_source) };
  });
}

export async function queryPublicAfterReports(client: SupabaseClient, events: CrawledEvent[]): Promise<InitialAfterReports> {
  if (!events.length) return { events, reports: [], authors: [] };
  const { data, error } = await excludeHiddenLiveReports(client.from("after_reports")
    .select("id, event_id, user_id, seat_area_type, seat_description, seat_block, seat_row, seat_number, seat_view_photo_paths, main_stage, center_stage, fansa_rating, torokko, kyakukudari, silver_tape_rows, fansa, memo, created_at"))
    .in("event_id", events.map(event => event.id)).order("created_at", { ascending: false }).limit(500);
  if (error) throw new Error("Public reports could not be loaded", { cause: error });
  const allowed = new Set(events.map(event => event.id));
  const reports = ((data ?? []) as AfterReportCard[]).filter(report => allowed.has(report.event_id));
  const userIds = [...new Set(reports.map(report => report.user_id).filter((id): id is string => Boolean(id)))];
  if (!userIds.length) return { events, reports, authors: [] };
  // Same opt-in author fields as the existing browser view; never use a service-role client.
  const authors = await client.from("profiles").select("id, display_name, x_handle, show_x_on_posts")
    .in("id", userIds).eq("show_x_on_posts", true);
  return { events, reports, authors: authors.error ? [] : ((authors.data ?? []) as PostAuthor[]).filter(author => author.show_x_on_posts) };
}
