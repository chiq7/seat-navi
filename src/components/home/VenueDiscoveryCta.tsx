import Link from "next/link";
import { ArrowUpRight, Building2, MapPinned } from "lucide-react";

export default function VenueDiscoveryCta() {
  return (
    <section className="zr-container py-8 sm:py-10" aria-labelledby="venue-discovery-title">
      <Link
        href="/venues"
        className="zr-focus group relative block overflow-hidden border border-[#ded8dc] bg-white px-5 py-6 transition-colors hover:bg-[#fff0f5] sm:px-8 sm:py-8"
      >
        <div className="absolute -right-9 -top-8 text-[#f43679]/[0.08]">
          <Building2 size={170} strokeWidth={1} />
        </div>
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black tracking-[0.22em] text-[#f43679]">VENUE GUIDE</p>
            <h2 id="venue-discovery-title" className="mt-3 text-[26px] font-black leading-[1.14] tracking-[-0.05em] sm:text-[34px]">
              ライブ会場一覧・<br />座席表から探す
            </h2>
          </div>
          <ArrowUpRight size={25} strokeWidth={2.2} className="mt-1 shrink-0 text-[#f43679] transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" />
        </div>
        <div className="relative mt-6 flex items-center gap-2 text-[12px] font-bold leading-5 text-[#5d555b] sm:text-[13px]">
          <MapPinned size={16} className="shrink-0 text-[#f43679]" />
          東京ドーム、Kアリーナ横浜など、ライブ会場ごとの公演・座席表をまとめて見る
        </div>
      </Link>
    </section>
  );
}
