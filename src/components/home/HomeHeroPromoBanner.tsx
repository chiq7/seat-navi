import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";

export default function HomeHeroPromoBanner() {
  return (
    <Link
      href="/news/how-to-use-tixrepo"
      data-monetization-slot="home-first-view"
      aria-label="はじめてのちけレポを見る"
      className="zr-focus group relative flex min-h-[116px] overflow-hidden rounded-[22px] bg-[linear-gradient(120deg,#ef4f87_0%,#f779a3_52%,#b69cea_100%)] p-4 text-white shadow-[0_18px_42px_rgba(198,75,126,.22)] transition hover:-translate-y-0.5 sm:min-h-[170px] sm:rounded-[28px] sm:p-6 lg:min-h-[240px] lg:p-7"
    >
      <span className="absolute -right-10 -top-14 h-40 w-40 rounded-full border-[28px] border-white/15" aria-hidden="true" />
      <span className="absolute -bottom-16 right-16 h-36 w-36 rounded-full bg-white/10 blur-xl" aria-hidden="true" />

      <span className="relative flex w-full items-end justify-between gap-4">
        <span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/18 px-2.5 py-1.5 text-[9px] font-black tracking-[0.14em]">
            <Sparkles size={12} aria-hidden="true" /> TIXREPO GUIDE
          </span>
          <span className="mt-3 block text-[18px] font-black leading-tight tracking-[-0.04em] sm:text-[25px] lg:text-[30px]">
            はじめての<br className="lg:hidden" />ちけレポ
          </span>
          <span className="mt-1 block text-[10px] font-bold text-white/85 sm:text-[12px]">
            使い方を1分でチェック
          </span>
        </span>
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-[#df3f76] transition-transform group-hover:translate-x-1 group-hover:-translate-y-1 sm:size-12">
          <ArrowUpRight size={19} aria-hidden="true" />
        </span>
      </span>
    </Link>
  );
}
