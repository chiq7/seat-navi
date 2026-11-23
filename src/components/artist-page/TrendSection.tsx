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

/** Below this many results a tile shows the count (won/total), not a percentage that a couple of posts would swing. */
const MIN_RATE_SAMPLE = 10;

/** Tile grid from the original design (public/images/ads/tixrepo-ticket-analytics-demo-v3.png): a big rate per
 * condition with its count underneath; "—" until a report arrives so the table always shows. */
function MetricGroup({ group, accent }: { group: Group; accent: boolean }) {
  const Icon = group.icon;
  return <section className="border-b border-r border-[#ded8dc] bg-white p-3 sm:p-4">
    <h3 className="flex items-center gap-2 text-[12px] font-black text-[#1c171b]"><Icon size={16} strokeWidth={1.8} aria-hidden="true" className={accent ? "text-[#f43679]" : "text-[#625a61]"} />{group.label}</h3>
    <dl className="mt-3 grid border-l border-t border-[#eee8ec]" style={{ gridTemplateColumns: `repeat(${group.metrics.length}, minmax(0, 1fr))` }}>
      {group.metrics.map(metric => <div key={metric.label} className="min-w-0 border-b border-r border-[#eee8ec] px-0.5 py-1.5 text-center sm:px-2 sm:py-2">
        <dt className="truncate text-[9px] font-bold leading-4 text-[#817981]">{metric.label}</dt>
        <dd className={`mt-0.5 text-[14px] font-black tracking-[-0.02em] ${metric.total ? accent ? "text-[#f43679]" : "text-[#1c171b]" : "text-[#b3aab0]"}`}>
          {!metric.total ? "—" : metric.total >= MIN_RATE_SAMPLE ? `${Math.round(metric.won / metric.total * 100)}%` : `${metric.won}/${metric.total}`}
        </dd>
        <dd className="text-[9px] text-[#817981]">{!metric.total ? "0件" : metric.total >= MIN_RATE_SAMPLE ? `${metric.won}/${metric.total}件` : "件"}</dd>
      </div>)}
    </dl>
  </section>;
}

function DataGrid({ groups, accent = false }: { groups: Group[]; accent?: boolean }) {
  return <div className="grid grid-cols-1 border-l border-t border-[#ded8dc] min-[360px]:grid-cols-2">{groups.map(group => <MetricGroup key={group.label} group={group} accent={accent} />)}</div>;
}

function metrics(labels: string[], counts: Count[]): Metric[] {
  return labels.map((label, index) => ({ label, ...counts[index] }));
}

export default function TrendSection({ ticketStats, arenaStats, upgradeStats, title = "全公演", defaultArenaRateOpen = false, reportCount }: Props) {
  const [activeArenaTab, setActiveArenaTab] = useState<ArenaTab>("arena");
  const [isArenaRateOpen, setIsArenaRateOpen] = useState(defaultArenaRateOpen);
  // With no reports the same tables still show (each row "報告なし"), so visitors see what gets collected.
  const empty = !ticketStats.total;
  const ticketGroups: Group[] = [
    { icon: UsersRound, label: "FC歴", metrics: metrics(["1年未満", "1〜3年", "3年以上"], ticketStats.counts.fc) },
    { icon: Ticket, label: "申込枚数", metrics: metrics(["1枚", "2枚", "3枚", "4枚"], ticketStats.counts.ticketCount) },
    { icon: CalendarDays, label: "抽選回", metrics: metrics(["1次抽選", "2次抽選", "その他"], ticketStats.counts.lottery) },
    { icon: CreditCard, label: "決済方法", metrics: metrics(["クレカ", "その他"], ticketStats.counts.payment) },
  ];
  const seatStats = activeArenaTab === "arena" ? arenaStats : upgradeStats;
  const arenaGroups: Group[] = [
    { icon: UsersRound, label: "FC歴", metrics: metrics(["1年未満", "1〜3年", "3年以上"], [seatStats.fc.under1, seatStats.fc.one3, seatStats.fc.over3]) },
    { icon: Ticket, label: "申込枚数", metrics: metrics(["1枚", "2枚", "3枚", "4枚"], [seatStats.ticketCount.one, seatStats.ticketCount.two, seatStats.ticketCount.three, seatStats.ticketCount.four]) },
    ...(activeArenaTab === "arena" ? [{ icon: CalendarDays, label: "抽選回", metrics: metrics(["1次抽選", "2次抽選", "その他"], [arenaStats.lottery.first, arenaStats.lottery.second, arenaStats.lottery.other]) }] : [{ icon: CreditCard, label: "決済方法", metrics: metrics(["クレカ", "その他"], [upgradeStats.payment.credit, upgradeStats.payment.other]) }]),
  ];
  return <section className="community-panel overflow-hidden" aria-label={`${title}の当落・座席データ`}>
    <header className="bg-[#fff0f5] px-5 py-4 text-[#51454c] sm:px-6">
      <p className="text-[10px] font-black tracking-[0.22em] text-[#d64175]">TICKET ANALYTICS</p>
      <h2 className="mt-2 text-[23px] font-black tracking-[-0.045em]">{title}の当落傾向</h2>
      <p className="mt-1 text-[12px] text-[#625a61]">集まった当落報告{reportCount !== undefined ? `・投稿${reportCount}件` : ""}</p>
    </header>
    <div className="grid grid-cols-2 gap-3 border-b border-[#ded8dc] px-4 py-3" data-ticket-count-summary>
      <p className="text-[13px] text-[#625a61]">当選<strong className="ml-2 text-[24px] text-[#3d3038]">{ticketStats.won}<span className="text-[12px]">件</span></strong></p>
      <p className="text-[13px] text-[#625a61]">落選<strong className="ml-2 text-[24px] text-[#3d3038]">{ticketStats.lost}<span className="text-[12px]">件</span></strong></p>
      <p className="col-span-2 text-[12px] text-[#625a61]">{empty ? "まだ報告がありません。当選・落選の報告が届くと、下の表に条件別で集計されます。" : `申込結果${ticketStats.total}件の集計です。公式の当選確率ではありません。報告が${MIN_RATE_SAMPLE}件未満の項目は「当選/全体」の件数で表示します。`}</p>
    </div>
    <details className="px-4 text-[12px] text-[#625a61]"><summary className="zr-focus flex min-h-11 cursor-pointer items-center">集計の見方・割合</summary>
      <p className="pb-3">1件の投稿に複数の落選申込を含む場合があります。下の表は、各条件が入力された申込結果のうち当選の割合と件数です。</p>
      <ul className="space-y-2 pb-3">
        <li>当選：{ticketStats.won} / {ticketStats.total}件{empty ? "（報告なし）" : `（${ticketStats.rate}%）`}</li>
        <li>通常チケットのアリーナ：{ticketStats.normalArenaWon} / {ticketStats.normalArenaCount}件{ticketStats.normalArenaRate == null ? "（報告なし）" : `（${ticketStats.normalArenaRate}%）`}</li>
        <li>アップグレード当選：{ticketStats.upgradeWon} / {ticketStats.upgradeCount}件{ticketStats.upgradeRate == null ? "（報告なし）" : `（${ticketStats.upgradeRate}%）`}</li>
      </ul>
      <p className="pb-3">通常チケットのアリーナ率は、アップグレードが未申込か落選で、座席がアリーナかスタンドと分かる当選報告から計算します。アップグレード当選率は、申込結果が分かる報告だけを数えます。</p>
    </details>
    <div className="p-3 sm:p-5"><DataGrid groups={ticketGroups} /></div>
    <section className="border-t border-divider bg-[#fff8fa]" aria-labelledby="arena-rate-title">
      <button type="button" aria-expanded={isArenaRateOpen} aria-controls="arena-rate-details" onClick={() => setIsArenaRateOpen(open => !open)} className="zr-focus flex min-h-[70px] w-full items-end justify-between gap-4 px-5 py-4 text-left sm:px-6">
        <span>
          <span className="block text-[10px] font-black tracking-[0.2em] text-[#f43679]">SEAT RATE</span>
          <span id="arena-rate-title" className="mt-1 block text-[21px] font-black tracking-[-0.04em] text-[#1c171b]">アリーナ・アプグレの内訳</span>
        </span>
        <span className="mb-1 inline-flex items-center gap-2 text-[10px] font-black tracking-[0.08em] text-[#625a61]">{isArenaRateOpen ? "閉じる" : "詳細を見る"}<ChevronDown size={16} aria-hidden="true" className={`transition-transform ${isArenaRateOpen ? "rotate-180" : ""}`} /></span>
      </button>
      {isArenaRateOpen && <div id="arena-rate-details"><SegmentedControl value={activeArenaTab} onChange={setActiveArenaTab} options={[{ value: "arena", label: "通常アリーナ" }, { value: "upgrade", label: "アプグレ" }]} ariaLabel="アリーナ・アプグレの表示切替" className="border-x-0 border-y" />
        <p className="px-4 pt-3 text-[12px] text-[#625a61]">{activeArenaTab === "arena" ? "座席種別が分かる当選報告のうち、アリーナだった割合です。" : "アップグレードの申込結果が分かる報告のうち、当選の割合です。"}</p>
        <div className="p-3 sm:p-5"><DataGrid groups={arenaGroups} accent /></div>
      </div>}
    </section>
  </section>;
}
