"use client";

export type AnalyticsEventParams = Record<
  string,
  string | number | boolean | null | undefined
>;

declare global {
  interface Window {
    gtag?: (
      command: "config" | "event",
      targetOrEventName: string,
      params?: AnalyticsEventParams,
    ) => void;
  }
}

/**
 * GA4へサイト内行動を送る。計測タグが無いローカル環境では何もしない。
 * メールアドレス・表示名・自由記述コメントなどの個人情報は渡さないこと。
 */
export function trackEvent(
  eventName: string,
  params: AnalyticsEventParams = {},
): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;

  const safeParams = Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null),
  );
  window.gtag("event", eventName, safeParams);
}

