import { ReportEntryClient } from "./ReportEntryClient";
import { resolveArtist } from "@/lib/artists";
import { getCachedArtistEvents, getCachedPublicEvent } from "@/lib/serverEventData";
import { getCachedRecentReportEvents } from "@/lib/serverReportData";
import type { CrawledEvent } from "@/lib/types";
import { findDisplayedEventRepresentative } from "@/lib/eventDisplay";

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
  let initialEvents: CrawledEvent[] = [];
  let initialSelectedId: string | null = null;

  let anchorEvent: CrawledEvent | null = null;
  if (initialEventId) {
    anchorEvent = (await getCachedPublicEvent(initialEventId))?.event ?? null;
  }

  const targetArtistSlug = initialArtistSlug
    ?? (anchorEvent?.artist_slug ?? (anchorEvent ? resolveArtist(anchorEvent)?.slug : null));

  if (targetArtistSlug) {
    initialEvents = [...await getCachedArtistEvents(targetArtistSlug)].sort((a, b) =>
      (b.date ?? "").localeCompare(a.date ?? ""),
    );
  } else {
    initialEvents = await getCachedRecentReportEvents();
  }

  if (initialEventId) {
    if (initialEvents.some((event) => event.id === initialEventId)) {
      initialSelectedId = initialEventId;
    } else if (anchorEvent) {
      const representative = findDisplayedEventRepresentative(initialEvents, anchorEvent);
      if (representative) {
        initialSelectedId = representative.id;
      } else {
        initialEvents = [anchorEvent, ...initialEvents];
        initialSelectedId = initialEventId;
      }
    }
  }
  if (!initialSelectedId && targetArtistSlug) {
    initialSelectedId = initialEvents.find(
      (event) => (event.artist_slug ?? resolveArtist(event)?.slug) === targetArtistSlug,
    )?.id ?? null;
  }

  return (
    <ReportEntryClient
      key={`${initialArtistSlug ?? "all"}:${initialEventId ?? "none"}`}
      initialEvents={initialEvents}
      initialSelectedId={initialSelectedId}
    />
  );
}
