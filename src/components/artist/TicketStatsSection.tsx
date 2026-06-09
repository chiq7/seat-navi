import { computeTicketResultStats, computeArenaDetailStats } from "@/lib/artistPageStats";
import { fmtPct, rateText, detailRateText } from "@/lib/artistPageHelpers";

type Props = {
  ticketResultStats: ReturnType<typeof computeTicketResultStats>;
  seatStats: { normalArenaRate: number } | null;
  heroUpgradeRate: number | null;
  arenaDetailStats: ReturnType<typeof computeArenaDetailStats>;
};

export function TicketStatsSection({
  ticketResultStats,
  seatStats,
  heroUpgradeRate,
  arenaDetailStats,
}: Props) {
  return (
    <>
      {/* 4. 当選率データ */}
      <section className="mt-5 px-4">
        <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-gray-900">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "#006876" }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          当選率データ
        </h3>

        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {[
              {
                label: "チケット当選率",
                value: rateText(ticketResultStats.rate),
                unit: "%",
                color: "#006876",
              },
              {
                label: "通常当選アリーナ率",
                value: ticketResultStats.normalArenaRate !== null
                  ? fmtPct(ticketResultStats.normalArenaRate)
                  : seatStats ? fmtPct(seatStats.normalArenaRate) : "--",
                unit: "%",
                color: "#006876",
              },
              {
                label: "アプグレ当選率",
                value: ticketResultStats.upgradeRate !== null
                  ? fmtPct(ticketResultStats.upgradeRate)
                  : heroUpgradeRate !== null ? String(heroUpgradeRate) : "--",
                unit: "%",
                color: "#f59e0b",
              },
            ].map((card) => (
              <div key={card.label} className="rounded-2xl border border-slate-100 bg-white p-3 text-center shadow-sm">
                <p className="mb-1 text-[11px] font-bold text-gray-500">{card.label}</p>
                <div className="flex items-end justify-center gap-0.5">
                  <span className="text-3xl font-bold leading-none" style={{ color: card.color }}>
                    {card.value}
                  </span>
                  {card.value !== "--" && (
                    <span className="mb-0.5 text-sm font-bold" style={{ color: card.color }}>
                      {card.unit}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
            <p className="mb-2.5 text-sm font-semibold" style={{ color: "#006876" }}>主要傾向</p>
            <div className="space-y-3">
              {[
                {
                  label: "FC歴別 チケット当選率",
                  items: [
                    ["1年未満", rateText(ticketResultStats.fc.under1)],
                    ["1〜3年", rateText(ticketResultStats.fc.one3)],
                    ["3年以上", rateText(ticketResultStats.fc.over3)],
                  ],
                  cols: "grid-cols-3",
                },
                {
                  label: "申込枚数別 チケット当選率",
                  items: [
                    ["1枚", rateText(ticketResultStats.ticketCount.one)],
                    ["2枚", rateText(ticketResultStats.ticketCount.two)],
                    ["3枚", rateText(ticketResultStats.ticketCount.three)],
                    ["4枚", rateText(ticketResultStats.ticketCount.four)],
                  ],
                  cols: "grid-cols-4",
                },
                {
                  label: "抽選回別 チケット当選率",
                  items: [
                    ["1次抽選", rateText(ticketResultStats.lottery.first)],
                    ["2次抽選", rateText(ticketResultStats.lottery.second)],
                    ["その他", rateText(ticketResultStats.lottery.other)],
                  ],
                  cols: "grid-cols-3",
                },
                {
                  label: "決済方法別 チケット当選率",
                  items: [
                    ["クレカ", rateText(ticketResultStats.payment.credit)],
                    ["その他", rateText(ticketResultStats.payment.other)],
                  ],
                  cols: "grid-cols-2",
                },
              ].map((group) => (
                <div key={group.label}>
                  <p className="mb-1 border-b border-slate-100 pb-0.5 text-[11px] font-bold text-gray-400">
                    {group.label}
                  </p>
                  <div className={`grid ${group.cols} gap-1.5 text-center`}>
                    {group.items.map(([label, val]) => (
                      <div key={label} className="rounded-lg border border-slate-100 bg-slate-50 px-2 py-1.5">
                        <p className="mb-0.5 text-[10px] text-gray-400">{label}</p>
                        <p className="text-sm font-bold" style={{ color: "#006876" }}>
                          {val === "--" ? val : `${val}%`}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* 詳細傾向 */}
      <section className="mt-5 px-4">
        <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-gray-900">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "#006876" }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M11 3a1 1 0 012 0v2.06a8.001 8.001 0 016.94 6.94H22a1 1 0 110 2h-2.06A8.001 8.001 0 0113 20.94V23a1 1 0 11-2 0v-2.06A8.001 8.001 0 014.06 14H2a1 1 0 110-2h2.06A8.001 8.001 0 0111 5.06V3z" />
          </svg>
          詳細傾向
        </h3>

        <div className="space-y-3">
          <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
            <p className="mb-2.5 text-sm font-semibold" style={{ color: "#006876" }}>アリーナ当選率</p>
            <div className="space-y-3">
              {[
                {
                  label: "FC歴別",
                  items: [
                    ["1年未満", arenaDetailStats.fc.under1.rate, arenaDetailStats.fc.under1.total],
                    ["1〜3年", arenaDetailStats.fc.one3.rate, arenaDetailStats.fc.one3.total],
                    ["3年以上", arenaDetailStats.fc.over3.rate, arenaDetailStats.fc.over3.total],
                  ],
                  cols: "grid-cols-3",
                },
                {
                  label: "抽選回別",
                  items: [
                    ["1次抽選", arenaDetailStats.lottery.first.rate, arenaDetailStats.lottery.first.total],
                    ["2次抽選", arenaDetailStats.lottery.second.rate, arenaDetailStats.lottery.second.total],
                    ["その他", arenaDetailStats.lottery.other.rate, arenaDetailStats.lottery.other.total],
                  ],
                  cols: "grid-cols-3",
                },
                {
                  label: "申込枚数別",
                  items: [
                    ["1枚", arenaDetailStats.ticketCount.one.rate, arenaDetailStats.ticketCount.one.total],
                    ["2枚", arenaDetailStats.ticketCount.two.rate, arenaDetailStats.ticketCount.two.total],
                    ["3枚", arenaDetailStats.ticketCount.three.rate, arenaDetailStats.ticketCount.three.total],
                    ["4枚", arenaDetailStats.ticketCount.four.rate, arenaDetailStats.ticketCount.four.total],
                  ],
                  cols: "grid-cols-4",
                },
              ].map((group) => (
                <div key={group.label}>
                  <p className="mb-1 border-b border-slate-100 pb-0.5 text-[11px] font-bold text-gray-400">
                    {group.label}
                  </p>
                  <div className={`grid ${group.cols} gap-1.5 text-center`}>
                    {group.items.map(([label, rate]) => (
                      <div key={label} className="rounded-lg border border-slate-100 bg-slate-50 px-2 py-1.5">
                        <p className="mb-0.5 text-[10px] text-gray-400">{label}</p>
                        <p className="text-sm font-bold" style={{ color: "#006876" }}>
                          {detailRateText(rate as number | null)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>
    </>
  );
}
