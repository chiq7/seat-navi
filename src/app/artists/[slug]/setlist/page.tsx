import { getEventDisplayVenueName } from "@/lib/publicVenueGuides";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SetlistClient } from "./SetlistClient";
import { getSeoArtist, isTestArtist } from "@/lib/seoData";
import { buildMeta } from "@/lib/metadata";
import { getInitialArtistSetlists } from "@/lib/serverArtistContent";
import { selectInitialSetlist } from "@/lib/publicArtistContent";
import { getJstDateString } from "@/lib/artistPageData";
import { hasSetlistSongs } from "@/lib/setlistHelpers";
import archiveArtistsWithSongs from "@/lib/archiveArtistsWithSongs.json";
import archivePreviews from "@/lib/artistSetlistArchivePreviews.json";
import { artistSetlistPath, canIndexPerformanceSetlist, performanceSetlistPath, setlistPerformanceDate } from "@/lib/setlistSeo";
import { parseEventTitle } from "@/lib/eventTitle";
import { requestedPerformanceId } from "@/lib/requestedPerformance";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ slug: string }>; searchParams?: Promise<{ event?: string | string[] }> };

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const artist = getSeoArtist(slug);
  if (!artist) notFound();

  const { events, records } = await getInitialArtistSetlists(slug);
  const requestedId = requestedPerformanceId((await searchParams)?.event);
  const event = typeof requestedId === "string" ? events.find(candidate => candidate.id === requestedId) : undefined;
  const record = event ? records.find(candidate => candidate.event_id === event.id) : undefined;
  const canonicalPath = event && record?.source && canIndexPerformanceSetlist(event, record.items, true, getJstDateString())
    ? performanceSetlistPath(slug, event.id) : artistSetlistPath(slug);
  const name = slug === "buddiis" ? artist.name + "（バディーズ）" : artist.name;
  return buildMeta({
    path: artistSetlistPath(slug),
    canonicalPath,
    title: name + "のセトリ一覧｜ライブ・ツアー別セットリスト｜ちけレポ",
    description: artist.name + "のセトリを公演日・会場・ツアー名から探せます。確認済み公演のセットリストとアンコールの曲順を掲載。",
    index: !isTestArtist(artist) && (event ? hasSetlistSongs(record?.items)
      : records.some(row => hasSetlistSongs(row.items)) || archiveArtistsWithSongs.includes(slug)),
    follow: true,
    image: "/api/og/setlist/" + slug,
    imageAlt: artist.name + "のセットリスト",
  });
}

export default async function Page({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const artist = getSeoArtist(slug);
  if (!artist) notFound();
  const { events: initialEvents, records } = await getInitialArtistSetlists(slug);
  const requested = requestedPerformanceId((await searchParams)?.event);
  const today = getJstDateString();
  const initialSetlist = selectInitialSetlist(initialEvents, records, today, requested);
  const recordsById = new Map(records.map(record => [record.event_id, record]));
  const performanceLinks = initialEvents.flatMap(event => {
    const record = recordsById.get(event.id);
    if (!record?.source || !event.date || !canIndexPerformanceSetlist(event, record.items, true, today)) return [];
    return [{
      href: performanceSetlistPath(slug, event.id),
      date: event.date,
      label: setlistPerformanceDate(event.date) + " " + getEventDisplayVenueName(event.venue_id, event.venue) + "｜" + parseEventTitle(event.title, artist.name).tourName,
      recording: record.source.kind === "official_recording",
    }];
  }).sort((a, b) => b.date.localeCompare(a.date));

  return <SetlistClient key={JSON.stringify([slug, requested, initialSetlist.eventId])}
    params={params} initialEvents={initialEvents} initialSetlist={initialSetlist}
    hasPublishedSetlists={records.some(row => hasSetlistSongs(row.items)) || archiveArtistsWithSongs.includes(slug)}
    archivePreview={archivePreviews[slug as keyof typeof archivePreviews] ?? []}
    unavailableEvent={requested !== undefined && !initialSetlist.eventId} performanceLinks={performanceLinks} />;
}
