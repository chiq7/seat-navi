import type { SupabaseClient } from "@supabase/supabase-js";
import type { CrawledEvent } from "@/lib/types";
import type { AfterReportCard } from "@/lib/artistPageTypes";
import type { PostAuthor } from "@/lib/postAuthors";
import type { EditableItem } from "@/lib/setlistHelpers";

export type SetlistRecord = { event_id: string; items: EditableItem[] };
export type InitialSetlist = { eventId: string | null; items: EditableItem[] };
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
  const byEvent = new Map(records.filter(row => allowed.has(row.event_id)).map(row => [row.event_id, row.items]));
  const requested = events.find(event => event.id === requestedEventId);
  const recorded = events.filter(event => event.date && event.date <= today && (byEvent.get(event.id)?.length ?? 0) > 0)
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "") || a.id.localeCompare(b.id));
  const upcoming = events.filter(event => event.date && event.date >= today)
    .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? "") || a.id.localeCompare(b.id));
  const past = [...events].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "") || a.id.localeCompare(b.id));
  const eventId = (requested ?? recorded[0] ?? upcoming[0] ?? past[0])?.id ?? null;
  return { eventId, items: eventId ? byEvent.get(eventId) ?? [] : [] };
}

export async function queryPublicSetlists(client: SupabaseClient, events: CrawledEvent[]): Promise<SetlistRecord[]> {
  if (!events.length) return [];
  const { data, error } = await client.from("setlists").select("event_id, items").in("event_id", events.map(event => event.id));
  if (error) throw new Error("Public setlists could not be loaded", { cause: error });
  const allowed = new Set(events.map(event => event.id));
  return (data ?? []).filter(row => allowed.has(row.event_id)).map(row => {
    if (!Array.isArray(row.items)) throw new Error("Public setlist items are unavailable");
    return { event_id: row.event_id as string, items: row.items as EditableItem[] };
  });
}

export async function queryPublicAfterReports(client: SupabaseClient, events: CrawledEvent[]): Promise<InitialAfterReports> {
  if (!events.length) return { events, reports: [], authors: [] };
  const { data, error } = await client.from("after_reports")
    .select("id, event_id, user_id, seat_area_type, seat_block, seat_row, seat_number, seat_view_photo_paths, main_stage, center_stage, fansa_rating, torokko, kyakukudari, silver_tape_rows, fansa, memo, created_at")
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
