import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { getArtistNewsCount, getSeoArtist, isTestArtist, SITE_URL } from "@/lib/seoData";

type RouteProps = { params: Promise<{ slug: string }> };
type LayoutProps = RouteProps & { children: ReactNode };

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const { slug } = await params;
  const artist = getSeoArtist(slug);
  if (!artist) notFound();
  const newsCount = await getArtistNewsCount(slug);

  const title = `${artist.name}の公式ニュース｜ちけレポ`;
  const description = `${artist.name}の公式サイトNEWSをまとめて確認。ライブ・チケット・リリース情報など最新のお知らせ一覧。`;
  const ogImagePath = `/api/og/artist/${slug}`;

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/artists/${slug}/news` },
    robots: { index: !isTestArtist(artist) && newsCount > 0, follow: true },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/artists/${slug}/news`,
      type: "website",
      images: [{ url: ogImagePath, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImagePath],
    },
  };
}

export default async function ArtistNewsLayout({ children, params }: LayoutProps) {
  const { slug } = await params;
  if (!getSeoArtist(slug)) notFound();
  return children;
}
