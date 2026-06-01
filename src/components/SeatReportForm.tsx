"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import type { CrawledEvent } from "@/lib/types";

type TicketResult = "won" | "lost";

const BLOCK_PREFIXES = ["A", "B", "C", "D", "E", "SS", "SA", "SB", "SC", "SD", "SE"];

const LOTTERY_OPTIONS = [
  { value: "fc1", label: "1次抽選", resultLabel: "1次抽選" },
  { value: "fc2", label: "2次抽選", resultLabel: "2次抽選" },
  { value: "other", label: "その他", resultLabel: "その他" },
] as const;

const SELECTED_STYLE = {
  backgroundColor: "#5B2BE0",
  borderColor: "#5B2BE0",
  color: "#fff",
};

const DEFAULT_STYLE = {
  borderColor: "#e5e7eb",
  backgroundColor: "#fff",
  color: "#4b5563",
};

const COMPACT_INPUT_CLS =
  "min-w-0 rounded-lg border border-gray-200 bg-white px-2 py-2 text-[11px] outline-none accent-focus";
const COMPACT_BUTTON_CLS =
  "rounded-lg border px-1 py-1.5 text-[10px] font-bold leading-tight transition-all";
const PROGRESSIVE_GROUP_CLS = "border-t border-cyan-200/70 pt-3";

function randomId() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 20);
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-1.5 block text-xs font-bold text-gray-700">
      {children}
      {required && <span className="ml-1 text-red-500">*</span>}
    </label>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl bg-white p-3 shadow-sm ${className}`}>{children}</div>;
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

type SeatReportFormProps = {
  eventId: string;
  event?: CrawledEvent | null;
  successMode?: "redirect" | "inline";
  variant?: "full" | "progressive";
  successRedirectHref?: string;
  className?: string;
};

export function SeatReportForm({
  eventId,
  successMode = "redirect",
  variant = "full",
  successRedirectHref,
  className = "",
}: SeatReportFormProps) {
  const router = useRouter();

  const [ticketResult, setTicketResult] = useState<TicketResult>("won");
  const [lostApplicationCount, setLostApplicationCount] = useState(0);
  const [lostApplicationCountMode, setLostApplicationCountMode] = useState<0 | 1 | 2 | 3 | 4>(0);
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
  const [submitted, setSubmitted] = useState<TicketResult | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(() => variant === "full");

  useEffect(() => {
    setDetailsVisible(variant === "full");
  }, [variant]);

  const blockFull = blockPrefix + blockNum;
  const previewSeats = leftSeatNum
    ? Array.from({ length: ticketCount }, (_, i) => parseInt(leftSeatNum, 10) + i).filter((n) => !isNaN(n))
    : [];
  const showDetails = variant === "full" || detailsVisible;
  const isProgressive = variant === "progressive";
  const revealDetails = () => {
    if (variant === "progressive") setDetailsVisible(true);
  };

  const lotteryResultLabel = (value: string, fallbackToFirst: boolean) => {
    const target = value || (fallbackToFirst ? "fc1" : "");
    return LOTTERY_OPTIONS.find((opt) => opt.value === target)?.resultLabel ?? null;
  };

  const fcHistoryLabel = (value: string) => {
    if (value === "under_1_year") return "1年未満";
    if (value === "one_to_three_years") return "1〜3年";
    if (value === "over_3_years") return "3年以上";
    return null;
  };

  const paymentMethodLabel = (value: string) => {
    if (value === "credit") return "クレカ";
    if (value === "other") return "その他";
    return null;
  };

  const insertTicketResult = async (result: TicketResult) => {
    return supabase.from("event_ticket_results").insert({
      event_id: eventId,
      result,
      lost_application_count: lostApplicationCount,
      ticket_count: ticketCount,
      lottery_type: lotteryResultLabel(lotteryType, result === "won"),
      fc_history: fcHistoryLabel(fcHistory),
      payment_method: paymentMethodLabel(paymentMethod),
    });
  };

  const handleResultChange = (result: TicketResult) => {
    setTicketResult(result);
    setLostApplicationCount(result === "won" ? 0 : 1);
    setLostApplicationCountMode(result === "won" ? 0 : 1);
    setError("");
  };

  const handleLostCountSelect = (count: 0 | 1 | 2 | 3 | 4) => {
    setLostApplicationCountMode(count);
    setLostApplicationCount(count);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!eventId) {
      setError("公演を選択してください");
      return;
    }

    if (lostApplicationCount < 0) {
      setError("落選した申込回数は0以上で入力してください");
      return;
    }

    if (ticketResult === "lost") {
      if (lostApplicationCount < 1) {
        setError("落選した申込回数は1以上で入力してください");
        return;
      }

      setSubmitting(true);
      const { error: resultErr } = await insertTicketResult("lost");
      if (resultErr) {
        setError("保存に失敗しました: " + resultErr.message);
        setSubmitting(false);
        return;
      }

      if (successMode === "inline") {
        setSubmitted("lost");
        setSubmitting(false);
        return;
      }

      router.push(successRedirectHref ?? `/events/${eventId}?reported=1`);
      return;
    }

    const row = parseInt(rowNum, 10);
    const leftSeat = parseInt(leftSeatNum, 10);

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

    const { error: resultErr } = await insertTicketResult("won");
    if (resultErr) {
      setError("保存に失敗しました: " + resultErr.message);
      setSubmitting(false);
      return;
    }

    const effectiveLottery = isUpgrade ? "upgrade" : lotteryType === "other" ? "general" : lotteryType || "fc1";
    const rows = Array.from({ length: ticketCount }, (_, i) => ({
      id: randomId(),
      event_id: eventId,
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

    if (successMode === "inline") {
      setSubmitted("won");
      setSubmitting(false);
      return;
    }

    router.push(successRedirectHref ?? `/events/${eventId}?reported=1`);
  };

  if (submitted) {
    return (
      <div className={`rounded-2xl bg-white p-4 text-center shadow-sm ${className}`}>
        <p className="text-sm font-bold text-gray-900">
          {submitted === "won"
            ? "報告ありがとうございます！同じ会場・別日で当選した情報もあれば入力してください♪"
            : "落選情報を保存しました。ありがとうございます！"}
        </p>
      </div>
    );
  }

  const resultSelector = (
    <Card className={isProgressive ? "border border-cyan-200 bg-[#EAFBFF]" : ""}>
      <p className="mb-2 text-sm font-bold text-gray-900">今回の公演のチケット結果を教えてください</p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => handleResultChange("won")}
          className={`rounded-xl border px-3 py-2 text-sm font-bold transition ${
            ticketResult === "won"
              ? "border-cyan-600 bg-cyan-600 text-white"
              : "border-gray-200 bg-white text-gray-700"
          }`}
        >
          当選した
        </button>
        <button
          type="button"
          onClick={() => handleResultChange("lost")}
          className={`rounded-xl border px-3 py-2 text-sm font-bold transition ${
            ticketResult === "lost"
              ? "border-cyan-600 bg-cyan-600 text-white"
              : "border-gray-200 bg-white text-gray-700"
          }`}
        >
          落選した
        </button>
      </div>
    </Card>
  );

  const lostCountInput = (
    <div className={isProgressive ? PROGRESSIVE_GROUP_CLS : ""}>
      <Label required>同じ公演で落選した申込回数</Label>
      <div className="grid grid-cols-5 gap-1.5">
        {[
          { value: 0, label: "0回" },
          { value: 1, label: "1回" },
          { value: 2, label: "2回" },
          { value: 3, label: "3回" },
          { value: 4, label: "4回以上" },
        ].map((option) => (
          <CompactButton
            key={option.value}
            selected={lostApplicationCountMode === option.value}
            onClick={() => handleLostCountSelect(option.value as 0 | 1 | 2 | 3 | 4)}
          >
            {option.label}
          </CompactButton>
        ))}
      </div>
      {lostApplicationCountMode === 4 && (
        <input
          type="number"
          inputMode="numeric"
          min={4}
          value={lostApplicationCount}
          onChange={(e) => setLostApplicationCount(Math.max(4, Number(e.target.value)))}
          className={`${COMPACT_INPUT_CLS} mt-2 w-full`}
          aria-label="4回以上の落選した申込回数"
        />
      )}
    </div>
  );

  const seatFields = (
    <>
      <div className={isProgressive ? PROGRESSIVE_GROUP_CLS : ""}>
        <div className="mb-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <Label required>座席</Label>
          <span className="text-[11px] font-bold text-red-500">複数枚の場合1番左の席を入力</span>
        </div>
        <div
          className="grid grid-cols-[74px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-1.5"
          onFocusCapture={revealDetails}
        >
          <select
            value={blockPrefix}
            onChange={(e) => {
              revealDetails();
              setBlockPrefix(e.target.value);
            }}
            className={COMPACT_INPUT_CLS}
            aria-label="ブロック"
          >
            <option value="">ブロック</option>
            {BLOCK_PREFIXES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <input
            type="text"
            inputMode="numeric"
            value={blockNum}
            onChange={(e) => {
              revealDetails();
              setBlockNum(e.target.value.replace(/[^0-9]/g, ""));
            }}
            placeholder="番号"
            className={COMPACT_INPUT_CLS}
            aria-label="番号"
          />
          <input
            type="number"
            inputMode="numeric"
            min="1"
            value={rowNum}
            onChange={(e) => {
              revealDetails();
              setRowNum(e.target.value);
            }}
            placeholder="列"
            className={COMPACT_INPUT_CLS}
            aria-label="列"
          />
          <input
            type="number"
            inputMode="numeric"
            min="1"
            value={leftSeatNum}
            onChange={(e) => {
              revealDetails();
              setLeftSeatNum(e.target.value);
            }}
            placeholder="席番"
            className={COMPACT_INPUT_CLS}
            aria-label="席番"
          />
        </div>
        {previewSeats.length > 1 && (
          <p className="mt-1.5 text-[11px] text-gray-500">
            保存席: <span className="font-bold text-gray-700">{previewSeats.join("・")}番</span>
          </p>
        )}
      </div>
    </>
  );

  const ticketCountAndUpgradeFields = (
    <div className={isProgressive ? PROGRESSIVE_GROUP_CLS : ""}>
      <Label required>{ticketResult === "won" ? "枚数・アプグレ" : "申込枚数"}</Label>
      <div className={ticketResult === "won" ? "grid grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)] gap-1.5" : ""}>
        <CompactGroup label="枚数">
          {[1, 2, 3, 4].map((n) => (
            <CompactButton key={n} selected={ticketCount === n} onClick={() => setTicketCount(n)}>
              {n}枚
            </CompactButton>
          ))}
        </CompactGroup>
        {ticketResult === "won" && (
          <CompactGroup label="アプグレ">
            <CompactButton selected={isUpgrade} onClick={() => setIsUpgrade(true)}>
              有
            </CompactButton>
            <CompactButton selected={!isUpgrade} onClick={() => setIsUpgrade(false)}>
              なし
            </CompactButton>
          </CompactGroup>
        )}
      </div>
    </div>
  );

  const fcAndPaymentFields = (
    <div className={isProgressive ? PROGRESSIVE_GROUP_CLS : ""}>
      <Label>
        FC歴・支払い <span className="font-normal text-gray-400">任意</span>
      </Label>
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
    </div>
  );

  const lotteryFields = (
    <div className={isProgressive ? PROGRESSIVE_GROUP_CLS : ""}>
      <Label>抽選</Label>
      <div className={ticketResult === "won" ? "grid grid-cols-[112px_minmax(0,1fr)] gap-1.5" : ""}>
        <select
          value={lotteryType}
          onChange={(e) => setLotteryType(e.target.value)}
          className={COMPACT_INPUT_CLS}
          aria-label="抽選情報"
        >
          <option value="" disabled>
            抽選情報
          </option>
          {LOTTERY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {ticketResult === "won" && (
          <input
            type="text"
            value={lotteryName}
            onChange={(e) => setLotteryName(e.target.value)}
            placeholder="正しい抽選名を入力してください"
            className={COMPACT_INPUT_CLS}
            aria-label="抽選名入力"
          />
        )}
      </div>
    </div>
  );

  const submitButton = (
    <>
      {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-2xl py-3.5 text-sm font-bold text-white shadow-sm transition-all hover:opacity-90 active:scale-95 disabled:opacity-60"
        style={{ background: "linear-gradient(90deg, #0B7A88, #5B2BE0)" }}
      >
        {submitting ? "投稿中..." : ticketResult === "won" ? "報告する" : "落選情報を保存する"}
      </button>
    </>
  );

  if (isProgressive) {
    return (
      <form onSubmit={handleSubmit} className={className}>
        <Card className="border border-teal-200 bg-[#DDF5F6] shadow-teal-100/80">
          <h4 className="mb-3 rounded-xl bg-[#F0FCFF] px-3 py-2.5 text-sm font-bold text-cyan-950 shadow-sm">
            座席を報告する
          </h4>
          <div className="space-y-3">
            {resultSelector}
            {ticketResult === "won" ? (
              <>
                <p className="text-xs font-bold text-cyan-950">当選した座席は1件ずつ報告をお願いします♪</p>
                {lostCountInput}
                {seatFields}
                {showDetails && (
                  <>
                    {ticketCountAndUpgradeFields}
                    {fcAndPaymentFields}
                    {lotteryFields}
                    {submitButton}
                  </>
                )}
              </>
            ) : (
              <>
                {lostCountInput}
                {ticketCountAndUpgradeFields}
                {fcAndPaymentFields}
                {lotteryFields}
                {submitButton}
              </>
            )}
          </div>
        </Card>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={`space-y-2.5 ${className}`}>
      {resultSelector}

      {ticketResult === "won" ? (
        <>
          <Card>
            <p className="mb-3 text-xs font-bold text-gray-700">当選した座席は1件ずつ報告をお願いします♪</p>
            {lostCountInput}
          </Card>
          <Card>{seatFields}</Card>
          {showDetails && (
            <>
              <Card>{ticketCountAndUpgradeFields}</Card>
              <Card>{fcAndPaymentFields}</Card>
              <Card>{lotteryFields}</Card>
              {submitButton}
            </>
          )}
        </>
      ) : (
        <>
          <Card>{lostCountInput}</Card>
          <Card>{ticketCountAndUpgradeFields}</Card>
          <Card>{fcAndPaymentFields}</Card>
          <Card>{lotteryFields}</Card>
          {submitButton}
        </>
      )}
    </form>
  );
}
