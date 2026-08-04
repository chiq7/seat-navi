import Link from "next/link";
import { ArrowRight, BarChart3, Camera, Map, MapPinned, Search } from "lucide-react";

const FEATURES = [
  { label: "当落データ", detail: "当選率・抽選傾向", Icon: BarChart3 },
  { label: "座席表・予想", detail: "座席位置・ステージ構成", Icon: Map },
  { label: "現地レポ", detail: "見え方・演出・写真", Icon: Camera },
];

export default function HeroBanner() {
  return (
    <section className="relative isolate min-h-[540px] overflow-hidden bg-[#0e0910] text-white sm:min-h-[590px] lg:min-h-[650px]">
      <div className="absolute inset-0 opacity-90" style={{ background: "radial-gradient(circle at 72% 36%, rgba(244,54,121,.38), transparent 19%), radial-gradient(circle at 84% 58%, rgba(119,72,236,.28), transparent 25%), linear-gradient(128deg, #0d0910 6%, #201020 52%, #08070b 100%)" }} />
      <div className="absolute -top-20 left-[54%] h-[540px] w-[110px] origin-top rotate-[19deg] bg-gradient-to-b from-white/28 via-[#ff4c94]/8 to-transparent blur-2xl" />
      <div className="absolute -top-28 left-[74%] h-[610px] w-[130px] origin-top -rotate-[18deg] bg-gradient-to-b from-[#bca8ff]/25 via-[#ff4c94]/8 to-transparent blur-3xl" />
      <div className="absolute inset-x-0 bottom-0 h-[46%] opacity-60" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,.28) 0 2px, transparent 2.5px)", backgroundSize: "29px 24px", maskImage: "linear-gradient(to top, black, transparent)" }} />

      <div className="zr-container relative flex min-h-[540px] flex-col justify-between py-9 sm:min-h-[590px] sm:py-12 lg:min-h-[650px] lg:py-16">
        <div className="flex items-center gap-3 text-[10px] font-bold tracking-[0.24em] text-white/52 sm:text-[11px]">
          <span className="h-px w-10 bg-[#f43679]" />
          LIVE REPORT / SEAT MAP / VENUE
        </div>

        <div className="grid items-end gap-7 lg:grid-cols-[1fr_400px] lg:gap-10">
          <div>
            <h1 className="text-[clamp(42px,7.2vw,98px)] font-black leading-[1.04] tracking-[-0.055em]">
              <span className="block">当落・座席・</span>
              <span className="block">現地レポを</span>
              <span className="block text-[#ff4f8e]">まとめて確認。</span>
            </h1>
            <p className="mt-5 max-w-[650px] text-[14px] font-medium leading-6 text-white/66 sm:text-[16px] sm:leading-7">
              公演ごとの当選率、座席表・アリーナ予想、会場での見え方を、<br className="hidden sm:block" />
              ファンの投稿から確認・共有できます。
            </p>
          </div>

          <div className="border-t border-white/18 pt-3 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
            <div className="grid grid-cols-3 border-l border-t border-white/18">
              {FEATURES.map(({ label, detail, Icon }) => (
                <div key={label} className="min-w-0 border-b border-r border-white/18 px-2.5 py-3 sm:px-3">
                  <Icon size={17} strokeWidth={1.9} className="text-[#ff4f8e]" aria-hidden="true" />
                  <p className="mt-3 whitespace-nowrap text-[11px] font-black tracking-[-0.04em] sm:text-[12px]">{label}</p>
                  <p className="mt-1 min-h-7 text-[9px] font-bold leading-3 text-white/48 sm:text-[10px]">{detail}</p>
                </div>
              ))}
            </div>
            <Link href="/search" className="zr-focus group flex min-h-14 items-center gap-4 border-b border-white/18 py-3 text-[14px] font-bold">
              <Search size={20} className="text-[#ff4f8e]" />
              <span className="flex-1">アーティスト・会場・座席表を探す</span>
              <ArrowRight size={19} className="transition-transform group-hover:translate-x-1" />
            </Link>
            <Link href="/venues" className="zr-focus group flex min-h-14 items-center gap-4 border-b border-white/18 py-3 text-[14px] font-bold">
              <MapPinned size={20} className="text-[#ff4f8e]" />
              <span className="flex-1">ライブ会場一覧を見る</span>
              <ArrowRight size={19} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
