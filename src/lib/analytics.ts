"use client";

import { getTrafficOrigin, VERIFICATION_ENTRY_PATH } from "@/lib/analyticsTraffic";

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
function canSend(): boolean {
  if (typeof window === "undefined" || typeof window.gtag !== "function" || window.location.pathname === VERIFICATION_ENTRY_PATH) return false;
  const origin = getTrafficOrigin();
  return origin !== "verification_codex" && origin !== "verification_operator";
}

/**
 * サイト内移動の後、以降の送信（自前のイベント・スクロール・滞在時間）を今のページの分にする。
 * 最初の config で渡した page_location は、set や config の呼び直しでは変わらず、
 * update: true を付けたときだけ置き換わる（2026-11-28、送信を止めたブラウザで確認）。
 */
export function setAnalyticsPage(measurementId: string, pageLocation: string): void {
  if (!canSend()) return;
  window.gtag?.("config", measurementId, { update: true, page_location: pageLocation, send_page_view: false });
}

export function trackEvent(
  eventName: string,
  params: AnalyticsEventParams = {},
): void {
  if (!canSend()) return;

  const safeParams = Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null),
  );
  window.gtag?.("event", eventName, { ...safeParams, traffic_origin: getTrafficOrigin() });
}

