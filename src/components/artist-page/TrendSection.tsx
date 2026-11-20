"use client";

import { useState } from "react";
import { CalendarDays, ChevronDown, CreditCard, Ticket, UsersRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { computeTicketResultStats, computeArenaDetailStats, computeUpgradeDetailStats } from "@/lib/artistPageStats";
import { SegmentedControl } from "@/components/common/SegmentedControl";

type TicketStats = ReturnType<typeof computeTicketResultStats>;
type ArenaStats = ReturnType<typeof computeArenaDetailStats>;
type UpgradeStats = ReturnType<typeof computeUpgradeDetailStats>;
type Props = { ticketStats: TicketStats; arenaStats: ArenaStats; upgradeStats: UpgradeStats; title?: string; defaultArenaRateOpen?: boolean; reportCount?: number };
type Count = { won: number; total: number };
type Metric = Count & { label: string };
type Group = { icon: LucideIcon; label: string; metrics: Metric[] };
type ArenaTab = "arena" | "upgrade";

function DataGrid({ groups, resultLabel = "当選" }: { groups: Group[]; resultLabel?: string }) {
  return <div className="grid gap-3 sm:grid-cols-2">{groups.map(group => {
    const Icon = group.icon;
    return <section key={group.label} className="border border-[#ded8dc] bg-white p-3">
      <h3 className="flex items-center gap-2 text-[12px] font-bold"><Icon size={16} aria-hidden="true" />{group.label}</h3>
      <dl className="mt-2 divide-y divide-[#eee8ec]">{group.metrics.map(metric => <div key={metric.label} className="flex min-h-9 items-center justify-between gap-2 py-1 text-[12px]">
        <dt>{metric.label}</dt><dd className="text-right text-[#625a61]">{metric.total > 0 ? <><strong className="text-[#40383d]">{resultLabel}{metric.won}件</strong><span className="ml-2">/ {metric.total}件</span></> : "報告なし"}</dd>
      </div>)}</dl>
    </section>;
  })}</div>;
}

function metrics(labels: string[], counts: Count[]): Metric[] {
  return labels.map((label, index) => ({ label, ...counts[index] }));
}

export default function TrendSection({ ticketStats, arenaStats, upgradeStats, title = "全公演", defaultArenaRateOpen = false, reportCount }: Props) {
  const [activeArenaTab, setActiveArenaTab] = useState<ArenaTab>("arena");
  const [isArenaRateOpen, setIsArenaRateOpen] = useState(defaultArenaRateOpen);
  if (!ticketStats.total) return <section className="border-y border-[#ded8dc] bg-white px-4 py-4" aria-label={`${title}の当落報告`}><p className="text-[13px] text-[#625a61]">集計できる当落報告はまだありません。</p></section>;
  const ticketGroups: Group[] = [
    { icon: UsersRound, label: "ファンクラブ歴", metrics: metrics(["1年未満", "1〜3年", "3年以上"], ticketStats.counts.fc) },
    { icon: Ticket, label: "申込枚数", metrics: metrics(["1枚", "2枚", "3枚", "4枚"], ticketStats.counts.ticketCount) },
    { icon: CalendarDays, label: "抽選回", metrics: metrics(["1次抽選", "2次抽選", "その他"], ticketStats.counts.lottery) },
    { icon: CreditCard, label: "支払い方法", metrics: metrics(["クレジットカード", "その他"], ticketStats.counts.payment) },
  ];
  const seatStats = activeArenaTab === "arena" ? arenaStats : upgradeStats;
  const arenaGroups: Group[] = [
    { icon: UsersRound, label: "ファンクラブ歴", metrics: metrics(["1年未満", "1〜3年", "3年以上"], [seatStats.fc.under1, seatStats.fc.one3, seatStats.fc.over3]) },
    { icon: Ticket, label: "申込枚数", metrics: metrics(["1枚", "2枚", "3枚", "4枚"], [seatStats.ticketCount.one, seatStats.ticketCount.two, seatStats.ticketCount.three, seatStats.ticketCount.four]) },
    ...(activeArenaTab === "arena" ? [{ icon: CalendarDays, label: "抽選回", metrics: metrics(["1次抽選", "2次抽選", "その他"], [arenaStats.lottery.first, arenaStats.lottery.second, arenaStats.lottery.other]) }] : [{ icon: CreditCard, label: "支払い方法", metrics: metrics(["クレジットカード", "その他"], [upgradeStats.payment.credit, upgradeStats.payment.other]) }]),
  ];
  return <section className="community-panel overflow-hidden" aria-label={`${title}の当落・座席データ`}>
    <header className="bg-[#fff0f5] px-4 py-4"><h2 className="text-[21px] font-black text-[#51454c]">集まった当落報告</h2><p className="mt-1 text-[12px] text-[#625a61]">{title}{reportCount !== undefined ? `・投稿${reportCount}件` : ""}</p></header>
    <div className="grid grid-cols-2 gap-3 border-b border-[#ded8dc] px-4 py-4" data-ticket-count-summary>
      <p className="text-[13px] text-[#625a61]">当選<strong className="ml-2 text-[24px] text-[#3d3038]">{ticketStats.won}<span className="text-[12px]">件</span></strong></p>
      <p className="text-[13px] text-[#625a61]">落選<strong className="ml-2 text-[24px] text-[#3d3038]">{ticketStats.lost}<span className="text-[12px]">件</span></strong></p>
      <p className="col-span-2 text-[12px] text-[#625a61]">申込結果{ticketStats.total}件の集計です。公式の当選確率ではありません。</p>
    </div>
    <details className="px-4 text-[12px] text-[#625a61]"><summary className="zr-focus flex min-h-11 cursor-pointer items-center">集計の見方・割合</summary>
      <p className="pb-3">1件の投稿に複数の落選申込を含む場合があります。下の内訳は、各条件が入力された申込結果です。</p>
      <ul className="space-y-2 pb-3">
        <li>当選：{ticketStats.won} / {ticketStats.total}件（{ticketStats.rate}%）</li>
        <li>通常チケットのアリーナ：{ticketStats.normalArenaWon} / {ticketStats.normalArenaCount}件{ticketStats.normalArenaRate == null ? "（報告なし）" : `（${ticketStats.normalArenaRate}%）`}</li>
        <li>アップグレード当選：{ticketStats.upgradeWon} / {ticketStats.upgradeCount}件{ticketStats.upgradeRate == null ? "（報告なし）" : `（${ticketStats.upgradeRate}%）`}</li>
      </ul>
      <p className="pb-3">通常チケットのアリーナ率は、アップグレードが未申込か落選で、座席がアリーナかスタンドと分かる当選報告から計算します。アップグレード当選率は、申込結果が分かる報告だけを数えます。</p>
    </details>
    <details className="border-t border-[#ded8dc]"><summary className="zr-focus flex min-h-12 cursor-pointer items-center px-4 text-[13px] font-bold">条件別の報告を見る</summary><div className="p-3 sm:p-5"><DataGrid groups={ticketGroups} /></div></details>
    <section className="border-t border-divider bg-[#fff8fa]" aria-labelledby="arena-rate-title">
      <button type="button" aria-expanded={isArenaRateOpen} aria-controls="arena-rate-details" onClick={() => setIsArenaRateOpen(open => !open)} className="zr-focus flex min-h-14 w-full items-center justify-between gap-4 px-4 py-3 text-left">
        <h2 id="arena-rate-title" className="text-[18px] font-black">座席・アップグレードの報告</h2><ChevronDown size={18} className={`shrink-0 transition-transform ${isArenaRateOpen ? "rotate-180" : ""}`} />
      </button>
      {isArenaRateOpen && <div id="arena-rate-details"><SegmentedControl value={activeArenaTab} onChange={setActiveArenaTab} options={[{ value: "arena", label: "通常チケット" }, { value: "upgrade", label: "アップグレード" }]} ariaLabel="座席報告の表示切替" className="border-x-0 border-y" />
        <p className="px-4 pt-3 text-[12px] text-[#625a61]">{activeArenaTab === "arena" ? "座席種別が分かる当選報告のうち、アリーナだった件数です。" : "アップグレードの申込結果が分かる報告です。"}</p>
        <div className="p-3 sm:p-5"><DataGrid groups={arenaGroups} resultLabel={activeArenaTab === "arena" ? "アリーナ" : "当選"} /></div>
      </div>}
    </section>
  </section>;
}
