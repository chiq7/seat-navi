"use client";

import { CalendarDays, Ticket, X } from "lucide-react";
import { discoveryDateLabel } from "@/lib/seatDiscovery";
import { getArenaSeatDetails, seatConditionLabels, type SeatPosition } from "@/lib/arena-map/arenaSeatDetails";
import type { SeatReport } from "@/lib/types";
import type { ExternalSeatObservation } from "@/lib/external-seats/types";

export function ArenaSeatDetail({ position, reports, external, events, unknownOrigin, onClose }: {
  position: SeatPosition; reports: SeatReport[]; external: ExternalSeatObservation[];
  events: { id: string; date: string }[]; unknownOrigin: boolean; onClose: () => void;
}) {
  const detail = getArenaSeatDetails(position, reports, external);
  const date = (id: string) => {
    const value = events.find(event => event.id === id)?.date;
    return value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) ? discoveryDateLabel(value) : "公演日未確認";
  };
  return (
    <section aria-label="選んだ座席の報告" className="mx-3 mt-3 rounded-xl border border-[#e4c9d4] bg-white p-3 sm:mx-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex flex-wrap items-baseline gap-x-2 text-[#332b31]"><strong className="text-[24px] font-black">{position.block}</strong><span className="text-[15px] font-bold">{position.row}列 {position.seat}番</span></h3>
        <button type="button" onClick={onClose} aria-label="座席の詳細を閉じる" className="zr-focus flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[#71636c]"><X size={20} /></button>
      </div>
      <div className="divide-y divide-[#eee7ec]">
        {detail.reports.map(report => (
          <div key={report.id} className="py-2 text-[12px] leading-5">
            <p className="flex items-center gap-2 font-bold"><CalendarDays size={15} aria-hidden="true" />{date(report.event_id)}</p>
            {unknownOrigin ? <p className="mt-1 text-[#71636c]">座席記録 · 抽選条件未確認</p> : <p className="mt-1 flex items-start gap-2 text-[#62545d]"><Ticket size={15} className="mt-0.5 shrink-0" aria-hidden="true" /><span>{seatConditionLabels(report).join(" · ")}</span></p>}
          </div>
        ))}
        {detail.external.map(item => (
          <div key={item.id} className="py-2 text-[12px] leading-5">
            <p className="flex items-center gap-2 font-bold"><CalendarDays size={15} aria-hidden="true" />{date(item.event_id)}</p>
            <p className="mt-1 font-bold text-[#62545d]">外部参考 · {item.confidence === "exact" ? "位置情報" : item.confidence === "range" ? "範囲情報" : "候補情報"}</p>
            <p className="text-[#71636c]">{item.row_min}〜{item.row_max}列 / {item.seat_min}〜{item.seat_max}番{item.confidence !== "exact" ? "（範囲内の各席は未確定）" : ""}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
