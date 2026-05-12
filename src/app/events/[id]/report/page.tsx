"use client";

import { useState, use, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { AllBlocksOverview } from "@/components/AllBlocksOverview";
import type { CrawledEvent, SeatReport, HistoricalPattern } from "@/lib/types";

function randomId() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 20);
}

const BLOCK_PREFIXES = ["A", "B", "C", "D", "E", "SS", "SA", "SB", "SC", "SD", "SE"];

const ALL_LOTTERY_OPTIONS: { value: string; label: string }[] = [
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

function PillGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T | "";
  onChange: (v: T) => void;
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

export default function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = use(params);
  const router = useRouter();

  const [events,          setEvents]          = useState<CrawledEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState(eventId);
  const [blockPrefix,     setBlockPrefix]     = useState("");
  const [blockNum,        setBlockNum]        = useState("");
  const [rowNum,          setRowNum]          = useState("");
  const [ticketCount,     setTicketCount]     = useState(1);
  const [leftSeatNum,     setLeftSeatNum]     = useState("");
  const [lotteryType,     setLotteryType]     = useState<string>("");
  const [isUpgrade,       setIsUpgrade]       = useState(false);
  const [paymentMethod,   setPaymentMethod]   = useState<string>("");
  const [submitting,      setSubmitting]      = useState(false);
  const [error,           setError]           = useState("");

  // マップ用データ
  const [mapReports,  setMapReports]  = useState<SeatReport[]>([]);
  const [mapPatterns, setMapPatterns] = useState<HistoricalPattern[]>([]);

  useEffect(() => {
    supabase
      .from("events")
      .select("id, title, venue, venue_id, date, genre, lottery_types")
      .order("date", { ascending: true })
      .limit(200)
      .then(({ data }) => { if (data) setEvents(data as CrawledEvent[]); });
  }, []);

  // 選択イベント変更時にマップデータを取得
  useEffect(() => {
    if (!selectedEventId) { setMapReports([]); setMapPatterns([]); return; }

    supabase
      .from("seat_reports")
      .select("*")
      .eq("event_id", selectedEventId)
      .order("block").order("row_num").order("seat_num")
      .then(({ data }) => { if (data) setMapReports(data as SeatReport[]); });

    const venue = events.find((ev) => ev.id === selectedEventId)?.venue;
    if (venue) {
      supabase
        .from("historical_patterns")
        .select("block, max_row, max_seat, event_name")
        .eq("venue", venue)
        .limit(50)
        .then(({ data }) => { if (data) setMapPatterns(data as HistoricalPattern[]); });
    }
  }, [selectedEventId, events]);

  function fmtDate(d: string | null) {
    if (!d) return "日程未定";
    const [y, m, day] = d.split("-").map(Number);
    const w = ["日","月","火","水","木","金","土"][new Date(y, m - 1, day).getDay()];
    return `${y}/${m}/${day}(${w})`;
  }

  const blockFull = blockPrefix + blockNum;

  const selectedEvent = events.find((ev) => ev.id === selectedEventId);
  const lotteryOptions = selectedEvent?.lottery_types?.length
    ? ALL_LOTTERY_OPTIONS.filter((o) => selectedEvent.lottery_types!.includes(o.value))
    : ALL_LOTTERY_OPTIONS;

  // マップ用 blockMap
  const blockMap = new Map<string, SeatReport[]>();
  for (const r of mapReports) {
    if (!blockMap.has(r.block)) blockMap.set(r.block, []);
    blockMap.get(r.block)!.push(r);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const row      = parseInt(rowNum, 10);
    const leftSeat = parseInt(leftSeatNum, 10);

    if (!selectedEventId)           { setError("ツアー日程を選択してください"); return; }
    if (!blockPrefix)               { setError("ブロックを選択してください"); return; }
    if (!blockNum.trim())           { setError("ブロック番号を入力してください"); return; }
    if (!row || row < 1)            { setError("列番号は1以上の数値を入力してください"); return; }
    if (!leftSeat || leftSeat < 1)  { setError("座席番号は1以上の数値を入力してください"); return; }

    setSubmitting(true);

    const effectiveLottery = isUpgrade ? "upgrade" : (lotteryType || "fc1");
    const rows = Array.from({ length: ticketCount }, (_, i) => ({
      id: randomId(),
      event_id: selectedEventId,
      block: blockFull.trim(),
      row_num: row,
      seat_num: leftSeat + i,
      lottery_type: effectiveLottery,
      comment: null,
    }));

    const { error: dbErr } = await supabase.from("seat_reports").insert(rows);
    if (dbErr) {
      setError("投稿に失敗しました: " + dbErr.message);
      setSubmitting(false);
      return;
    }

    router.push(`/events/${selectedEventId}?reported=1`);
  };

  const seatHint = ticketCount === 1
    ? "お手元の番号を入力してください。"
    : "一番左（最小番号）を入力してください。不明な場合はお手元の番号で構いません。";

  const previewSeats = leftSeatNum
    ? Array.from({ length: ticketCount }, (_, i) => parseInt(leftSeatNum, 10) + i).filter((n) => !isNaN(n))
    : [];

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/90 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Link href={`/events/${eventId}`} className="text-gray-500 hover:text-gray-700">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-base font-bold text-gray-900">座席を報告</h1>
        </div>
      </header>

      {/* 2カラムレイアウト: PC=左フォーム右マップ / スマホ=上マップ下フォーム */}
      <div className="mx-auto max-w-5xl px-4 pt-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start">

          {/* 全体図（スマホ: 上、PC: 右） */}
          <div className="order-first md:order-last md:flex-1 md:sticky md:top-20">
            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="mb-3 text-xs font-bold text-gray-700">全体図</p>
              {blockMap.size > 0 ? (
                <AllBlocksOverview blockMap={blockMap} patterns={mapPatterns} />
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="text-3xl">🪑</div>
                  <p className="mt-2 text-xs text-gray-400">まだ報告がありません</p>
                </div>
              )}
            </div>
          </div>

          {/* フォーム（スマホ: 下、PC: 左） */}
          <form onSubmit={handleSubmit} className="order-last md:order-first md:w-96 md:shrink-0 space-y-3">

            {/* ① ツアー選択 */}
            <Card>
              <Label required>ツアー・日程</Label>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
              >
                <option value="">選択してください</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {fmtDate(ev.date)}　{ev.title}　{ev.venue}
                  </option>
                ))}
              </select>
            </Card>

            {/* ② ブロック */}
            <Card>
              <Label required>ブロック</Label>
              <div className="flex gap-2">
                <select
                  value={blockPrefix}
                  onChange={(e) => setBlockPrefix(e.target.value)}
                  className="w-24 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                >
                  <option value="">--</option>
                  {BLOCK_PREFIXES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <div className="flex-1">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={blockNum}
                    onChange={(e) => setBlockNum(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="番号（例: 3）"
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                  />
                </div>
              </div>
              {blockFull && (
                <p className="mt-1.5 text-[11px] text-gray-400">
                  ブロック名: <span className="font-bold text-gray-600">{blockFull}</span>
                </p>
              )}
            </Card>

            {/* ③ 列 */}
            <Card>
              <Label required>列</Label>
              <input
                type="number"
                inputMode="numeric"
                min="1"
                value={rowNum}
                onChange={(e) => setRowNum(e.target.value)}
                placeholder="例: 5"
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
              />
            </Card>

            {/* ④ 申込枚数 */}
            <Card>
              <Label required>申込枚数</Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setTicketCount(n)}
                    className={`flex-1 rounded-xl border py-2.5 text-sm font-bold transition-all ${
                      ticketCount === n
                        ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                        : "border-gray-200 bg-white text-gray-600 hover:border-[var(--accent)]"
                    }`}
                  >
                    {n}枚
                  </button>
                ))}
              </div>
            </Card>

            {/* ⑤ 座席番号 */}
            <Card>
              <Label required>座席番号</Label>
              <p className="mb-2 text-[11px] leading-snug text-gray-500">{seatHint}</p>
              <input
                type="number"
                inputMode="numeric"
                min="1"
                value={leftSeatNum}
                onChange={(e) => setLeftSeatNum(e.target.value)}
                placeholder="例: 12"
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
              />
              {previewSeats.length > 1 && (
                <p className="mt-1.5 text-[11px] text-gray-400">
                  保存される座席:&nbsp;
                  <span className="font-bold text-gray-600">{previewSeats.join("・")}番</span>
                </p>
              )}
            </Card>

            {/* ⑥ 任意項目 */}
            <Card>
              <p className="mb-3 text-xs font-bold text-gray-400">任意項目</p>

              <div className="mb-4">
                <Label>抽選枠</Label>
                <PillGroup
                  options={lotteryOptions}
                  value={lotteryType as string}
                  onChange={setLotteryType}
                />
              </div>

              <div className="mb-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsUpgrade((v) => !v)}
                  className={`flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                    isUpgrade ? "bg-[var(--accent)]" : "bg-gray-200"
                  }`}
                >
                  <span
                    className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${
                      isUpgrade ? "translate-x-4" : "translate-x-0.5"
                    }`}
                  />
                </button>
                <span className="text-xs text-gray-700">アップグレード当選だった</span>
              </div>

              <div>
                <Label>支払い方法</Label>
                <PillGroup
                  options={[
                    { value: "credit",      label: "クレカ" },
                    { value: "convenience", label: "コンビニ" },
                    { value: "other",       label: "その他" },
                  ]}
                  value={paymentMethod as string}
                  onChange={setPaymentMethod}
                />
              </div>
            </Card>

            {error && (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-2xl bg-[var(--accent)] py-3.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-[var(--accent-dark)] active:scale-95 disabled:opacity-60"
            >
              {submitting ? "投稿中..." : "報告する ✍️"}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
