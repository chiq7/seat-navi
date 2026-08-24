"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import { rateText } from "@/lib/artistPageHelpers";
import { ShareButton } from "@/components/common/ShareButton";
import { AccountLink } from "@/components/auth/AccountLink";
import FavoriteArtistButton from "@/components/auth/FavoriteArtistButton";
import { Header } from "@/components/common/Header";
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
  const availableSummaryMetrics = summaryMetrics.filter((metric) => metric.value !== "--");
  const heightClass = nextEvent
    ? availableSummaryMetrics.length > 0
      ? "min-h-[420px] sm:min-h-[510px] lg:min-h-[560px]"
      : "min-h-[360px] sm:min-h-[460px] lg:min-h-[510px]"
    : "min-h-[300px] sm:min-h-[400px] lg:min-h-[450px]";

  return (
    <section className={`relative w-full overflow-hidden bg-[#ffeaf2] text-[#2b252b] ${heightClass}`}>
      <Image
        src={heroImageSrc}
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover opacity-85"
        style={{ objectPosition: "center 18%" }}
        onError={() => {
          if (heroImageSrc !== DEFAULT_ARTIST_HERO_IMAGE) setHeroImageSrc(DEFAULT_ARTIST_HERO_IMAGE);
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#652642]/30 via-[#ed76a7]/5 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-[64%] bg-gradient-to-t from-[#ffeaf2] via-[#ffeaf2]/92 to-transparent" />
      <div className={`relative z-10 ${heightClass}`}>
        <Header
          title={artistName}
          backHref="/"
          backLabel="TOPへ戻る"
          rightSlot={
            <div className="flex items-center justify-end">
              <AccountLink iconSize={22} />
              <ShareButton
                url={`${typeof window !== "undefined" ? window.location.origin : ""}/artists/${slug}`}
                text={`${artistName} の当落データ・座席情報 #ちけレポ`}
                className="zr-focus flex h-11 w-11 items-center justify-center rounded-full text-[#665761] transition-colors active:bg-[#fff0f5]"
              />
            </div>
          }
        />

        <div className="zr-container absolute inset-x-0 bottom-0 pb-5 sm:pb-7">
          <div className="max-w-[860px] rounded-[28px] bg-white/88 p-5 shadow-[0_14px_38px_rgba(129,55,83,.14)] backdrop-blur-md sm:p-7">
          <p className="text-[10px] font-black tracking-[0.2em] text-[#e4487b]">FAN&apos;S LIVE NOTE</p>
          <div className="mt-2 flex flex-wrap items-center gap-2.5 sm:gap-4">
            <h1 className="min-w-0 text-[38px] font-black leading-none tracking-[-0.055em] text-[#2b252b] sm:text-[56px] lg:text-[72px]">{artistName}</h1>
            <FavoriteArtistButton artistSlug={slug} showLabel className="bg-white/95" />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <p className="max-w-[680px] text-[14px] font-bold leading-6 text-[#594651] sm:text-[17px]">
              {nextEvent ? (tourTitle || artistName) : "次回公演 発表待ち"}
            </p>
            {nextEvent && isTestData && <span className="rounded-full bg-[#f7e9ef] px-2 py-1 text-[9px] font-bold text-[#9b6179]">テストデータ</span>}
          </div>

          {nextEvent ? (
          <div className="mt-5 grid rounded-2xl bg-[#fff4f8] px-4 sm:grid-cols-[1.35fr_.65fr] sm:px-5">
            <div className="flex min-w-0 items-center gap-4 py-3 sm:border-r sm:border-[#f1dce5] sm:pr-5">
              <CalendarDays size={18} className="shrink-0 text-[#ec4f84]" />
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-[#9b7284]">{fmtDateLabel(nextEvent.date)}</p>
                <p className="mt-1 flex items-center gap-1.5 truncate text-[14px] font-bold text-[#443740]"><MapPin size={13} className="shrink-0 text-[#df6790]" />{nextEvent.venue}</p>
              </div>
            </div>
            <div className="flex items-end justify-between border-t border-[#f1dce5] py-3 sm:border-t-0 sm:pl-5">
              <span className="text-[10px] font-bold tracking-[0.12em] text-[#9b7284]">NEXT LIVE</span>
              <p className="font-black leading-none text-[#e84a80]"><span className="text-[34px]">{countdownDays ?? "--"}</span><span className="ml-1 text-[10px] tracking-[0.12em]">DAYS</span></p>
            </div>
          </div>
          ) : (
            <div className="mt-5 flex min-h-12 items-center justify-between gap-3 rounded-2xl bg-[#fff4f8] px-4">
              <p className="text-[12px] font-bold text-[#876b79]">次回公演の発表を待っています</p>
              <Link href={`/artists/${slug}/news`} className="shrink-0 text-[11px] font-black text-[#e84a80]">公式NEWS →</Link>
            </div>
          )}

          {availableSummaryMetrics.length > 0 && <div className={`grid pt-5 ${availableSummaryMetrics.length === 1 ? "grid-cols-1" : availableSummaryMetrics.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
            {availableSummaryMetrics.map((metric, index) => (
              <div
                key={metric.label}
                className={`min-w-0 px-2 text-left ${index > 0 ? "border-l border-[#f0dfe6]" : ""}`}
              >
                <p className="truncate text-[9px] font-bold text-[#967987] sm:text-[11px]">{metric.label}</p>
                <p className="mt-1.5 text-[22px] font-black leading-none text-[#3d3038] sm:text-[28px]">
                  {metric.value}<span className="ml-0.5 text-[12px] text-[#e84a80]">%</span>
                </p>
              </div>
            ))}
          </div>}
          </div>
        </div>
      </div>
    </section>
  );
}
