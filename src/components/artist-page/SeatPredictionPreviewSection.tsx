import Link from "next/link";
import { ArrowRight, MapPinned, PenLine } from "lucide-react";
import type { SeatReport } from "@/lib/types";
import MapPreviewSection from "@/components/artist-page/MapPreviewSection";
import { SeatPredictionCard } from "@/components/common/SeatPredictionCard";
import { SelectControl } from "@/components/common/SelectControl";
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
      <h2 className="artist-heading">座席表・座席予想</h2>

      <div className="mt-4 min-w-0 sm:mt-5">
        {mapEvent && venues.length > 0 && (
          <div className="border-y border-[#282127] bg-white">
            <div className="flex items-center gap-2 px-3 py-2.5 sm:px-5">
              <MapPinned size={17} className="shrink-0 text-[#f43679]" />
              <p className="text-[10px] font-black tracking-[0.12em] text-[#817981]">会場を選択</p>
            </div>
            <label className="relative block border-t border-[#ded8dc] bg-[#eef0ff] px-4 py-2.5">
              <span className="sr-only">会場を選択</span>
              <SelectControl
                value={activeVenue ?? ""}
                onChange={(event) => onSelectVenue?.(event.target.value)}
                variant="bare"
                tone="seat"
              >
                {venues.map(({ venue }) => <option key={venue} value={venue}>{venue}</option>)}
              </SelectControl>
            </label>
          </div>
        )}

        {mapEvent && (
          <div className="mt-3">
            <MapPreviewSection mapEvent={mapEvent} />
          </div>
        )}

        <div className="mt-3 border border-[#282127] bg-[#fff8fa] p-3 sm:p-5">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-[9px] font-black tracking-[0.18em] text-[#f43679]">FAN PREDICTION</p>
              <h3 className="mt-1 text-[20px] font-black tracking-[-0.04em] text-[#1c171b]">ファンの有力予想</h3>
            </div>
            <span className="text-[10px] font-black text-[#817981]">PICKED #01</span>
          </div>

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
            <div className="border border-dashed border-[#cfc6cc] bg-white px-5 py-6 text-center">
              <PenLine size={27} className="mx-auto text-[#f43679]" />
              <p className="mt-3 text-[15px] font-black text-[#1c171b]">まだ予想図がありません</p>
              <p className="mt-1 text-[11px] font-medium text-[#817981]">最初の予想を投稿して、会場の座席表を完成させよう。</p>
              {!mapEvent && emptyPostHref && (
                <Link
                  href={emptyPostHref}
                  className="zr-focus mt-4 inline-flex min-h-11 items-center gap-2 bg-[#f43679] px-5 text-[12px] font-black text-white"
                >
                  予想図を投稿する<ArrowRight size={16} />
                </Link>
              )}
            </div>
          )}
        </div>

        {mapEvent && detailHref && (
          <div className="border-b border-x border-[#282127] bg-white">
            <Link href={detailHref} className="zr-focus group flex min-h-12 items-center justify-between px-5 text-[12px] font-black text-[#1c171b]">
              <span>すべての予想図を見る</span>
              <ArrowRight size={17} className="text-[#f43679] transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
