import { ReportEntryClient } from "./ReportEntryClient";
import { resolveArtist } from "@/lib/artists";
import { queryEventsForArtist } from "@/lib/events";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CrawledEvent } from "@/lib/types";

type SearchParams = {
  event?: string | string[];
  artist?: string | string[];
};

function firstValue(value: string | string[] | undefined): string | null {
  return typeof value === "string" ? value : null;
}

/** URL待ちでページ全体を空にせず、報告カードを最初のHTMLから表示する。 */
export default async function ReportEntryPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const initialEventId = firstValue(params.event);
  const initialArtistSlug = firstValue(params.artist);
  const client = await createSupabaseServerClient();
  let initialEvents: CrawledEvent[] = [];
  let initialSelectedId: string | null = null;

  if (client) {
    let anchorEvent: CrawledEvent | null = null;
    if (initialEventId && !initialArtistSlug) {
      const { data } = await client
        .from("events")
        .select("id, title, venue, venue_id, date, genre, lottery_types, artist_slug")
        .eq("id", initialEventId)
        .maybeSingle();
      anchorEvent = (data as CrawledEvent) ?? null;
    }

    const targetArtistSlug = initialArtistSlug
      ?? (anchorEvent?.artist_slug ?? (anchorEvent ? resolveArtist(anchorEvent)?.slug : null));

    if (targetArtistSlug) {
      initialEvents = (await queryEventsForArtist(client, targetArtistSlug)).sort((a, b) =>
        (b.date ?? "").localeCompare(a.date ?? ""),
      );
    } else {
      const { data } = await client
        .from("events")
        .select("id, title, venue, venue_id, date, genre, lottery_types, artist_slug")
        .order("date", { ascending: false })
        .limit(50);
      initialEvents = (data as CrawledEvent[]) ?? [];
    }

    if (initialEventId) {
      if (initialEvents.some((event) => event.id === initialEventId)) {
        initialSelectedId = initialEventId;
      } else if (anchorEvent) {
        initialEvents = [anchorEvent, ...initialEvents];
        initialSelectedId = initialEventId;
      }
    }
    if (!initialSelectedId && targetArtistSlug) {
      initialSelectedId = initialEvents.find(
        (event) => (event.artist_slug ?? resolveArtist(event)?.slug) === targetArtistSlug,
      )?.id ?? null;
    }
  }

  return (
    <ReportEntryClient
      key={`${initialArtistSlug ?? "all"}:${initialEventId ?? "none"}`}
      initialEvents={initialEvents}
      initialSelectedId={initialSelectedId}
    />
  );
}
