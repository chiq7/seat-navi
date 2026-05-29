"use client";

import { useState, use, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { findArtistByKeyword } from "@/lib/artists";
import type { CrawledEvent } from "@/lib/types";

function randomId() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 20);
}

const BLOCK_PREFIXES = ["A", "B", "C", "D", "E", "SS", "SA", "SB", "SC", "SD", "SE"];

const ALL_LOTTERY_OPTIONS: { value: string; label: string }[] = [
  { value: "fc1", label: "FC1次" },
  { value: "fc2", label: "FC2次" },
  { value: "general", label: "一般" },
  { value: "revival", label: "復活" },
  { value: "production", label: "制作開放" },
];

const SELECTED_STYLE: React.CSSProperties = {
  backgroundColor: "#5B2BE0",
  borderColor: "#5B2BE0",
  color: "#fff",
};

const DEFAULT_STYLE: React.CSSProperties = {
  borderColor: "#e5e7eb",
  backgroundColor: "#fff",
  color: "#4b5563",
};

const COMPACT_INPUT_CLS =
  "min-w-0 rounded-lg border border-gray-200 bg-white px-2 py-2 text-[11px] outline-none accent-focus";
const COMPACT_BUTTON_CLS =
  "rounded-lg border px-1 py-1.5 text-[10px] font-bold leading-tight transition-all";

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-1.5 block text-xs font-bold text-gray-700">
      {children}
      {required && <span className="ml-1 text-red-500">*</span>}
    </label>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl bg-white p-3 shadow-sm">{children}</div>;
}

function CompactButton({
  children,
  selected,
  onClick,
}: {
  children: React.ReactNode;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={COMPACT_BUTTON_CLS}
      style={selected ? SELECTED_STYLE : DEFAULT_STYLE}
    >
      {children}
    </button>
  );
}

function CompactGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1">
      <span className="shrink-0 text-[10px] font-bold leading-none text-gray-500">{label}</span>
      <div className="grid min-w-0 flex-1 grid-flow-col auto-cols-fr gap-1">{children}</div>
    </div>
  );
}

export default function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = use(params);
  const router = useRouter();

  const [events, setEvents] = useState<CrawledEvent[]>([]);
  const [selectedEventId] = useState(eventId);
  const [blockPrefix, setBlockPrefix] = useState("");
  const [blockNum, setBlockNum] = useState("");
  const [rowNum, setRowNum] = useState("");
  const [ticketCount, setTicketCount] = useState(1);
  const [leftSeatNum, setLeftSeatNum] = useState("");
  const [lotteryType, setLotteryType] = useState<string>("");
  const [lotteryName, setLotteryName] = useState("");
  const [isUpgrade, setIsUpgrade] = useState(false);
  const [fcHistory, setFcHistory] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase
      .from("events")
      .select("id, title, venue, venue_id, date, genre, lottery_types")
      .order("date", { ascending: true })
      .limit(200)
      .then(({ data }) => {
        if (data) setEvents(data as CrawledEvent[]);
      });
  }, []);

  const blockFull = blockPrefix + blockNum;
  const selectedEvent = events.find((ev) => ev.id === selectedEventId);
  const lotteryOptions = selectedEvent?.lottery_types?.length
    ? ALL_LOTTERY_OPTIONS.filter((o) => selectedEvent.lottery_types!.includes(o.value))
    : ALL_LOTTERY_OPTIONS;
  const artist = selectedEvent ? findArtistByKeyword(selectedEvent.title) : undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const row = parseInt(rowNum, 10);
    const leftSeat = parseInt(leftSeatNum, 10);

    if (!selectedEventId) {
      setError("公演を選択してください");
      return;
    }
    if (!blockPrefix) {
      setError("ブロックを選択してください");
      return;
    }
    if (!blockNum.trim()) {
      setError("ブロック番号を入力してください");
      return;
    }
    if (!row || row < 1) {
      setError("列は1以上の数字で入力してください");
      return;
    }
    if (!leftSeat || leftSeat < 1) {
      setError("席番は1以上の数字で入力してください");
      return;
    }

    setSubmitting(true);

    const effectiveLottery = isUpgrade ? "upgrade" : (lotteryType || "fc1");
    const rows = Array.from({ length: ticketCount }, (_, i) => ({
      id: randomId(),
      event_id: selectedEventId,
      block: blockFull.trim(),
      row_num: row,
      seat_num: leftSeat + i,
      lottery_type: effectiveLottery,
      lottery_name: lotteryName.trim() || null,
      payment_method: paymentMethod || null,
      fc_history: fcHistory || null,
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

  const previewSeats = leftSeatNum
    ? Array.from({ length: ticketCount }, (_, i) => parseInt(leftSeatNum, 10) + i).filter((n) => !isNaN(n))
    : [];

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/90 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Link href={`/events/${eventId}`} className="text-gray-500 hover:text-gray-700">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-base font-bold text-gray-900">{artist?.name ?? "座席を報告"}</h1>
        </div>
      </header>

      <div className="mx-auto max-w-md px-3 pt-4">
        <form onSubmit={handleSubmit} className="space-y-2.5">
          <Card>
            <div className="mb-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <Label required>座席</Label>
              <span className="text-[11px] font-bold text-red-500">複数枚の場合1番左の席を入力</span>
            </div>
            <div className="grid grid-cols-[74px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-1.5">
              <select
                value={blockPrefix}
                onChange={(e) => setBlockPrefix(e.target.value)}
                className={COMPACT_INPUT_CLS}
                aria-label="ブロック"
              >
                <option value="">ブロック</option>
                {BLOCK_PREFIXES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <input
                type="text"
                inputMode="numeric"
                value={blockNum}
                onChange={(e) => setBlockNum(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="番号"
                className={COMPACT_INPUT_CLS}
                aria-label="番号"
              />
              <input
                type="number"
                inputMode="numeric"
                min="1"
                value={rowNum}
                onChange={(e) => setRowNum(e.target.value)}
                placeholder="列"
                className={COMPACT_INPUT_CLS}
                aria-label="列"
              />
              <input
                type="number"
                inputMode="numeric"
                min="1"
                value={leftSeatNum}
                onChange={(e) => setLeftSeatNum(e.target.value)}
                placeholder="席番"
                className={COMPACT_INPUT_CLS}
                aria-label="席番"
              />
            </div>
            {(blockFull || previewSeats.length > 1) && (
              <p className="mt-1.5 text-[11px] text-gray-400">
                {blockFull && <span className="font-bold text-gray-600">{blockFull}</span>}
                {previewSeats.length > 1 && (
                  <span>
                    {blockFull ? " / " : ""}
                    保存席: <span className="font-bold text-gray-600">{previewSeats.join("・")}番</span>
                  </span>
                )}
              </p>
            )}
          </Card>

          <Card>
            <Label required>枚数・アプグレ</Label>
            <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)] gap-1.5">
              <CompactGroup label="枚数">
                {[1, 2, 3, 4].map((n) => (
                  <CompactButton key={n} selected={ticketCount === n} onClick={() => setTicketCount(n)}>
                    {n}枚
                  </CompactButton>
                ))}
              </CompactGroup>
              <CompactGroup label="アプグレ">
                <CompactButton selected={isUpgrade} onClick={() => setIsUpgrade(true)}>
                  有
                </CompactButton>
                <CompactButton selected={!isUpgrade} onClick={() => setIsUpgrade(false)}>
                  なし
                </CompactButton>
              </CompactGroup>
            </div>
          </Card>

          <Card>
            <Label>FC歴・支払い <span className="font-normal text-gray-400">任意</span></Label>
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-1.5">
              <CompactGroup label="FC歴">
                <CompactButton selected={fcHistory === "under_1_year"} onClick={() => setFcHistory("under_1_year")}>
                  1年未満
                </CompactButton>
                <CompactButton selected={fcHistory === "one_to_three_years"} onClick={() => setFcHistory("one_to_three_years")}>
                  1〜3年
                </CompactButton>
                <CompactButton selected={fcHistory === "over_3_years"} onClick={() => setFcHistory("over_3_years")}>
                  3年以上
                </CompactButton>
              </CompactGroup>
              <CompactGroup label="支払い">
                <CompactButton selected={paymentMethod === "credit"} onClick={() => setPaymentMethod("credit")}>
                  クレカ
                </CompactButton>
                <CompactButton selected={paymentMethod === "other"} onClick={() => setPaymentMethod("other")}>
                  その他
                </CompactButton>
              </CompactGroup>
            </div>
          </Card>

          <Card>
            <Label>抽選</Label>
            <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-1.5">
              <select
                value={lotteryType}
                onChange={(e) => setLotteryType(e.target.value)}
                className={COMPACT_INPUT_CLS}
                aria-label="抽選情報"
              >
                <option value="">抽選情報</option>
                {lotteryOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <input
                type="text"
                value={lotteryName}
                onChange={(e) => setLotteryName(e.target.value)}
                placeholder="正しい抽選名を入力してください"
                className={COMPACT_INPUT_CLS}
                aria-label="抽選名入力"
              />
            </div>
          </Card>

          {error && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-2xl py-3.5 text-sm font-bold text-white shadow-sm transition-all hover:opacity-90 active:scale-95 disabled:opacity-60"
            style={{ background: "linear-gradient(90deg, #0B7A88, #5B2BE0)" }}
          >
            {submitting ? "投稿中..." : "報告する ✍️"}
          </button>
        </form>
      </div>
    </div>
  );
}
