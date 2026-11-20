import Link from "next/link";
import { eventVenueHref } from "@/lib/eventVenueHref";
import { ChevronRight } from "lucide-react";
import type { EventVenuePhotoPreview } from "@/lib/serverSeatPhotoVenues";
import { VenuePhotoThumbnail } from "./VenuePhotoThumbnail";

export function EventVenuePhotos({ eventId, venue, showPreview, awaitingReports }: { eventId: string; venue: EventVenuePhotoPreview; showPreview: boolean; awaitingReports: boolean }) {
  const { name, href, count, photos } = venue;
  const venuePath = eventVenueHref(href.split("#")[0], eventId);

  return (
    <div id="performance-seat-links" className="zr-container scroll-mt-[90px] py-4">
      <Link href={venuePath} prefetch={false} data-event-venue-banner data-venue-photo-count={count}
        className="zr-focus flex min-h-14 items-center gap-3 rounded-2xl border border-[#e9bfd1] bg-[#fff3f8] px-4 py-4 text-[#702344] hover:bg-[#ffeaf3] sm:px-5">
        <span className="min-w-0 flex-1">
          <strong className="block text-[16px] leading-snug sm:text-lg">
            <span aria-hidden="true">🏟️ </span>{name}の座席表{count > 0 && <>・見え方写真（{count}枚）</>}を見る
          </strong>
          {count > 0 && <span className="mt-2 block text-[13px] leading-relaxed text-[#694955]">
            {awaitingReports
              ? "当日のレポが集まる前に、この会場のスタンド・アリーナからの距離感や見え方を写真でチェック！"
              : `この会場の座席表と、ほかの席からの見え方写真（${count}枚）をまとめて確認できます。`}
          </span>}
        </span>
        <ChevronRight size={22} aria-hidden="true" className="shrink-0" />
      </Link>
      {showPreview && photos.length > 0 && (
        <section aria-labelledby="event-venue-photos-title" data-event-venue-photo-preview className="mt-5">
          <h2 id="event-venue-photos-title" className="text-base font-black leading-snug text-[#40383d] sm:text-lg">
            {name}の座席からの見え方イメージ
          </h2>
          <p className="mt-1 text-xs text-[#71636c]">過去公演の写真</p>
          <ul className="mt-3 flex snap-x gap-2 overflow-x-auto pb-2 sm:gap-3" aria-label="過去公演の座席写真">
            {photos.map(photo => <li key={photo.thumbnailUrl} className="w-[43%] max-w-48 shrink-0 snap-start sm:w-36">
              <Link href={eventVenueHref(photo.href, eventId)} prefetch={false} data-event-venue-photo
                className="zr-focus block min-h-11 rounded-lg border border-[#eadfe4] bg-white p-1 hover:border-[#bd6288]">
                <VenuePhotoThumbnail src={photo.thumbnailUrl} />
                <span className="block px-1 py-2 text-[13px] font-bold leading-snug text-[#40383d]">{photo.label}</span>
              </Link>
            </li>)}
          </ul>
          <Link href={venuePath} prefetch={false} data-event-venue-photo-link
            className="zr-focus mt-2 flex min-h-12 items-center justify-between gap-3 rounded-xl border border-[#d6a4ba] bg-white px-4 py-2.5 text-sm font-bold leading-snug text-[#812c53] hover:bg-[#fff3f8]">
            <span>{name}のすべての座席写真（{count}枚）とブロック解説を見る</span><span aria-hidden="true">→</span>
          </Link>
        </section>
      )}
    </div>
  );
}
