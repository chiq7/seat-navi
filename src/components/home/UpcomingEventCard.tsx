import Link from "next/link";
import FavoriteArtistButton from "@/components/auth/FavoriteArtistButton";
import type { UpcomingEvent } from "@/lib/homeData";

export type { UpcomingEvent } from "@/lib/homeData";

type UpcomingEventCardProps = {
  item: UpcomingEvent;
  backgroundImage?: string;
  featured?: boolean;
  favoriteUserId: string | null;
  initialFavorite: boolean;
  index?: number;
};

export default function UpcomingEventCard({
  item,
  backgroundImage,
  featured,
  favoriteUserId,
  initialFavorite,
  index,
}: UpcomingEventCardProps) {
  void backgroundImage;
  const reportCount = Number(item.count.replace(/,/g, ""));
  const reportLabel = reportCount > 0 ? `${item.count}件` : "最初のレポを投稿";
  if (featured) {
    return (
      <div className="group relative h-[108px] overflow-hidden rounded-[16px] border border-[#f0dfe6] bg-white px-3 py-2.5 shadow-[0_6px_18px_rgba(105,63,80,.045)] sm:px-3.5">
        <Link href={`/artists/${item.artistSlug}`} className="zr-focus flex h-full flex-col rounded-xl no-underline">
          <div className="flex min-w-0 items-center gap-2">
            <span className="shrink-0 text-[11px] font-black tabular-nums tracking-[0.18em] text-[#ef4f87]">{String(index ?? 1).padStart(2, "0")}</span>
            <span className="min-w-0 flex-1 truncate pr-10 text-right text-[10px] font-bold text-[#777078] sm:text-[11px]">{item.period}</span>
          </div>
          <div className="mt-1.5 min-w-0">
            <p className="truncate text-[14px] font-black leading-tight tracking-[-0.04em] text-[#40383d] sm:text-[16px]">{item.artist}</p>
            <p className="mt-1 truncate text-[9px] font-bold leading-4 text-[#514a50] sm:text-[10px]">{item.eventName}</p>
          </div>
          <div className="mt-auto flex items-center justify-between gap-2 pt-1.5">
            <span className="min-w-0 flex-1 truncate text-[9px] font-medium text-[#817981]">{item.venue}</span>
            <span className="shrink-0 text-[9px] font-bold text-[#ef4f87]">{reportLabel} →</span>
          </div>
        </Link>
        <FavoriteArtistButton
          artistSlug={item.artistSlug}
          initialUserId={favoriteUserId}
          initialFavorite={initialFavorite}
          className="absolute right-0.5 top-0.5 z-10"
        />
      </div>
    );
  }

  return (
    <div className="group relative rounded-2xl border border-[#f0e3e8] bg-white px-3 shadow-[0_6px_18px_rgba(105,63,80,.035)]">
      <Link
        href={`/artists/${item.artistSlug}`}
        className="zr-focus grid min-h-[92px] w-full grid-cols-[72px_1fr] items-center gap-3 py-3 pr-12 no-underline transition-colors hover:bg-[#fff7fa] sm:grid-cols-[96px_1fr_auto]"
      >
        <div className="border-r border-[#ded8dc] pr-3 text-center sm:pr-5">
          <p className="text-[17px] font-black tabular-nums text-[#1c171b] sm:text-[18px]">{item.date}</p>
          <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.14em] text-[#ef4f87] sm:mt-2">LIVE</p>
        </div>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-black text-[#1c171b] sm:text-[16px]">{item.artist}</p>
          <p className="mt-1 truncate text-[11px] font-medium text-[#665e65]">{item.eventName}</p>
          <p className="mt-1 truncate text-[10px] text-[#948c93] sm:mt-2">{item.venue}</p>
        </div>
        <div className="hidden text-right sm:block">
          {reportCount > 0 ? (
            <>
              <p className="text-[20px] font-black text-[#ef4f87]">{item.count}</p>
              <p className="text-[9px] text-[#938b92]">件のレポ</p>
            </>
          ) : (
            <p className="max-w-[76px] text-[10px] font-black leading-4 text-[#ef4f87]">最初のレポを投稿</p>
          )}
        </div>
      </Link>
      <FavoriteArtistButton
        artistSlug={item.artistSlug}
        initialUserId={favoriteUserId}
        initialFavorite={initialFavorite}
        className="absolute right-1 top-1/2 z-10 -translate-y-1/2"
      />
    </div>
  );
}
