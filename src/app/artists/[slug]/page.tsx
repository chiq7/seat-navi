"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { findArtistBySlug } from "@/lib/artists";
import { genreLabel } from "@/lib/utils";
import type { CrawledEvent } from "@/lib/types";

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const GENRE_BADGE: Record<string, string> = {
  kpop:        "bg-violet-100 text-violet-700",
  johnnys:     "bg-blue-100   text-blue-700",
  female_idol: "bg-pink-100   text-pink-700",
  male_idol:   "bg-sky-100    text-sky-700",
  other:       "bg-gray-100   text-gray-600",
};

const LOTTERY_LABEL: Record<string, string> = {
  fc1:        "FC1次",
  fc2:        "FC2次",
  general:    "一般",
  upgrade:    "アプグレ",
  revival:    "復活当選",
  production: "制作開放",
};

const LOTTERY_COLOR: Record<string, string> = {
  fc1:        "bg-violet-100 text-violet-700",
  fc2:        "bg-purple-100 text-purple-700",
  general:    "bg-gray-100   text-gray-600",
  upgrade:    "bg-amber-100  text-amber-700",
  revival:    "bg-green-100  text-green-700",
  production: "bg-blue-100   text-blue-700",
};

const BLOCK_GROUPS = [
  { label: "アリーナ中央", options: ["A","B","C","D","E","F","G"] },
  { label: "サイド・特殊",  options: ["SS","SA","SB","SC","SD","SE","SF"] },
];

const ALL_LOTTERY_OPTIONS = [
  { value: "fc1",        label: "FC1次（最速含む）" },
  { value: "fc2",        label: "FC2次" },
  { value: "general",    label: "一般" },
  { value: "revival",    label: "復活当選" },
  { value: "production", label: "制作開放" },
];

const ARENA_PREFIXES  = ["A","B","C","D","E","F","G"];
const SPECIAL_PREFIXES = ["SS","SA","SB","SC","SD","SE","SF"];

// ---------------------------------------------------------------------------
// ユーティリティ
// ---------------------------------------------------------------------------

function fmtDate(d: string | null) {
  if (!d) return "日程未定";
  const [y, m, day] = d.split("-").map(Number);
  const w = ["日","月","火","水","木","金","土"][new Date(y, m - 1, day).getDay()];
  return `${m}/${day}(${w})`;
}

function fmtDatetime(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  const event = new Date(y, m - 1, d);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((event.getTime() - today.getTime()) / 86_400_000);
}

function randomId() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 20);
}

// ---------------------------------------------------------------------------
// 型
// ---------------------------------------------------------------------------

type AnalyticsReport = {
  id: string;
  event_id: string;
  block: string;
  row_num: number;
  seat_num: number;
  lottery_type: string;
  created_at: string;
};

type BlockStat = { count: number; upgrade: number; fc: number; general: number };

type AfterSummary = {
  id: string;
  event_id: string;
  hanamichi: string | null;
  torokko: string | null;
  center_stage: string | null;
  kyakukudari: string | null;
  visibility: number | null;
  fansa: boolean | null;
  satisfaction: number | null;
  photo_paths: string[];
  created_at: string;
};

// ---------------------------------------------------------------------------
// ブロック図
// ---------------------------------------------------------------------------

function BlockDiagram({ reports }: { reports: AnalyticsReport[] }) {
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);

  const blockStats = useMemo<Map<string, BlockStat>>(() => {
    const map = new Map<string, BlockStat>();
    for (const r of reports) {
      const b = r.block.trim();
      if (!map.has(b)) map.set(b, { count: 0, upgrade: 0, fc: 0, general: 0 });
      const s = map.get(b)!;
      s.count++;
      if (r.lottery_type === "upgrade") s.upgrade++;
      if (r.lottery_type === "fc1" || r.lottery_type === "fc2") s.fc++;
      if (r.lottery_type === "general") s.general++;
    }
    return map;
  }, [reports]);

  const grouped = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const block of blockStats.keys()) {
      const prefix = block.replace(/\d+$/, "") || block;
      if (!map.has(prefix)) map.set(prefix, []);
      map.get(prefix)!.push(block);
    }
    for (const blocks of map.values()) {
      blocks.sort((a, b) => (parseInt(a.replace(/\D/g,""))||0) - (parseInt(b.replace(/\D/g,""))||0));
    }
    return map;
  }, [blockStats]);

  const arenaBlocks  = ARENA_PREFIXES.flatMap(p => grouped.get(p) ?? []);
  const specialBlocks = SPECIAL_PREFIXES.flatMap(p => grouped.get(p) ?? []);
  const otherBlocks  = [...grouped.entries()]
    .filter(([p]) => !ARENA_PREFIXES.includes(p) && !SPECIAL_PREFIXES.includes(p))
    .flatMap(([, b]) => b);

  function tileClass(block: string): string {
    const s = blockStats.get(block);
    const c = s?.count ?? 0;
    const base = "rounded-lg border px-2.5 py-2 text-xs font-bold transition-all active:scale-95";
    const ring = selectedBlock === block ? " ring-2 ring-[var(--accent)] ring-offset-1" : "";
    if (c >= 6) return `${base} bg-[var(--accent)] text-white border-[var(--accent)]${ring}`;
    if (c >= 3) return `${base} bg-violet-300 text-white border-violet-300${ring}`;
    if (c >= 1) return `${base} bg-violet-100 text-violet-700 border-violet-200${ring}`;
    return `${base} bg-gray-100 text-gray-400 border-gray-200${ring}`;
  }

  function BlockTile({ block }: { block: string }) {
    const cnt = blockStats.get(block)?.count ?? 0;
    return (
      <button
        type="button"
        onClick={() => setSelectedBlock(selectedBlock === block ? null : block)}
        className={tileClass(block)}
      >
        {block}
        <span className="ml-1 text-[9px] opacity-70">{cnt}</span>
      </button>
    );
  }

  const sel = selectedBlock ? blockStats.get(selectedBlock) : null;

  if (blockStats.size === 0) {
    return (
      <div className="flex flex-col items-center py-10 text-center">
        <span className="text-4xl">🗺️</span>
        <p className="mt-2 text-sm font-semibold text-gray-500">まだ座席報告がありません</p>
        <p className="mt-1 text-xs text-gray-400">最初の報告者になって予想図を作ろう！</p>
      </div>
    );
  }

  return (
    <div>
      {/* ステージ */}
      <div className="mb-5 flex justify-center">
        <div className="rounded-xl bg-gray-800 px-12 py-2.5 text-xs font-bold tracking-widest text-white">
          STAGE
        </div>
      </div>

      {/* スタンド・特殊（ステージ側） */}
      {specialBlocks.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-gray-400">スタンド・特殊</p>
          <div className="flex flex-wrap gap-1.5">
            {specialBlocks.map(b => <BlockTile key={b} block={b} />)}
          </div>
        </div>
      )}

      {/* アリーナ */}
      {arenaBlocks.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-gray-400">アリーナ</p>
          <div className="flex flex-wrap gap-1.5">
            {arenaBlocks.map(b => <BlockTile key={b} block={b} />)}
          </div>
        </div>
      )}

      {/* その他ブロック */}
      {otherBlocks.length > 0 && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-1.5">
            {otherBlocks.map(b => <BlockTile key={b} block={b} />)}
          </div>
        </div>
      )}

      {/* 選択ブロック詳細 */}
      {selectedBlock && sel && (
        <div className="mb-3 rounded-xl bg-violet-50 px-4 py-3">
          <p className="text-xs font-bold text-violet-900">{selectedBlock}ブロック — {sel.count}件の報告</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {sel.fc > 0 && <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700">FC {sel.fc}件</span>}
            {sel.upgrade > 0 && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">アプグレ {sel.upgrade}件</span>}
            {sel.general > 0 && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">一般 {sel.general}件</span>}
          </div>
        </div>
      )}

      {/* 凡例 */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-gray-400">
        <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded border border-gray-200 bg-gray-100"/>未報告</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded bg-violet-100"/>1〜2件</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded bg-violet-300"/>3〜5件</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded bg-[var(--accent)]"/>6件以上</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// アンケートリザルト
// ---------------------------------------------------------------------------

function SurveyResults({ reports }: { reports: AnalyticsReport[] }) {
  const stats = useMemo(() => {
    if (reports.length === 0) return null;

    const total = reports.length;
    const lotteryMap = new Map<string, number>();
    const blockMap   = new Map<string, number>();

    for (const r of reports) {
      lotteryMap.set(r.lottery_type, (lotteryMap.get(r.lottery_type) ?? 0) + 1);
      blockMap.set(r.block, (blockMap.get(r.block) ?? 0) + 1);
    }

    const upgradeCount = lotteryMap.get("upgrade") ?? 0;
    const lotteryEntries = [...lotteryMap.entries()]
      .filter(([k]) => k !== "upgrade")
      .sort((a, b) => b[1] - a[1]);

    const sortedBlocks = [...blockMap.entries()].sort((a, b) => b[1] - a[1]);
    const topBlocks    = sortedBlocks.slice(0, 5).map(([b]) => b);
    const lowBlocks    = sortedBlocks.filter(([, n]) => n < 3).map(([b]) => b);

    return { total, upgradeCount, lotteryEntries, topBlocks, lowBlocks };
  }, [reports]);

  if (!stats || stats.total === 0) return null;

  const maxLottery = Math.max(...stats.lotteryEntries.map(([,n]) => n), 1);

  return (
    <div className="space-y-4">
      {/* アプグレ割合 */}
      {stats.upgradeCount > 0 && (
        <div className="flex items-center gap-3 rounded-xl bg-amber-50 px-3 py-2.5">
          <span className="text-lg">⚡</span>
          <div>
            <p className="text-xs font-bold text-amber-800">アップグレード当選</p>
            <p className="text-[11px] text-amber-700">
              {stats.upgradeCount}件 / {stats.total}件中 ({Math.round(stats.upgradeCount / stats.total * 100)}%)
            </p>
          </div>
        </div>
      )}

      {/* 抽選枠分布 */}
      {stats.lotteryEntries.length > 0 && (
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-gray-400">抽選枠の内訳</p>
          <div className="space-y-1.5">
            {stats.lotteryEntries.map(([key, count]) => (
              <div key={key} className="flex items-center gap-2">
                <span className="w-16 shrink-0 text-[10px] font-semibold text-gray-600">{LOTTERY_LABEL[key] ?? key}</span>
                <div className="flex-1 overflow-hidden rounded-full bg-gray-100 h-1.5">
                  <div
                    className="h-1.5 rounded-full bg-[var(--accent)]"
                    style={{ width: `${Math.round((count / maxLottery) * 100)}%` }}
                  />
                </div>
                <span className="w-6 shrink-0 text-right text-[10px] text-gray-400">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 情報不足ブロック */}
      {stats.lowBlocks.length > 0 && (
        <div className="rounded-xl border border-dashed border-gray-200 p-3">
          <p className="mb-1.5 text-[10px] font-bold text-gray-500">📢 情報が足りないブロック（3件未満）</p>
          <p className="text-xs text-gray-600">{stats.lowBlocks.join(" / ")}</p>
          <p className="mt-1 text-[10px] text-gray-400">このブロックに当選した方の報告をお待ちしています</p>
        </div>
      )}

      {/* 報告が多いブロック */}
      {stats.topBlocks.length > 0 && (
        <div>
          <p className="mb-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wide">報告が多いブロック</p>
          <div className="flex flex-wrap gap-1.5">
            {stats.topBlocks.map(b => (
              <span key={b} className="rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-bold text-violet-700">{b}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// インライン座席報告フォーム
// ---------------------------------------------------------------------------

function InlineReportForm({
  events,
  defaultEventId,
  onSuccess,
}: {
  events: CrawledEvent[];
  defaultEventId?: string;
  onSuccess: () => void;
}) {
  const [selectedEventId, setSelectedEventId] = useState(defaultEventId ?? "");
  const [blockPrefix,   setBlockPrefix]   = useState("");
  const [blockNum,      setBlockNum]      = useState("");
  const [rowNum,        setRowNum]        = useState("");
  const [ticketCount,   setTicketCount]   = useState(1);
  const [leftSeatNum,   setLeftSeatNum]   = useState("");
  const [lotteryType,   setLotteryType]   = useState("");
  const [isUpgrade,     setIsUpgrade]     = useState<boolean | null>(null);
  const [lotteryRound,  setLotteryRound]  = useState("");
  const [lotteryName,   setLotteryName]   = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [submitting,    setSubmitting]    = useState(false);
  const [formError,     setFormError]     = useState("");

  const selectedEvent = events.find(ev => ev.id === selectedEventId);
  const lotteryOptions = selectedEvent?.lottery_types?.length
    ? ALL_LOTTERY_OPTIONS.filter(o => selectedEvent.lottery_types!.includes(o.value))
    : ALL_LOTTERY_OPTIONS;

  const blockFull = blockPrefix + blockNum;
  const previewSeats = leftSeatNum
    ? Array.from({ length: ticketCount }, (_, i) => parseInt(leftSeatNum, 10) + i).filter(n => !isNaN(n))
    : [];

  function fmtOption(ev: CrawledEvent) {
    if (!ev.date) return `${ev.title} ${ev.venue}`;
    const [y, m, d] = ev.date.split("-").map(Number);
    const w = ["日","月","火","水","木","金","土"][new Date(y, m-1, d).getDay()];
    return `${m}/${d}(${w}) ${ev.title} ${ev.venue}`;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    const row      = parseInt(rowNum, 10);
    const leftSeat = parseInt(leftSeatNum, 10);

    if (!selectedEventId)           { setFormError("ツアー・日程を選択してください"); return; }
    if (isUpgrade === null)          { setFormError("アップグレード当選かどうかを選択してください"); return; }
    if (!blockPrefix)               { setFormError("ブロックを選択してください"); return; }
    if (!blockNum.trim())           { setFormError("ブロック番号を入力してください"); return; }
    if (!row || row < 1)            { setFormError("列番号は1以上の数値を入力してください"); return; }
    if (!leftSeat || leftSeat < 1)  { setFormError("座席番号は1以上の数値を入力してください"); return; }

    setSubmitting(true);
    const effectiveLottery = isUpgrade ? "upgrade" : (lotteryType || "fc1");
    const rows = Array.from({ length: ticketCount }, (_, i) => ({
      id: randomId(),
      event_id: selectedEventId,
      block: blockFull.trim(),
      row_num: row,
      seat_num: leftSeat + i,
      lottery_type: effectiveLottery,
      lottery_round: lotteryRound || null,
      lottery_name: lotteryName.trim() || null,
      comment: null,
    }));

    const { error: dbErr } = await supabase.from("seat_reports").insert(rows);
    if (dbErr) { setFormError("投稿に失敗しました: " + dbErr.message); setSubmitting(false); return; }

    // リセット
    setBlockPrefix(""); setBlockNum(""); setRowNum("");
    setTicketCount(1); setLeftSeatNum(""); setLotteryType("");
    setIsUpgrade(null); setLotteryRound(""); setLotteryName("");
    setPaymentMethod(""); setSubmitting(false);
    onSuccess();
  };

  const f = "w-full rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs outline-none focus:border-[var(--accent)] focus:bg-white";

  return (
    <form onSubmit={handleSubmit} className="space-y-3">

      {/* ツアー・日程 */}
      <div>
        <p className="mb-1 text-[11px] font-bold text-gray-500">ツアー・日程 <span className="text-red-400">*</span></p>
        <select value={selectedEventId} onChange={e => setSelectedEventId(e.target.value)} className={f}>
          <option value="">選択してください</option>
          {events.map(ev => <option key={ev.id} value={ev.id}>{fmtOption(ev)}</option>)}
        </select>
      </div>

      {/* 申込枚数 */}
      <div>
        <p className="mb-1 text-[11px] font-bold text-gray-500">申込枚数 <span className="text-red-400">*</span></p>
        <div className="flex gap-1.5">
          {[1,2,3,4].map(n => (
            <button key={n} type="button" onClick={() => setTicketCount(n)}
              className={`flex-1 rounded-lg border py-1.5 text-xs font-bold transition-all ${
                ticketCount === n ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-gray-200 bg-gray-50 text-gray-600"
              }`}
            >{n}枚</button>
          ))}
        </div>
      </div>

      {/* アプグレ */}
      <div>
        <p className="mb-1 text-[11px] font-bold text-gray-500">アプグレ当選？ <span className="text-red-400">*</span></p>
        <div className="flex gap-1.5">
          {([true, false] as const).map(v => (
            <button key={String(v)} type="button" onClick={() => setIsUpgrade(v)}
              className={`flex-1 rounded-lg border py-1.5 text-xs font-bold transition-all ${
                isUpgrade === v ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-gray-200 bg-gray-50 text-gray-600"
              }`}
            >{v ? "はい" : "いいえ"}</button>
          ))}
        </div>
      </div>

      {/* 抽選枠（アプグレいいえの時のみ） */}
      {isUpgrade === false && (
        <div>
          <p className="mb-1 text-[11px] font-bold text-gray-500">抽選枠 <span className="text-[10px] font-normal text-gray-400">任意</span></p>
          <select value={lotteryType} onChange={e => setLotteryType(e.target.value)} className={f}>
            <option value="">選択しない</option>
            {lotteryOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      )}

      {/* ブロック・座席 */}
      <div>
        <p className="mb-1 text-[11px] font-bold text-gray-500">ブロック・座席 <span className="text-red-400">*</span></p>
        <div className="space-y-1.5">
          <div className="flex gap-1.5">
            <select value={blockPrefix} onChange={e => setBlockPrefix(e.target.value)}
              className="w-24 rounded-lg border border-gray-200 bg-gray-50 px-1.5 py-1.5 text-xs outline-none focus:border-[var(--accent)]"
            >
              <option value="">--</option>
              {BLOCK_GROUPS.map(g => (
                <optgroup key={g.label} label={g.label}>
                  {g.options.map(p => <option key={p} value={p}>{p}</option>)}
                </optgroup>
              ))}
            </select>
            <input
              type="text" inputMode="numeric"
              value={blockNum} onChange={e => setBlockNum(e.target.value.replace(/[^0-9]/g,""))}
              placeholder="番号（例: 3）" className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs outline-none focus:border-[var(--accent)]"
            />
          </div>
          <div className="flex gap-1.5">
            <input type="number" inputMode="numeric" min="1"
              value={rowNum} onChange={e => setRowNum(e.target.value)}
              placeholder="列（例: 5）"
              className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs outline-none focus:border-[var(--accent)]"
            />
            <input type="number" inputMode="numeric" min="1"
              value={leftSeatNum} onChange={e => setLeftSeatNum(e.target.value)}
              placeholder="座席番号（例: 12）"
              className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs outline-none focus:border-[var(--accent)]"
            />
          </div>
        </div>
        {blockFull && <p className="mt-0.5 text-[10px] text-gray-400">ブロック: <span className="font-bold text-gray-600">{blockFull}</span></p>}
        {previewSeats.length > 1 && <p className="mt-0.5 text-[10px] text-gray-400">保存: <span className="font-bold text-gray-600">{previewSeats.join("・")}番</span></p>}
      </div>

      {/* 抽選情報（任意） */}
      <div>
        <p className="mb-1 text-[11px] font-bold text-gray-500">抽選情報 <span className="text-[10px] font-normal text-gray-400">任意</span></p>
        <select value={lotteryRound} onChange={e => setLotteryRound(e.target.value)} className={`${f} mb-1.5`}>
          <option value="">選択しない</option>
          <option value="first">1次抽選</option>
          <option value="second">2次抽選</option>
          <option value="third_plus">3次抽選以上</option>
          <option value="other">その他</option>
          <option value="unknown">わからない</option>
        </select>
        <input type="text" value={lotteryName} onChange={e => setLotteryName(e.target.value)}
          placeholder="正確な抽選名（例：FC先行1次）" className={f} />
      </div>

      {/* 支払い方法（任意） */}
      <div>
        <p className="mb-1 text-[11px] font-bold text-gray-500">支払い方法 <span className="text-[10px] font-normal text-gray-400">任意</span></p>
        <div className="flex gap-1.5">
          {[{v:"credit",l:"クレカ"},{v:"convenience",l:"コンビニ"},{v:"other",l:"その他"}].map(o => (
            <button key={o.v} type="button" onClick={() => setPaymentMethod(o.v)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
                paymentMethod === o.v ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-gray-200 bg-gray-50 text-gray-500"
              }`}
            >{o.l}</button>
          ))}
        </div>
      </div>

      {formError && <div className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">{formError}</div>}

      <button type="submit" disabled={submitting}
        className="w-full rounded-2xl bg-[var(--accent)] py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-[var(--accent-dark)] active:scale-95 disabled:opacity-60"
      >
        {submitting ? "投稿中..." : "報告する ✍️"}
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// 公演カード
// ---------------------------------------------------------------------------

function EventCard({ ev, seatCount, afterCount }: { ev: CrawledEvent; seatCount: number; afterCount: number }) {
  const days = daysUntil(ev.date);
  const soon = days !== null && days >= 0 && days <= 7;
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="mb-3">
        <div className="flex flex-wrap items-center gap-1.5 mb-1">
          <span className="text-xs font-bold text-gray-500">{fmtDate(ev.date)}</span>
          {soon && <span className="rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">もうすぐ</span>}
        </div>
        <p className="text-sm font-bold leading-snug text-gray-900">{ev.title}</p>
        <p className="mt-0.5 text-xs text-gray-500">{ev.venue}</p>
      </div>
      <div className="flex gap-2 mb-3">
        <div className={`flex-1 rounded-xl px-3 py-2 text-center ${seatCount > 0 ? "bg-[var(--accent-light)]" : "bg-gray-50"}`}>
          <p className={`text-base font-extrabold ${seatCount > 0 ? "text-[var(--accent)]" : "text-gray-400"}`}>{seatCount}</p>
          <p className="text-[10px] text-gray-500">座席報告</p>
        </div>
        <div className={`flex-1 rounded-xl px-3 py-2 text-center ${afterCount > 0 ? "bg-amber-50" : "bg-gray-50"}`}>
          <p className={`text-base font-extrabold ${afterCount > 0 ? "text-amber-600" : "text-gray-400"}`}>{afterCount}</p>
          <p className="text-[10px] text-gray-500">答え合わせ</p>
        </div>
      </div>
      <div className="flex gap-2">
        <Link href={`/events/${ev.id}`}
          className="flex flex-1 items-center justify-center rounded-xl bg-[var(--accent)] py-2.5 text-xs font-bold text-white transition-all active:scale-95"
        >座席を見る</Link>
        <Link href={`/events/${ev.id}/after-report`}
          className="flex flex-1 items-center justify-center rounded-xl border border-gray-200 bg-white py-2.5 text-xs font-semibold text-gray-700 transition-all active:scale-95"
        >答え合わせ投稿</Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 最新の座席報告（3件）
// ---------------------------------------------------------------------------

function RecentReports({
  reports,
  venueMap,
  firstEventId,
}: {
  reports: AnalyticsReport[];
  venueMap: Map<string, string>;
  firstEventId?: string;
}) {
  const displayed = reports.slice(0, 3);
  if (displayed.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-2xl bg-white py-10 shadow-sm">
        <span className="text-3xl">🪑</span>
        <p className="mt-2 text-sm font-semibold text-gray-600">まだ座席報告はありません</p>
      </div>
    );
  }
  return (
    <>
      <div className="space-y-2">
        {displayed.map(r => (
          <div key={r.id} className="rounded-2xl bg-white px-4 py-3.5 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                  <span className="rounded-md bg-[var(--accent-light)] px-2 py-0.5 text-xs font-bold text-[var(--accent)]">{r.block}</span>
                  <span className="text-xs text-gray-700">{r.row_num}列 {r.seat_num}番</span>
                  {r.lottery_type && (
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${LOTTERY_COLOR[r.lottery_type] ?? "bg-gray-100 text-gray-600"}`}>
                      {LOTTERY_LABEL[r.lottery_type] ?? r.lottery_type}
                    </span>
                  )}
                </div>
                {venueMap.get(r.event_id) && <p className="text-[11px] text-gray-400">{venueMap.get(r.event_id)}</p>}
              </div>
              <span className="shrink-0 text-[10px] text-gray-400">{fmtDatetime(r.created_at)}</span>
            </div>
          </div>
        ))}
      </div>
      {firstEventId && (
        <div className="mt-2 text-center">
          <Link href={`/events/${firstEventId}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent)]"
          >
            すべての座席報告を見る
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// 答え合わせサマリー
// ---------------------------------------------------------------------------

function AfterReportSummary({
  reports,
  firstEventId,
}: {
  reports: AfterSummary[];
  firstEventId?: string;
}) {
  if (reports.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-2xl bg-white py-8 shadow-sm text-center">
        <span className="text-3xl">📸</span>
        <p className="mt-2 text-sm font-semibold text-gray-600">答え合わせ報告を募集中</p>
        <p className="mt-1 text-xs text-gray-400">公演後の見え方・花道・トロッコ情報を教えてください</p>
        {firstEventId && (
          <Link href={`/events/${firstEventId}/after-report`}
            className="mt-4 rounded-full bg-[var(--accent)] px-5 py-2 text-xs font-bold text-white"
          >答え合わせを投稿する</Link>
        )}
      </div>
    );
  }

  const total   = reports.length;
  const hanamichi    = reports.filter(r => r.hanamichi    === "yes").length;
  const torokko      = reports.filter(r => r.torokko      === "yes").length;
  const centerStage  = reports.filter(r => r.center_stage === "yes").length;
  const kyakukudari  = reports.filter(r => r.kyakukudari  === "yes").length;
  const fansaCount   = reports.filter(r => r.fansa        === true).length;
  const hasPhoto     = reports.filter(r => r.photo_paths?.length > 0).length;
  const avgVis  = reports.filter(r => r.visibility).map(r => r.visibility!).reduce((a,b) => a+b, 0) / (reports.filter(r => r.visibility).length || 1);
  const avgSat  = reports.filter(r => r.satisfaction).map(r => r.satisfaction!).reduce((a,b) => a+b, 0) / (reports.filter(r => r.satisfaction).length || 1);

  const items = [
    { label: "花道",           value: `${hanamichi}/${total}件`, active: hanamichi > 0 },
    { label: "トロッコ",        value: `${torokko}/${total}件`,   active: torokko > 0 },
    { label: "センターステージ", value: `${centerStage}/${total}件`, active: centerStage > 0 },
    { label: "客降り",          value: `${kyakukudari}/${total}件`, active: kyakukudari > 0 },
    { label: "ファンサ",        value: `${fansaCount}/${total}件`, active: fansaCount > 0 },
    { label: "写真投稿",        value: `${hasPhoto}件あり`,       active: hasPhoto > 0 },
    { label: "視認性",          value: avgVis > 0 ? `★${avgVis.toFixed(1)}` : "未評価", active: avgVis > 0 },
    { label: "満足度",          value: avgSat > 0 ? `★${avgSat.toFixed(1)}` : "未評価", active: avgSat > 0 },
  ];

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs text-gray-500">{total}件の答え合わせ報告</span>
        {firstEventId && (
          <Link href={`/events/${firstEventId}/after-report`}
            className="text-[11px] font-semibold text-[var(--accent)]"
          >投稿する →</Link>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {items.map(item => (
          <div key={item.label} className={`rounded-xl px-3 py-2 ${item.active ? "bg-[var(--accent-light)]" : "bg-gray-50"}`}>
            <p className="text-[10px] text-gray-500">{item.label}</p>
            <p className={`text-xs font-bold ${item.active ? "text-[var(--accent)]" : "text-gray-400"}`}>{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// セトリアコーディオン
// ---------------------------------------------------------------------------

function SetlistAccordion() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
      <button type="button" onClick={() => setOpen(v => !v)}
        className="flex w-full items-center justify-between px-4 py-4 text-left"
      >
        <div>
          <p className="text-sm font-extrabold text-gray-900">セトリ情報</p>
          <p className="mt-0.5 text-[11px] text-amber-600">ネタバレを含む可能性があります</p>
        </div>
        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
          <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      {open && (
        <div className="border-t border-gray-100 px-4 py-8 text-center">
          <span className="text-3xl">🎵</span>
          <p className="mt-2 text-sm font-semibold text-gray-600">セトリ情報は準備中です</p>
          <p className="mt-1 text-xs text-gray-400">公演後に更新予定です</p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ページ
// ---------------------------------------------------------------------------

export default function ArtistPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const artist = findArtistBySlug(slug);

  const [events,          setEvents]          = useState<CrawledEvent[]>([]);
  const [analyticsReports,setAnalyticsReports]= useState<AnalyticsReport[]>([]);
  const [afterReports,    setAfterReports]    = useState<AfterSummary[]>([]);
  const [seatCounts,      setSeatCounts]      = useState<Map<string, number>>(new Map());
  const [afterCounts,     setAfterCounts]     = useState<Map<string, number>>(new Map());
  const [loading,         setLoading]         = useState(true);
  const [toast,           setToast]           = useState("");

  async function loadData(artist: NonNullable<ReturnType<typeof findArtistBySlug>>) {
    const orFilter = artist.keywords.map(kw => `title.ilike.%${kw}%`).join(",");

    const { data: allEvData } = await supabase
      .from("events")
      .select("id, title, venue, venue_id, date, genre, lottery_types")
      .or(orFilter)
      .order("date", { ascending: true });

    const allEvs = (allEvData as CrawledEvent[]) ?? [];
    setEvents(allEvs);
    if (allEvs.length === 0) { setLoading(false); return; }

    const ids = allEvs.map(e => e.id);

    const [seatRes, afterRes] = await Promise.all([
      supabase.from("seat_reports")
        .select("id, event_id, block, row_num, seat_num, lottery_type, created_at")
        .in("event_id", ids)
        .order("created_at", { ascending: false })
        .limit(500),
      supabase.from("after_reports")
        .select("id, event_id, hanamichi, torokko, center_stage, kyakukudari, visibility, fansa, satisfaction, photo_paths, created_at")
        .in("event_id", ids)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    const seatData  = (seatRes.data as AnalyticsReport[]) ?? [];
    const afterData = (afterRes.data as AfterSummary[]) ?? [];

    // per-event counts
    const sCounts = new Map<string, number>();
    for (const r of seatData) sCounts.set(r.event_id, (sCounts.get(r.event_id) ?? 0) + 1);
    const aCounts = new Map<string, number>();
    for (const r of afterData) aCounts.set(r.event_id, (aCounts.get(r.event_id) ?? 0) + 1);

    setAnalyticsReports(seatData);
    setAfterReports(afterData);
    setSeatCounts(sCounts);
    setAfterCounts(aCounts);
    setLoading(false);
  }

  useEffect(() => {
    if (!artist) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData(artist);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artist]);

  // トースト自動消去
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const today = new Date().toISOString().split("T")[0];
  const upcomingEvents = useMemo(() => events.filter(ev => ev.date && ev.date >= today), [events, today]);
  const firstEventId   = upcomingEvents[0]?.id;
  const totalSeat      = analyticsReports.length;
  const totalAfter     = afterReports.length;

  const venueMap = useMemo(() => new Map(events.map(ev => [ev.id, ev.venue])), [events]);

  function handleReportSuccess() {
    setToast("報告ありがとう！ 🎉");
    if (artist) loadData(artist);
  }

  if (!artist) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50">
        <p className="text-sm text-gray-500">アーティストが見つかりません</p>
        <Link href="/" className="rounded-full bg-[var(--accent)] px-5 py-2.5 text-xs font-bold text-white">ホームに戻る</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">

      {/* ヘッダー */}
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/90 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => router.back()}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-sm font-bold text-gray-900">{artist.name}</span>
          <Link href="/chat" className="ml-auto flex items-center gap-1 rounded-full bg-violet-50 px-3 py-1.5 text-[11px] font-bold text-violet-700">
            <span>🎀</span><span>AIに聞く</span>
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-2xl space-y-4 px-4 pt-4">

        {/* ① アーティストヘッダー */}
        <div className={`overflow-hidden rounded-2xl bg-gradient-to-br ${artist.grad} p-5 shadow-md`}>
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
              <span className="text-3xl font-extrabold text-white drop-shadow-sm">{artist.initials}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xl font-extrabold text-white leading-tight">{artist.name}</p>
              <span className={`mt-1 inline-block rounded px-2 py-0.5 text-[10px] font-bold ${GENRE_BADGE[artist.genre] ?? GENRE_BADGE.other}`}>
                {genreLabel(artist.genre)}
              </span>
            </div>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-white/80">{artist.description}</p>
        </div>

        {/* 件数カード */}
        {loading ? (
          <div className="grid grid-cols-3 gap-2">
            {[0,1,2].map(i => (
              <div key={i} className="animate-pulse rounded-2xl bg-white p-3 shadow-sm text-center">
                <div className="mx-auto mb-1 h-6 w-12 rounded bg-gray-100" />
                <div className="mx-auto h-2.5 w-10 rounded bg-gray-100" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-white p-3 shadow-sm text-center">
              <p className="text-xl font-extrabold text-[var(--accent)]">{totalSeat}</p>
              <p className="mt-0.5 text-[10px] text-gray-500">座席報告</p>
            </div>
            <div className="rounded-2xl bg-white p-3 shadow-sm text-center">
              <p className="text-xl font-extrabold text-amber-500">{totalAfter}</p>
              <p className="mt-0.5 text-[10px] text-gray-500">答え合わせ</p>
            </div>
            <div className="rounded-2xl bg-white p-3 shadow-sm text-center">
              <p className="text-xl font-extrabold text-gray-700">{events.length}</p>
              <p className="mt-0.5 text-[10px] text-gray-500">対象公演</p>
            </div>
          </div>
        )}

        {/* ② 直近の公演 */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-extrabold text-gray-900">直近の公演</p>
            {!loading && <span className="text-[11px] text-gray-400">{upcomingEvents.length}件</span>}
          </div>
          {loading ? (
            <div className="space-y-3">
              {[0,1].map(i => (
                <div key={i} className="animate-pulse rounded-2xl bg-white p-4 shadow-sm">
                  <div className="mb-2 h-3 w-24 rounded bg-gray-100" />
                  <div className="mb-1 h-4 w-full rounded bg-gray-100" />
                  <div className="h-3 w-2/3 rounded bg-gray-100" />
                </div>
              ))}
            </div>
          ) : upcomingEvents.length === 0 ? (
            <div className="flex flex-col items-center rounded-2xl bg-white py-12 shadow-sm">
              <span className="text-4xl">🎤</span>
              <p className="mt-3 text-sm font-semibold text-gray-700">直近の公演はありません</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingEvents.map(ev => (
                <EventCard key={ev.id} ev={ev}
                  seatCount={seatCounts.get(ev.id) ?? 0}
                  afterCount={afterCounts.get(ev.id) ?? 0}
                />
              ))}
            </div>
          )}
        </section>

        {/* ③ 座席予想図 */}
        <section>
          <p className="mb-3 text-sm font-extrabold text-gray-900">{artist.name} 座席予想図</p>
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="mb-4 text-xs text-gray-500">
              {totalSeat > 0
                ? `${totalSeat}件の座席報告をもとに作成。ブロックをタップすると詳細が見られます。`
                : "座席報告が集まると、ブロックが点灯していきます。"}
            </p>
            {loading ? (
              <div className="flex justify-center py-10">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
              </div>
            ) : (
              <BlockDiagram reports={analyticsReports} />
            )}
          </div>
        </section>

        {/* ④ 座席報告フォーム */}
        <section>
          <p className="mb-3 text-sm font-extrabold text-gray-900">座席を報告する</p>
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="mb-3 text-xs text-gray-500">報告するとブロック図が更新されます。あなたの報告が予想図を完成させます！</p>
            {events.length > 0 ? (
              <InlineReportForm
                events={events}
                defaultEventId={firstEventId}
                onSuccess={handleReportSuccess}
              />
            ) : (
              <p className="text-center text-xs text-gray-400 py-6">公演情報を読み込み中...</p>
            )}
          </div>
        </section>

        {/* ⑤ アンケートリザルト */}
        {!loading && totalSeat > 0 && (
          <section>
            <p className="mb-3 text-sm font-extrabold text-gray-900">アンケートリザルト</p>
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <SurveyResults reports={analyticsReports} />
            </div>
          </section>
        )}

        {/* ⑥ 最新の座席報告 */}
        <section>
          <p className="mb-3 text-sm font-extrabold text-gray-900">最新の座席報告</p>
          {loading ? (
            <div className="space-y-2">
              {[0,1,2].map(i => (
                <div key={i} className="animate-pulse rounded-2xl bg-white p-4 shadow-sm">
                  <div className="h-3 w-32 rounded bg-gray-100" />
                </div>
              ))}
            </div>
          ) : (
            <RecentReports reports={analyticsReports} venueMap={venueMap} firstEventId={firstEventId} />
          )}
        </section>

        {/* ⑦ 答え合わせ情報 */}
        <section>
          <p className="mb-3 text-sm font-extrabold text-gray-900">答え合わせ情報</p>
          {loading ? (
            <div className="animate-pulse rounded-2xl bg-white p-4 shadow-sm h-24" />
          ) : (
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <AfterReportSummary reports={afterReports} firstEventId={firstEventId} />
            </div>
          )}
        </section>

        {/* ⑧ セトリ情報 */}
        <section>
          <p className="mb-3 text-sm font-extrabold text-gray-900">セトリ情報</p>
          <SetlistAccordion />
        </section>

      </div>

      {/* ボトムナビ */}
      <nav className="fixed bottom-0 left-1/2 z-30 flex w-full max-w-md -translate-x-1/2 border-t border-gray-100 bg-white/95 backdrop-blur-md">
        <Link href="/" className="flex flex-1 flex-col items-center gap-0.5 py-3 text-gray-400">
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" /></svg>
          <span className="text-[10px] font-semibold">ホーム</span>
        </Link>
        <Link href="/chat" className="flex flex-1 flex-col items-center gap-0.5 py-3 text-gray-400">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="text-[10px] font-semibold">AIチャット</span>
        </Link>
      </nav>

      {/* トースト */}
      {toast && (
        <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-gray-900 px-5 py-3 text-xs font-semibold text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
