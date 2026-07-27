import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { getArtistContentCounts, getSeoArtist, isTestArtist, SITE_URL } from "@/lib/seoData";

type RouteProps = { params: Promise<{ slug: string }> };
type LayoutProps = RouteProps & { children: ReactNode };

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const { slug } = await params;
  const artist = getSeoArtist(slug);
  if (!artist) notFound();
  const { afterReports } = await getArtistContentCounts(slug);
  const title = `${artist.name}の現地レポ｜ちけレポ`;
  const description = `${artist.name}の公演の現地レポート。座席の見え方、会場の混雑、グッズ列の様子をファンが共有。`;
  const url = `${SITE_URL}/artists/${slug}/after-reports`;
  const ogImagePath = `/api/og/artist/${slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    robots: { index: !isTestArtist(artist) && afterReports > 0, follow: true },
    openGraph: {
      title,
      description,
      url,
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

export default async function AfterReportsLayout({ children, params }: LayoutProps) {
  const { slug } = await params;
  if (!getSeoArtist(slug)) notFound();
  return children;
}
