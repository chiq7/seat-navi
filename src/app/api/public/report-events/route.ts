import { NextRequest, NextResponse } from "next/server";
import { resolveArtist } from "@/lib/artists";
import { findDisplayedEventRepresentative } from "@/lib/eventDisplay";
import { getCachedArtistEvents, getCachedPublicEvent } from "@/lib/serverEventData";
import { getCachedRecentReportEvents } from "@/lib/serverReportData";
import { isTestEvent } from "@/lib/seoData";
import type { CrawledEvent } from "@/lib/types";

/**
 * 3つの投稿フォームで共通利用する公演選択データ。
 * 公開公演だけを短時間共有し、個人情報・投稿内容は返さない。
 */
export async function GET(request: NextRequest) {
  const eventId = request.nextUrl.searchParams.get("event")?.trim() || null;
  const requestedArtistSlug = request.nextUrl.searchParams.get("artist")?.trim() || null;
  const anchorInfo = eventId ? await getCachedPublicEvent(eventId) : null;
  const anchorEvent = anchorInfo?.event ?? null;
  const artistSlug = requestedArtistSlug
    ?? anchorEvent?.artist_slug
    ?? (anchorEvent ? resolveArtist(anchorEvent)?.slug ?? null : null);

  let events: CrawledEvent[] = artistSlug
    ? [...await getCachedArtistEvents(artistSlug)].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
    : await getCachedRecentReportEvents();
  events = events.filter((event) => !isTestEvent(event));

  if (anchorEvent && !events.some((event) => event.id === anchorEvent.id)) {
    const representative = findDisplayedEventRepresentative(events, anchorEvent);
    if (!representative) events = [anchorEvent, ...events];
  }

  const representative = anchorEvent ? findDisplayedEventRepresentative(events, anchorEvent) : null;
  const selectedEventId = eventId
    ? (events.some((event) => event.id === eventId) ? eventId : representative?.id ?? null)
    : events[0]?.id ?? null;

  return NextResponse.json(
    { events, selectedEventId },
    { headers: { "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=300" } },
  );
}
