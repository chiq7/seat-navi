"use client";

import MapPreviewSection from "@/components/artist-page/MapPreviewSection";
import TrendSection from "@/components/artist-page/TrendSection";
import {
  computeArenaDetailStats,
  computeTicketResultStats,
  computeUpgradeDetailStats,
} from "@/lib/artistPageStats";
import type { TicketResultAnalytics } from "@/lib/artistPageTypes";
import type { SeatReport } from "@/lib/types";

type Card = "trend" | "map";

const FC_HISTORIES = ["1年未満", "1〜3年", "3年以上"] as const;
const LOTTERY_TYPES = ["1次抽選", "2次抽選", "その他"] as const;
const PAYMENT_METHODS = ["クレカ", "その他"] as const;
const MAP_LOTTERIES = ["fc1", "fc2", "general", "upgrade"] as const;

function makeTicketRows(): TicketResultAnalytics[] {
  return Array.from({ length: 180 }, (_, index) => {
    const isWon = index % 7 !== 0 && index % 11 !== 0;
    const upgradeResult =
      index % 5 === 0 ? (index % 10 === 0 ? "applied_won" : "applied_lost") : "not_applied";

    return {
      id: `ad-ticket-${index + 1}`,
      event_id: "ad-demo-event",
      user_id: null,
      result: isWon ? "won" : "lost",
      lost_application_count: isWon ? 0 : index % 3 === 0 ? 2 : 1,
      ticket_count: (index % 4) + 1,
      lottery_type: LOTTERY_TYPES[index % LOTTERY_TYPES.length],
      fc_history: FC_HISTORIES[index % FC_HISTORIES.length],
      payment_method: PAYMENT_METHODS[index % PAYMENT_METHODS.length],
      seat_type: isWon ? (index % 5 <= 2 ? "arena" : "stand") : null,
      upgrade_result: upgradeResult,
      comment: null,
      seat_block: null,
      seat_row: null,
      seat_number: null,
      stand_direction: null,
      stand_floor: null,
      other_seat_info: null,
      created_at: "2026-08-03T00:00:00.000Z",
    };
  });
}

function makeMapReports(): SeatReport[] {
  const blocks = Array.from(
    { length: 64 },
    (_, index) => `${String.fromCharCode(65 + Math.floor(index / 8))}${(index % 8) + 1}`,
  );

  return blocks.flatMap((block, blockIndex) =>
    Array.from({ length: 4 }, (_, seatIndex) => ({
      id: `ad-seat-${block}-${seatIndex + 1}`,
      event_id: "ad-demo-event",
      block,
      row_num: ((blockIndex * 3 + seatIndex * 2) % 18) + 1,
      seat_num: ((blockIndex * 11 + seatIndex * 17) % 80) + 1,
      lottery_type: MAP_LOTTERIES[(blockIndex + seatIndex) % MAP_LOTTERIES.length],
      lottery_round: seatIndex % 3 === 0 ? "1次抽選" : seatIndex % 3 === 1 ? "2次抽選" : "その他",
      lottery_name: null,
      payment_method: PAYMENT_METHODS[(blockIndex + seatIndex) % PAYMENT_METHODS.length],
      fc_history: FC_HISTORIES[(blockIndex + seatIndex) % FC_HISTORIES.length],
      comment: null,
      created_at: "2026-08-03T00:00:00.000Z",
    })),
  );
}

const ticketRows = makeTicketRows();
const mapReports = makeMapReports();
const ticketStats = computeTicketResultStats(ticketRows);
const arenaStats = computeArenaDetailStats(ticketRows);
const upgradeStats = computeUpgradeDetailStats(ticketRows);

export default function AdDemoClient({ initialCard }: { initialCard: Card }) {
  return (
    <main className="min-h-screen bg-[#f8fafc] px-1 pb-5 pt-2">
      <div className="mx-auto w-full max-w-[430px]">
        {initialCard === "trend" ? (
          <TrendSection
            title="全公演"
            ticketStats={ticketStats}
            arenaStats={arenaStats}
            upgradeStats={upgradeStats}
            initialArenaDetailOpen
          />
        ) : (
          <MapPreviewSection mapEvent={{ id: "ad-demo-event", reports: mapReports }} />
        )}
        <p className="px-3 pt-3 text-center text-[10px] leading-4 text-slate-400">
          広告素材用のテストデータです。実際の集計値・座席報告ではありません。
        </p>
      </div>
    </main>
  );
}
