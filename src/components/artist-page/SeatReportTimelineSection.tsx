import Link from "next/link";
import type { TicketResultAnalytics } from "@/lib/artistPageTypes";
import type { CrawledEvent } from "@/lib/types";

type Props = {
  /** アーティスト全体・created_at降順で既に上位3件に絞り込み済みのものを渡す */
  items: TicketResultAnalytics[];
  eventMap: Map<string, CrawledEvent>;
};

function seatTypeLabel(v: string | null | undefined): string | null {
  if (!v) return null;
  const map: Record<string, string> = {
    arena: "アリーナ",
    stand: "スタンド",
    seated: "着席",
    restricted: "制限席",
    obstructed: "見切れ席",
    unknown: "不明",
  };
  return map[v] ?? v;
}

function upgradeResultLabel(v: string | null | undefined): string | null {
  if (v === "applied_won") return "アプグレ当選";
  if (v === "applied_lost") return "アプグレ落選";
  return null;
}

function fmtShortDate(d: string | null | undefined): string {
  if (!d) return "";
  const parts = d.split("-").map(Number);
  return `${parts[1]}/${parts[2]}`;
}

export default function SeatReportTimelineSection({ items, eventMap }: Props) {
  if (items.length === 0) return null;

  return (
    <section className="mt-4 px-4">
      <h2 className="text-[14px] font-bold text-gray-900">みんなの新着報告</h2>
      <p className="mt-0.5 text-[11px] text-gray-400">
        このアーティスト全体の新着報告です（会場・ツアーの絞り込みはありません）
      </p>
      <div className="mt-2 divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        {items.map((item) => {
          const ev = eventMap.get(item.event_id);
          const isWon = item.result === "won";

          const detailBadges = [
            item.fc_history ? `FC${item.fc_history}` : null,
            upgradeResultLabel(item.upgrade_result),
            item.lottery_type ?? null,
          ].filter((v): v is string => Boolean(v));

          const seatInfoText = [
            seatTypeLabel(item.seat_type),
            item.seat_block,
            item.stand_direction,
            item.stand_floor,
            item.other_seat_info,
            item.seat_row,
            item.seat_number,
          ]
            .filter((v): v is string => Boolean(v))
            .join("　");

          return (
            <Link
              key={item.id}
              href={`/events/${item.event_id}`}
              className="block px-3.5 py-2.5 no-underline transition-colors active:bg-gray-50"
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    isWon ? "bg-[#FFF1F6] text-[#FF6B9D]" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {isWon ? "当選" : "落選"}
                </span>
                {ev && (
                  <span className="min-w-0 truncate text-[11px] text-gray-500">
                    {ev.venue}・{fmtShortDate(ev.date)}
                  </span>
                )}
              </div>
              {detailBadges.length > 0 && (
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  {detailBadges.map((label, i) => (
                    <span
                      key={i}
                      className="shrink-0 rounded-full bg-gray-50 px-2 py-0.5 text-[11px] font-bold text-gray-600"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              )}
              {seatInfoText && (
                <p className="mt-1 truncate text-[11px] text-gray-700">{seatInfoText}</p>
              )}
              {item.comment && (
                <p className="mt-1 truncate text-[11px] text-gray-600">{item.comment}</p>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
