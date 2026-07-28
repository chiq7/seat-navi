"use client";

import Link from "next/link";
import Image from "next/image";
import { ChevronRight } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import type { CrawledEvent } from "@/lib/types";

type CardLinkProps = {
  href: string | null;
  reportType: "ticket" | "arena_prediction" | "live" | "setlist";
  eventId?: string | null;
  children: React.ReactNode;
};

function CardLink({ href, reportType, eventId = null, children }: CardLinkProps) {
  if (href) {
    return (
      <Link
        href={href}
        onClick={() => trackEvent("report_start", {
          report_type: reportType,
          event_id: eventId,
        })}
        className="flex items-center gap-4 rounded-[24px] border border-[#F3F4F6] bg-white p-3 shadow-sm transition-transform active:scale-[0.99]"
      >
        {children}
      </Link>
    );
  }
  return (
    <div className="flex cursor-default items-center gap-4 rounded-[24px] border border-[#F3F4F6] bg-white p-3 opacity-40 shadow-sm">
      {children}
    </div>
  );
}

type Props = {
  selectedEvent: CrawledEvent | null;
  artistName: string | null;
  artistSlug: string | null;
};

export function ReportEventSelector({
  selectedEvent,
  artistSlug,
}: Props) {
  const ticketHref = selectedEvent ? `/report/ticket?event=${selectedEvent.id}` : null;
  const arenaHref = selectedEvent ? `/events/${selectedEvent.id}/fan-seat-prediction` : null;
  const liveHref = selectedEvent ? `/report/live?event=${selectedEvent.id}` : null;
  const setlistHref = artistSlug ? `/artists/${artistSlug}/setlist` : null;

  return (
    <>
      {/* 報告タイプカード */}
      <div className="mt-5 px-3">
        <div className="-mb-1">
          <Image
            src="/images/report/report-form-title.png"
            alt="報告する内容を選んでください"
            width={2172}
            height={724}
            className="h-[60px] w-auto max-w-full object-contain"
          />
        </div>

        <div className="space-y-3">
          {/* 当落・座席を報告 */}
          <CardLink href={ticketHref} reportType="ticket" eventId={selectedEvent?.id}>
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[18px]">
              <Image
                src="/images/report/icons/report-ticket-seat-icon1.png"
                alt=""
                width={64}
                height={64}
                className="h-full w-full object-cover object-center"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[17px] font-bold leading-tight text-[#111827]">当落・座席を報告</p>
              <p className="mt-1 text-[13px] leading-snug text-[#6B7280]">
                当落・抽選種別・座席情報をまとめて共有
              </p>
              <p className={`mt-1 text-[11px] font-semibold ${ticketHref ? "text-[#FF6B9D]" : "text-[#6B7280]"}`}>
                {ticketHref ? "当落・座席レポートページへ" : "公演を選択してください"}
              </p>
            </div>
            {ticketHref && <ChevronRight size={20} strokeWidth={2} className="shrink-0 text-[#D1D5DB]" />}
          </CardLink>

          {/* アリーナ予想図を投稿 */}
          <CardLink href={arenaHref} reportType="arena_prediction" eventId={selectedEvent?.id}>
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[18px]">
              <Image
                src="/images/report/icons/report-arena-prediction-icon1.png"
                alt=""
                width={64}
                height={64}
                className="h-full w-full object-cover object-center"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[17px] font-bold leading-tight text-[#111827]">アリーナ予想図を投稿</p>
              <p className="mt-1 text-[13px] leading-snug text-[#6B7280]">
                座席ドットを見て、花道・センステ予想を共有
              </p>
              <p className={`mt-1 text-[11px] font-semibold ${arenaHref ? "text-[#FF6B9D]" : "text-[#6B7280]"}`}>
                {arenaHref ? "アリーナ予想投稿ページへ" : "公演を選択してください"}
              </p>
            </div>
            {arenaHref && <ChevronRight size={20} strokeWidth={2} className="shrink-0 text-[#D1D5DB]" />}
          </CardLink>

          {/* 現地レポを投稿 */}
          <CardLink href={liveHref} reportType="live" eventId={selectedEvent?.id}>
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[18px]">
              <Image
                src="/images/report/icons/report-local-icon1.png"
                alt=""
                width={64}
                height={64}
                className="h-full w-full object-cover object-center"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[17px] font-bold leading-tight text-[#111827]">現地レポを投稿</p>
              <p className="mt-1 text-[13px] leading-snug text-[#6B7280]">
                会場の混雑、グッズ列、雰囲気を共有
              </p>
              <p className={`mt-1 text-[11px] font-semibold ${liveHref ? "text-[#FF6B9D]" : "text-[#6B7280]"}`}>
                {liveHref ? "現地レポフォームページへ" : "公演を選択してください"}
              </p>
            </div>
            {liveHref && <ChevronRight size={20} strokeWidth={2} className="shrink-0 text-[#D1D5DB]" />}
          </CardLink>

          {/* セトリを投稿 */}
          <CardLink href={setlistHref} reportType="setlist" eventId={selectedEvent?.id}>
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[18px]">
              <Image
                src="/images/report/icons/report-setlist-icon1.png"
                alt=""
                width={64}
                height={64}
                className="h-full w-full object-cover object-center"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[17px] font-bold leading-tight text-[#111827]">セトリを投稿</p>
              <p className="mt-1 text-[13px] leading-snug text-[#6B7280]">曲順やMC、演出メモを共有</p>
              <p className={`mt-1 text-[11px] font-semibold ${setlistHref ? "text-[#FF6B9D]" : "text-[#6B7280]"}`}>
                {setlistHref ? "セトリの投稿掲載ページへ" : "公演を選択してください"}
              </p>
            </div>
            {setlistHref && <ChevronRight size={20} strokeWidth={2} className="shrink-0 text-[#D1D5DB]" />}
          </CardLink>
        </div>
      </div>
    </>
  );
}
