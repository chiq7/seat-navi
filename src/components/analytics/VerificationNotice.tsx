"use client";
import { useSyncExternalStore } from "react";
import { endVerification, getTrafficOrigin } from "@/lib/analyticsTraffic";
import styles from "./VerificationAccess.module.css";
const subscribe = (callback: () => void) => { window.addEventListener("tixrepo-traffic-ready", callback); return () => window.removeEventListener("tixrepo-traffic-ready", callback); };
const serverOrigin = () => "public_unmarked" as const;
export function VerificationNotice() {
  const origin = useSyncExternalStore(subscribe, getTrafficOrigin, serverOrigin);
  if (origin !== "verification_codex" && origin !== "verification_operator") return null;
  return <aside aria-label="確認アクセスの計測状態" className={styles.notice}>
    <p className={styles.noticeText}>{origin === "verification_codex" ? "Codex" : "運営者"}の確認中：Google Analyticsへの送信を停止しています</p>
    <button className={styles.end} onClick={endVerification}>通常計測に戻す</button>
  </aside>;
}
