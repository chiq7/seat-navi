import { notFound } from "next/navigation";
import { getSeoArtist } from "@/lib/seoData";
import { getInitialArtistNews } from "@/lib/serverArtistContent";
import ArtistNewsClient from "./ArtistNewsClient";

export default async function ArtistNewsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!getSeoArtist(slug)) notFound();
  const news = await getInitialArtistNews(slug);
  return <ArtistNewsClient key={slug} slug={slug} initialNews={news} />;
}
