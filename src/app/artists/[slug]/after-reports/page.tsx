import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSeoArtist, isTestArtist } from "@/lib/seoData";
import { buildMeta, seatPhotoTitle } from "@/lib/metadata";
import { countReportCardPhotos } from "@/lib/reportPhotoCount";
import { getInitialArtistReports } from "@/lib/serverArtistContent";
import AfterReportsClient from "./AfterReportsClient";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ event?: string | string[] }>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const artist = getSeoArtist(slug);
  if (!artist) notFound();
  const { reports } = await getInitialArtistReports(slug);
  const selected = (await searchParams)?.event;
  const visibleReports = selected ? reports.filter(report => report.event_id === selected) : reports;
  return buildMeta({
    path: `/artists/${slug}/after-reports`,
    title: seatPhotoTitle(`${artist.name}の現地レポ・座席からの見え方`, countReportCardPhotos(visibleReports)),
    description: `${artist.name}のライブ会場写真、座席からの見え方、演出、トロッコや銀テープの現地レポを確認できます。`,
    index: !isTestArtist(artist) && visibleReports.length > 0,
    follow: true,
    twitterCard: "summary",
  });
}

export default async function AfterReportsPage({ params, searchParams }: Props) {
  const [{ slug }, query] = await Promise.all([params, searchParams ?? Promise.resolve({ event: undefined })]);
  if (!getSeoArtist(slug)) notFound();
  const initial = await getInitialArtistReports(slug);
  const eventId = query.event;
  if (eventId !== undefined && (typeof eventId !== "string" || !initial.events.some(event => event.id === eventId))) notFound();
  return <AfterReportsClient key={`${slug}:${eventId ?? "all"}`} slug={slug} initial={initial} initialEventId={eventId ?? null} />;
}
