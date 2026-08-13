"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Sparkles } from "lucide-react";

const slides = [
  {
    href: "/news/how-to-use-tixrepo",
    ariaLabel: "はじめてのちけレポを見る",
    eyebrow: "TIXREPO GUIDE",
    title: "はじめての\nちけレポ",
    description: "使い方を1分でチェック",
    background: "bg-[linear-gradient(120deg,#ef4f87_0%,#f779a3_52%,#b69cea_100%)]",
  },
  {
    href: "/artists/seventeen",
    ariaLabel: "SEVENTEENのライブ情報を見る",
    eyebrow: "FEATURED ARTIST",
    title: "SEVENTEEN",
    description: "当落・座席・現地レポ",
    background: "bg-[linear-gradient(120deg,#6e63cb_0%,#8d82dd_48%,#ef79a6_100%)]",
  },
  {
    href: "/artists/yoasobi",
    ariaLabel: "YOASOBIのライブ情報を見る",
    eyebrow: "FEATURED ARTIST",
    title: "YOASOBI",
    description: "公演・座席情報をまとめて見る",
    background: "bg-[linear-gradient(120deg,#ef5f87_0%,#f08b72_52%,#c190df_100%)]",
  },
] as const;

export default function HomeHeroPromoBanner() {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // ファーストビューにある2組は、TOPを開いた時点で遷移先を温める。
  // アーティストTOPは表示情報が多いため、タップ後に初めてルートを取りに行くと
  // 主要導線が遅れて見える。表示済みのバナーだけを対象にして通信量は増やしすぎない。
  useEffect(() => {
    router.prefetch("/artists/seventeen");
    router.prefetch("/artists/yoasobi");
  }, [router]);

  function handleScroll() {
    const element = scrollRef.current;
    if (!element || element.clientWidth === 0) return;
    setActiveIndex(Math.round(element.scrollLeft / element.clientWidth));
  }

  function showSlide(index: number) {
    const element = scrollRef.current;
    if (!element) return;
    element.scrollTo({ left: element.clientWidth * index, behavior: "smooth" });
  }

  return (
    <div
      data-monetization-slot="home-first-view"
      role="region"
      aria-label="注目バナー"
      className="relative min-h-[142px] overflow-hidden rounded-[22px] shadow-[0_16px_36px_rgba(198,75,126,.18)] sm:min-h-[172px] sm:rounded-[26px] lg:min-h-[190px]"
    >
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="hide-scrollbar flex min-h-[142px] snap-x snap-mandatory overflow-x-auto sm:min-h-[172px] lg:min-h-[190px]"
      >
        {slides.map((slide) => (
          <Link
            key={slide.href}
            href={slide.href}
            aria-label={slide.ariaLabel}
            className={`zr-focus group relative flex w-full shrink-0 snap-center p-5 text-white transition sm:p-6 lg:p-7 ${slide.background}`}
          >
            <span className="absolute -right-10 -top-14 h-40 w-40 rounded-full border-[28px] border-white/15" aria-hidden="true" />
            <span className="absolute -bottom-16 right-16 h-36 w-36 rounded-full bg-white/10 blur-xl" aria-hidden="true" />

            <span className="relative flex w-full items-end justify-between gap-4">
              <span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/18 px-2.5 py-1.5 text-[9px] font-black tracking-[0.14em]">
                  <Sparkles size={12} aria-hidden="true" /> {slide.eyebrow}
                </span>
                <span className="mt-2 block whitespace-pre-line text-[20px] font-black leading-tight tracking-[-0.04em] sm:text-[25px] lg:text-[29px]">
                  {slide.title}
                </span>
                <span className="mt-1 block text-[11px] font-bold text-white/85 sm:text-[13px]">
                  {slide.description}
                </span>
              </span>
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-white text-[#df3f76] transition-transform group-hover:translate-x-1 group-hover:-translate-y-1 sm:size-14">
                <ArrowUpRight size={22} aria-hidden="true" />
              </span>
            </span>
          </Link>
        ))}
      </div>

      <div className="absolute right-3 top-3 z-10 flex rounded-full bg-white/20 p-1 backdrop-blur-sm" aria-label="バナー切り替え">
        {slides.map((slide, index) => (
          <button
            key={slide.href}
            type="button"
            onClick={() => showSlide(index)}
            aria-label={`${index + 1}枚目のバナーを表示`}
            aria-current={activeIndex === index ? "true" : undefined}
            className="zr-focus grid size-7 place-items-center rounded-full"
          >
            <span className={`block h-1.5 rounded-full transition-all ${activeIndex === index ? "w-4 bg-white" : "w-1.5 bg-white/55"}`} />
          </button>
        ))}
      </div>
    </div>
  );
}
