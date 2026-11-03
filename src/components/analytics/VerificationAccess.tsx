"use client";

import { useState } from "react";
import { beginVerification, endVerification } from "@/lib/analyticsTraffic";
import styles from "./VerificationAccess.module.css";

export function VerificationAccess() {
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  function start() {
    if (!confirmed) return;
    try { beginVerification("operator"); }
    catch { setError("確認モードを保存できませんでした。ブラウザの設定を確認してください。"); }
  }
  function normal() {
    try { endVerification(); }
    catch { setError("計測停止の解除に失敗しました。ブラウザの保存設定を確認してください。"); }
  }
  return (
    <main className={styles.main}>
      <h1 className={styles.heading}>運営者の確認アクセス</h1>
      <p className={styles.paragraph}>このブラウザで自分の画面を確認するとき、Google Analyticsへの送信を停止します。過去の記録は変更しません。</p>
      <p className={styles.paragraph}>停止はこのブラウザの同じサイトの全タブで続きます。再起動後も保持し、「通常計測に戻す」で解除できます。別の端末・ブラウザではそれぞれ設定してください。</p>
      <label className={styles.consent}>
        <input className={styles.checkbox} type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />
        <span>このブラウザの確認アクセスを計測から外します</span>
      </label>
      <button className={styles.action} disabled={!confirmed} onClick={start}>運営者の計測を停止</button>
      <button className={styles.secondary} disabled={!confirmed} onClick={() => { try { beginVerification("codex"); } catch { setError("計測停止を保存できませんでした。"); } }}>Codexの計測を停止</button>
      <button className={styles.secondary} onClick={normal}>通常計測に戻す</button>
      {error && <p role="alert" className={styles.error}>{error}</p>}
    </main>
  );
}
