"use client";

import { useEffect, useSyncExternalStore } from "react";
import { endVerification, getTrafficOrigin, VERIFICATION_STORAGE_KEY } from "@/lib/analyticsTraffic";
import styles from "./VerificationAccess.module.css";

const subscribe = (callback: () => void) => {
  window.addEventListener("tixrepo-traffic-ready", callback);
  return () => window.removeEventListener("tixrepo-traffic-ready", callback);
};
const serverOrigin = () => "public_unmarked" as const;

export function VerificationNotice() {
  const origin = useSyncExternalStore(subscribe, getTrafficOrigin, serverOrigin);
  const active = origin === "verification_codex" || origin === "verification_operator";
  useEffect(() => {
    if (!active) return;
    let expiry: number;
    try { expiry = JSON.parse(sessionStorage.getItem(VERIFICATION_STORAGE_KEY) ?? "null")?.expiresAt; }
    catch { return; }
    if (!Number.isSafeInteger(expiry)) return;
    // Stop at an untracked control page, rather than continuing QA as a public visit.
    const timer = window.setTimeout(endVerification, Math.max(0, expiry - Date.now()));
    return () => window.clearTimeout(timer);
  }, [active]);
  if (!active) return null;
  return (
    <aside aria-label="確認アクセスの計測状態" className={styles.notice}>
      <p className={styles.noticeText}>{origin === "verification_codex" ? "Codex" : "運営者"}の確認モード：通常アクセスと別に集計します</p>
      <button className={styles.end} onClick={endVerification}>確認を終了</button>
    </aside>
  );
}
