"use client";

import { useState } from "react";
import { CalendarDays, CreditCard, Ticket, UsersRound } from "lucide-react";
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

type Metric = { label: string; value: string };
type MetricGroupData = { icon: LucideIcon; label: string; metrics: Metric[] };
type ArenaTab = "arena" | "upgrade";

function MetricGroup({ group, accent = false }: { group: MetricGroupData; accent?: boolean }) {
  const Icon = group.icon;

  return (
    <section className="border-b border-r border-[#ded8dc] bg-white p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <Icon size={18} strokeWidth={1.8} className={accent ? "text-[#f43679]" : "text-[#625a61]"} />
        <h3 className="text-[13px] font-black text-[#1c171b]">{group.label}</h3>
      </div>
      <div
        className="mt-4 grid border-l border-t border-[#eee8ec]"
        style={{ gridTemplateColumns: `repeat(${group.metrics.length}, minmax(0, 1fr))` }}
      >
        {group.metrics.map((metric) => (
          <div key={metric.label} className="min-w-0 border-b border-r border-[#eee8ec] px-1.5 py-2 text-center sm:px-2">
            <p className="truncate text-[9px] font-bold leading-4 text-[#817981]">{metric.label}</p>
            <p className={`mt-1 text-[14px] font-black tracking-[-0.02em] ${metric.value === "--" ? "text-[#aaa2a8]" : accent ? "text-[#f43679]" : "text-[#1c171b]"}`}>
              {metric.value}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function DataGrid({ groups, accent = false }: { groups: MetricGroupData[]; accent?: boolean }) {
  return (
    <div className="grid border-l border-t border-[#ded8dc] sm:grid-cols-2">
      {groups.map((group) => <MetricGroup key={group.label} group={group} accent={accent} />)}
    </div>
  );
}

export default function TrendSection({ ticketStats, arenaStats, upgradeStats, title = "全公演" }: Props) {
  const [activeArenaTab, setActiveArenaTab] = useState<ArenaTab>("arena");

  const ticketGroups: MetricGroupData[] = [
    {
      icon: UsersRound,
      label: "FC歴",
      metrics: [
        { label: "1年未満", value: detailRateText(ticketStats.fc.under1) },
        { label: "1〜3年", value: detailRateText(ticketStats.fc.one3) },
        { label: "3年以上", value: detailRateText(ticketStats.fc.over3) },
      ],
    },
    {
      icon: Ticket,
      label: "申込枚数",
      metrics: [
        { label: "1枚", value: detailRateText(ticketStats.ticketCount.one) },
        { label: "2枚", value: detailRateText(ticketStats.ticketCount.two) },
        { label: "3枚", value: detailRateText(ticketStats.ticketCount.three) },
        { label: "4枚", value: detailRateText(ticketStats.ticketCount.four) },
      ],
    },
    {
      icon: CalendarDays,
      label: "抽選回",
      metrics: [
        { label: "1次抽選", value: detailRateText(ticketStats.lottery.first) },
        { label: "2次抽選", value: detailRateText(ticketStats.lottery.second) },
        { label: "その他", value: detailRateText(ticketStats.lottery.other) },
      ],
    },
    {
      icon: CreditCard,
      label: "決済方法",
      metrics: [
        { label: "クレカ", value: detailRateText(ticketStats.payment.credit) },
        { label: "その他", value: detailRateText(ticketStats.payment.other) },
      ],
    },
  ];

  const arenaGroups: MetricGroupData[] = activeArenaTab === "arena"
    ? [
        {
          icon: UsersRound,
          label: "FC歴",
          metrics: [
            { label: "1年未満", value: detailRateText(arenaStats.fc.under1.rate) },
            { label: "1〜3年", value: detailRateText(arenaStats.fc.one3.rate) },
            { label: "3年以上", value: detailRateText(arenaStats.fc.over3.rate) },
          ],
        },
        {
          icon: Ticket,
          label: "申込枚数",
          metrics: [
            { label: "1枚", value: detailRateText(arenaStats.ticketCount.one.rate) },
            { label: "2枚", value: detailRateText(arenaStats.ticketCount.two.rate) },
            { label: "3枚", value: detailRateText(arenaStats.ticketCount.three.rate) },
            { label: "4枚", value: detailRateText(arenaStats.ticketCount.four.rate) },
          ],
        },
        {
          icon: CalendarDays,
          label: "抽選回",
          metrics: [
            { label: "1次抽選", value: detailRateText(arenaStats.lottery.first.rate) },
            { label: "2次抽選", value: detailRateText(arenaStats.lottery.second.rate) },
            { label: "その他", value: detailRateText(arenaStats.lottery.other.rate) },
          ],
        },
      ]
    : [
        {
          icon: UsersRound,
          label: "FC歴",
          metrics: [
            { label: "1年未満", value: detailRateText(upgradeStats.fc.under1.rate) },
            { label: "1〜3年", value: detailRateText(upgradeStats.fc.one3.rate) },
            { label: "3年以上", value: detailRateText(upgradeStats.fc.over3.rate) },
          ],
        },
        {
          icon: Ticket,
          label: "申込枚数",
          metrics: [
            { label: "1枚", value: detailRateText(upgradeStats.ticketCount.one.rate) },
            { label: "2枚", value: detailRateText(upgradeStats.ticketCount.two.rate) },
            { label: "3枚", value: detailRateText(upgradeStats.ticketCount.three.rate) },
            { label: "4枚", value: detailRateText(upgradeStats.ticketCount.four.rate) },
          ],
        },
        {
          icon: CreditCard,
          label: "決済方法",
          metrics: [
            { label: "クレカ", value: detailRateText(upgradeStats.payment.credit.rate) },
            { label: "その他", value: detailRateText(upgradeStats.payment.other.rate) },
          ],
        },
      ];

  return (
    <section className="overflow-hidden border border-[#282127] bg-white" aria-label={`${title}の当落・座席データ`}>
      <header className="bg-[#1c171b] px-5 py-5 text-white sm:px-6">
        <p className="text-[10px] font-black tracking-[0.22em] text-[#ff5b96]">TICKET ANALYTICS</p>
        <div className="mt-2 flex items-end justify-between gap-4">
          <h2 className="text-[23px] font-black tracking-[-0.045em]">{title}の当落傾向</h2>
          <span className="mb-1 text-[9px] font-black tracking-[0.14em] text-white/50">ALL RESULTS</span>
        </div>
      </header>

      <div className="p-4 sm:p-6">
        <DataGrid groups={ticketGroups} />
      </div>

      <section className="border-t border-[#282127] bg-[#fff8fa]" aria-labelledby="arena-rate-title">
        <div className="flex items-end justify-between gap-4 px-5 py-5 sm:px-6">
          <div>
            <p className="text-[10px] font-black tracking-[0.2em] text-[#f43679]">SEAT RATE</p>
            <h2 id="arena-rate-title" className="mt-1 text-[21px] font-black tracking-[-0.04em] text-[#1c171b]">アリーナ当選率</h2>
          </div>
          <span className="mb-1 text-[9px] font-black tracking-[0.12em] text-[#817981]">BY PROFILE</span>
        </div>
        <div className="grid grid-cols-2 border-y border-[#ded8dc] bg-white">
          <button
            type="button"
            onClick={() => setActiveArenaTab("arena")}
            className={`zr-focus min-h-12 border-r border-[#ded8dc] text-[12px] font-black transition-colors ${activeArenaTab === "arena" ? "bg-[#f43679] text-white" : "text-[#625a61] hover:bg-[#fff0f5]"}`}
          >
            通常アリーナ
          </button>
          <button
            type="button"
            onClick={() => setActiveArenaTab("upgrade")}
            className={`zr-focus min-h-12 text-[12px] font-black transition-colors ${activeArenaTab === "upgrade" ? "bg-[#f43679] text-white" : "text-[#625a61] hover:bg-[#fff0f5]"}`}
          >
            アプグレ
          </button>
        </div>
        <div className="p-4 sm:p-6">
          <DataGrid groups={arenaGroups} accent />
        </div>
      </section>
    </section>
  );
}
