import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getArtistNewsCount, getSeoArtist, isTestArtist, SITE_URL } from "@/lib/seoData";

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
  const canonical = `${SITE_URL}/artists/${slug}/news`;

  return {
    title,
    description,
    alternates: { canonical },
    robots: { index: !isTestArtist(artist) && count > 0, follow: true },
    openGraph: { title, description, url: canonical, type: "website" },
    twitter: { card: "summary", title, description },
  };
}

export default function ArtistNewsLayout({ children }: Props) {
  return children;
}
