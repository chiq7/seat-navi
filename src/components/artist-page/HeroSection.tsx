"use client";

import Image from "next/image";
import { Fragment } from "react";
import { CalendarDays, ChevronLeft, Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { rateText } from "@/lib/artistPageHelpers";

type TourStop = { date: string; label: string; active: boolean };

type Props = {
  artistName: string;
  tourTitle: string;
  dateRange: string | null;
  ticketRate: number | null;
  normalArenaRate: number | null;
  upgradeRate: number | null;
  nextEvent: { date: string; venue: string } | null;
  countdownDays: number | null;
  tourStops: TourStop[];
};

const summaryCardHeight = 70;
const summaryBottom = 8;
const cardGap = 6;
const countdownCardHeight = 84;
const countdownBottom = summaryBottom + summaryCardHeight + cardGap;

function fmtShort(d: string): string {
  const [, m, day] = d.split("-");
  return `${m}.${day}`;
}

function fmtDateLabel(d: string): string {
  const [y, m, day] = d.split("-").map(Number);
  const w = ["日", "月", "火", "水", "木", "金", "土"][new Date(y, m - 1, day).getDay()];
  return `${String(m).padStart(2, "0")}.${String(day).padStart(2, "0")}（${w}）`;
}

export default function HeroSection({
  artistName,
  tourTitle,
  dateRange,
  ticketRate,
  normalArenaRate,
  upgradeRate,
  nextEvent,
  countdownDays,
  tourStops,
}: Props) {
  const router = useRouter();

  const summaryMetrics = [
    { label: "チケット当選率", value: rateText(ticketRate) },
    { label: "通常アリーナ率", value: rateText(normalArenaRate) },
    { label: "アプグレ当選率", value: rateText(upgradeRate) },
  ];

  return (
    <section className="relative h-[340px] w-full overflow-hidden bg-[#080512]">
      <Image
        src="/images/hero/artist-top.png"
        alt=""
        fill
        priority
        sizes="390px"
        className="object-cover"
        style={{ objectPosition: "center 8%" }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/15" />
      <div className="relative z-10 h-full w-full">
        <header
          className="absolute inset-x-0 top-0 z-10 flex items-center justify-between"
          style={{ height: "56px", paddingLeft: "14px", paddingRight: "14px" }}
        >
          <button
            type="button"
            aria-label="戻る"
            onClick={() => router.back()}
            className="flex h-10 w-10 items-center justify-center text-white"
          >
            <ChevronLeft size={26} strokeWidth={2.7} />
          </button>
          <h1 className="font-serif font-semibold text-white" style={{ fontSize: "21px", letterSpacing: "0.22em" }}>
            {artistName}
          </h1>
          <button
            type="button"
            aria-label="お気に入り"
            className="flex h-10 w-10 items-center justify-center text-white"
          >
            <Heart size={23} strokeWidth={2.4} />
          </button>
        </header>

        <div className="absolute z-10 text-center" style={{ top: "82px", left: "24px", right: "24px" }}>
          <h2 className="font-extrabold text-white" style={{ fontSize: "25px", lineHeight: "1.1" }}>
            {tourTitle || artistName}
          </h2>
          {dateRange && (
            <p
              className="font-semibold"
              style={{ marginTop: "6px", fontSize: "12px", color: "rgba(255,255,255,0.86)" }}
            >
              {dateRange}
            </p>
          )}
        </div>

        {nextEvent && (
          <div
            className="absolute z-10"
            style={{
              bottom: `${countdownBottom}px`,
              left: "48px",
              right: "48px",
              height: `${countdownCardHeight}px`,
              background: "rgba(0,0,0,0.55)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(255,255,255,0.55)",
              borderRadius: "22px",
              boxShadow: "0 8px 22px rgba(0,0,0,0.22)",
              padding: "8px 14px",
            }}
          >
            <div className="grid h-full items-center" style={{ gridTemplateColumns: "38% 62%" }}>
              <div className="flex flex-col items-center justify-center">
                <div className="mb-1 flex items-center justify-center gap-1" style={{ color: "rgba(255,255,255,0.82)" }}>
                  <CalendarDays size={11} strokeWidth={2.1} />
                  <p style={{ fontSize: "10px", fontWeight: 500 }}>次の公演まで</p>
                </div>
                <div className="flex items-end justify-center gap-1">
                  <span
                    className="drop-shadow-[0_0_10px_rgba(255,79,163,0.9)]"
                    style={{ fontSize: "36px", fontWeight: 700, lineHeight: 1, color: "#ff4fa3" }}
                  >
                    {countdownDays ?? "--"}
                  </span>
                  <span style={{ fontSize: "10px", fontWeight: 500, letterSpacing: "0.12em", color: "#ff8ac5", paddingBottom: "4px" }}>
                    DAYS
                  </span>
                </div>
              </div>
              <div
                className="flex min-w-0 flex-col justify-center"
                style={{ borderLeft: "1px solid rgba(255,255,255,0.16)", paddingLeft: "14px" }}
              >
                <p style={{ fontSize: "10px", fontWeight: 500, color: "rgba(255,255,255,0.78)" }}>
                  {fmtDateLabel(nextEvent.date)}
                </p>
                <p
                  className="truncate text-white"
                  style={{ fontSize: "16px", fontWeight: 600, lineHeight: "1.2", marginTop: "1px" }}
                >
                  {nextEvent.venue}
                </p>
                {tourStops.length > 0 && (
                  <div className="mt-1 flex w-[150px] items-end">
                    {tourStops.map((stop, index) => (
                      <Fragment key={stop.date}>
                        <div className="flex flex-col items-center">
                          <span className="mb-1 text-[8px] leading-none text-white/65">{fmtShort(stop.date)}</span>
                          <span
                            className={
                              stop.active
                                ? "h-2 w-2 rounded-full border border-[#ff5fb7] bg-[#ff5fb7] shadow-[0_0_8px_rgba(255,95,183,0.85)]"
                                : "h-1.5 w-1.5 rounded-full border border-white/50 bg-white/10"
                            }
                            aria-label={stop.label}
                          />
                        </div>
                        {index < tourStops.length - 1 ? <div className="mb-[3px] h-px w-7 bg-white/30" /> : null}
                      </Fragment>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div
          className="absolute z-10 overflow-hidden rounded-2xl border border-white/45 bg-white/80 shadow-sm backdrop-blur-md"
          style={{
            bottom: `${summaryBottom}px`,
            left: "16px",
            right: "16px",
            height: `${summaryCardHeight}px`,
          }}
        >
          <div className="grid grid-cols-3 py-2.5">
            {summaryMetrics.map((metric, index) => (
              <div
                key={metric.label}
                className={`px-1 text-center ${index < summaryMetrics.length - 1 ? "border-r border-gray-200" : ""}`}
              >
                <p className="whitespace-nowrap text-[12px] font-bold leading-none text-gray-900">{metric.label}</p>
                <p className="mt-1 text-[31px] font-bold leading-none text-[#FF6B9D]">
                  {metric.value === "--" ? "--" : <>{metric.value}<span className="text-[18px]">%</span></>}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
