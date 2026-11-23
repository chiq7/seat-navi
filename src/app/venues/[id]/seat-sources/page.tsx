import { notFound, permanentRedirect } from "next/navigation";
import { findSeoVenue } from "@/lib/venueSeo";

type Props = { params: Promise<{ id: string }> };

/** The post list now lives on the venue page itself (#seat-source-posts); old list URLs forward there. */
export default async function VenueSeatSources({ params }: Props) {
  const venue = findSeoVenue((await params).id);
  if (!venue) notFound();
  permanentRedirect(`/venues/${encodeURIComponent(venue.id)}#seat-source-posts`);
}
