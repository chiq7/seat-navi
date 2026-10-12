import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MapPin, Search } from "lucide-react";

export default function HeroBanner() {
  return (
    <>
      <section className="relative isolate overflow-hidden bg-[#070b1c] text-white">
        <Image
          src="/images/hero/home-idol-live-v3.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-[72%_center] sm:object-[68%_center] lg:object-center"
        />
        <div
          className="absolute inset-0 bg-[linear-gradient(90deg,rgba(4,8,25,.98)_0%,rgba(4,8,25,.88)_36%,rgba(4,8,25,.34)_64%,rgba(4,8,25,.04)_100%)] max-lg:bg-[linear-gradient(90deg,rgba(4,8,25,.96)_0%,rgba(4,8,25,.82)_52%,rgba(4,8,25,.38)_100%)]"
          aria-hidden="true"
        />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#070b1c]/70 to-transparent" aria-hidden="true" />

        <div className="zr-container relative flex items-center py-6 sm:py-9 lg:py-10">
          <div className="max-w-[620px]">
            <h1 className="text-[26px] font-black leading-[1.3] tracking-[-0.04em] text-white sm:text-[40px] lg:text-[46px]">
              <span className="block">みんなの座席から、</span>
              <span className="block text-[#ff6fa6]">ステージ配置を予想。</span>
            </h1>
            <p className="mt-2 text-[13px] font-medium text-white/90">当選率・席からの写真も見られる</p>
            <div className="mt-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
              <Link href="/search" className="zr-focus inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#ef4f87] px-4 text-[14px] font-bold text-white transition hover:bg-[#db3e73]">
                <Search size={18} aria-hidden="true" /> アーティストから探す <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <Link href="/venues" className="zr-focus inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-3 text-[13px] font-bold text-white hover:bg-white/10">
                <MapPin size={16} aria-hidden="true" /> 会場・座席表から探す <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>

    </>
  );
}
