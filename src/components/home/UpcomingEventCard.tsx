import Link from "next/link";
import type { UpcomingEvent } from "@/lib/homeData";

export type { UpcomingEvent } from "@/lib/homeData";

type UpcomingEventCardProps = {
  item: UpcomingEvent;
  backgroundImage?: string;
  featured?: boolean;
};

export default function UpcomingEventCard({ item, backgroundImage, featured }: UpcomingEventCardProps) {
  if (featured && backgroundImage) {
    return (
      <Link href={`/artists/${item.artistSlug}`} className="block h-[132px] w-[135px] shrink-0 overflow-hidden rounded-[16px] bg-white shadow-sm no-underline">
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
          <span className="absolute right-[3px] top-[3px] flex h-[20px] w-[20px] items-center justify-center rounded-full bg-white">
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#FF6B9D" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </span>
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
            className="absolute left-0 right-0 m-0 text-center text-[10px] font-bold text-white"
            style={{ bottom: "14px", textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}
          >
            {item.date}
          </p>
        </div>
        <div className="box-border flex h-[56px] flex-col" style={{ padding: "2px 8px 5px" }}>
          <p className="m-0 mt-[3px] text-center text-[10px] font-bold leading-none text-[#555]">
            直近の注目公演
          </p>
          <span className="mt-[7px] block w-full rounded-[16px] bg-[#FF6B9D] py-[4px] text-center text-[9px] font-bold text-white">
            公演を見る
          </span>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/artists/${item.artistSlug}`}
      className="relative block w-[104px] shrink-0 rounded-xl border border-gray-100 bg-white p-3 shadow-sm no-underline transition-transform active:scale-[0.98]"
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
      <button
        type="button"
        className="absolute top-[8px] right-[8px] w-[20px] h-[20px] min-w-[20px] rounded-full bg-white border border-[#eee] flex items-center justify-center p-0 cursor-pointer"
      >
        <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="#FF6B9D" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      </button>

      <p className="text-[10px] font-bold text-gray-500 leading-none mt-[4px] mb-[4px]">{item.date}</p>
      <p className="text-[15px] font-bold text-gray-900 truncate mb-[2px] mt-[4px]">{item.artist}</p>
      <p className="text-[9px] text-gray-400 truncate mb-[2px]">{item.venue}</p>
      <div className="flex items-baseline gap-0.5">
        <span className="text-[9px] text-gray-400 mr-[2px]">報告数</span>
        <span className="text-[13px] font-bold text-[#FF6B9D]">{item.count}</span>
        <span className="text-[9px] text-gray-400">件</span>
      </div>
    </Link>
  );
}
