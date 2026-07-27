import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SetlistClient } from "./SetlistClient";
import { getArtistContentCounts, getSeoArtist, isTestArtist, SITE_URL } from "@/lib/seoData";

type PageProps = { params: Promise<{ slug: string }> };

/**
 * このページは元々 "use client" のため generateMetadata を持てない。
 * 表示ロジックは SetlistClient.tsx へそのまま移設し、ここはメタデータ専用のServer Component。
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const artist = getSeoArtist(slug);
  if (!artist) notFound();
  const { setlists } = await getArtistContentCounts(slug);
  const title = `${artist.name}のセットリスト｜ちけレポ`;
  const description = `${artist.name}の公演セットリストを掲載。曲順・MC・演出メモをファンが共有。`;
  const ogImagePath = `/api/og/setlist/${slug}`;

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/artists/${slug}/setlist` },
    robots: { index: !isTestArtist(artist) && setlists > 0, follow: true },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/artists/${slug}/setlist`,
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

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  if (!getSeoArtist(slug)) notFound();
  return <SetlistClient params={params} />;
}
