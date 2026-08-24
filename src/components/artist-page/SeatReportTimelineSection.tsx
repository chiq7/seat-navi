import type { ReactNode } from "react";
import Link from "next/link";
import type { TicketResultAnalytics } from "@/lib/artistPageTypes";
import type { CrawledEvent } from "@/lib/types";
import type { PostAuthor } from "@/lib/postAuthors";
import { PostAuthorLink } from "@/components/common/PostAuthorLink";

type Props = {
  /** アーティスト全体・created_at降順で既に上位3件に絞り込み済みのものを渡す */
  items: TicketResultAnalytics[];
  eventMap: Map<string, CrawledEvent>;
  reportHref?: string;
  title?: string | null;
  emptyText?: string;
  authorMap?: Map<string, PostAuthor>;
  actions?: (item: TicketResultAnalytics) => ReactNode;
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

function fmtDateWithDow(d: string | null | undefined): string {
  if (!d) return "";
  const parts = d.split("-").map(Number);
  const dow = ["日", "月", "火", "水", "木", "金", "土"][new Date(parts[0], parts[1] - 1, parts[2]).getDay()];
  return `${parts[1]}/${parts[2]}（${dow}）`;
}

function withSuffix(v: string | null | undefined, suffix: string): string | null {
  if (!v) return null;
  return v.endsWith(suffix) ? v : `${v}${suffix}`;
}

function buildSeatInfo(item: TicketResultAnalytics): { typeLabel: string | null; values: string[] } | null {
  const typeLabel = seatTypeLabel(item.seat_type);
  const values = [
    withSuffix(item.seat_block, "ブロック"),
    item.stand_direction,
    item.stand_floor,
    item.other_seat_info,
    withSuffix(item.seat_row, "列"),
    withSuffix(item.seat_number, "番"),
  ].filter((v): v is string => Boolean(v));

  if (!typeLabel && values.length === 0) return null;
  return { typeLabel, values };
}

export default function SeatReportTimelineSection({
  items,
  eventMap,
  reportHref,
  title = "座席報告タイムライン",
  emptyText = "まだ座席報告はありません",
  authorMap,
  actions,
}: Props) {
  return (
    <section className="border border-divider bg-white" aria-label={title ?? undefined}>
      {title && (
        <header className="border-b border-divider px-4 py-3">
          <p className="text-[9px] font-black tracking-[0.18em] text-[#f43679]">RECENT SEATS</p>
          <h3 className="mt-1 text-[15px] font-black tracking-[-0.03em] text-[#1c171b]">{title}</h3>
        </header>
      )}
      {items.length > 0 ? (
        <>
          <div className="divide-y divide-[#ded8dc]">
            {items.map((item) => {
          const ev = eventMap.get(item.event_id);
          const isWon = item.result === "won";
          const isUpgradeWon = item.upgrade_result === "applied_won";
          const seatInfo = buildSeatInfo(item);

          const detailBadges = [
            item.lottery_type ?? null,
            item.fc_history ? `FC${item.fc_history}` : null,
            item.payment_method ?? null,
          ].filter((v): v is string => Boolean(v));

          return (
            <div
              key={item.id}
              className="px-4 py-4"
            >
              {/* 1層目：当落バッジ + アプグレバッジ + 会場・日付 */}
              <div className="flex flex-wrap items-center gap-1">
                <span
                  className={`shrink-0 px-2 py-1 text-[10px] font-black text-white ${
                    isWon ? "bg-[#f43679]" : "bg-[#817981]"
                  }`}
                >
                  {isWon ? "当選" : "落選"}
                </span>
                <span
                  className={`shrink-0 bg-[#fff0f5] px-2 py-1 text-[10px] font-black text-[#f43679] ${
                    isUpgradeWon ? "" : "invisible"
                  }`}
                >
                  アプグレ
                </span>
                {ev && (
                  <span className="min-w-0 flex-1 text-[12px] font-medium text-[#333333]">
                    {ev.venue}・{fmtDateWithDow(ev.date)}
                  </span>
                )}
              </div>

              {/* 2層目：座席情報 */}
              {seatInfo && (
                <div className="mt-1.5 leading-tight">
                  {seatInfo.typeLabel && (
                    <span className="mr-1.5 text-[13px] font-bold text-gray-900">
                      {seatInfo.typeLabel}
                    </span>
                  )}
                  {seatInfo.values.map((v, i) => (
                    <span key={i} className="mr-1.5 text-[15px] font-bold text-gray-900">
                      {v}
                    </span>
                  ))}
                </div>
              )}

              {/* 3層目：補助バッジ */}
              {detailBadges.length > 0 && (
                <div className="mt-1.5 flex flex-wrap items-center gap-1">
                  {detailBadges.map((label, i) => (
                    <span
                      key={i}
                      className="inline-flex shrink-0 items-center bg-[#f2eef0] px-2 py-1 text-[10px] font-bold text-[#625a61]"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              )}

              {/* 4層目：コメント */}
              {item.comment && (
                <p className="mt-1.5 truncate text-[11px] text-gray-400">{item.comment}</p>
              )}
              <PostAuthorLink author={item.user_id ? authorMap?.get(item.user_id) : null} className="mt-1.5" />
              {actions?.(item)}
            </div>
          );
            })}
          </div>
        </>
      ) : (
        <div className="community-soft-panel rounded-[20px] px-5 py-5 text-center">
          <p className="text-[9px] font-black tracking-[0.18em] text-[#d64175]">NO SEAT REPORTS</p>
          <p className="mt-3 text-[14px] font-black">{emptyText}</p>
          {reportHref && (
            <Link
              href={reportHref}
              className="zr-focus mt-5 inline-flex min-h-11 items-center border border-white/35 px-4 text-[11px] font-black text-white transition-colors hover:bg-white hover:text-[#1c171b]"
            >
              最初の座席情報を報告する
            </Link>
          )}
        </div>
      )}
    </section>
  );
}
