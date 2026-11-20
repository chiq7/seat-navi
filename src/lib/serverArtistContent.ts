import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { queryEventsForArtist } from "@/lib/events";
import { queryAllOfficialNewsForArtist } from "@/lib/officialNews";
import { queryPublicAfterReports, queryPublicSetlists } from "@/lib/publicArtistContent";
import { isTestEvent } from "@/lib/seoData";

function publicClient() {
  const client = createSupabasePublicClient();
  if (!client) throw new Error("Public content reader is unavailable");
  return client;
}

// Request-scoped memoization only: edits and author privacy changes are not persisted in a new cache.
export const getInitialArtistNews = cache(async (slug: string) => {
  const result = await queryAllOfficialNewsForArtist(slug, publicClient());
  if (result.error) throw new Error("Public news could not be loaded");
  return result.data;
});

const publicArtistEvents = cache(async (slug: string) =>
  (await queryEventsForArtist(publicClient(), slug, { throwOnError: true })).filter(event => !isTestEvent(event)));

const countPublicReports = unstable_cache(async (eventIds: string[]) => {
  const client = createSupabasePublicClient(AbortSignal.timeout(2500));
  if (!client) throw new Error("Public report count unavailable");
  const { count, error } = await client.from("after_reports").select("id", { count: "exact", head: true }).in("event_id", eventIds);
  if (error || count == null) throw new Error("Public report count unavailable");
  return count;
}, ["artist-public-report-count-v1"], { revalidate: 300 });

export async function getArtistPublicReportCount(events: readonly { id: string }[]): Promise<number | null> {
  if (!events.length) return 0;
  return countPublicReports([...new Set(events.map(event => event.id))].sort()).catch(() => null);
}

export const getInitialArtistReports = cache(async (slug: string) => {
  const events = await publicArtistEvents(slug);
  return queryPublicAfterReports(publicClient(), events);
});

export const getInitialArtistSetlists = cache(async (slug: string) => {
  const events = await publicArtistEvents(slug);
  return { events, records: await queryPublicSetlists(publicClient(), events) };
});
