import { permanentRedirect } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

/** The post list now lives on the show page itself (#seat-source-posts); old list URLs forward there. */
export default async function EventSeatSources({ params }: Props) {
  const { id } = await params;
  permanentRedirect(`/events/${encodeURIComponent(id)}#seat-source-posts`);
}
