import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getArtistNewsCount, getSeoArtist, isTestArtist } from "@/lib/seoData";
import { buildMeta } from "@/lib/metadata";

type Props = {
  children: ReactNode;
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const artist = getSeoArtist(slug);
  if (!artist) notFound();
  const count = await getArtistNewsCount(slug);
  const title = `${artist.name}の公式ニュース｜ちけレポ`;
  const description = `${artist.name}のライブ、チケット、出演、リリース情報を公式サイトからまとめて確認できます。`;
  return buildMeta({
    path: `/artists/${slug}/news`,
    title,
    description,
    index: !isTestArtist(artist) && count > 0,
    follow: true,
    twitterCard: "summary",
  });
}

export default function ArtistNewsLayout({ children }: Props) {
  return children;
}
