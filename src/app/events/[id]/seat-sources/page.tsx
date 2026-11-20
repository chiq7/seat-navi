import { cache } from "react";
import { notFound } from "next/navigation";
import { getRequestPublicEventCatalog } from "@/lib/publicEventCatalogContext";
import { getCachedPublicEvent } from "@/lib/serverEventData";
import { SeatSourceListPage, sourcePageHref, getSourcePage, type SourceQuery } from "@/components/venue/SeatSourceArchive";
import { sourceKindNames, sourcePreviewLimit } from "@/lib/seatSourceArchive";
import { buildMeta } from "@/lib/metadata";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<SourceQuery> };
const getPublicEventName = cache(async (id: string) => {
  const catalog = await getRequestPublicEventCatalog();
  const event = catalog?.events.find(item => item.id === id) ?? (await getCachedPublicEvent(id))?.event;
  if (!event) notFound();
  return [event.title, event.venue, event.date].filter(Boolean).join("・");
});

export async function generateMetadata({ params, searchParams }: Props) {
  const { id } = await params;
  const { kind, page, posts } = getSourcePage("events",id,await searchParams);
  const name = await getPublicEventName(id);
  return buildMeta({ index: posts.length > sourcePreviewLimit, path: sourcePageHref("/events/" + id, kind, page),
    title: `${name}の${sourceKindNames[kind]}（${page}ページ目）｜ちけレポ`,
    description: `この公演の${sourceKindNames[kind]}を元のX投稿とともに確認できます。` });
}

export default async function EventSeatSources({ params, searchParams }: Props) {
  const { id } = await params;
  return <SeatSourceListPage scope="events" id={id} name={await getPublicEventName(id)} query={await searchParams} />;
}
