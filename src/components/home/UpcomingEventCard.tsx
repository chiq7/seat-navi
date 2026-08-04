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
      <div className="group relative min-h-[200px] border-b border-r border-[#d8d1d6] px-3 py-4 sm:min-h-[220px] sm:px-5 sm:py-5 lg:last:border-r-0">
        <Link href={`/artists/${item.artistSlug}`} className="zr-focus flex h-full flex-col rounded-sm no-underline">
          <div className="flex items-start justify-between gap-4">
            <span className="text-[11px] font-black tabular-nums tracking-[0.18em] text-[#f43679]">{String(index ?? 1).padStart(2, "0")}</span>
            <span className="pr-9 text-[11px] font-bold text-[#777078]">{item.period}</span>
          </div>
          <div className="mt-4 sm:mt-6">
            <p className="text-[18px] font-black leading-tight tracking-[-0.04em] text-[#1c171b] sm:text-[22px]">{item.artist}</p>
            <p className="mt-2 line-clamp-2 text-[12px] font-bold leading-5 text-[#514a50]">{item.eventName}</p>
            <p className="mt-3 text-[11px] text-[#817981]">{item.venue}</p>
          </div>
          <div className="mt-auto flex flex-col items-start gap-1 pt-4 sm:flex-row sm:items-end sm:justify-between sm:pt-7">
            <span className="text-[10px] font-bold text-[#f43679] sm:text-[11px]">公演・座席表を見る →</span>
            <span className="text-[10px] text-[#938b92]">{item.count} reports</span>
          </div>
        </Link>
        <FavoriteArtistButton
          artistSlug={item.artistSlug}
          initialUserId={favoriteUserId}
          initialFavorite={initialFavorite}
          className="absolute right-1 top-5 z-10 sm:right-4"
        />
      </div>
    );
  }

  return (
    <div className="group relative border-b border-[#ded8dc]">
      <Link
        href={`/artists/${item.artistSlug}`}
        className="zr-focus grid min-h-[92px] w-full grid-cols-[72px_1fr] items-center gap-3 py-3 pr-12 no-underline transition-colors hover:bg-[#fff7fa] sm:grid-cols-[96px_1fr_auto]"
      >
        <div className="border-r border-[#ded8dc] pr-3 text-center sm:pr-5">
          <p className="text-[17px] font-black tabular-nums text-[#1c171b] sm:text-[18px]">{item.date}</p>
          <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.14em] text-[#f43679] sm:mt-2">LIVE</p>
        </div>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-black text-[#1c171b] sm:text-[16px]">{item.artist}</p>
          <p className="mt-1 truncate text-[11px] font-medium text-[#665e65]">{item.eventName}</p>
          <p className="mt-1 truncate text-[10px] text-[#948c93] sm:mt-2">{item.venue}</p>
        </div>
        <div className="hidden text-right sm:block">
          <p className="text-[20px] font-black text-[#f43679]">{item.count}</p>
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
