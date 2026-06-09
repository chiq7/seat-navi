"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import type { CrawledEvent } from "@/lib/types";
import {
  BLOCK_PREFIXES,
  LOTTERY_OPTIONS,
  COMPACT_INPUT_CLS,
  PROGRESSIVE_GROUP_CLS,
} from "./SeatReportForm/constants";
import { Label, Card, CompactButton, CompactGroup, formatEventDate } from "./SeatReportForm/parts";

type TicketResult = "won" | "lost";

function randomId() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 20);
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
  event,
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
  const [blockCustom, setBlockCustom] = useState("");
  const [seatType, setSeatType] = useState<string>("");
  const [upgradeResult, setUpgradeResult] = useState<string>("not_applied");
  const [lotteryType, setLotteryType] = useState<string>("");
  const [lotteryName, setLotteryName] = useState("");
  const [fcHistory, setFcHistory] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState<TicketResult | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(() => variant === "full");

  useEffect(() => {
    setDetailsVisible(variant === "full");
  }, [variant]);

  const blockFull = blockPrefix === "other" ? blockCustom : blockPrefix + blockNum;
  const previewSeats = leftSeatNum
    ? Array.from({ length: ticketCount }, (_, i) => parseInt(leftSeatNum, 10) + i).filter((n) => !isNaN(n))
    : [];
  const showDetails = variant === "full" || detailsVisible;
  const isProgressive = variant === "progressive";
  const revealDetails = () => {
    if (variant === "progressive") setDetailsVisible(true);
  };

  const resetForm = () => {
    setTicketResult("won");
    setLostApplicationCount(0);
    setLostApplicationCountMode(0);
    setBlockPrefix("");
    setBlockNum("");
    setBlockCustom("");
    setRowNum("");
    setLeftSeatNum("");
    setTicketCount(1);
    setSeatType("");
    setUpgradeResult("not_applied");
    setLotteryType("");
    setLotteryName("");
    setFcHistory("");
    setPaymentMethod("");
    setSubmitting(false);
    setError("");
    setSubmitted(null);
    setDetailsVisible(variant === "full");
  };
  const eventDateLabel = formatEventDate(event?.date);
  const eventSummary = event ? (
    <div className="rounded-xl border border-cyan-100 bg-white/80 px-3 py-2.5 shadow-sm">
      <p className="text-[11px] font-bold text-cyan-700">報告する公演</p>
      <p className="mt-1 text-sm font-extrabold leading-snug text-gray-900">{event.venue}</p>
      {eventDateLabel && <p className="mt-0.5 text-xs font-bold text-gray-500">{eventDateLabel}</p>}
    </div>
  ) : null;

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
      seat_type: result === "won" ? (seatType || null) : null,
      upgrade_result: result === "won" ? (upgradeResult || null) : "not_applied",
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

    if (!seatType) {
      setError("席種を選択してください");
      return;
    }

    let row = 0;
    let leftSeat = 0;

    if (seatType === "arena") {
      row = parseInt(rowNum, 10);
      leftSeat = parseInt(leftSeatNum, 10);

      if (!blockPrefix) {
        setError("ブロックを選択してください");
        return;
      }
      if (blockPrefix === "other") {
        if (!blockCustom.trim()) {
          setError("ブロックを入力してください");
          return;
        }
      } else if (!blockNum.trim()) {
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
    }

    setSubmitting(true);

    const { error: resultErr } = await insertTicketResult("won");
    if (resultErr) {
      setError("保存に失敗しました: " + resultErr.message);
      setSubmitting(false);
      return;
    }

    if (seatType === "arena") {
      const effectiveLottery = lotteryType === "other" ? "general" : lotteryType || "fc1";
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
        {successMode === "inline" && (
          <button
            type="button"
            onClick={resetForm}
            className="mt-3 w-full rounded-2xl border border-cyan-600 py-2.5 text-sm font-bold text-cyan-700 transition-all hover:bg-cyan-50 active:scale-95"
          >
            同じ公演でもう一度報告する
          </button>
        )}
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
              const val = e.target.value;
              setBlockPrefix(val);
              setBlockNum("");
              if (val !== "other") setBlockCustom("");
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
            <option value="other">その他</option>
          </select>
          {blockPrefix === "other" ? (
            <input
              type="text"
              value={blockCustom}
              onChange={(e) => {
                revealDetails();
                setBlockCustom(e.target.value);
              }}
              placeholder="例: SS3"
              className={COMPACT_INPUT_CLS}
              aria-label="ブロック手動入力"
            />
          ) : (
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
          )}
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
      <Label required>申込枚数</Label>
      <CompactGroup label="枚数">
        {[1, 2, 3, 4].map((n) => (
          <CompactButton key={n} selected={ticketCount === n} onClick={() => setTicketCount(n)}>
            {n}枚
          </CompactButton>
        ))}
      </CompactGroup>
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
      <div className={ticketResult === "won" ? "grid grid-cols-[145px_minmax(0,1fr)] gap-1.5" : ""}>
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

  const seatTypeFields = (
    <div className={isProgressive ? PROGRESSIVE_GROUP_CLS : ""}>
      <Label required>席種</Label>
      <div className="grid grid-cols-3 gap-1.5">
        {[
          { value: "arena",      label: "アリーナ" },
          { value: "stand",      label: "スタンド" },
          { value: "seated",     label: "着席指定" },
          { value: "restricted", label: "注釈付き" },
          { value: "obstructed", label: "見切れ" },
          { value: "unknown",    label: "その他/不明" },
        ].map((opt) => (
          <CompactButton
            key={opt.value}
            selected={seatType === opt.value}
            onClick={() => {
              setSeatType(opt.value);
              revealDetails();
            }}
          >
            {opt.label}
          </CompactButton>
        ))}
      </div>
    </div>
  );

  const upgradeResultFields = (
    <div className={isProgressive ? PROGRESSIVE_GROUP_CLS : ""}>
      <Label>
        アプグレ応募状況 <span className="font-normal text-gray-400">任意</span>
      </Label>
      <CompactGroup label="アプグレ">
        <CompactButton selected={upgradeResult === "not_applied"} onClick={() => setUpgradeResult("not_applied")}>
          応募なし
        </CompactButton>
        <CompactButton selected={upgradeResult === "applied_lost"} onClick={() => setUpgradeResult("applied_lost")}>
          落選
        </CompactButton>
        <CompactButton selected={upgradeResult === "applied_won"} onClick={() => setUpgradeResult("applied_won")}>
          当選
        </CompactButton>
      </CompactGroup>
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
            {eventSummary}
            {resultSelector}
            {ticketResult === "won" ? (
              <>
                <p className="text-xs font-bold text-cyan-950">当選した座席は1件ずつ報告をお願いします♪</p>
                {lostCountInput}
                {seatTypeFields}
                {seatType === "arena" && seatFields}
                {showDetails && (
                  <>
                    {upgradeResultFields}
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
      {eventSummary}
      {resultSelector}

      {ticketResult === "won" ? (
        <>
          <Card>
            <p className="mb-3 text-xs font-bold text-gray-700">当選した座席は1件ずつ報告をお願いします♪</p>
            {lostCountInput}
          </Card>
          <Card>{seatTypeFields}</Card>
          {seatType === "arena" && <Card>{seatFields}</Card>}
          {showDetails && (
            <>
              <Card>{upgradeResultFields}</Card>
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
