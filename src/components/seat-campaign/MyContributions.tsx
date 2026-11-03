"use client";
import { useCallback, useSyncExternalStore } from "react";
import type { CampaignEvent } from "@/lib/seat-campaign/model";
import { receiptLedger, RECEIPTS_CHANGED, type ManagedReceipt } from "@/lib/seat-campaign/receiptLedger";
import styles from "./SeatCampaign.module.css";
const subscribe = (f: () => void) => { window.addEventListener("storage", f); window.addEventListener(RECEIPTS_CHANGED, f); return () => { window.removeEventListener("storage", f); window.removeEventListener(RECEIPTS_CHANGED, f); }; };
export default function MyContributions({ event, busy, onWithdraw, onRetry }: { event: CampaignEvent; busy: boolean; onWithdraw: (r: ManagedReceipt, edit: boolean) => void; onRetry: (r: ManagedReceipt) => void }) {
  const snapshot = useCallback(() => { try { return JSON.stringify({ rows: receiptLedger(localStorage, event) }); } catch { return JSON.stringify({ error: "投稿履歴を読み取れません。ブラウザのデータを消さずに再読込してください。" }); } }, [event]);
  const value = JSON.parse(useSyncExternalStore(subscribe, snapshot, () => '{"rows":[]}')) as { rows?: ManagedReceipt[]; error?: string };
  return <details className={styles.operations}><summary>このブラウザで投稿した座席（{value.rows?.length ?? "?"}件）</summary>
    <p className={styles.small}>投稿ごとに撤回・修正できます。ブラウザのデータを消すと管理できなくなります。通信結果が不明な投稿は同じIDで再確認します。</p>
    {value.error && <p role="alert" className={styles.error}>{value.error}</p>}
    <ul className={styles.rows}>{value.rows?.map(r => <li key={r.id}><strong>{r.input.block} · {r.input.row}列 · {r.input.number}番</strong><p>{r.state === "pending" ? "保存結果を確認中" : "保存済み（運営による確認状況とは別）"}</p><div className={styles.actions}>
      {r.state === "pending" && <button className={styles.secondary} disabled={busy} onClick={() => onRetry(r)}>同じ内容で保存を再確認</button>}
      <button className={styles.secondary} disabled={busy} onClick={() => onWithdraw(r, false)}>この投稿を撤回</button>
      <button className={styles.secondary} disabled={busy} onClick={() => onWithdraw(r, true)}>撤回して修正</button>
    </div></li>)}</ul>
  </details>;
}
