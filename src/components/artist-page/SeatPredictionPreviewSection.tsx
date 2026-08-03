import Image from "next/image";
import Link from "next/link";
import type { SeatReport } from "@/lib/types";
import MapPreviewSection from "@/components/artist-page/MapPreviewSection";
import { SeatPredictionCard } from "@/components/common/SeatPredictionCard";
import type { PostAuthor } from "@/lib/postAuthors";

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
  author?: PostAuthor | null;
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
    <section className="artist-section" id="seat-map">
      <p className="artist-kicker">Seat Map & Prediction</p>
      <h2 className="artist-heading">会場の座席表・予想図</h2>
      <div className="mt-8 min-w-0 bg-white p-4 sm:p-6">
        {mapEvent && venues.length > 0 && (
          <div className="mb-3">
            <p className="mb-2 text-[10px] font-bold tracking-[0.12em] text-[#8d858c]">会場を選択</p>
            <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
              {venues.map(({ venue }) => (
                <button
                  key={venue}
                  type="button"
                  onClick={() => onSelectVenue?.(venue)}
                  aria-pressed={venue === activeVenue}
                  className={`zr-focus min-h-11 shrink-0 border px-4 py-2 text-left text-[12px] font-bold transition-colors ${
                    venue === activeVenue
                      ? "border-[#f43679] bg-[#f43679] text-white"
                      : "border-[#ded8dc] bg-white text-[#5d555b]"
                  }`}
                >
                  <p
                    className="truncate"
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
            author={topPrediction.author}
          />
        ) : (
          <div className="border border-[#ded8dc] bg-[#faf8f9] px-3 py-4">
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
                  className="zr-focus inline-flex min-h-11 items-center rounded-full bg-[#f43679] px-5 text-[12px] font-bold text-white"
                >
                  予想図を投稿する
                </Link>
              </div>
            )}
          </div>
        )}
        {mapEvent && detailHref && (
          <div className="border-t border-[#ded8dc] pt-4 text-center">
            <Link href={detailHref} className="text-[14px] font-bold text-[#FF6B9D]">
              他の投稿を見る
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
