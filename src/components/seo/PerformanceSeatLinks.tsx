import Link from "next/link";
import { MapPin, ExternalLink } from "lucide-react";
import { getPublicVenueSeatGuideHref } from "@/lib/publicVenueGuides";
import { getOfficialSeatSources, officialSeatSourceLabel } from "@/lib/officialSeatSources";
import type { CrawledEvent } from "@/lib/types";

export default function PerformanceSeatLinks({ event, officialSeatMap }: { event: CrawledEvent; officialSeatMap?: string }) {
  const venueHref = getPublicVenueSeatGuideHref(event.venue_id, event.venue);
  const officialSources = getOfficialSeatSources(event);
  if (!venueHref && !officialSeatMap && !officialSources.length) return null;

  const linkClass = "zr-focus inline-flex min-h-11 items-center gap-2 px-2 text-[13px] font-black text-[#8e2858] underline underline-offset-4";
  return (
    <section id="performance-seat-links" aria-labelledby="performance-seat-links-title" className="mt-4 scroll-mt-[90px] border-y border-[#eadfe4] py-2">
      <h2 id="performance-seat-links-title" className="text-sm font-black text-[#40383d]">座席表を探す</h2>
      <div className="mt-1 flex flex-wrap gap-x-2">
        {officialSeatMap && <a href={officialSeatMap} target="_blank" rel="noopener noreferrer" className={linkClass}>
          <ExternalLink size={15} aria-hidden="true" />主催者の公演シートマップを見る
        </a>}
        {officialSources.map(source => <a key={source.id} data-official-seat-source={source.id} href={source.url} target="_blank" rel="noopener noreferrer" className={`${linkClass} max-w-full`}>
          <ExternalLink size={15} className="shrink-0" aria-hidden="true" /><span>{officialSeatSourceLabel(source)}</span>
        </a>)}
        {venueHref && <Link href={venueHref} className={linkClass}>
          <MapPin size={15} aria-hidden="true" />会場の常設座席表を見る
        </Link>}
      </div>
      {officialSeatMap && <p className="mt-1 text-xs leading-relaxed text-[#665861]">主催者ページの「SEAT MAP」で、{event.venue}の図を選べます。</p>}
      {officialSources.some(source => source.kind === "venue-seating" || source.kind === "layout") && <p className="mt-1 text-xs leading-relaxed text-[#665861]">会場の座席表・レイアウト例は、公演ごとの配置と異なる場合があります。</p>}
      {officialSources.some(source => source.kind === "event-area") && <p className="mt-1 text-xs leading-relaxed text-[#665861]">会場マップは入場口・観覧エリアなどの案内です。</p>}
      {officialSources.filter(source => source.note).map(source => <p key={source.id} className="mt-1 text-xs leading-relaxed text-[#665861]">{source.note}</p>)}
    </section>
  );
}
