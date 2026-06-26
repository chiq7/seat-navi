"use client";

import { useState } from "react";
import { CalendarDays, ChevronDown, ChevronUp, CreditCard, Ticket, UsersRound } from "lucide-react";

const trendRows = [
  {
    icon: UsersRound,
    label: "FC歴",
    cells: [
      { label: "1年未満", value: "58%" },
      { label: "1〜3年", value: "65%" },
      { label: "3年以上", value: "71%" },
      null,
    ],
  },
  {
    icon: Ticket,
    label: "申込枚数",
    cells: [
      { label: "1枚", value: "67%" },
      { label: "2枚", value: "61%" },
      { label: "3枚", value: "--" },
      { label: "4枚", value: "49%" },
    ],
  },
  {
    icon: CalendarDays,
    label: "抽選回",
    cells: [
      { label: "1次抽選", value: "68%" },
      { label: "2次抽選", value: "54%" },
      { label: "その他", value: "39%" },
      null,
    ],
  },
  {
    icon: CreditCard,
    label: "決済方法",
    cells: [
      { label: "クレカ", value: "63%" },
      { label: "その他", value: "57%" },
      null,
      null,
    ],
  },
];

const arenaRows = [
  {
    icon: UsersRound,
    label: "FC歴",
    cells: [
      { label: "1年未満", value: "33%" },
      { label: "1〜3年", value: "--" },
      { label: "3年以上", value: "--" },
      null,
    ],
  },
  {
    icon: Ticket,
    label: "申込枚数",
    cells: [
      { label: "1枚", value: "50%" },
      { label: "2枚", value: "100%" },
      { label: "3枚", value: "--" },
      { label: "4枚", value: "--" },
    ],
  },
  {
    icon: CalendarDays,
    label: "抽選",
    cells: [
      { label: "1次抽選", value: "75%" },
      { label: "2次抽選", value: "--" },
      { label: "その他", value: "0%" },
      null,
    ],
  },
];

const upgradeRows = [
  {
    icon: UsersRound,
    label: "FC歴",
    cells: [
      { label: "1年未満", value: "--" },
      { label: "1〜3年", value: "--" },
      { label: "3年以上", value: "--" },
      null,
    ],
  },
  {
    icon: Ticket,
    label: "申込枚数",
    cells: [
      { label: "1枚", value: "--" },
      { label: "2枚", value: "--" },
      { label: "3枚", value: "--" },
      { label: "4枚", value: "--" },
    ],
  },
  {
    icon: CreditCard,
    label: "決済方法",
    cells: [
      { label: "クレカ", value: "--" },
      { label: "その他", value: "--" },
      null,
      null,
    ],
  },
];

type TrendRowData = (typeof trendRows)[number];
type ArenaTab = "arena" | "upgrade";

export default function TrendSection() {
  const [activeArenaTab, setActiveArenaTab] = useState<ArenaTab>("arena");
  const detailRows = activeArenaTab === "arena" ? arenaRows : upgradeRows;

  return (
    <section className="mt-1.5 px-4">
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="p-1.5">
          <TrendTabs />
        </div>
        <div className="border-t border-gray-100">
          <TrendCard
            activeTab={activeArenaTab}
            rows={detailRows}
            onTabChange={setActiveArenaTab}
          />
        </div>
      </div>
    </section>
  );
}

export function TrendTabs() {
  return (
    <div className="grid h-11 grid-cols-2 rounded-full border border-gray-200 p-1">
      <button className="rounded-full bg-[#FF6B9D] text-[16px] font-bold text-white" type="button">
        全公演
      </button>
      <button className="rounded-full text-[16px] font-bold text-gray-900" type="button">
        会場別
      </button>
    </div>
  );
}

function TrendCard({
  activeTab,
  rows,
  onTabChange,
}: {
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
      <ArenaDetailCard
        activeTab={activeTab}
        rows={rows}
        onTabChange={onTabChange}
      />
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
