"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { AllBlocksOverview } from "@/components/AllBlocksOverview";
import type { CrawledEvent, SeatReport, EventLayout, HistoricalPattern } from "@/lib/types";

function randomId() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 20);
}

const BLOCK_GROUPS = [
  { label: "アリーナ中央", options: ["A", "B", "C", "D", "E", "F", "G"] },
  { label: "サイド・特殊",  options: ["SS", "SA", "SB", "SC", "SD", "SE", "SF"] },
];

const ALL_LOTTERY_OPTIONS = [
  { value: "fc1",        label: "FC1次（最速含む）" },
  { value: "fc2",        label: "FC2次" },
  { value: "general",    label: "一般" },
  { value: "revival",    label: "復活当選" },
  { value: "production", label: "制作開放" },
];

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-1.5 block text-xs font-bold text-gray-700">
      {children}
      {required && <span className="ml-1 text-red-500">*</span>}
    </label>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl bg-white p-4 shadow-sm">{children}</div>;
}

function PillGroup({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all ${
            value === opt.value
              ? "border-[var(--accent)] bg-[var(--accent)] text-white"
              : "border-gray-200 bg-white text-gray-600 hover:border-[var(--accent)]"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: eventId } = use(params);
  const searchParams = useSearchParams();
  const justAfterReported = searchParams.get("after_reported") === "1";

  // ページデータ
  const [event,    setEvent]    = useState<CrawledEvent | null>(null);
  const [reports,  setReports]  = useState<SeatReport[]>([]);
  const [layout,   setLayout]   = useState<EventLayout | null>(null);
  const [patterns, setPatterns] = useState<HistoricalPattern[]>([]);
  const [loading,  setLoading]  = useState(true);

  // トースト
  const [toast, setToast] = useState(justAfterReported ? "答え合わせ投稿ありがとう！ 🎉" : "");

  // フォーム
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

  useEffect(() => {
    async function load() {
      const [evRes, repRes, layoutRes] = await Promise.all([
        supabase
          .from("events")
          .select("id, title, venue, venue_id, date, genre, lottery_types")
          .eq("id", eventId)
          .single(),
        supabase
          .from("seat_reports")
          .select("*")
          .eq("event_id", eventId)
          .order("block").order("row_num").order("seat_num"),
        supabase
          .from("event_layouts")
          .select("id, event_id, image_url, created_at")
          .eq("event_id", eventId)
          .limit(1)
          .maybeSingle(),
      ]);
      if (evRes.data)     setEvent(evRes.data as CrawledEvent);
      if (repRes.data)    setReports(repRes.data as SeatReport[]);
      if (layoutRes.data) setLayout(layoutRes.data as EventLayout);

      if (evRes.data?.venue) {
        const { data: patData } = await supabase
          .from("historical_patterns")
          .select("block, max_row, max_seat, event_name")
          .eq("venue", evRes.data.venue)
          .limit(50);
        if (patData) setPatterns(patData as HistoricalPattern[]);
      }
      setLoading(false);
    }
    load();
  }, [eventId]);

  // トースト自動消去
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const blockFull = blockPrefix + blockNum;

  const lotteryOptions = event?.lottery_types?.length
    ? ALL_LOTTERY_OPTIONS.filter((o) => event.lottery_types!.includes(o.value))
    : ALL_LOTTERY_OPTIONS;

  const blockMap = new Map<string, SeatReport[]>();
  for (const r of reports) {
    if (!blockMap.has(r.block)) blockMap.set(r.block, []);
    blockMap.get(r.block)!.push(r);
  }

  const seatHint = ticketCount === 1
    ? "お手元の番号を入力してください。"
    : "一番左（最小番号）を入力してください。不明な場合はお手元の番号で構いません。";

  const previewSeats = leftSeatNum
    ? Array.from({ length: ticketCount }, (_, i) => parseInt(leftSeatNum, 10) + i).filter((n) => !isNaN(n))
    : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    const row      = parseInt(rowNum, 10);
    const leftSeat = parseInt(leftSeatNum, 10);

    if (isUpgrade === null)        { setFormError("アップグレード当選かどうかを選択してください"); return; }
    if (!blockPrefix)              { setFormError("ブロックを選択してください"); return; }
    if (!blockNum.trim())          { setFormError("ブロック番号を入力してください"); return; }
    if (!row || row < 1)           { setFormError("列番号は1以上の数値を入力してください"); return; }
    if (!leftSeat || leftSeat < 1) { setFormError("座席番号は1以上の数値を入力してください"); return; }

    setSubmitting(true);

    const effectiveLottery = isUpgrade ? "upgrade" : (lotteryType || "fc1");
    const newRows: SeatReport[] = Array.from({ length: ticketCount }, (_, i) => ({
      id: randomId(),
      event_id: eventId,
      block: blockFull.trim(),
      row_num: row,
      seat_num: leftSeat + i,
      lottery_type: effectiveLottery as SeatReport["lottery_type"],
      lottery_round: lotteryRound || null,
      lottery_name: lotteryName.trim() || null,
      comment: null,
      created_at: new Date().toISOString(),
    }));

    const { error: dbErr } = await supabase.from("seat_reports").insert(newRows);
    if (dbErr) {
      setFormError("投稿に失敗しました: " + dbErr.message);
      setSubmitting(false);
      return;
    }

    // 全体図をその場で更新
    setReports((prev) => [...prev, ...newRows]);

    // フォームリセット
    setBlockPrefix("");
    setBlockNum("");
    setRowNum("");
    setTicketCount(1);
    setLeftSeatNum("");
    setLotteryType("");
    setIsUpgrade(null);
    setLotteryRound("");
    setLotteryName("");
    setPaymentMethod("");
    setSubmitting(false);
    setToast("報告ありがとう！ 🎉");
  };

  function fmtDate(d: string | null) {
    if (!d) return "日程未定";
    const [y, m, day] = d.split("-").map(Number);
    const w = ["日","月","火","水","木","金","土"][new Date(y, m - 1, day).getDay()];
    return `${y}年${m}月${day}日(${w})`;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* ヘッダー */}
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/90 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-gray-500 hover:text-gray-700">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="flex-1 truncate text-sm font-bold text-gray-900">
            {loading ? "読み込み中..." : (event?.title ?? "公演詳細")}
          </h1>
        </div>
      </header>

      {loading ? (
        <div className="space-y-3 px-4 pt-5">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse rounded-2xl bg-white p-4 shadow-sm">
              <div className="h-4 w-32 rounded bg-gray-200" />
              <div className="mt-3 h-24 rounded bg-gray-100" />
            </div>
          ))}
        </div>
      ) : event ? (
        <div className="px-4 pt-4">
          {/* 公演情報 */}
          <div className="mb-4 rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500">{event.venue}</p>
            <p className="mt-1 text-base font-extrabold leading-snug text-gray-900">{event.title}</p>
            <p className="mt-1 text-sm text-gray-600">{fmtDate(event.date)}</p>
          </div>

          {/* 参考予想図 */}
          {layout && (
            <div className="mb-4 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-2.5">
                <span className="text-xs font-bold text-gray-700">参考予想図</span>
                <span className="ml-auto text-[10px] text-gray-400">ユーザー提供</span>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={layout.image_url} alt="座席予想図" className="w-full object-contain" style={{ maxHeight: "280px" }} />
            </div>
          )}

          {/* 2カラム: PC=左フォーム(40%) 右マップ(60%) / スマホ=上マップ 下フォーム */}
          <div className="flex flex-col gap-4 md:flex-row md:items-start">

            {/* 全体図（スマホ: 上 / PC: 右） */}
            <div className="order-first md:order-last md:sticky md:top-20" style={{ flex: "0 0 60%" }}>
              <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-bold text-gray-700">全体図</p>
                  <span className="text-[10px] text-gray-400">報告数: {reports.length}件</span>
                </div>
                {blockMap.size > 0 ? (
                  <AllBlocksOverview blockMap={blockMap} patterns={patterns} />
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="text-3xl">🪑</div>
                    <p className="mt-2 text-xs text-gray-400">まだ報告がありません</p>
                    <p className="text-[11px] text-gray-300">最初の報告者になってね！</p>
                  </div>
                )}
              </div>
            </div>

            {/* フォーム（スマホ: 下 / PC: 左） */}
            <form
              onSubmit={handleSubmit}
              className="order-last md:order-first rounded-2xl bg-white p-4 shadow-sm"
              style={{ flex: "0 0 40%" }}
            >
              <p className="mb-2 text-xs font-bold text-gray-700">座席を報告する</p>

              <div className="space-y-2">

                {/* 申込枚数 */}
                <div>
                  <p className="mb-1 text-[11px] font-bold text-gray-500">申込枚数 <span className="text-red-400">*</span></p>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4].map((n) => (
                      <button key={n} type="button" onClick={() => setTicketCount(n)}
                        className={`flex-1 rounded-lg border py-1.5 text-xs font-bold transition-all ${
                          ticketCount === n
                            ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                            : "border-gray-200 bg-gray-50 text-gray-600"
                        }`}
                      >
                        {n}枚
                      </button>
                    ))}
                  </div>
                </div>

                {/* アプグレ当選？ */}
                <div>
                  <p className="mb-1 text-[11px] font-bold text-gray-500">アプグレ当選？ <span className="text-red-400">*</span></p>
                  <div className="flex gap-1.5">
                    {([true, false] as const).map((v) => (
                      <button key={String(v)} type="button" onClick={() => setIsUpgrade(v)}
                        className={`flex-1 rounded-lg border py-1.5 text-xs font-bold transition-all ${
                          isUpgrade === v
                            ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                            : "border-gray-200 bg-gray-50 text-gray-600"
                        }`}
                      >
                        {v ? "はい" : "いいえ"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 抽選枠（任意・プルダウン）アプグレいいえの時のみ */}
                {isUpgrade === false && (
                  <div>
                    <p className="mb-1 text-[11px] font-bold text-gray-500">抽選枠 <span className="text-[10px] font-normal text-gray-400">任意</span></p>
                    <select
                      value={lotteryType}
                      onChange={(e) => setLotteryType(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs outline-none focus:border-[var(--accent)]"
                    >
                      <option value="">選択しない</option>
                      {lotteryOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* ブロック＋番号 / 列＋座席番号（2行） */}
                <div>
                  <p className="mb-1 text-[11px] font-bold text-gray-500">ブロック・座席 <span className="text-red-400">*</span></p>
                  <div className="space-y-1.5">
                    <div className="flex gap-1.5">
                      <select
                        value={blockPrefix}
                        onChange={(e) => setBlockPrefix(e.target.value)}
                        className="w-24 rounded-lg border border-gray-200 bg-gray-50 px-1.5 py-1.5 text-xs outline-none focus:border-[var(--accent)]"
                      >
                        <option value="">--</option>
                        {BLOCK_GROUPS.map((group) => (
                          <optgroup key={group.label} label={group.label}>
                            {group.options.map((p) => (
                              <option key={p} value={p}>{p}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={blockNum}
                        onChange={(e) => setBlockNum(e.target.value.replace(/[^0-9]/g, ""))}
                        placeholder="番号（例: 3）"
                        className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs outline-none focus:border-[var(--accent)]"
                      />
                    </div>
                    <div className="flex gap-1.5">
                      <input
                        type="number" inputMode="numeric" min="1"
                        value={rowNum}
                        onChange={(e) => setRowNum(e.target.value)}
                        placeholder="列（例: 5）"
                        className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs outline-none focus:border-[var(--accent)]"
                      />
                      <input
                        type="number" inputMode="numeric" min="1"
                        value={leftSeatNum}
                        onChange={(e) => setLeftSeatNum(e.target.value)}
                        placeholder="座席番号（例: 12）"
                        className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs outline-none focus:border-[var(--accent)]"
                      />
                    </div>
                  </div>
                  {blockFull && (
                    <p className="mt-0.5 text-[10px] text-gray-400">
                      ブロック: <span className="font-bold text-gray-600">{blockFull}</span>
                    </p>
                  )}
                  <p className="mt-0.5 text-[10px] text-gray-400">{seatHint}</p>
                  {previewSeats.length > 1 && (
                    <p className="mt-0.5 text-[10px] text-gray-400">
                      保存: <span className="font-bold text-gray-600">{previewSeats.join("・")}番</span>
                    </p>
                  )}
                </div>

                {/* 抽選情報（任意） */}
                <div>
                  <p className="mb-1 text-[11px] font-bold text-gray-500">抽選情報 <span className="text-[10px] font-normal text-gray-400">任意</span></p>
                  <select
                    value={lotteryRound}
                    onChange={(e) => setLotteryRound(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs outline-none focus:border-[var(--accent)]"
                  >
                    <option value="">選択しない</option>
                    <option value="first">1次抽選</option>
                    <option value="second">2次抽選</option>
                    <option value="third_plus">3次抽選以上</option>
                    <option value="other">その他</option>
                    <option value="unknown">わからない</option>
                  </select>
                  <p className="mt-1.5 mb-1 text-[11px] font-bold text-gray-500">正確な抽選名を教えてください</p>
                  <input
                    type="text"
                    value={lotteryName}
                    onChange={(e) => setLotteryName(e.target.value)}
                    placeholder="例：FC先行1次、Lawson特別抽選"
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs outline-none focus:border-[var(--accent)]"
                  />
                </div>

                {/* 支払い方法（任意・タグタップ） */}
                <div className="border-t border-gray-100 pt-1.5">
                  <p className="mb-1 text-[11px] font-bold text-gray-500">支払い方法 <span className="text-[10px] font-normal text-gray-400">任意</span></p>
                  <div className="flex gap-1.5">
                    {[
                      { value: "credit",      label: "クレカ" },
                      { value: "convenience", label: "コンビニ" },
                      { value: "other",       label: "その他" },
                    ].map((opt) => (
                      <button key={opt.value} type="button" onClick={() => setPaymentMethod(opt.value)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
                          paymentMethod === opt.value
                            ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                            : "border-gray-200 bg-gray-50 text-gray-500"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

              </div>

              {formError && (
                <div className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{formError}</div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="mt-3 w-full rounded-2xl bg-[var(--accent)] py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-[var(--accent-dark)] active:scale-95 disabled:opacity-60"
              >
                {submitting ? "投稿中..." : "報告する ✍️"}
              </button>
            </form>

          </div>
        </div>
      ) : (
        <div className="px-4 pt-8 text-center text-sm text-gray-500">公演が見つかりません</div>
      )}

      {/* トースト */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-gray-900 px-5 py-3 text-xs font-semibold text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
