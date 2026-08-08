import Link from "next/link";
import { ArrowUpRight, MapPinned } from "lucide-react";

export default function VenueDiscoveryCta() {
  return (
    <Link
      href="/venues"
      className="zr-focus group flex min-h-[214px] flex-col justify-between rounded-[28px] bg-[#edf0ff] p-6 transition hover:-translate-y-1 sm:p-8"
      aria-labelledby="venue-discovery-title"
    >
      <div className="flex items-start justify-between gap-4">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/70 text-[#6176d7]">
          <MapPinned size={21} aria-hidden="true" />
        </span>
        <ArrowUpRight size={23} strokeWidth={2} className="shrink-0 text-[#6176d7] transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" />
      </div>
      <div>
        <p className="text-[10px] font-black tracking-[0.16em] text-[#6176d7]">VENUE &amp; SEAT MAP</p>
        <h2 id="venue-discovery-title" className="mt-2 text-[25px] font-black leading-[1.2] tracking-[-0.05em] text-[#2b3046] sm:text-[30px]">
          会場・座席表から探す
        </h2>
        <p className="mt-3 max-w-[640px] text-[12px] font-bold leading-6 text-[#65708a] sm:text-[13px]">
          東京ドーム、Kアリーナ横浜など、会場ごとの公演・座席情報を見る
        </p>
      </div>
    </Link>
  );
}
