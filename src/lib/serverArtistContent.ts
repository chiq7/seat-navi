import "server-only";
import { cache } from "react";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { getCachedArtistEvents } from "@/lib/serverEventData";
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

export const getInitialArtistReports = cache(async (slug: string) => {
  const events = (await getCachedArtistEvents(slug)).filter(event => !isTestEvent(event));
  return queryPublicAfterReports(publicClient(), events);
});

export const getInitialArtistSetlists = cache(async (slug: string) => {
  const events = (await getCachedArtistEvents(slug)).filter(event => !isTestEvent(event));
  return { events, records: await queryPublicSetlists(publicClient(), events) };
});
