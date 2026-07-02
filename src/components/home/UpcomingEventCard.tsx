import Link from "next/link";

export type UpcomingEvent = {
  id: string;
  artist: string;
  date: string;
  venue: string;
  count: string;
};

export default function UpcomingEventCard({ item }: { item: UpcomingEvent }) {
  return (
    <Link href="/report" className="relative shrink-0 w-[104px] bg-white rounded-2xl border border-gray-100 shadow-sm cursor-pointer active:scale-[0.98] transition-transform p-[10px] block no-underline">
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
