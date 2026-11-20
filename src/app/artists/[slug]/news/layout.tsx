import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getSeoArtist, isTestArtist } from "@/lib/seoData";
import { getInitialArtistNews } from "@/lib/serverArtistContent";
import { buildMeta } from "@/lib/metadata";

export const dynamic = "force-dynamic";

type Props = {
  children: ReactNode;
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const artist = getSeoArtist(slug);
  if (!artist) notFound();
  const news = await getInitialArtistNews(slug);
  const title = `${artist.name}の公式ニュース｜ちけレポ`;
  const description = `${artist.name}のライブ、チケット、出演、リリース情報を公式サイトからまとめて確認できます。`;
  return buildMeta({
    path: `/artists/${slug}/news`,
    title,
    description,
    index: !isTestArtist(artist) && news.length > 0,
    follow: true,
    twitterCard: "summary",
  });
}

export default function ArtistNewsLayout({ children }: Props) {
  return children;
}
