import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  BarChart3,
  ChevronRight,
  LockKeyhole,
  MapPinned,
  MessageCircleHeart,
  Sparkles,
  Ticket,
} from "lucide-react";

export const metadata: Metadata = {
  title: "広告用デモ画面｜ちけレポ",
  robots: { index: false, follow: false },
};

type Creative = "ticket" | "arena" | "report";

const CREATIVE_COPY: Record<Creative, { eyebrow: string; title: ReactNode; icon: ReactNode }> = {
  ticket: {
    eyebrow: "当落レポ",
    title: <>当選の傾向を<br />公演ごとに見える化</>,
    icon: <BarChart3 size={21} strokeWidth={2.3} />,
  },
  arena: {
    eyebrow: "座席・アリーナ予想図",
    title: <>座席報告から<br />入場前の見え方を予想</>,
    icon: <MapPinned size={21} strokeWidth={2.3} />,
  },
  report: {
    eyebrow: "現地レポ",
    title: <>終演後のひとことが<br />次の参戦のヒントに</>,
    icon: <MessageCircleHeart size={21} strokeWidth={2.3} />,
  },
};

function DemoHeader({ creative }: { creative: Creative }) {
  const copy = CREATIVE_COPY[creative];
  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[#ff5791]">
          <Ticket size={25} fill="currentColor" strokeWidth={1.7} />
          <span className="text-[22px] font-extrabold tracking-[-0.08em] text-[#ff4f8b]">ちけレポ</span>
        </div>
        <span className="rounded-full border border-[#f8bfd4] bg-white px-2.5 py-1 text-[10px] font-bold text-[#d9487c]">
          広告用デモ画面
        </span>
      </div>
      <div className="mt-6 flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#ffedf4] text-[#ff4f8b] shadow-[0_7px_18px_rgba(255,79,139,0.13)]">
          {copy.icon}
        </div>
        <div>
          <p className="text-[11px] font-bold tracking-[0.12em] text-[#ff5791]">{copy.eyebrow}</p>
          <h1 className="mt-1 text-[28px] font-extrabold leading-[1.25] tracking-[-0.05em] text-[#17213a]">{copy.title}</h1>
        </div>
      </div>
    </>
  );
}

function EventChip() {
  return (
    <div className="mt-5 rounded-2xl border border-[#f1e6eb] bg-white px-4 py-3 shadow-[0_8px_26px_rgba(67,31,48,0.06)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold text-[#ff4f8b]">TixRepo LIVE DEMO 2026</p>
          <p className="mt-1 text-[14px] font-extrabold text-[#18233e]">テスト公演（表示イメージ）</p>
        </div>
        <div className="shrink-0 text-right text-[10px] font-bold leading-5 text-[#77809a]">
          8.15（土）<br />Kアリーナ横浜
        </div>
      </div>
    </div>
  );
}

function TicketCreative() {
  const rows = [
    { label: "FC先行", detail: "1枚申込", rate: "48%", width: "w-[48%]", color: "bg-[#ff6398]" },
    { label: "FC先行", detail: "2枚申込", rate: "31%", width: "w-[31%]", color: "bg-[#ff99bc]" },
    { label: "一般販売", detail: "指定席", rate: "18%", width: "w-[18%]", color: "bg-[#9a86ed]" },
  ];
  return (
    <>
      <EventChip />
      <section className="mt-4 rounded-[22px] border border-[#f1e6eb] bg-white p-4 shadow-[0_10px_30px_rgba(67,31,48,0.07)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-[#ffedf4] px-2 py-1 text-[10px] font-extrabold text-[#ef3f7d]">当選傾向</span>
            <span className="text-[11px] font-bold text-[#43506b]">条件ごとに見比べる</span>
          </div>
          <span className="text-[10px] font-bold text-[#98a1b5]">集計イメージ</span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-[#fff4f8] p-2.5 text-center">
            <p className="text-[9px] font-bold text-[#a56b82]">当選</p>
            <p className="mt-1 text-[22px] font-extrabold leading-none text-[#ff4f8b]">48<span className="ml-0.5 text-[12px]">%</span></p>
          </div>
          <div className="rounded-xl bg-[#f6f3ff] p-2.5 text-center">
            <p className="text-[9px] font-bold text-[#7767ba]">落選</p>
            <p className="mt-1 text-[22px] font-extrabold leading-none text-[#7965dd]">52<span className="ml-0.5 text-[12px]">%</span></p>
          </div>
          <div className="rounded-xl bg-[#f7f8fc] p-2.5 text-center">
            <p className="text-[9px] font-bold text-[#768098]">報告例</p>
            <p className="mt-1 text-[22px] font-extrabold leading-none text-[#33415d]">126<span className="ml-0.5 text-[12px]">件</span></p>
          </div>
        </div>
        <div className="mt-5 space-y-3">
          {rows.map((row) => (
            <div key={row.label + row.detail}>
              <div className="flex items-center justify-between text-[11px]">
                <p className="font-bold text-[#27314a]">{row.label}<span className="ml-1.5 font-medium text-[#8b94a8]">{row.detail}</span></p>
                <p className="font-extrabold text-[#2e3852]">{row.rate}</p>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#f0f2f7]">
                <div className={`h-full rounded-full ${row.width} ${row.color}`} />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 flex items-center gap-2 rounded-xl border border-[#f5d5e2] bg-[#fff8fb] px-3 py-2.5">
          <LockKeyhole size={15} className="shrink-0 text-[#ff4f8b]" />
          <p className="text-[10px] font-bold leading-4 text-[#525f78]">申込条件ごとの比較は、詳細画面で確認</p>
          <ChevronRight size={15} className="ml-auto shrink-0 text-[#ff4f8b]" />
        </div>
      </section>
    </>
  );
}

function ArenaCreative() {
  const cells = Array.from({ length: 60 }, (_, index) => {
    if ([3, 4, 12, 13, 14, 24, 25, 35, 36, 37, 46].includes(index)) return "bg-[#ff5b91]";
    if ([5, 6, 7, 15, 16, 17, 18, 26, 27, 28, 38, 39, 47, 48].includes(index)) return "bg-[#9a86ed]";
    if ([8, 9, 19, 20, 29, 30, 31, 40, 41, 49, 50].includes(index)) return "bg-[#f7c7da]";
    return "bg-white/35";
  });
  return (
    <>
      <EventChip />
      <section className="mt-4 rounded-[22px] border border-[#273458] bg-[#222c48] p-4 shadow-[0_13px_32px_rgba(28,34,59,0.22)]">
        <div className="flex items-center justify-between text-white">
          <div>
            <p className="text-[10px] font-bold text-[#ffa5c5]">アリーナ予想図</p>
            <p className="mt-1 text-[15px] font-extrabold">座席報告の表示イメージ</p>
          </div>
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold text-white/85">アリーナ</span>
        </div>
        <div className="mt-4 rounded-[16px] border border-white/15 bg-[#111a30] px-3 pb-4 pt-3">
          <div className="mx-auto flex h-8 w-[72%] items-center justify-center rounded-md bg-[#ff5b91] text-[10px] font-extrabold tracking-[0.16em] text-white">STAGE</div>
          <div className="mx-auto mt-3 grid max-w-[270px] grid-cols-10 gap-1.5">
            {cells.map((cell, index) => <span key={index} className={`aspect-square rounded-[3px] ${cell}`} />)}
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-x-3 gap-y-1.5 text-[9px] font-bold text-white/85">
            <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-sm bg-[#ff5b91]" />座席報告</span>
            <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-sm bg-[#9a86ed]" />予想マス</span>
            <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-sm bg-white/35" />未報告</span>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[["B3", "8列"], ["C2", "12列"], ["D1", "5列"]].map(([block, row]) => (
            <div key={block} className="rounded-xl bg-white/8 p-2 text-center">
              <p className="text-[10px] font-extrabold text-white">{block}</p>
              <p className="mt-1 text-[9px] font-bold text-[#bfc8e6]">{row}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function ReportCreative() {
  const reports = [
    { type: "座席レポ", className: "bg-[#f0eaff] text-[#7459cc]", title: "アリーナ B3・8列目", detail: "座席位置と見え方を残せます" },
    { type: "現地レポ", className: "bg-[#fff0e5] text-[#e57c34]", title: "終演後の会場メモ", detail: "規制退場・混雑・演出の情報" },
    { type: "当落レポ", className: "bg-[#ffebf2] text-[#ed4a82]", title: "申込結果のメモ", detail: "申込条件と結果をまとめて確認" },
  ];
  return (
    <>
      <EventChip />
      <section className="mt-4 overflow-hidden rounded-[22px] border border-[#f1e6eb] bg-white shadow-[0_10px_30px_rgba(67,31,48,0.07)]">
        <div className="flex items-center justify-between border-b border-[#f2edf0] px-4 py-3.5">
          <div className="flex items-center gap-2">
            <Sparkles size={17} className="text-[#ff4f8b]" />
            <p className="text-[14px] font-extrabold text-[#24304a]">みんなのレポ</p>
          </div>
          <span className="text-[10px] font-bold text-[#ff4f8b]">投稿画面へ</span>
        </div>
        <div className="divide-y divide-[#f2edf0] px-4">
          {reports.map((report) => (
            <article key={report.type} className="py-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className={`rounded-md px-2 py-1 text-[10px] font-extrabold ${report.className}`}>{report.type}</span>
                <span className="text-[10px] font-bold text-[#9ca4b4]">表示イメージ</span>
              </div>
              <p className="mt-2 text-[14px] font-extrabold text-[#23304b]">{report.title}</p>
              <p className="mt-1 text-[11px] font-medium text-[#7e889d]">{report.detail}</p>
            </article>
          ))}
        </div>
        <div className="m-3 rounded-2xl bg-gradient-to-r from-[#ff5b91] to-[#fc82ad] px-4 py-3 text-white shadow-[0_8px_18px_rgba(255,91,145,0.22)]">
          <p className="text-[12px] font-extrabold">写真がなくても、ひとことから。</p>
          <p className="mt-1 text-[10px] font-medium text-white/85">次に行く人の役に立つ情報を残せます</p>
        </div>
      </section>
    </>
  );
}

export default async function AdDemoPage({
  searchParams,
}: {
  searchParams: Promise<{ card?: string }>;
}) {
  const { card } = await searchParams;
  const creative: Creative = card === "arena" || card === "report" ? card : "ticket";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_92%_4%,#ffe3ef_0,transparent_28%),linear-gradient(180deg,#fff8fb_0%,#f8f9ff_100%)] px-4 pb-8 pt-5">
      <DemoHeader creative={creative} />
      {creative === "ticket" && <TicketCreative />}
      {creative === "arena" && <ArenaCreative />}
      {creative === "report" && <ReportCreative />}
      <p className="mx-auto mt-5 max-w-[340px] text-center text-[10px] font-medium leading-4 text-[#8b94a8]">
        本画面内の名称・数値・投稿は広告用のサンプルです。実際の集計値・利用者投稿ではありません。
      </p>
      <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] font-extrabold text-[#ff4f8b]">
        <Ticket size={14} fill="currentColor" strokeWidth={1.7} />
        tixrepo.com
      </div>
    </main>
  );
}
