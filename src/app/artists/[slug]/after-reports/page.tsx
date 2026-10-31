import { notFound } from "next/navigation";
import { getSeoArtist } from "@/lib/seoData";
import { getInitialArtistReports } from "@/lib/serverArtistContent";
import AfterReportsClient from "./AfterReportsClient";

export default async function AfterReportsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!getSeoArtist(slug)) notFound();
  const initial = await getInitialArtistReports(slug);
  return <AfterReportsClient key={slug} slug={slug} initial={initial} />;
}
