"use client";

import Link from "next/link";
import { BarChart3, Camera, ListMusic, Map, MoveRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { REPORT_TONE_CLASSES, type ReportTone } from "@/lib/designTokens";
import type { CrawledEvent } from "@/lib/types";

type ReportType = "ticket" | "arena_prediction" | "live" | "setlist";

type ReportChoice = {
  href: string | null;
  type: ReportType;
  label: string;
  description: string;
  meta: string;
  Icon: LucideIcon;
  tone: ReportTone;
};

function ReportChoiceLink({ choice, eventId }: { choice: ReportChoice; eventId?: string | null }) {
  const inner = (
    <>
      <div className="flex items-start justify-between gap-4">
        <choice.Icon
          size={21}
          strokeWidth={1.7}
          className={REPORT_TONE_CLASSES[choice.tone].text}
        />
      </div>
      <div className="mt-3 sm:mt-7">
        <h3 className="text-[15px] font-black leading-snug tracking-[-0.04em] text-[#40383d] sm:text-[27px]">
          {choice.label}
        </h3>
        <p className="mt-1.5 text-[12px] font-bold leading-5 text-[#817981] sm:mt-2 sm:min-h-[40px]">
          {choice.description}
        </p>
        <p className={`mt-1.5 flex items-center gap-1 text-[12px] font-black leading-5 sm:mt-3 sm:gap-2 ${choice.href ? "text-[#ef4f87]" : "text-[#aaa2a8]"}`}>
          {choice.href ? choice.meta : "先に公演を選択してください"}
          {choice.href && <MoveRight size={16} className="shrink-0 transition-transform group-hover:translate-x-1" />}
        </p>
      </div>
    </>
  );

  const className = `group flex min-h-[126px] flex-col justify-between rounded-[18px] border border-white/80 p-3 shadow-[0_10px_26px_rgba(91,67,79,.06)] sm:min-h-[184px] sm:rounded-[24px] sm:p-6 ${
    {
      ticket: REPORT_TONE_CLASSES.ticket.background,
      seat: REPORT_TONE_CLASSES.seat.background,
      live: REPORT_TONE_CLASSES.live.background,
      setlist: REPORT_TONE_CLASSES.setlist.background,
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
  venueId?: string | null;
  requireSelection?: boolean;
};

export function ReportEventSelector({ selectedEvent, artistSlug, venueId, requireSelection }: Props) {
  const params = new URLSearchParams();
  if (selectedEvent) params.set("event", selectedEvent.id);
  if (venueId) params.set("venue", venueId);
  if (artistSlug && !selectedEvent) params.set("artist", artistSlug);
  const query = params.size ? `?${params}` : "";
  const choices: ReportChoice[] = [
    {
      href: requireSelection ? null : `/report/ticket${query}`,
      type: "ticket",
      label: "当落・座席を報告",
      description: "当落結果や、おおまかな座席位置を共有。",
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
      href: requireSelection ? null : `/report/live${query}`,
      type: "live",
      label: "現地レポを投稿",
      description: "座席からの見え方、会場写真、ライブ演出をファンへ。",
      meta: "現地レポフォームへ",
      Icon: Camera,
      tone: "live",
    },
    {
      href: artistSlug && !requireSelection ? `/artists/${artistSlug}/setlist${selectedEvent ? `?event=${encodeURIComponent(selectedEvent.id)}` : ""}` : null,
      type: "setlist",
      label: "セトリを見る・投稿する",
      description: "曲順、MC、演出メモをライブの記録として共有。",
      meta: "セトリを見る・投稿する",
      Icon: ListMusic,
      tone: "setlist",
    },
  ];

  return (
    <section className="zr-container py-6 sm:py-10" aria-labelledby="report-choice-title">
      <h2 id="report-choice-title" className="artist-heading">何をレポートする？</h2>
      <p className="mt-2 text-sm text-[#70636a]">当落・座席と現地レポはゲストでも投稿できます。</p>

      <div className="mt-4 grid grid-cols-1 gap-2.5 min-[360px]:grid-cols-2 sm:mt-6 sm:gap-3">
        {choices.map(choice => (
          <ReportChoiceLink
            key={choice.type}
            choice={choice}
            eventId={selectedEvent?.id}
          />
        ))}
      </div>
    </section>
  );
}
