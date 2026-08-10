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
  if (featured) {
    return (
      <div className="group relative min-h-[132px] rounded-[18px] border border-[#f0dfe6] bg-white px-3 py-3 shadow-[0_8px_22px_rgba(105,63,80,.05)] sm:min-h-[146px] sm:px-4 sm:py-4">
        <Link href={`/artists/${item.artistSlug}`} className="zr-focus flex h-full flex-col rounded-xl no-underline">
          <div className="flex min-w-0 items-center gap-2">
            <span className="shrink-0 text-[11px] font-black tabular-nums tracking-[0.18em] text-[#ef4f87]">{String(index ?? 1).padStart(2, "0")}</span>
            <span className="min-w-0 flex-1 truncate pr-10 text-right text-[10px] font-bold text-[#777078] sm:text-[11px]">{item.period}</span>
          </div>
          <div className="mt-2.5 min-w-0 sm:mt-3">
            <p className="truncate text-[15px] font-black leading-tight tracking-[-0.04em] text-[#40383d] sm:text-[18px]">{item.artist}</p>
            <p className="mt-1 truncate text-[10px] font-bold leading-4 text-[#514a50] sm:text-[11px]">{item.eventName}</p>
            <p className="mt-1 truncate text-[9px] text-[#817981] sm:text-[10px]">{item.venue}</p>
          </div>
          <div className="mt-auto flex items-end justify-between gap-2 pt-2.5 sm:pt-3">
            <span className="truncate text-[9px] font-bold text-[#ef4f87] sm:text-[10px]">公演を見る →</span>
            <span className="shrink-0 text-[9px] text-[#938b92]">{item.count} reports</span>
          </div>
        </Link>
        <FavoriteArtistButton
          artistSlug={item.artistSlug}
          initialUserId={favoriteUserId}
          initialFavorite={initialFavorite}
          className="absolute right-1 top-2 z-10 sm:right-3 sm:top-3"
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
          <p className="text-[20px] font-black text-[#ef4f87]">{item.count}</p>
          <p className="text-[9px] text-[#938b92]">REPORTS</p>
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
