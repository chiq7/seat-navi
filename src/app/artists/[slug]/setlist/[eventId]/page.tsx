import type { Metadata } from "next";
import { Header } from "@/components/common/Header";
import { BottomNav } from "@/components/common/BottomNav";
import Link from "next/link";
import { eventVenueHref } from "@/lib/eventVenueHref";
import { notFound } from "next/navigation";
import { cache } from "react";
import { buildMeta } from "@/lib/metadata";
import { getSeoArtist } from "@/lib/seoData";
import { getCachedPublicEvent } from "@/lib/serverEventData";
import { queryPublicSetlists } from "@/lib/publicArtistContent";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { getEventDisplayVenueName, getPublicVenueSeatGuideHref } from "@/lib/publicVenueGuides";
import { getJstDateString } from "@/lib/artistPageData";
import { computeSongNumbers } from "@/lib/setlistHelpers";
import { artistSetlistPath, canIndexPerformanceSetlist, performanceSetlistHeading, performanceSetlistPath, setlistPerformanceDate } from "@/lib/setlistSeo";

type Props = { params: Promise<{ slug: string; eventId: string }> };

const readPerformance = cache(async (slug: string, eventId: string) => {
  const artist = getSeoArtist(slug);
  if (!artist || !/^[a-zA-Z0-9_-]+$/.test(eventId)) notFound();
  const info = await getCachedPublicEvent(eventId);
  if (!info || info.isTestData || (info.event.artist_slug ?? info.artist?.slug) !== slug || !info.event.date) notFound();

  const client = createSupabasePublicClient();
  if (!client) throw new Error("Public setlist reader is unavailable");
  const [record] = await queryPublicSetlists(client, [info.event]);
  if (!record?.source || !canIndexPerformanceSetlist(info.event, record.items, true, getJstDateString())) notFound();

  return { ...info, artist, date: info.event.date, record };
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, eventId } = await params;
  const { artist, event, date, record, tourName } = await readPerformance(slug, eventId);
  const recording = record.source?.kind === "official_recording";
  const title = performanceSetlistHeading(artist.name, getEventDisplayVenueName(event.venue_id, event.venue), date, event.title)
    + (recording ? "（公式映像収録版）" : "") + "｜ちけレポ";
  return buildMeta({
    path: performanceSetlistPath(slug, eventId),
    title,
    description: artist.name + "「" + (tourName || event.title) + "」の" + setlistPerformanceDate(date)
      + "、" + getEventDisplayVenueName(event.venue_id, event.venue) + "公演の" + (recording ? "公式映像の収録順" : "セットリストと曲順") + "を掲載。",
    index: true,
    follow: true,
    image: "/api/og/setlist/" + slug,
    imageAlt: artist.name + "のセットリスト",
  });
}

export default async function PerformanceSetlistPage({ params }: Props) {
  const { slug, eventId } = await params;
  const { artist, event, date, record, tourName } = await readPerformance(slug, eventId);
  const heading = performanceSetlistHeading(artist.name, getEventDisplayVenueName(event.venue_id, event.venue), date, event.title);
  const recording = record.source?.kind === "official_recording";
  const songNumbers = computeSongNumbers(record.items);
  const venueHref = getPublicVenueSeatGuideHref(event.venue_id, event.venue);
  const linkClass = "zr-focus inline-flex min-h-11 items-center rounded-full border border-[#eadfe4] px-4 text-sm font-bold text-[#84234f]";

  return (
    <>
    {/* Same frame as the artist, show and setlist list pages: header with back, bottom menu. */}
    <Header title="セトリ" backHref={artistSetlistPath(slug)} backLabel="セトリ一覧へ戻る"
      breadcrumbLabel={`${setlistPerformanceDate(date)} ${getEventDisplayVenueName(event.venue_id, event.venue)}`} breadcrumbParents={[
        { href: `/artists/${slug}`, label: artist.name }, { href: artistSetlistPath(slug), label: "セトリ一覧" },
      ]} />
    <main className="zr-container mx-auto pb-[calc(104px+env(safe-area-inset-bottom))] pt-4 sm:pt-8">
      <header className="mb-8 rounded-2xl border border-[#eadfe4] bg-[#fff6fa] p-5 sm:p-8">
        <h1 className="text-2xl font-black leading-snug text-[#462436] sm:text-4xl">
          {heading}{recording ? "（公式映像収録版）" : ""}
        </h1>
        {tourName && <p className="mt-3 text-sm font-bold text-[#665861]">{tourName}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={"/events/" + eventId} className={linkClass}>公演情報</Link>
          {venueHref && <Link href={eventVenueHref(venueHref, eventId)} className={linkClass}>会場の座席表</Link>}
        </div>
      </header>
      <section aria-labelledby="performance-songs">
        <h2 id="performance-songs" className="artist-heading">
          {recording ? "公式映像の収録曲順" : "セットリスト・曲順"}（{songNumbers.size}曲）
        </h2>
        <ol className="mt-4 overflow-hidden rounded-2xl border border-[#eadfe4] bg-white">
          {record.items.map(item => (
            <li key={item.id} className="flex min-h-12 items-center gap-3 border-b border-[#eadfe4] px-4 py-2 last:border-b-0">
              {item.type === "song" && <><span className="min-w-8 text-xs font-bold text-[#84234f]">{songNumbers.get(item.id)}</span><span>{item.title}</span></>}
              {item.type === "encore" && <span className="font-bold text-[#84234f]">アンコール</span>}
              {item.type === "mc" && <span className="text-sm text-[#665861]">MC</span>}
              {(item.type === "separator" || item.type === "tag") && <span className="text-sm text-[#665861]">{item.label}</span>}
            </li>
          ))}
        </ol>
      </section>
    </main>
    <BottomNav active="setlist" artistSlug={slug} eventId={eventId} />
    </>
  );
}
