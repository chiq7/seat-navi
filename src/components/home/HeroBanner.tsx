import Link from "next/link";
import { ArrowRight, Heart, MessageCircle, Search } from "lucide-react";
import HomeHeroPromoBanner from "@/components/home/HomeHeroPromoBanner";

export default function HeroBanner() {
  return (
    <section className="relative isolate overflow-hidden bg-[#fff0f6] text-[#2b252b]">
      <div className="absolute -right-28 -top-28 h-80 w-80 rounded-full bg-[#ff9fc1]/45 blur-3xl" />
      <div className="absolute -bottom-36 left-[18%] h-72 w-72 rounded-full bg-[#d8cbff]/35 blur-3xl" />
      <div className="zr-container relative grid gap-5 py-6 sm:gap-8 sm:py-12 lg:grid-cols-[1.08fr_.92fr] lg:items-center lg:py-16">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-2 text-[10px] font-black tracking-[0.12em] text-[#d83d72] shadow-sm">
            <Heart size={14} fill="currentColor" aria-hidden="true" /> FAN COMMUNITY
          </p>
          <h1 className="mt-4 text-[25px] font-black leading-[1.12] tracking-[-0.06em] sm:mt-5 sm:text-[46px] lg:text-[48px] xl:text-[52px]">
            <span className="block whitespace-nowrap">当落・座席予想・現地レポ。</span>
            <span className="mt-1 block whitespace-nowrap text-[#ed4a83]">すべてがここに集まる。</span>
          </h1>
          <div className="mt-5 grid grid-cols-2 gap-2.5 sm:mt-7 sm:flex sm:flex-wrap sm:gap-3">
            <Link href="/search" className="zr-focus inline-flex min-h-12 items-center justify-center gap-1.5 rounded-full bg-[#ef4f87] px-3 text-[11px] font-black text-white shadow-[0_10px_24px_rgba(239,79,135,.24)] transition hover:bg-[#db3e73] sm:gap-2 sm:px-5 sm:text-[13px]">
              <Search size={16} /> 推しを探す <ArrowRight size={14} />
            </Link>
            <Link href="/report" className="zr-focus inline-flex min-h-12 items-center justify-center gap-1.5 rounded-full bg-white px-3 text-[11px] font-black text-[#6b5561] shadow-sm transition hover:bg-[#fffafd] sm:gap-2 sm:px-5 sm:text-[13px]">
              <MessageCircle size={16} className="text-[#ef4f87]" /> レポを投稿
            </Link>
          </div>
        </div>

        <HomeHeroPromoBanner />
      </div>
    </section>
  );
}
