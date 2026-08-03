import Link from "next/link";
import { ArrowRight, ArrowUpRight, MapPinned, Search } from "lucide-react";

export default function HeroBanner() {
  return (
    <section className="relative isolate min-h-[610px] overflow-hidden bg-[#0e0910] text-white sm:min-h-[650px] lg:min-h-[720px]">
      <div className="absolute inset-0 opacity-90" style={{ background: "radial-gradient(circle at 72% 36%, rgba(244,54,121,.38), transparent 19%), radial-gradient(circle at 84% 58%, rgba(119,72,236,.28), transparent 25%), linear-gradient(128deg, #0d0910 6%, #201020 52%, #08070b 100%)" }} />
      <div className="absolute -top-20 left-[54%] h-[540px] w-[110px] origin-top rotate-[19deg] bg-gradient-to-b from-white/28 via-[#ff4c94]/8 to-transparent blur-2xl" />
      <div className="absolute -top-28 left-[74%] h-[610px] w-[130px] origin-top -rotate-[18deg] bg-gradient-to-b from-[#bca8ff]/25 via-[#ff4c94]/8 to-transparent blur-3xl" />
      <div className="absolute inset-x-0 bottom-0 h-[46%] opacity-60" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,.28) 0 2px, transparent 2.5px)", backgroundSize: "29px 24px", maskImage: "linear-gradient(to top, black, transparent)" }} />

      <div className="zr-container relative flex min-h-[610px] flex-col justify-between py-12 sm:min-h-[650px] sm:py-16 lg:min-h-[720px] lg:py-20">
        <div className="flex items-center gap-3 text-[10px] font-bold tracking-[0.24em] text-white/52 sm:text-[11px]">
          <span className="h-px w-10 bg-[#f43679]" />
          LIVE REPORT / SEAT MAP / VENUE
        </div>

        <div className="grid items-end gap-10 lg:grid-cols-[1fr_380px]">
          <div>
            <h1 className="text-[clamp(42px,7.2vw,98px)] font-black leading-[1.04] tracking-[-0.055em]">
              <span className="block">その席の景色を、</span>
              <span className="block text-[#ff4f8e]">次の誰かへ。</span>
            </h1>
            <p className="mt-7 max-w-[650px] text-[14px] font-medium leading-7 text-white/66 sm:text-[16px] sm:leading-8">
              ライブの当落、会場の座席表、ステージの見え方。<br />
              ファンの実体験を集めて、次のライブをもっと楽しみにする場所です。
            </p>
          </div>

          <div className="border-t border-white/18 pt-5 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
            <Link href="/search" className="zr-focus group flex min-h-16 items-center gap-4 border-b border-white/18 py-4 text-[14px] font-bold">
              <Search size={20} className="text-[#ff4f8e]" />
              <span className="flex-1">アーティスト・会場・座席表を探す</span>
              <ArrowRight size={19} className="transition-transform group-hover:translate-x-1" />
            </Link>
            <Link href="/report" className="zr-focus group flex min-h-16 items-center gap-4 border-b border-white/18 py-4 text-[14px] font-bold">
              <ArrowUpRight size={20} className="text-[#ff4f8e]" />
              <span className="flex-1">ライブの記録を投稿する</span>
              <ArrowRight size={19} className="transition-transform group-hover:translate-x-1" />
            </Link>
            <Link href="/venues" className="zr-focus group flex min-h-16 items-center gap-4 border-b border-white/18 py-4 text-[14px] font-bold">
              <MapPinned size={20} className="text-[#ff4f8e]" />
              <span className="flex-1">会場から公演を探す</span>
              <ArrowRight size={19} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
