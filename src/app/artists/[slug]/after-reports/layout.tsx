import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getArtistContentCounts, getSeoArtist, isTestArtist } from "@/lib/seoData";
import { buildMeta } from "@/lib/metadata";

type Props = {
  children: ReactNode;
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const artist = getSeoArtist(slug);
  if (!artist) notFound();
  const { afterReports } = await getArtistContentCounts(slug);
  const title = `${artist.name}の現地レポ・座席からの見え方｜ちけレポ`;
  const description = `${artist.name}のライブ会場写真、座席からの見え方、演出、トロッコや銀テープの現地レポを確認できます。`;
  return buildMeta({
    path: `/artists/${slug}/after-reports`,
    title,
    description,
    index: !isTestArtist(artist) && afterReports > 0,
    follow: true,
    twitterCard: "summary",
  });
}

export default function ArtistAfterReportsLayout({ children }: Props) {
  return children;
}
