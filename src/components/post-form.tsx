"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LOTTERY_TYPES, PAYMENT_METHODS } from "@/lib/types";
import type { Event, Section } from "@/lib/types";
import { YourReportCard } from "@/components/your-report-card";
import { YourSeatInsight } from "@/components/your-seat-insight";
import { CtaStack } from "@/components/cta-stack";
import { useDanketsu, useGate } from "@/hooks/use-danketsu";
import { useHighlightDot } from "@/hooks/use-highlight-dot";
import { SAMPLE_EVENTS, getSampleSections } from "@/lib/sample-data";

type PostFormProps = {
  sectionId: string;
  eventId: string;
  sectionName: string;
};

// ===== スワイプ式ステップ投稿 =====

const TOTAL_STEPS = 5; // 必須4 + 任意1

export function PostForm({ sectionId, eventId, sectionName }: PostFormProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);

  // 必須
  const [lotteryType, setLotteryType] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [appliedCount, setAppliedCount] = useState<number | null>(null);
  const [blockName, setBlockName] = useState("");

  // 任意
  const [rowNumber, setRowNumber] = useState("");
  const [fcYears, setFcYears] = useState("");
  const [appliedEvents, setAppliedEvents] = useState("");
  const [isFirstChoice, setIsFirstChoice] = useState<boolean | null>(null);
  const [hasCompanion, setHasCompanion] = useState<boolean | null>(null);
  const [comment, setComment] = useState("");
  const [hasSpoiler, setHasSpoiler] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showOptional, setShowOptional] = useState(false);

  const canProceed = (): boolean => {
    switch (step) {
      case 0: return lotteryType !== null;
      case 1: return paymentMethod !== null;
      case 2: return appliedCount !== null;
      case 3: return blockName.trim().length > 0;
      case 4: return true; // 任意
      default: return false;
    }
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // TODO: Replace with Supabase insert
      await new Promise((r) => setTimeout(r, 800));
      console.log("Report submitted:", {
        section_id: sectionId,
        event_id: eventId,
        lottery_type: lotteryType,
        payment_method: paymentMethod,
        applied_count: appliedCount,
        block_name: blockName,
        row_number: rowNumber || null,
        fc_years: fcYears ? parseInt(fcYears) : null,
        applied_events: appliedEvents ? parseInt(appliedEvents) : null,
        is_first_choice: isFirstChoice,
        has_companion: hasCompanion,
        comment: comment || null,
        has_spoiler: hasSpoiler,
      });

      // ゲート自動解放（当選報告したので）
      try {
        const gateKey = `gate_unlocked_${eventId}`;
        localStorage.setItem(gateKey, "1");
      } catch { /* ignore */ }

      // マップ戻り時ハイライト用にブロック名を保存
      try {
        localStorage.setItem("highlight_report", blockName);
      } catch { /* ignore */ }

      setSubmitted(true);
    } catch {
      alert("送信に失敗しました。もう一度お試しください。");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <RewardPage
        eventId={eventId}
        lotteryType={lotteryType!}
        paymentMethod={paymentMethod!}
        appliedCount={appliedCount!}
        blockName={blockName}
        rowNumber={rowNumber || null}
      />
    );
  }

  // Progress bar
  const progress = ((step + 1) / TOTAL_STEPS) * 100;

  return (
    <div className="pb-8">
      {/* Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-[10px] text-gray-400">
          <span>STEP {step + 1} / {TOTAL_STEPS}</span>
          <span>{sectionName}</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-dark)] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Step content */}
      <div className="min-h-[280px] fade-in-up" key={step}>
        {step === 0 && (
          <StepLottery value={lotteryType} onChange={setLotteryType} />
        )}
        {step === 1 && (
          <StepPayment value={paymentMethod} onChange={setPaymentMethod} />
        )}
        {step === 2 && (
          <StepCount value={appliedCount} onChange={setAppliedCount} />
        )}
        {step === 3 && (
          <StepBlock value={blockName} onChange={setBlockName} rowValue={rowNumber} onRowChange={setRowNumber} />
        )}
        {step === 4 && (
          <StepOptional
            showOptional={showOptional}
            setShowOptional={setShowOptional}
            fcYears={fcYears}
            setFcYears={setFcYears}
            appliedEvents={appliedEvents}
            setAppliedEvents={setAppliedEvents}
            isFirstChoice={isFirstChoice}
            setIsFirstChoice={setIsFirstChoice}
            hasCompanion={hasCompanion}
            setHasCompanion={setHasCompanion}
            comment={comment}
            setComment={setComment}
            hasSpoiler={hasSpoiler}
            setHasSpoiler={setHasSpoiler}
          />
        )}
      </div>

      {/* Navigation */}
      <div className="flex gap-3 mt-6">
        {step > 0 && (
          <button
            type="button"
            onClick={handleBack}
            className="flex-1 rounded-full border border-gray-200 bg-white py-3 text-sm font-medium text-gray-600 transition-all hover:bg-gray-50 active:scale-[0.98]"
          >
            戻る
          </button>
        )}
        {step < TOTAL_STEPS - 1 ? (
          <button
            type="button"
            onClick={handleNext}
            disabled={!canProceed()}
            className="flex-1 rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-dark)] py-3 text-sm font-bold text-white shadow-md transition-all hover:shadow-lg active:scale-[0.98] disabled:opacity-40"
          >
            次へ
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !canProceed()}
            className="flex-1 rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-dark)] py-3 text-sm font-bold text-white shadow-md transition-all hover:shadow-lg active:scale-[0.98] disabled:opacity-40"
          >
            {submitting ? "送信中..." : "当選席を報告する 🎵"}
          </button>
        )}
      </div>
    </div>
  );
}

// ===== Step Components =====

function StepLottery({ value, onChange }: { value: string | null; onChange: (v: string) => void }) {
  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900">抽選種別は？</h2>
      <p className="mt-1 text-xs text-gray-500">どの抽選で当選した？</p>
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        {LOTTERY_TYPES.map((lt) => (
          <button
            key={lt.key}
            type="button"
            onClick={() => onChange(lt.key)}
            className={`rounded-2xl border py-4 text-sm font-medium transition-all ${
              value === lt.key
                ? "border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent-dark)] shadow-md scale-[1.02]"
                : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
            }`}
          >
            {lt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function StepPayment({ value, onChange }: { value: string | null; onChange: (v: string) => void }) {
  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900">支払い方法は？</h2>
      <p className="mt-1 text-xs text-gray-500">チケットの支払い方法を選んでね</p>
      <div className="mt-4 space-y-2.5">
        {PAYMENT_METHODS.map((pm) => (
          <button
            key={pm.key}
            type="button"
            onClick={() => onChange(pm.key)}
            className={`w-full rounded-2xl border py-4 text-sm font-medium transition-all ${
              value === pm.key
                ? "border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent-dark)] shadow-md"
                : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
            }`}
          >
            {pm.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function StepCount({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900">申込枚数は？</h2>
      <p className="mt-1 text-xs text-gray-500">何枚で申し込んだ？</p>
      <div className="mt-4 flex gap-3">
        {[1, 2, 3].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`flex-1 rounded-2xl border py-6 text-center transition-all ${
              value === n
                ? "border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent-dark)] shadow-md scale-[1.02]"
                : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
            }`}
          >
            <div className="text-2xl font-bold">{n === 3 ? "3+" : n}</div>
            <div className="mt-1 text-[10px] text-gray-500">
              {n === 1 ? "枚" : n === 2 ? "枚" : "枚以上"}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function StepBlock({
  value,
  onChange,
  rowValue,
  onRowChange,
}: {
  value: string;
  onChange: (v: string) => void;
  rowValue: string;
  onRowChange: (v: string) => void;
}) {
  const QUICK_BLOCKS = ["A1", "A2", "A3", "B1", "B2", "B3", "C1", "スタンド1塁", "スタンド3塁"];

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900">ブロックは？</h2>
      <p className="mt-1 text-xs text-gray-500">配席されたブロックを教えて</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {QUICK_BLOCKS.map((b) => (
          <button
            key={b}
            type="button"
            onClick={() => onChange(b)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
              value === b
                ? "border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent-dark)]"
                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
            }`}
          >
            {b}
          </button>
        ))}
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="ブロック名を入力"
        className="mt-3 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-[var(--accent)] placeholder:text-gray-400"
      />
      <div className="mt-4">
        <span className="text-xs text-gray-500">列（任意）</span>
        <input
          type="text"
          value={rowValue}
          onChange={(e) => onRowChange(e.target.value)}
          placeholder="列番号（例: 5）"
          className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-[var(--accent)] placeholder:text-gray-400"
        />
      </div>
    </div>
  );
}

function StepOptional({
  showOptional,
  setShowOptional,
  fcYears,
  setFcYears,
  appliedEvents,
  setAppliedEvents,
  isFirstChoice,
  setIsFirstChoice,
  hasCompanion,
  setHasCompanion,
  comment,
  setComment,
  hasSpoiler,
  setHasSpoiler,
}: {
  showOptional: boolean;
  setShowOptional: (v: boolean) => void;
  fcYears: string;
  setFcYears: (v: string) => void;
  appliedEvents: string;
  setAppliedEvents: (v: string) => void;
  isFirstChoice: boolean | null;
  setIsFirstChoice: (v: boolean) => void;
  hasCompanion: boolean | null;
  setHasCompanion: (v: boolean) => void;
  comment: string;
  setComment: (v: string) => void;
  hasSpoiler: boolean;
  setHasSpoiler: (v: boolean) => void;
}) {
  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900">もうちょっと教えて？</h2>
      <p className="mt-1 text-xs text-gray-500">任意だけど、精度がグッと上がるよ</p>

      <button
        type="button"
        onClick={() => setShowOptional(!showOptional)}
        className="mt-4 flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 transition-colors hover:bg-gray-50"
      >
        <span>追加情報を入力する</span>
        <span className="text-gray-400">{showOptional ? "▲" : "▼"}</span>
      </button>

      {showOptional && (
        <div className="mt-3 space-y-3 fade-in-up">
          <input
            type="number"
            value={fcYears}
            onChange={(e) => setFcYears(e.target.value)}
            placeholder="FC歴（年）"
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-[var(--accent)] placeholder:text-gray-400"
          />
          <input
            type="number"
            value={appliedEvents}
            onChange={(e) => setAppliedEvents(e.target.value)}
            placeholder="何公演申し込んだ？"
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-[var(--accent)] placeholder:text-gray-400"
          />
          <div className="flex gap-3">
            <YesNoButton label="第一希望？" value={isFirstChoice} onChange={setIsFirstChoice} />
            <YesNoButton label="同行あり？" value={hasCompanion} onChange={setHasCompanion} />
          </div>
        </div>
      )}

      {/* Comment (always visible) */}
      <div className="mt-4">
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="自由コメント（任意）"
          rows={3}
          className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-[var(--accent)] placeholder:text-gray-400"
        />
        <label className="mt-1 flex items-center gap-2">
          <input
            type="checkbox"
            checked={hasSpoiler}
            onChange={(e) => setHasSpoiler(e.target.checked)}
            className="h-4 w-4 rounded accent-[var(--accent)]"
          />
          <span className="text-xs text-gray-500">ネタバレあり</span>
        </label>
      </div>
    </div>
  );
}

function YesNoButton({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean | null;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex-1">
      <div className="mb-1.5 text-xs text-gray-500">{label}</div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`flex-1 rounded-xl border py-2 text-xs font-medium transition-all ${
            value === true
              ? "border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent-dark)]"
              : "border-gray-200 bg-white text-gray-600"
          }`}
        >
          はい
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`flex-1 rounded-xl border py-2 text-xs font-medium transition-all ${
            value === false
              ? "border-gray-400 bg-gray-100 text-gray-700"
              : "border-gray-200 bg-white text-gray-600"
          }`}
        >
          いいえ
        </button>
      </div>
    </div>
  );
}

// ======================================================
// 報酬ページ（報告完了後に表示）
// ======================================================

type RewardPageProps = {
  eventId: string;
  lotteryType: string;
  paymentMethod: string;
  appliedCount: number;
  blockName: string;
  rowNumber: string | null;
};

function RewardPage({
  eventId,
  lotteryType,
  paymentMethod,
  appliedCount,
  blockName,
  rowNumber,
}: RewardPageProps) {
  // データ取得
  const event = SAMPLE_EVENTS.find((e) => e.id === eventId) ?? null;
  const sections = getSampleSections(eventId);

  // 団結Lv（CTA出し分け用）
  const danketsu = useDanketsu(eventId);

  return (
    <div className="fade-in-up space-y-4 pb-8">
      {/* 完了メッセージ */}
      <div className="text-center py-6">
        <div className="text-5xl">🎉</div>
        <h2 className="mt-3 text-lg font-bold text-gray-900">
          反映したよ！団結ありがとう
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          あなたの報告で予想がもっと固まるよ
        </p>
      </div>

      {/* あなたの報告カード */}
      <YourReportCard
        data={{
          lotteryType,
          paymentMethod,
          appliedCount,
          blockName,
          rowNumber,
          isUpgrade: lotteryType === "upgrade",
        }}
      />

      {/* あなた向けインサイト（報酬） */}
      {event && sections.length > 0 && (
        <YourSeatInsight
          event={event}
          sections={sections}
          lotteryType={lotteryType}
          blockName={blockName}
        />
      )}

      {/* CTA 3ボタン */}
      <div className="pt-2">
        <CtaStack
          eventId={eventId}
          showUpgrade={lotteryType === "upgrade" || true}
          showDanketsu={!danketsu.pushedToday}
          onPushDanketsu={() => danketsu.pushDanketsu()}
        />
      </div>
    </div>
  );
}
