import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SetlistClient } from "./SetlistClient";
import { getArtistContentCounts, getSeoArtist, isTestArtist } from "@/lib/seoData";
import { buildMeta } from "@/lib/metadata";
import { getInitialArtistSetlists } from "@/lib/serverArtistContent";
import { selectInitialSetlist } from "@/lib/publicArtistContent";
import { getJstDateString } from "@/lib/artistPageData";

type PageProps = { params: Promise<{ slug: string }>; searchParams?: Promise<{ event?: string | string[] }> };

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

  return buildMeta({
    path: `/artists/${slug}/setlist`,
    title,
    description,
    index: !isTestArtist(artist) && setlists > 0,
    follow: true,
    image: ogImagePath,
    imageAlt: `${artist.name}のセットリスト`,
  });
}

export default async function Page({ params, searchParams }: PageProps) {
  const { slug } = await params;
  if (!getSeoArtist(slug)) notFound();
  const { events: initialEvents, records } = await getInitialArtistSetlists(slug);
  const requested = (await searchParams)?.event;
  const initialSetlist = selectInitialSetlist(initialEvents, records, getJstDateString(), typeof requested === "string" ? requested : undefined);
  return <SetlistClient key={`${slug}:${initialSetlist.eventId ?? "none"}`} params={params} initialEvents={initialEvents} initialSetlist={initialSetlist} />;
}
