"use client";

type DanketsuGaugeProps = {
  gauge: string;        // "■■■□□"
  displayLv: number;    // 1-5
  message: string;      // 煽り文言
  pushedToday: boolean;
  pushAnimation: boolean;
  onPush: () => void;
  compact?: boolean;
};

export function DanketsuGauge({
  gauge,
  displayLv,
  message,
  pushedToday,
  pushAnimation,
  onPush,
  compact = false,
}: DanketsuGaugeProps) {
  if (compact) {
    return (
      <button
        type="button"
        onClick={onPush}
        disabled={pushedToday}
        className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
          pushedToday
            ? "border-emerald-200 bg-emerald-50 text-emerald-600"
            : "border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 active:scale-95"
        } ${pushAnimation ? "scale-105" : ""}`}
      >
        <span className="tracking-wider">{gauge}</span>
        <span>Lv.{displayLv}</span>
        {!pushedToday && <span>🔥</span>}
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gray-900">団結Lv</span>
            <span className="text-base font-bold tracking-wider text-orange-500">
              {gauge}
            </span>
            <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-bold text-orange-600">
              Lv.{displayLv}
            </span>
          </div>
          <p className="mt-1 text-[10px] text-gray-400">{message}</p>
        </div>
        <button
          type="button"
          onClick={onPush}
          disabled={pushedToday}
          className={`flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-bold shadow-md transition-all ${
            pushedToday
              ? "bg-emerald-100 text-emerald-600 shadow-none"
              : "bg-gradient-to-r from-orange-400 to-amber-500 text-white active:scale-90 hover:shadow-lg"
          } ${pushAnimation ? "scale-110" : ""}`}
        >
          {pushedToday ? (
            <>
              <span>✅</span>
              <span>済み</span>
            </>
          ) : (
            <>
              <span className={pushAnimation ? "animate-bounce" : ""}>🔥</span>
              <span>今日の団結</span>
            </>
          )}
        </button>
      </div>
      <p className="mt-2 text-[10px] text-gray-400">
        団結すると予想が固まる · 1日1回
      </p>
    </div>
  );
}

/** スクショ用透かしの団結Lv表示 */
export function DanketsuWatermark({
  gauge,
  displayLv,
}: {
  gauge: string;
  displayLv: number;
}) {
  return (
    <span className="text-[10px] text-gray-400">
      団結Lv {gauge} Lv.{displayLv}
    </span>
  );
}
