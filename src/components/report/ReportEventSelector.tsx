"use client";

import Link from "next/link";
import { BarChart3, Camera, ListMusic, Map, MoveRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import type { CrawledEvent } from "@/lib/types";

type ReportType = "ticket" | "arena_prediction" | "live" | "setlist";

type ReportChoice = {
  href: string | null;
  type: ReportType;
  label: string;
  description: string;
  meta: string;
  Icon: LucideIcon;
  tone: "ticket" | "seat" | "live" | "setlist";
};

function ReportChoiceLink({ choice, eventId, index }: { choice: ReportChoice; eventId?: string | null; index: number }) {
  const inner = (
    <>
      <div className="flex items-start justify-between gap-4">
        <choice.Icon
          size={21}
          strokeWidth={1.7}
          className={{ ticket: "text-[#e94a7d]", seat: "text-[#6176d7]", live: "text-[#dd8053]", setlist: "text-[#8165bb]" }[choice.tone]}
        />
        <span className="text-[9px] font-black tracking-[0.16em] text-[#958d93]">
          {String(index + 1).padStart(2, "0")} / REPORT
        </span>
      </div>
      <div className="mt-3 sm:mt-7">
        <h3 className="whitespace-nowrap text-[15px] font-black leading-tight tracking-[-0.04em] text-[#40383d] sm:text-[27px]">
          {choice.label}
        </h3>
        <p className="mt-1.5 truncate text-[9px] font-bold leading-4 text-[#817981] sm:mt-2 sm:min-h-[40px] sm:whitespace-normal sm:text-[11px] sm:leading-5">
          {choice.description}
        </p>
        <p className={`mt-1.5 flex items-center gap-1 truncate text-[9px] font-black sm:mt-3 sm:gap-2 sm:text-[10px] ${choice.href ? "text-[#ef4f87]" : "text-[#aaa2a8]"}`}>
          {choice.href ? choice.meta : "先に公演を選択してください"}
          {choice.href && <MoveRight size={16} className="transition-transform group-hover:translate-x-1" />}
        </p>
      </div>
    </>
  );

  const className = `group flex min-h-[126px] flex-col justify-between rounded-[18px] border border-white/80 p-3 shadow-[0_10px_26px_rgba(91,67,79,.06)] sm:min-h-[184px] sm:rounded-[24px] sm:p-6 ${
    {
      ticket: "bg-[#fff0f5]",
      seat: "bg-[#edf0ff]",
      live: "bg-[#fff1ea]",
      setlist: "bg-[#f4efff]",
    }[choice.tone]
  } ${choice.href ? "" : "cursor-default opacity-45"}`;

  if (!choice.href) return <div className={className}>{inner}</div>;

  return (
    <Link
      href={choice.href}
      onClick={() => trackEvent("report_start", { report_type: choice.type, event_id: eventId ?? null })}
      className={`zr-focus ${className}`}
    >
      {inner}
    </Link>
  );
}

type Props = {
  selectedEvent: CrawledEvent | null;
  artistName: string | null;
  artistSlug: string | null;
};

export function ReportEventSelector({ selectedEvent, artistSlug }: Props) {
  const choices: ReportChoice[] = [
    {
      href: selectedEvent ? `/report/ticket?event=${selectedEvent.id}` : null,
      type: "ticket",
      label: "当落・座席を報告",
      description: "当選・落選、抽選種別、実際の座席をまとめて共有。",
      meta: "当落・座席フォームへ",
      Icon: BarChart3,
      tone: "ticket",
    },
    {
      href: selectedEvent ? `/events/${selectedEvent.id}/fan-seat-prediction` : null,
      type: "arena_prediction",
      label: "アリーナ予想図",
      description: "会場の座席表を見ながら、花道やセンステ構成を予想。",
      meta: "座席予想を投稿",
      Icon: Map,
      tone: "seat",
    },
    {
      href: selectedEvent ? `/report/live?event=${selectedEvent.id}` : null,
      type: "live",
      label: "現地レポを投稿",
      description: "座席からの見え方、会場写真、ライブ演出をファンへ。",
      meta: "現地レポフォームへ",
      Icon: Camera,
      tone: "live",
    },
    {
      href: artistSlug ? `/artists/${artistSlug}/setlist` : null,
      type: "setlist",
      label: "セトリを投稿",
      description: "曲順、MC、演出メモをライブの記録として共有。",
      meta: "セトリページへ",
      Icon: ListMusic,
      tone: "setlist",
    },
  ];

  return (
    <section className="zr-container py-6 sm:py-10" aria-labelledby="report-choice-title">
      <p className="artist-kicker">Share Your Live</p>
      <h2 id="report-choice-title" className="artist-heading">何をレポートする？</h2>
      <p className="mt-2 text-[11px] font-medium leading-5 text-[#817981] sm:mt-3 sm:text-[12px] sm:leading-6">
        選んだ公演の当落、座席表、会場の様子を投稿できます。
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:mt-6 sm:gap-3">
        {choices.map((choice, index) => (
          <ReportChoiceLink
            key={choice.type}
            choice={choice}
            eventId={selectedEvent?.id}
            index={index}
          />
        ))}
      </div>
    </section>
  );
}
