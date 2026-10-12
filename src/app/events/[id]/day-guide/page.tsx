import type { Metadata } from "next";
import { notFound } from "next/navigation";
import EventDayPreview from "@/components/event-day/EventDayPreview";
import { EVENT_DAY_PUBLICATIONS } from "@/data/eventDayPublications";
import { eventDayGuidePath, matchPublishedEventDay } from "@/lib/eventDayPublication";
import { buildMeta, SITE_URL } from "@/lib/metadata";
import { getCachedPublicEvent } from "@/lib/serverEventData";

type PageProps = { params: Promise<{ id: string }> };

async function getGuide(id: string) {
  const info = await getCachedPublicEvent(id);
  if (!info) notFound();
  const publication = matchPublishedEventDay(info.event, info.artist?.slug ?? info.event.artist_slug ?? null, EVENT_DAY_PUBLICATIONS);
  if (!publication) notFound();
  return publication;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const { summary: day } = await getGuide(id);
  return buildMeta({
    path: eventDayGuidePath(id),
    title: `${day.artist} ${day.dateLabel} ${day.venue}｜当日まとめ・グッズ・FCブース｜ちけレポ`,
    description: `${day.dateLabel}の${day.artist} ${day.venue}。開場${day.open ?? "未発表"}・開演${day.start ?? "未発表"}、グッズ・CD予約・FCブースの時間と場所、引換締切、必要なものを図で確認・画像保存できます。${day.state === "past" ? "終了した公演の案内です。" : ""}`,
    index: true, follow: true, image: `/api/og/event/${id}`,
    imageAlt: `${day.artist} ${day.dateLabel} ${day.venue} 当日まとめ`,
  });
}

export default async function EventDayGuidePage({ params }: PageProps) {
  const { id } = await params;
  const { summary } = await getGuide(id);
  return <EventDayPreview day={summary} publicUrl={`${SITE_URL}${eventDayGuidePath(id)}`} />;
}
