"use client";

import MapPreviewSection from "@/components/artist-page/MapPreviewSection";
import SeatPredictionPreviewSection from "@/components/artist-page/SeatPredictionPreviewSection";
import TrendSection from "@/components/artist-page/TrendSection";
import {
  computeArenaDetailStats,
  computeTicketResultStats,
  computeUpgradeDetailStats,
} from "@/lib/artistPageStats";
import type { TicketResultAnalytics } from "@/lib/artistPageTypes";
import type { SeatReport } from "@/lib/types";

type Card = "trend" | "map" | "prediction";

const FC_HISTORIES = ["1年未満", "1〜3年", "3年以上"] as const;
const AD_DEMO_TICKET_PLAN = {
  total: 100,
  lottery: [
    { label: "1次抽選", entries: 34, wins: 25 },
    { label: "2次抽選", entries: 36, wins: 22 },
    { label: "その他", entries: 30, wins: 15 },
  ],
  arenaSeatsAmongWins: 26,
  upgrade: { won: 6, lost: 24 },
} as const;

const AD_DEMO_SEAT_REPORT_PLAN = {
  total: 100,
  lotteryTypes: [
    { value: "fc1", label: "1次抽選", count: 52 },
    { value: "fc2", label: "2次抽選", count: 29 },
    { value: "general", label: "一般", count: 13 },
    { value: "upgrade", label: "アップグレード", count: 6 },
  ],
} as const;

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function makeTicketRows(): TicketResultAnalytics[] {
  const random = seededRandom(20260913);
  const lotteryEntries = AD_DEMO_TICKET_PLAN.lottery.flatMap(({ label, entries, wins }) =>
    shuffle(
      [...Array.from({ length: wins }, () => ({ label, result: "won" as const })), ...Array.from({ length: entries - wins }, () => ({ label, result: "lost" as const }))],
      random,
    ),
  );
  const fcHistories = shuffle(Array.from({ length: AD_DEMO_TICKET_PLAN.total }, (_, index) => FC_HISTORIES[index % FC_HISTORIES.length]), random);
  const ticketCounts = shuffle([...
    Array.from({ length: 30 }, () => 1),
    ...Array.from({ length: 35 }, () => 2),
    ...Array.from({ length: 20 }, () => 3),
    ...Array.from({ length: 15 }, () => 4),
  ], random);
  const paymentMethods = shuffle([...
    Array.from({ length: 65 }, () => "クレカ" as const),
    ...Array.from({ length: 35 }, () => "その他" as const),
  ], random);
  const winIndices = shuffle(lotteryEntries.flatMap((entry, index) => entry.result === "won" ? [index] : []), random);
  const arenaWinIndices = new Set(winIndices.slice(0, AD_DEMO_TICKET_PLAN.arenaSeatsAmongWins));
  const upgradeResults = shuffle([...
    Array.from({ length: AD_DEMO_TICKET_PLAN.upgrade.won }, () => "applied_won" as const),
    ...Array.from({ length: AD_DEMO_TICKET_PLAN.upgrade.lost }, () => "applied_lost" as const),
    ...Array.from({ length: AD_DEMO_TICKET_PLAN.total - AD_DEMO_TICKET_PLAN.upgrade.won - AD_DEMO_TICKET_PLAN.upgrade.lost }, () => "not_applied" as const),
  ], random);

  if (lotteryEntries.length !== AD_DEMO_TICKET_PLAN.total) {
    throw new Error("広告用の当落サンプル件数が100件ではありません。");
  }

  return lotteryEntries.map((entry, index) => {
    const isWon = entry.result === "won";
    return {
      id: `ad-ticket-${index + 1}`,
      event_id: "ad-demo-event",
      user_id: null,
      result: entry.result,
      // 当選率の母数を、先に決めた100件の申込数と一致させる。
      lost_application_count: isWon ? 0 : 1,
      ticket_count: ticketCounts[index],
      lottery_type: entry.label,
      fc_history: fcHistories[index],
      payment_method: paymentMethods[index],
      seat_type: isWon ? (arenaWinIndices.has(index) ? "arena" : "stand") : null,
      upgrade_result: upgradeResults[index],
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
  const random = seededRandom(20260914);
  const blocks = Array.from(
    { length: 64 },
    (_, index) => `${String.fromCharCode(65 + Math.floor(index / 8))}${(index % 8) + 1}`,
  );

  const lotteryAssignments = shuffle(
    AD_DEMO_SEAT_REPORT_PLAN.lotteryTypes.flatMap(({ value, label, count }) => Array.from({ length: count }, () => ({ value, label }))),
    random,
  );
  const usedPositions = new Set<string>();

  if (lotteryAssignments.length !== AD_DEMO_SEAT_REPORT_PLAN.total) {
    throw new Error("広告用の座席報告サンプル件数が100件ではありません。");
  }

  return lotteryAssignments.map(({ value, label }, index) => {
    let block = "";
    let rowNum = 0;
    let seatNum = 0;
    do {
      block = blocks[Math.floor(random() * blocks.length)];
      rowNum = Math.floor(random() * 18) + 1;
      seatNum = Math.floor(random() * 80) + 1;
    } while (usedPositions.has(`${block}:${rowNum}:${seatNum}`));
    usedPositions.add(`${block}:${rowNum}:${seatNum}`);

    return {
      id: `ad-seat-${index + 1}`,
      event_id: "ad-demo-event",
      block,
      row_num: rowNum,
      seat_num: seatNum,
      lottery_type: value,
      lottery_round: label,
      lottery_name: null,
      payment_method: random() < 0.65 ? "クレカ" : "その他",
      fc_history: FC_HISTORIES[Math.floor(random() * FC_HISTORIES.length)],
      comment: null,
      created_at: "2026-08-03T00:00:00.000Z",
    };
  });
}

const ticketRows = makeTicketRows();
const mapReports = makeMapReports();
const ticketStats = computeTicketResultStats(ticketRows);
const arenaStats = computeArenaDetailStats(ticketRows);
const upgradeStats = computeUpgradeDetailStats(ticketRows);
const topPrediction = {
  id: "ad-demo-arena-prediction",
  imageUrl: "/images/ads/ad-demo-arena-prediction.png",
  comment: "【広告用サンプル】花道とセンターステージの位置を想定したアリーナ予想図です。実際の座席配置は公式案内を確認してください。",
  tags: ["アリーナ構成", "座席予想"],
  createdAt: "2026-09-13T10:00:00.000Z",
  voteCount: 24,
};

export default function AdDemoClient({
  initialCard,
  captureMode = false,
}: {
  initialCard: Card;
  captureMode?: boolean;
}) {
  return (
    <main
      className={`min-h-screen bg-[#f8fafc] ${captureMode ? "fixed left-0 top-0 w-[400px] px-1 pb-5 pt-2" : "px-1 pb-5 pt-2"}`}
      style={captureMode ? { zoom: initialCard === "map" ? 1.18 : 1.3 } : undefined}
    >
      {captureMode ? (
        <style jsx global>{`
          nextjs-portal { display: none !important; }
        `}</style>
      ) : null}
      <div className="mx-auto mb-1 flex w-full max-w-[430px] items-center justify-between px-2 text-[9px] font-black tracking-[0.1em] text-[#cf4b7d]">
        <span>DEMO DATA</span>
        <span>広告素材用のサンプル表示</span>
      </div>
      <div className="mx-auto w-full max-w-[430px]">
        {initialCard === "trend" ? (
          <TrendSection
            title="全公演"
            ticketStats={ticketStats}
            arenaStats={arenaStats}
            upgradeStats={upgradeStats}
            defaultArenaRateOpen
          />
        ) : initialCard === "map" ? (
          <MapPreviewSection mapEvent={{ id: "ad-demo-event", reports: mapReports }} />
        ) : (
          <SeatPredictionPreviewSection
            venues={[]}
            activeVenue="サンプルアリーナ"
            topPrediction={topPrediction}
            mapEvent={null}
          />
        )}
        <p className="px-3 pt-3 text-center text-[10px] leading-4 text-slate-400">
          広告素材用のテストデータです。実際の集計値・座席報告ではありません。
        </p>
      </div>
    </main>
  );
}
