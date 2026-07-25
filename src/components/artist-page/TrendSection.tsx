"use client";

import { useState } from "react";
import { CalendarDays, ChevronDown, ChevronUp, CreditCard, Ticket, UsersRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { computeTicketResultStats, computeArenaDetailStats, computeUpgradeDetailStats } from "@/lib/artistPageStats";
import { detailRateText } from "@/lib/artistPageHelpers";

type TicketStats = ReturnType<typeof computeTicketResultStats>;
type ArenaStats = ReturnType<typeof computeArenaDetailStats>;
type UpgradeStats = ReturnType<typeof computeUpgradeDetailStats>;

type Props = {
  ticketStats: TicketStats;
  arenaStats: ArenaStats;
  upgradeStats: UpgradeStats;
  title?: string;
};

type Cell = { label: string; value: string } | null;
type TrendRowData = { icon: LucideIcon; label: string; cells: Cell[] };

type ArenaTab = "arena" | "upgrade";

export default function TrendSection({ ticketStats, arenaStats, upgradeStats, title = "全公演" }: Props) {
  const [activeArenaTab, setActiveArenaTab] = useState<ArenaTab>("arena");

  const trendRows: TrendRowData[] = [
    {
      icon: UsersRound,
      label: "FC歴",
      cells: [
        { label: "1年未満", value: detailRateText(ticketStats.fc.under1) },
        { label: "1〜3年",  value: detailRateText(ticketStats.fc.one3) },
        { label: "3年以上", value: detailRateText(ticketStats.fc.over3) },
        null,
      ],
    },
    {
      icon: Ticket,
      label: "申込枚数",
      cells: [
        { label: "1枚", value: detailRateText(ticketStats.ticketCount.one) },
        { label: "2枚", value: detailRateText(ticketStats.ticketCount.two) },
        { label: "3枚", value: detailRateText(ticketStats.ticketCount.three) },
        { label: "4枚", value: detailRateText(ticketStats.ticketCount.four) },
      ],
    },
    {
      icon: CalendarDays,
      label: "抽選回",
      cells: [
        { label: "1次抽選", value: detailRateText(ticketStats.lottery.first) },
        { label: "2次抽選", value: detailRateText(ticketStats.lottery.second) },
        { label: "その他",  value: detailRateText(ticketStats.lottery.other) },
        null,
      ],
    },
    {
      icon: CreditCard,
      label: "決済方法",
      cells: [
        { label: "クレカ",  value: detailRateText(ticketStats.payment.credit) },
        { label: "その他",  value: detailRateText(ticketStats.payment.other) },
        null,
        null,
      ],
    },
  ];

  const arenaRows: TrendRowData[] = [
    {
      icon: UsersRound,
      label: "FC歴",
      cells: [
        { label: "1年未満", value: detailRateText(arenaStats.fc.under1.rate) },
        { label: "1〜3年",  value: detailRateText(arenaStats.fc.one3.rate) },
        { label: "3年以上", value: detailRateText(arenaStats.fc.over3.rate) },
        null,
      ],
    },
    {
      icon: Ticket,
      label: "申込枚数",
      cells: [
        { label: "1枚", value: detailRateText(arenaStats.ticketCount.one.rate) },
        { label: "2枚", value: detailRateText(arenaStats.ticketCount.two.rate) },
        { label: "3枚", value: detailRateText(arenaStats.ticketCount.three.rate) },
        { label: "4枚", value: detailRateText(arenaStats.ticketCount.four.rate) },
      ],
    },
    {
      icon: CalendarDays,
      label: "抽選",
      cells: [
        { label: "1次抽選", value: detailRateText(arenaStats.lottery.first.rate) },
        { label: "2次抽選", value: detailRateText(arenaStats.lottery.second.rate) },
        { label: "その他",  value: detailRateText(arenaStats.lottery.other.rate) },
        null,
      ],
    },
  ];

  const upgradeRows: TrendRowData[] = [
    {
      icon: UsersRound,
      label: "FC歴",
      cells: [
        { label: "1年未満", value: detailRateText(upgradeStats.fc.under1.rate) },
        { label: "1〜3年",  value: detailRateText(upgradeStats.fc.one3.rate) },
        { label: "3年以上", value: detailRateText(upgradeStats.fc.over3.rate) },
        null,
      ],
    },
    {
      icon: Ticket,
      label: "申込枚数",
      cells: [
        { label: "1枚", value: detailRateText(upgradeStats.ticketCount.one.rate) },
        { label: "2枚", value: detailRateText(upgradeStats.ticketCount.two.rate) },
        { label: "3枚", value: detailRateText(upgradeStats.ticketCount.three.rate) },
        { label: "4枚", value: detailRateText(upgradeStats.ticketCount.four.rate) },
      ],
    },
    {
      icon: CreditCard,
      label: "決済方法",
      cells: [
        { label: "クレカ",  value: detailRateText(upgradeStats.payment.credit.rate) },
        { label: "その他",  value: detailRateText(upgradeStats.payment.other.rate) },
        null,
        null,
      ],
    },
  ];

  const detailRows = activeArenaTab === "arena" ? arenaRows : upgradeRows;

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="p-1.5">
        <h2 className="flex h-11 items-center justify-center text-[16px] font-bold text-gray-900">
          {title}
        </h2>
      </div>
      <div className="border-t border-gray-100">
        <TrendCard
          trendRows={trendRows}
          activeTab={activeArenaTab}
          rows={detailRows}
          onTabChange={setActiveArenaTab}
        />
      </div>
    </div>
  );
}

function TrendCard({
  trendRows,
  activeTab,
  rows,
  onTabChange,
}: {
  trendRows: TrendRowData[];
  activeTab: ArenaTab;
  rows: TrendRowData[];
  onTabChange: (tab: ArenaTab) => void;
}) {
  return (
    <div>
      <div className="divide-y divide-gray-100">
        {trendRows.map((row) => (
          <TrendRow key={row.label} row={row} />
        ))}
      </div>
      <ArenaDetailCard activeTab={activeTab} rows={rows} onTabChange={onTabChange} />
    </div>
  );
}

function ArenaDetailCard({
  activeTab,
  rows,
  onTabChange,
}: {
  activeTab: ArenaTab;
  rows: TrendRowData[];
  onTabChange: (tab: ArenaTab) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ToggleIcon = isOpen ? ChevronUp : ChevronDown;

  return (
    <div className="border-t border-gray-100">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="flex w-full items-center justify-between px-4 py-3"
      >
        <h3 className="text-[17px] font-bold leading-tight text-gray-900">アリーナ当選率</h3>
        <div className="ml-auto flex items-center gap-1 text-[#FF6B9D]">
          <span className="text-[14px] font-bold leading-tight">詳細を見る</span>
          <ToggleIcon size={18} strokeWidth={2.2} />
        </div>
      </button>
      {isOpen ? (
        <>
          <div className="px-4">
            <div className="grid h-10 grid-cols-2 rounded-full border border-gray-200 p-1">
              <button
                type="button"
                onClick={() => onTabChange("arena")}
                className={`rounded-full text-[14px] font-bold ${
                  activeTab === "arena" ? "bg-[#FF6B9D] text-white" : "text-gray-900"
                }`}
              >
                通常アリーナ
              </button>
              <button
                type="button"
                onClick={() => onTabChange("upgrade")}
                className={`rounded-full text-[14px] font-bold ${
                  activeTab === "upgrade" ? "bg-[#FF6B9D] text-white" : "text-gray-900"
                }`}
              >
                アプグレ
              </button>
            </div>
          </div>
          <div className="mt-3 divide-y divide-gray-100 border-t border-gray-100">
            {rows.map((row) => (
              <TrendRow key={row.label} row={row} valueColorClass="text-[#D9467A]" valueSizeClass="text-[14px]" />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function TrendRow({
  row,
  valueColorClass = "text-[#F4A0BC]",
  valueSizeClass = "text-[13px]",
}: {
  row: TrendRowData;
  valueColorClass?: string;
  valueSizeClass?: string;
}) {
  const Icon = row.icon;

  return (
    <div className="grid grid-cols-[30px_98px_1fr] items-center gap-1 px-3.5 py-2.5">
      <Icon size={24} strokeWidth={1.9} className="text-gray-500" />
      <div className="min-w-0">
        <p className="truncate text-[15px] font-bold leading-tight text-gray-900">{row.label}</p>
      </div>
      <div className="ml-auto grid grid-cols-4 items-center justify-items-end gap-1">
        {row.cells.map((item, index) =>
          item ? (
            <div key={item.label} className="w-[60px] min-w-0 text-center">
              <p className="truncate text-center text-[10px] font-medium leading-tight text-gray-500">{item.label}</p>
              <p
                className={`text-center ${valueSizeClass} font-bold leading-tight ${
                  item.value === "--" ? "text-[#9CA3AF]" : valueColorClass
                }`}
              >
                {item.value}
              </p>
            </div>
          ) : (
            <div key={`empty-${index}`} className="w-[60px]" />
          ),
        )}
      </div>
    </div>
  );
}
