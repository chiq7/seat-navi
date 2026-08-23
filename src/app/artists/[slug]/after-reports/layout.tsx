import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getArtistContentCounts, getSeoArtist, isTestArtist, SITE_URL } from "@/lib/seoData";

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
  const canonical = `${SITE_URL}/artists/${slug}/after-reports`;

  return {
    title,
    description,
    alternates: { canonical },
    robots: { index: !isTestArtist(artist) && afterReports > 0, follow: true },
    openGraph: { title, description, url: canonical, type: "website" },
    twitter: { card: "summary", title, description },
  };
}

export default function ArtistAfterReportsLayout({ children }: Props) {
  return children;
}
