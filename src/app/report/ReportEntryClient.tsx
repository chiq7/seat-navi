"use client";

import { useSearchParams } from "next/navigation";
import { Header } from "@/components/common/Header";
import { BottomNav } from "@/components/common/BottomNav";
import { ReportEventSelector } from "@/components/report/ReportEventSelector";
import { ReportPerformancePicker, useReportEventSelection } from "@/components/report/ReportPerformancePicker";
import { findArtistBySlug, resolveArtist } from "@/lib/artists";
import type { ReportOptions } from "@/lib/reportEventSelection";

export function ReportEntryClient({ initial }: { initial?: ReportOptions }) {
  const query = useSearchParams();
  const selection = useReportEventSelection(initial);
  const event = selection.selectedEventRow;
  const artist = event ? resolveArtist(event) : null;
  const venueId = query.get("venue");
  const artistSlug = artist?.slug ?? findArtistBySlug(query.get("artist") ?? "")?.slug ?? null;
  const backHref = event ? `/events/${encodeURIComponent(event.id)}` : venueId && selection.venueName
    ? `/venues/${encodeURIComponent(venueId)}` : artistSlug ? `/artists/${encodeURIComponent(artistSlug)}` : "/";
  return <main className="community-page pb-20 font-sans">
    <Header title="レポートを投稿" backHref={backHref} backLabel="戻る" />
    <h1 className="zr-container pt-4 text-xl font-black">ライブを報告する</h1>
    <ReportPerformancePicker selection={selection} />
    <ReportEventSelector selectedEvent={event} artistName={artist?.name ?? null} artistSlug={artistSlug} venueId={venueId} requireSelection={query.has("event") && !event} />
    <BottomNav active="report" artistSlug={artistSlug ?? undefined} eventId={event?.id} />
  </main>;
}
