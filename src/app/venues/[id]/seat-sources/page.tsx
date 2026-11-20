import { notFound } from "next/navigation";
import { findSeoVenue } from "@/lib/venueSeo";
import { getPublicVenueName } from "@/lib/publicVenueGuides";
import { SeatSourceListPage, sourcePageHref, getSourcePage, type SourceQuery } from "@/components/venue/SeatSourceArchive";
import { sourceKindNames, sourcePreviewLimit } from "@/lib/seatSourceArchive";
import { buildMeta } from "@/lib/metadata";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<SourceQuery> };
function getVenue(id: string) {
  const venue = findSeoVenue(id);
  if (!venue) notFound();
  return { id: venue.id, name: getPublicVenueName(venue.id, venue.name) };
}

export async function generateMetadata({ params, searchParams }: Props) {
  const venue = getVenue((await params).id);
  const { kind, page, posts } = getSourcePage("venues",venue.id,await searchParams);
  return buildMeta({ index: posts.length > sourcePreviewLimit, path: sourcePageHref("/venues/" + venue.id, kind, page),
    title: `${venue.name}の${sourceKindNames[kind]}（${page}ページ目）｜ちけレポ`,
    description: `${venue.name}の${sourceKindNames[kind]}を元のX投稿とともに確認できます。` });
}

export default async function VenueSeatSources({ params, searchParams }: Props) {
  const venue = getVenue((await params).id);
  return <SeatSourceListPage scope="venues" id={venue.id} name={venue.name} query={await searchParams} />;
}
