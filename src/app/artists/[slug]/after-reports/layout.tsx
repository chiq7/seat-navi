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

  return {
    title: `${artist.name}の現地レポ｜ちけレポ`,
    description: `${artist.name}の公演の現地レポート。座席の見え方、会場の混雑、グッズ列の様子をファンが共有。`,
    alternates: { canonical: `${SITE_URL}/artists/${slug}/after-reports` },
    robots: { index: !isTestArtist(artist) && afterReports > 0, follow: true },
  };
}

export default async function AfterReportsLayout({ children, params }: LayoutProps) {
  const { slug } = await params;
  if (!getSeoArtist(slug)) notFound();
  return children;
}
