import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArtistClient } from "./ArtistClient";
import { getSeoArtist, isTestArtist, SITE_URL } from "@/lib/seoData";
import { getArtistSeoProfile } from "@/lib/seoProfiles";
import { serializeJsonLd } from "@/lib/structuredData";
import { getCachedArtistEvents } from "@/lib/serverEventData";

type PageProps = { params: Promise<{ slug: string }> };

/**
 * このページは元々 "use client" のため generateMetadata を持てない。
 * 表示ロジックは ArtistClient.tsx へそのまま移設し、ここはメタデータ専用のServer Component。
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const artist = getSeoArtist(slug);
  if (!artist) notFound();
  const profile = getArtistSeoProfile(slug);

  const title = `${artist.name}の当落・座席・現地レポ｜ちけレポ`;
  const description = profile?.metaDescription ?? `${artist.name}のチケット当選率、座席報告、アリーナ予想図、現地レポ、セットリストをまとめて確認。ファンの実際の報告データを掲載。`;
  const ogImagePath = `/api/og/artist/${slug}`;

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/artists/${slug}` },
    robots: { index: !isTestArtist(artist), follow: true },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/artists/${slug}`,
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
  const artist = getSeoArtist(slug);
  if (!artist) notFound();
  // 公演一覧は公開データなので、ログイン状態ごとにDBを読み直さず共有キャッシュを使う。
  // お気に入りや投稿状態はクライアント側の既存処理をそのまま維持する。
  const initialEvents = await getCachedArtistEvents(slug);
  const profile = getArtistSeoProfile(slug);
  const structuredData = profile
    ? {
        "@context": "https://schema.org",
        "@type": profile.schemaType,
        name: artist.name,
        ...(profile.alternateName ? { alternateName: profile.alternateName } : {}),
        url: `${SITE_URL}/artists/${slug}`,
        sameAs: profile.officialUrl,
        description: profile.summary,
      }
    : null;

  return (
    <>
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }}
        />
      )}
      <ArtistClient params={params} initialEvents={initialEvents} />
    </>
  );
}
