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

export default function SeatReportTimelineSection({ items, eventMap }: Props) {
  if (items.length === 0) return null;

  return (
    <section className="mt-4 px-4">
      <h2 className="text-[14px] font-bold text-gray-900">座席報告タイムライン</h2>
      <div className="mt-2 divide-y divide-gray-200 bg-white shadow-sm">
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
              className="px-4 py-3"
            >
              {/* 1層目：当落バッジ + アプグレバッジ + 会場・日付 */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={`shrink-0 rounded px-3 py-0.5 text-[13px] font-bold text-white ${
                    isWon ? "bg-[#FF9EBF]" : "bg-gray-400"
                  }`}
                >
                  {isWon ? "当選" : "落選"}
                </span>
                <span
                  className={`shrink-0 rounded bg-[#FEF3C7] px-3 py-0.5 text-[13px] font-bold text-[#92400E] ${
                    isUpgradeWon ? "" : "invisible"
                  }`}
                >
                  アプグレ
                </span>
                {ev && (
                  <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-[#333333]">
                    🎪 {ev.venue}・{fmtDateWithDow(ev.date)}
                  </span>
                )}
              </div>

              {/* 2層目：座席情報 */}
              {seatInfo && (
                <div className="mt-2 leading-tight">
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
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {detailBadges.map((label, i) => (
                    <span
                      key={i}
                      className="inline-flex shrink-0 items-center rounded bg-gray-100 px-2.5 py-0.5 text-[11px] font-bold text-gray-700"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              )}

              {/* 4層目：コメント */}
              {item.comment && (
                <p className="mt-2 truncate text-[11px] text-gray-400">{item.comment}</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
