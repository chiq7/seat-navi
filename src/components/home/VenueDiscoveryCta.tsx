import Link from "next/link";
import { ArrowUpRight, MapPinned } from "lucide-react";

export default function VenueDiscoveryCta() {
  return (
    <Link
      href="/venues"
      className="zr-focus group flex min-h-[166px] flex-col justify-start rounded-[22px] bg-[#edf0ff] p-4 transition hover:-translate-y-1 sm:min-h-[214px] sm:justify-between sm:rounded-[28px] sm:p-8"
      aria-labelledby="venue-discovery-title"
    >
      <div className="flex items-start justify-between gap-4">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/70 text-[#6176d7]">
          <MapPinned size={21} aria-hidden="true" />
        </span>
        <ArrowUpRight size={23} strokeWidth={2} className="shrink-0 text-[#6176d7] transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" />
      </div>
      <div className="mt-2 sm:mt-0">
        <p className="text-[10px] font-black tracking-[0.16em] text-[#6176d7]">VENUE &amp; SEAT MAP</p>
        <h2 id="venue-discovery-title" className="mt-2 text-[17px] font-black leading-[1.25] tracking-[-0.05em] text-[#4b4c64] sm:text-[30px]">
          会場・座席表から探す
        </h2>
        <p className="mt-3 hidden max-w-[640px] text-[12px] font-bold leading-6 text-[#65708a] sm:block sm:text-[13px]">
          東京ドーム、Kアリーナ横浜など、会場ごとの公演・座席情報を見る
        </p>
      </div>
    </Link>
  );
}
