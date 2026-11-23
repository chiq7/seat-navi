import { notFound, permanentRedirect } from "next/navigation";
import { findSeoVenue } from "@/lib/venueSeo";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ kind?: string | string[] }> };

/** The old post lists: seat posts are now the venue's photo row, arena-map posts its arena-map image row. */
export default async function VenueSeatSources({ params, searchParams }: Props) {
  const venue = findSeoVenue((await params).id);
  if (!venue) notFound();
  const kind = (await searchParams).kind;
  permanentRedirect(`/venues/${encodeURIComponent(venue.id)}#${kind === "arena_map" ? "dome-arena-maps" : "dome-photos"}`);
}
