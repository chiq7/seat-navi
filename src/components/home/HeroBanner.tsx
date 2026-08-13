import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MessageCircle, Search } from "lucide-react";
import HomeHeroPromoBanner from "@/components/home/HomeHeroPromoBanner";

export default function HeroBanner() {
  return (
    <>
      <section className="relative isolate min-h-[390px] overflow-hidden bg-[#070b1c] text-white sm:min-h-[480px] lg:min-h-[540px]">
        <Image
          src="/images/hero/home-community-v2.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-[68%_center] sm:object-[64%_center] lg:object-center"
        />
        <div
          className="absolute inset-0 bg-[linear-gradient(90deg,rgba(4,8,25,.96)_0%,rgba(4,8,25,.88)_34%,rgba(4,8,25,.42)_58%,rgba(4,8,25,.08)_100%)] max-lg:bg-[linear-gradient(90deg,rgba(4,8,25,.94)_0%,rgba(4,8,25,.78)_55%,rgba(4,8,25,.34)_100%)]"
          aria-hidden="true"
        />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#070b1c] to-transparent" aria-hidden="true" />

        <div className="zr-container relative flex min-h-[390px] items-center py-10 sm:min-h-[480px] sm:py-14 lg:min-h-[540px] lg:py-16">
          <div className="max-w-[620px]">
            <p className="mb-4 text-[10px] font-black tracking-[0.22em] text-[#ff78aa] sm:text-xs">LIVE TICKET COMMUNITY</p>
            <h1 className="text-[25px] font-black leading-[1.12] tracking-[-0.055em] text-white sm:text-[46px] lg:text-[50px] xl:text-[54px]">
              <span className="block whitespace-nowrap">当落・座席予想・現地レポ。</span>
              <span className="mt-1 block whitespace-nowrap text-[#ff6fa6]">すべてがここに集まる。</span>
            </h1>
            <div className="mt-6 grid grid-cols-2 gap-2.5 sm:mt-8 sm:flex sm:flex-wrap sm:gap-3">
              <Link href="/search" className="zr-focus inline-flex min-h-12 items-center justify-center gap-1.5 rounded-full bg-[#ef4f87] px-3 text-[11px] font-black text-white shadow-[0_12px_30px_rgba(239,79,135,.34)] transition hover:bg-[#db3e73] sm:gap-2 sm:px-5 sm:text-[13px]">
                <Search size={16} /> 推しを探す <ArrowRight size={14} />
              </Link>
              <Link href="/report" className="zr-focus inline-flex min-h-12 items-center justify-center gap-1.5 rounded-full border border-white/35 bg-white/92 px-3 text-[11px] font-black text-[#4f3440] shadow-sm backdrop-blur-sm transition hover:bg-white sm:gap-2 sm:px-5 sm:text-[13px]">
                <MessageCircle size={16} className="text-[#ef4f87]" /> レポを投稿
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#fff8fb] py-4 sm:py-6" aria-label="ちけレポのおすすめ">
        <div className="zr-container max-w-[920px]">
          <HomeHeroPromoBanner />
        </div>
      </section>
    </>
  );
}
