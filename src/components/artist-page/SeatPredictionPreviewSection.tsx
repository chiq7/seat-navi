import Image from "next/image";
import Link from "next/link";
import type { SeatReport } from "@/lib/types";
import MapPreviewSection from "@/components/artist-page/MapPreviewSection";
import { SeatPredictionCard } from "@/components/common/SeatPredictionCard";

type MapEvent = {
  id: string;
  reports: SeatReport[];
};

type VenueChip = {
  venue: string;
  eventId: string;
};

export type TopPrediction = {
  id: string;
  imageUrl: string;
  comment: string | null;
  tags: string[];
  createdAt: string;
  voteCount: number;
};

type Props = {
  venues: VenueChip[];
  activeVenue?: string | null;
  onSelectVenue?: (venue: string) => void;
  topPrediction?: TopPrediction | null;
  mapEvent: MapEvent | null;
  detailHref?: string | null;
  emptyPostHref?: string | null;
};

function fmtShortDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function SeatPredictionPreviewSection({
  venues,
  activeVenue = null,
  onSelectVenue,
  topPrediction = null,
  mapEvent,
  detailHref = null,
  emptyPostHref = null,
}: Props) {
  return (
    <section className="mt-3 px-3">
      <h2 className="mb-3 text-[18px] font-bold leading-none text-gray-900">マップ・座席予想</h2>
      <div className="rounded-2xl border border-gray-100 bg-white p-3 pb-2 shadow-sm">
        {mapEvent && venues.length > 0 && (
          <div className="mb-3">
            <p className="mb-1.5 text-[11px] font-semibold text-gray-400">会場を選択</p>
            <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
              {venues.map(({ venue }) => (
                <button
                  key={venue}
                  type="button"
                  onClick={() => onSelectVenue?.(venue)}
                  aria-pressed={venue === activeVenue}
                  className={`w-[84px] shrink-0 rounded-lg p-2.5 text-left transition-all active:scale-95 ${
                    venue === activeVenue
                      ? "border-2 border-[#FF6B9D] bg-[#FFF1F6]"
                      : "border border-gray-200 bg-white"
                  }`}
                >
                  <p
                    className={`truncate text-[12px] font-bold leading-tight ${
                      venue === activeVenue ? "text-[#FF6B9D]" : "text-gray-600"
                    }`}
                  >
                    {venue}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}
        {mapEvent && (
          <div className="mb-4">
            <MapPreviewSection mapEvent={mapEvent} />
          </div>
        )}
        {topPrediction ? (
          <SeatPredictionCard
            predictionId={topPrediction.id}
            imageUrl={topPrediction.imageUrl}
            comment={topPrediction.comment}
            tags={topPrediction.tags}
            venue={activeVenue}
            dateLabel={fmtShortDate(topPrediction.createdAt)}
            likeCount={topPrediction.voteCount}
            rank={1}
            detailHref={detailHref}
          />
        ) : (
          <div className="rounded-2xl border border-gray-100 bg-white px-3 py-3 shadow-sm">
            <div className="relative mx-auto h-[140px] w-full max-w-[280px] overflow-hidden rounded-xl bg-white">
              <Image
                src="/images/artist-page/seat-map-preparing2.png"
                alt="準備中"
                fill
                sizes="(max-width: 320px) 100vw, 280px"
                className="object-contain"
              />
            </div>
            {!mapEvent && emptyPostHref && (
              <div className="pt-2 text-center">
                <Link
                  href={emptyPostHref}
                  className="inline-flex rounded-full bg-[#FF6B9D] px-4 py-2 text-[12px] font-bold text-white"
                >
                  予想図を投稿する
                </Link>
              </div>
            )}
          </div>
        )}
        {mapEvent && detailHref && (
          <div className="py-3 text-center">
            <Link href={detailHref} className="text-[14px] font-bold text-[#FF6B9D]">
              他の投稿を見る
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
