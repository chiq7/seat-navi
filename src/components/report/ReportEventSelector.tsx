"use client";

import Link from "next/link";
import Image from "next/image";
import { ChevronRight } from "lucide-react";
import type { CrawledEvent } from "@/lib/types";

function Sparkle({
  size = 8,
  color = "#FF6B9D",
  className = "",
}: {
  size?: number;
  color?: string;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      className={className}
      style={{ flexShrink: 0 }}
    >
      <path d="M12 2L13.8 9.2L21 10.5L13.8 12.5L12 20L10.2 12.5L3 10.5L10.2 9.2L12 2Z" />
    </svg>
  );
}

type CardLinkProps = {
  href: string | null;
  children: React.ReactNode;
};

function CardLink({ href, children }: CardLinkProps) {
  if (href) {
    return (
      <Link
        href={href}
        className="flex items-center gap-4 rounded-[24px] border border-[#F3F4F6] bg-white p-4 shadow-sm transition-transform active:scale-[0.99]"
      >
        {children}
      </Link>
    );
  }
  return (
    <div className="flex cursor-default items-center gap-4 rounded-[24px] border border-[#F3F4F6] bg-white p-4 opacity-40 shadow-sm">
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
  artistName,
  artistSlug,
}: Props) {
  const ticketHref = selectedEvent ? `/report/ticket?event=${selectedEvent.id}` : null;
  const arenaHref = selectedEvent ? `/events/${selectedEvent.id}/fan-seat-prediction` : null;
  const liveHref = selectedEvent ? `/report/live?event=${selectedEvent.id}` : null;
  const setlistHref = artistSlug ? `/artists/${artistSlug}/setlist` : null;

  return (
    <>
      {/* アーティスト情報（アリーナ予想図ページと同じ見た目） */}
      {selectedEvent && (
        <section className="px-4 pt-3">
          <div className="flex items-start gap-2">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0">
              <rect x="9" y="2" width="6" height="11" rx="3" fill="#FF6B9D" />
              <path d="M5 10a7 7 0 0014 0" stroke="#FF6B9D" strokeWidth="2" strokeLinecap="round" fill="none" />
              <line x1="12" y1="17" x2="12" y2="22" stroke="#FF6B9D" strokeWidth="2" strokeLinecap="round" />
              <line x1="8" y1="22" x2="16" y2="22" stroke="#FF6B9D" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <div className="min-w-0 flex-1">
              {artistName ? (
                <>
                  <p className="text-[15px] font-bold leading-snug text-gray-900">{artistName}</p>
                  <p className="mt-0.5 text-[12px] leading-snug text-gray-500">{selectedEvent.title}</p>
                </>
              ) : (
                <p className="text-[14px] font-bold leading-snug text-gray-900">{selectedEvent.title}</p>
              )}
            </div>
            <Sparkle size={9} color="#FBBF24" className="mt-0.5" />
          </div>
        </section>
      )}

      {/* 報告タイプカード */}
      <div className="mt-5 px-4">
        <div className="mb-3">
          <Image
            src="/images/report/report-form-title.png"
            alt="報告する内容を選んでください"
            width={2172}
            height={724}
            className="h-[40px] w-auto max-w-full object-contain"
          />
        </div>

        <div className="space-y-3">
          {/* 当落・座席を報告 */}
          <CardLink href={ticketHref}>
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
                当選・落選、抽選種別、座席情報をまとめて共有
              </p>
              <p className={`mt-1 text-[11px] font-semibold ${ticketHref ? "text-[#FF6B9D]" : "text-[#6B7280]"}`}>
                {ticketHref ? "当落・座席レポートページへ" : "公演を選択してください"}
              </p>
            </div>
            {ticketHref && <ChevronRight size={20} strokeWidth={2} className="shrink-0 text-[#D1D5DB]" />}
          </CardLink>

          {/* アリーナ予想図を投稿 */}
          <CardLink href={arenaHref}>
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
          <CardLink href={liveHref}>
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
          <CardLink href={setlistHref}>
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
