import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { getSeoArtist, isTestArtist, SITE_URL } from "@/lib/seoData";

type RouteProps = { params: Promise<{ slug: string }> };
type LayoutProps = RouteProps & { children: ReactNode };

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const { slug } = await params;
  const artist = getSeoArtist(slug);
  if (!artist) notFound();

  return {
    title: `${artist.name}の公式ニュース｜ちけレポ`,
    description: `${artist.name}の公式サイトNEWSをまとめて確認。ライブ・チケット・リリース情報など最新のお知らせ一覧。`,
    alternates: { canonical: `${SITE_URL}/artists/${slug}/news` },
    robots: { index: !isTestArtist(artist), follow: true },
  };
}

export default async function ArtistNewsLayout({ children, params }: LayoutProps) {
  const { slug } = await params;
  if (!getSeoArtist(slug)) notFound();
  return children;
}
