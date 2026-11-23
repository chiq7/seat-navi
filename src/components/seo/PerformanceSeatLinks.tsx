import Link from "next/link";
import { eventVenueHref } from "@/lib/eventVenueHref";
import { Camera, MapPin, ExternalLink } from "lucide-react";
import { getPublicVenueSeatGuideHref } from "@/lib/publicVenueGuides";
import { getOfficialSeatSources, officialSeatSourceLabel } from "@/lib/officialSeatSources";
import type { CrawledEvent } from "@/lib/types";

export default function PerformanceSeatLinks({ event, officialSeatMap, arenaPhotoCount = 0, venuePhotoCount = 0, venueGuideInBanner = false }: {
  event: CrawledEvent;
  officialSeatMap?: string;
  arenaPhotoCount?: number;
  venuePhotoCount?: number;
  venueGuideInBanner?: boolean;
}) {
  const venueHref = venueGuideInBanner ? null : getPublicVenueSeatGuideHref(event.venue_id, event.venue);
  const officialSources = getOfficialSeatSources(event);
  const seatSources = officialSources.filter(source => source.kind !== "event-guidance");
  const guidanceSources = officialSources.filter(source => source.kind === "event-guidance");
  const hasSeatLinks = Boolean(venueHref || officialSeatMap || seatSources.length || arenaPhotoCount);
  if (!hasSeatLinks && !guidanceSources.length) return null;

  const linkClass = "zr-focus inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#e9cdd9] bg-white px-3 text-[13px] font-black text-[#8e2858]";
  return (
    <section id={venueGuideInBanner ? undefined : "performance-seat-links"} aria-labelledby={hasSeatLinks ? "performance-seat-links-title" : "performance-guidance-title"} className="mt-4 scroll-mt-[90px] border-y border-[#eadfe4] py-2">
      {hasSeatLinks && <>
      <h2 id="performance-seat-links-title" className="text-sm font-black text-[#40383d]">座席表を探す</h2>
      <div className="mt-2 flex flex-wrap gap-2">
        {arenaPhotoCount > 0 && <a href="#arena-seat-photos" className="zr-focus inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#eaf6f3] px-2 text-[13px] font-bold text-[#07564f]">
          <Camera size={16} className="shrink-0" aria-hidden="true" />この公演のアリーナ写真（{arenaPhotoCount}枚）
        </a>}
        {officialSeatMap && <a href={officialSeatMap} target="_blank" rel="noopener noreferrer" className={linkClass}>
          <ExternalLink size={15} aria-hidden="true" />主催者の公演シートマップを見る
        </a>}
        {seatSources.map(source => <a key={source.id} data-official-seat-source={source.id} href={source.url} target="_blank" rel="noopener noreferrer" className={`${linkClass} max-w-full`}>
          <ExternalLink size={15} className="shrink-0" aria-hidden="true" /><span>{officialSeatSourceLabel(source)}</span>
        </a>)}
        {venueHref && <Link href={eventVenueHref(venueHref, event.id)} className={linkClass} aria-describedby={venuePhotoCount > 0 ? "performance-venue-photo-info" : undefined}>
          <MapPin size={15} className="shrink-0" aria-hidden="true" /><span>会場の常設座席表を見る</span>
          {venuePhotoCount > 0 && <span aria-hidden="true" className="inline-flex shrink-0 items-center gap-1 rounded-md bg-[#eaf6f3] px-1.5 py-1 text-xs text-[#07564f]">
            <Camera size={13} aria-hidden="true" />写真あり
          </span>}
        </Link>}
        {venuePhotoCount > 0 && <span id="performance-venue-photo-info" className="sr-only">会場の座席写真{venuePhotoCount}枚あり</span>}
      </div>
      {officialSeatMap && <p className="mt-1 text-xs leading-relaxed text-[#665861]">主催者ページの「SEAT MAP」で、{event.venue}の図を選べます。</p>}
      {seatSources.some(source => source.kind === "venue-seating" || source.kind === "layout") && <p className="mt-1 text-xs leading-relaxed text-[#665861]">会場の座席表・レイアウト例は、公演ごとの配置と異なる場合があります。</p>}
      {seatSources.some(source => source.kind === "event-area") && <p className="mt-1 text-xs leading-relaxed text-[#665861]">会場マップは入場口・観覧エリアなどの案内です。</p>}
      {seatSources.some(source => source.kind === "venue-floor") && <p className="mt-1 text-xs leading-relaxed text-[#665861]">フロアマップはステージ・客席エリアなどの案内です。公演当日の座席番号・配置はチケットや主催者の案内をご確認ください。</p>}
      {seatSources.filter(source => source.note).map(source => <p key={source.id} className="mt-1 text-xs leading-relaxed text-[#665861]">{source.note}</p>)}
      </>}
      {guidanceSources.length > 0 && <div data-official-guidance className={hasSeatLinks ? "mt-3 border-t border-[#eadfe4] pt-3" : undefined}>
        <h2 id="performance-guidance-title" className="text-sm font-black text-[#40383d]">公式の会場案内・入場方法</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {guidanceSources.map(source => <a key={source.id} data-official-seat-source={source.id} href={source.url} target="_blank" rel="noopener noreferrer" className={`${linkClass} max-w-full`}>
            <ExternalLink size={15} className="shrink-0" aria-hidden="true" /><span>{officialSeatSourceLabel(source)}</span>
          </a>)}
        </div>
        {guidanceSources.filter(source => source.note).map(source => <p key={source.id} className="mt-1 text-xs leading-relaxed text-[#665861]">{source.note}</p>)}
      </div>}
    </section>
  );
}
