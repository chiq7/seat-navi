"use client";

import Link from "next/link";

type GateOverlayProps = {
  eventId: string;
  onUnlock: (method: "report" | "result" | "danketsu") => void;
  danketsuPushedToday: boolean;
  onPushDanketsu: () => boolean;
};

export function GateOverlay({
  eventId,
  onUnlock,
  danketsuPushedToday,
  onPushDanketsu,
}: GateOverlayProps) {
  const handleDanketsu = () => {
    if (danketsuPushedToday) {
      // Already pushed today — still unlock gate
      onUnlock("danketsu");
    } else {
      const success = onPushDanketsu();
      if (success) {
        onUnlock("danketsu");
      }
    }
  };

  return (
    <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-5">
      <div className="text-center">
        <div className="text-3xl">🔓</div>
        <h3 className="mt-2 text-sm font-bold text-gray-900">
          詳細を見るには協力が必要だよ
        </h3>
        <p className="mt-1 text-xs text-gray-500">
          1つやるだけでフィルタ・詳細が全部見れるようになるよ
        </p>
      </div>

      <div className="mt-4 space-y-2.5">
        {/* Option 1: 当選報告 (30秒) */}
        <Link
          href={`/venue/${eventId}/section/new/post`}
          className="flex w-full items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-left transition-all hover:border-[var(--accent)] hover:shadow-sm"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pink-50 text-lg">
            ✍️
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-gray-900">
              当選席を報告する
            </div>
            <div className="text-[10px] text-gray-400">30秒で完了</div>
          </div>
          <svg className="h-4 w-4 shrink-0 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>

        {/* Option 2: 当落だけ報告 (10秒) */}
        <button
          type="button"
          onClick={() => onUnlock("result")}
          className="flex w-full items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-left transition-all hover:border-purple-300 hover:shadow-sm"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-lg">
            🎯
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-gray-900">
              当落だけ報告する
            </div>
            <div className="text-[10px] text-gray-400">当選 or 落選を1タップ</div>
          </div>
          <svg className="h-4 w-4 shrink-0 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Option 3: 団結 (1日1回) */}
        <button
          type="button"
          onClick={handleDanketsu}
          className="flex w-full items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-left transition-all hover:border-orange-300 hover:shadow-sm"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-lg">
            🔥
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-gray-900">
              今日の団結を入れる
            </div>
            <div className="text-[10px] text-gray-400">
              {danketsuPushedToday ? "今日は入れ済み（タップで解放）" : "1日1回 · 1秒で完了"}
            </div>
          </div>
          <svg className="h-4 w-4 shrink-0 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
