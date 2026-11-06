import { notFound } from "next/navigation";
import { getSeoArtist } from "@/lib/seoData";
import { getInitialArtistReports } from "@/lib/serverArtistContent";
import AfterReportsClient from "./AfterReportsClient";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ event?: string | string[] }>;
};

export default async function AfterReportsPage({ params, searchParams }: Props) {
  const [{ slug }, query] = await Promise.all([params, searchParams ?? Promise.resolve({ event: undefined })]);
  if (!getSeoArtist(slug)) notFound();
  const initial = await getInitialArtistReports(slug);
  const eventId = query.event;
  if (eventId !== undefined && (typeof eventId !== "string" || !initial.events.some(event => event.id === eventId))) notFound();
  return <AfterReportsClient key={`${slug}:${eventId ?? "all"}`} slug={slug} initial={initial} initialEventId={eventId ?? null} />;
}
