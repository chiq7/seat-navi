"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CalendarDays, ChevronLeft, MapPin } from "lucide-react";
import { rateText } from "@/lib/artistPageHelpers";
import { ShareButton } from "@/components/common/ShareButton";
import { AccountLink } from "@/components/auth/AccountLink";
import { DEFAULT_ARTIST_HERO_IMAGE, resolveArtistHeroImage } from "@/lib/artistPageData";

type Props = {
  artistName: string;
  slug: string;
  heroImage?: string | null;
  tourTitle: string;
  isTestData?: boolean;
  dateRange: string | null;
  ticketRate: number | null;
  normalArenaRate: number | null;
  upgradeRate: number | null;
  nextEvent: { date: string; venue: string } | null;
  countdownDays: number | null;
};

function fmtDateLabel(d: string): string {
  const [y, m, day] = d.split("-").map(Number);
  const w = ["日", "月", "火", "水", "木", "金", "土"][new Date(y, m - 1, day).getDay()];
  return `${String(m).padStart(2, "0")}.${String(day).padStart(2, "0")}（${w}）`;
}

export default function HeroSection({
  artistName,
  slug,
  heroImage,
  tourTitle,
  isTestData = false,
  ticketRate,
  normalArenaRate,
  upgradeRate,
  nextEvent,
  countdownDays,
}: Props) {
  const configuredHeroImage = resolveArtistHeroImage(heroImage);
  const [heroImageSrc, setHeroImageSrc] = useState(configuredHeroImage);

  const summaryMetrics = [
    { label: "チケット当選率", value: rateText(ticketRate) },
    { label: "通常アリーナ率", value: rateText(normalArenaRate) },
    { label: "アプグレ当選率", value: rateText(upgradeRate) },
  ];

  return (
    <section className="relative min-h-[570px] w-full overflow-hidden bg-[#0d090d] text-white sm:min-h-[620px] lg:min-h-[670px]">
      <Image
        src={heroImageSrc}
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover"
        style={{ objectPosition: "center 18%" }}
        onError={() => {
          if (heroImageSrc !== DEFAULT_ARTIST_HERO_IMAGE) setHeroImageSrc(DEFAULT_ARTIST_HERO_IMAGE);
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/5 to-[#0d090d]" />
      <div className="absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-[#0d090d] via-[#0d090d]/88 to-transparent" />
      <div className="relative z-10 min-h-[570px] sm:min-h-[620px] lg:min-h-[670px]">
        <header className="zr-container flex h-16 items-center justify-between sm:h-[72px]">
          <Link
            href="/"
            aria-label="TOPへ戻る"
            className="zr-focus flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-black/20 text-white backdrop-blur-md"
          >
            <ChevronLeft size={26} strokeWidth={2.7} />
          </Link>
          <div className="ml-auto flex items-center justify-end gap-1">
            <AccountLink tone="light" iconSize={22} />
            <ShareButton
              url={`${typeof window !== "undefined" ? window.location.origin : ""}/artists/${slug}`}
              text={`${artistName} の当落データ・座席情報 #ちけレポ`}
              className="flex h-10 w-10 items-center justify-center rounded-full text-white transition-colors active:bg-white/15"
            />
          </div>
        </header>

        <div className="zr-container absolute inset-x-0 bottom-0 pb-7 sm:pb-10">
          <p className="text-[10px] font-black tracking-[0.24em] text-[#ff5b96]">ARTIST LIVE ARCHIVE</p>
          <h1 className="mt-3 text-[44px] font-black leading-none tracking-[-0.055em] text-white sm:text-[64px] lg:text-[82px]">{artistName}</h1>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <p className="max-w-[680px] text-[14px] font-bold leading-6 text-white/82 sm:text-[17px]">
              {nextEvent ? (tourTitle || artistName) : "次回公演 発表待ち"}
            </p>
            {nextEvent && isTestData && <span className="rounded-full border border-white/35 px-2 py-1 text-[9px] font-bold text-white/72">テストデータ</span>}
          </div>

          <div className="mt-6 grid border-y border-white/20 sm:grid-cols-[1.35fr_.65fr]">
            <div className="flex min-w-0 items-center gap-4 py-4 sm:border-r sm:border-white/20 sm:pr-5">
              {nextEvent ? (
                <>
                  <CalendarDays size={18} className="shrink-0 text-[#ff5b96]" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-white/52">{fmtDateLabel(nextEvent.date)}</p>
                    <p className="mt-1 flex items-center gap-1.5 truncate text-[14px] font-bold"><MapPin size={13} className="shrink-0" />{nextEvent.venue}</p>
                  </div>
                </>
              ) : <p className="py-1 text-[13px] font-bold text-white/62">次回公演の発表を待っています</p>}
            </div>
            <div className="flex items-end justify-between border-t border-white/20 py-4 sm:border-t-0 sm:pl-5">
              <span className="text-[10px] font-bold tracking-[0.12em] text-white/48">NEXT LIVE</span>
              <p className="font-black leading-none text-[#ff5b96]"><span className="text-[34px]">{countdownDays ?? "--"}</span><span className="ml-1 text-[10px] tracking-[0.12em]">DAYS</span></p>
            </div>
          </div>

          <div className="grid grid-cols-3 pt-5">
            {summaryMetrics.map((metric, index) => (
              <div
                key={metric.label}
                className={`min-w-0 px-2 text-left ${index > 0 ? "border-l border-white/16" : ""}`}
              >
                <p className="truncate text-[9px] font-bold text-white/46 sm:text-[11px]">{metric.label}</p>
                <p className="mt-2 text-[24px] font-black leading-none text-white sm:text-[30px]">
                  {metric.value === "--" ? "--" : <>{metric.value}<span className="ml-0.5 text-[12px] text-[#ff5b96]">%</span></>}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
