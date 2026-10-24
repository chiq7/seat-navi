"use client";

import { useState } from "react";
import { beginVerification, VERIFICATION_STORAGE_KEY } from "@/lib/analyticsTraffic";
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
    try { window.sessionStorage.removeItem(VERIFICATION_STORAGE_KEY); } catch { /* No marker is added. */ }
    window.location.assign("/");
  }
  return (
    <main className={styles.main}>
      <h1 className={styles.heading}>運営者の確認アクセス</h1>
      <p className={styles.paragraph}>自分で画面を確認するときに、このタブのアクセスを通常の集計と分けます。過去のアクセスは削除しません。</p>
      <p className={styles.paragraph}>確認モードはこのタブで最長2時間有効です。共有するURLに確認用の印は付きません。</p>
      <label className={styles.consent}>
        <input className={styles.checkbox} type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />
        <span>このタブを運営者の確認専用として使います</span>
      </label>
      <button className={styles.action} disabled={!confirmed} onClick={start}>確認モードで開始</button>
      <button className={styles.secondary} onClick={normal}>通常の閲覧へ</button>
      {error && <p role="alert" className={styles.error}>{error}</p>}
    </main>
  );
}
