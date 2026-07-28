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
};

export default function UpcomingEventCard({
  item,
  backgroundImage,
  featured,
  favoriteUserId,
  initialFavorite,
}: UpcomingEventCardProps) {
  if (featured && backgroundImage) {
    return (
      <div className="relative h-[132px] w-[150px] shrink-0">
        <Link href={`/artists/${item.artistSlug}`} className="block h-full w-full overflow-hidden rounded-[16px] bg-white shadow-sm no-underline">
          <div className="relative h-[76px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={backgroundImage}
            alt={item.artist}
            className="h-full w-full object-cover"
            style={{ objectPosition: "center 100%" }}
          />
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.3) 60%, rgba(255,255,255,1) 100%)",
            }}
          />
          <p
            className="absolute left-0 right-0 m-0 text-center text-[14px] font-bold text-white"
            style={{ bottom: "49px", textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}
          >
            {item.artist}
          </p>
          <p
            className="absolute left-0 right-0 m-0 overflow-hidden text-ellipsis whitespace-nowrap text-center text-[10px] font-normal text-white"
            style={{ bottom: "31px", padding: "0 6px", textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}
          >
            {item.venue}
          </p>
          <p
            className="absolute left-0 right-0 m-0 overflow-hidden text-ellipsis whitespace-nowrap px-[6px] text-center text-[10px] font-bold text-white"
            style={{ bottom: "14px", textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}
          >
            {item.eventName}
          </p>
          </div>
          <div className="box-border flex h-[56px] flex-col" style={{ padding: "2px 8px 5px" }}>
            <p className="m-0 mt-[3px] text-center text-[10px] font-bold leading-none text-[#555]">
              {item.period}
            </p>
            <span className="mt-[7px] block w-full rounded-[16px] bg-[#FF6B9D] py-[4px] text-center text-[9px] font-bold text-white">
              公演を見る
            </span>
          </div>
        </Link>
        <FavoriteArtistButton
          artistSlug={item.artistSlug}
          initialUserId={favoriteUserId}
          initialFavorite={initialFavorite}
          className="absolute right-1 top-1 z-10"
        />
      </div>
    );
  }

  return (
    <div className="relative w-[120px] shrink-0">
      <Link
        href={`/artists/${item.artistSlug}`}
        className="block w-full rounded-xl border border-gray-100 bg-white p-3 shadow-sm no-underline transition-transform active:scale-[0.98]"
        style={
          backgroundImage
            ? {
                backgroundImage: `url('${backgroundImage}')`,
                backgroundPosition: "center bottom",
                backgroundSize: "cover",
              }
            : undefined
        }
      >
        <p className="mb-[4px] mt-[4px] pr-7 text-[10px] font-bold leading-none text-gray-500">{item.date}</p>
        <p className="mb-[2px] mt-[4px] truncate text-[15px] font-bold text-gray-900">{item.artist}</p>
        <p className="mb-[2px] truncate text-[9px] text-gray-400">{item.venue}</p>
        <div className="flex items-baseline gap-0.5">
          <span className="mr-[2px] text-[9px] text-gray-400">報告数</span>
          <span className="text-[13px] font-bold text-[#FF6B9D]">{item.count}</span>
          <span className="text-[9px] text-gray-400">件</span>
        </div>
      </Link>
      <FavoriteArtistButton
        artistSlug={item.artistSlug}
        initialUserId={favoriteUserId}
        initialFavorite={initialFavorite}
        className="absolute right-1.5 top-1.5 z-10"
      />
    </div>
  );
}
