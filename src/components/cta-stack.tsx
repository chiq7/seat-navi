"use client";

import Link from "next/link";

type CtaStackProps = {
  eventId: string;
  showUpgrade?: boolean;
  showDanketsu?: boolean;
  onPushDanketsu?: () => void;
};

/**
 * 報酬ページ下部 CTA 3ボタン
 * 「予想マップに戻る」（最優先）
 * 「アプグレだけ見る」（条件付き）
 * 「今日の団結、入れとこ」（未実行時のみ）
 */
export function CtaStack({
  eventId,
  showUpgrade = true,
  showDanketsu = false,
  onPushDanketsu,
}: CtaStackProps) {
  return (
    <div className="space-y-2.5">
      {/* Primary: 予想マップ */}
      <Link
        href={`/venue/${eventId}`}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-dark)] py-3.5 text-sm font-bold text-white shadow-lg transition-all hover:shadow-xl active:scale-[0.98]"
      >
        <span>🗺️</span>
        <span>予想マップに戻る</span>
      </Link>

      {/* Secondary: アプグレだけ見る */}
      {showUpgrade && (
        <Link
          href={`/venue/${eventId}?filter=upgrade`}
          className="flex w-full items-center justify-center gap-2 rounded-full border border-amber-200 bg-amber-50 py-3 text-sm font-semibold text-amber-700 transition-all hover:bg-amber-100 active:scale-[0.98]"
        >
          <span>⚡</span>
          <span>アプグレだけ見る</span>
        </Link>
      )}

      {/* Tertiary: 団結 (未実行時) */}
      {showDanketsu && onPushDanketsu && (
        <button
          type="button"
          onClick={onPushDanketsu}
          className="flex w-full items-center justify-center gap-2 rounded-full border border-orange-200 bg-orange-50 py-3 text-sm font-semibold text-orange-700 transition-all hover:bg-orange-100 active:scale-[0.98]"
        >
          <span>🔥</span>
          <span>今日の団結、入れとこ</span>
        </button>
      )}
    </div>
  );
}
