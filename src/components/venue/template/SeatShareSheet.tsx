"use client";

import { useEffect, useRef, useState } from "react";
import { Copy, Share2, X } from "lucide-react";
import { seatShareImage, seatShareLabel, seatSharePath, seatShareText, SITE_ORIGIN, type SeatShare } from "@/lib/seatShare";
import { trackVenueSeatShare } from "@/lib/venueAnalytics";
import styles from "./SeatShareSheet.module.css";

type Destination = "line" | "x" | "copy" | "native";

/** The link for one destination, tagged so GA4 can tell where shared visits came from. */
function shareUrl(share: SeatShare, source: Destination) {
  const url = new URL(seatSharePath(share), SITE_ORIGIN);
  url.searchParams.set("utm_source", source === "native" ? "share" : source);
  url.searchParams.set("utm_medium", "social");
  url.searchParams.set("utm_campaign", "seat_share");
  return url.toString();
}

/** "この席を送る": LINE, X, copy, or the phone's own share sheet. What friends see is shown first. */
export function SeatShareSheet({ share, venueName, blockName, onClose }: { share: SeatShare; venueName: string; blockName: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [copied, setCopied] = useState<"idle" | "done" | "manual">("idle");
  // Opened only after a tap, so the browser is known here (no server render to match).
  const [native] = useState(() => typeof navigator !== "undefined" && typeof navigator.share === "function");
  const text = seatShareText(venueName, blockName, share.row, share.number);
  const image = seatShareImage(share.venue, share.section);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    element.showModal();
    return () => element.close();
  }, []);

  async function copy() {
    trackVenueSeatShare("copy");
    try { await navigator.clipboard.writeText(`${text}\n${shareUrl(share, "copy")}`); setCopied("done"); }
    catch { setCopied("manual"); }
  }
  async function shareNative() {
    trackVenueSeatShare("native");
    try { await navigator.share({ title: text, text, url: shareUrl(share, "native") }); } catch { /* closed by the person */ }
  }

  const line = `https://line.me/R/share?text=${encodeURIComponent(`${text}\n${shareUrl(share, "line")}`)}`;
  const x = new URL("https://x.com/intent/tweet");
  x.searchParams.set("text", text); x.searchParams.set("url", shareUrl(share, "x"));

  return <dialog ref={dialog} className={styles.dialog} aria-labelledby="seat-share-title"
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className={styles.panel}>
      <header className={styles.head}>
        <h2 id="seat-share-title">この席を送る</h2>
        <button type="button" className={styles.close} onClick={onClose} aria-label="閉じる"><X size={20} aria-hidden="true" /></button>
      </header>
      <figure className={styles.preview}>
        {/* eslint-disable-next-line @next/next/no-img-element -- the share picture exactly as LINE / X will show it */}
        {image && <img src={image} alt="" width={1200} height={630} />}
        <figcaption><strong>{venueName}</strong><span>{seatShareLabel(blockName, share.row, share.number)}</span></figcaption>
      </figure>
      <div className={styles.actions}>
        <a className={`${styles.action} ${styles.line}`} href={line} target="_blank" rel="noopener noreferrer" onClick={() => trackVenueSeatShare("line")}>
          <span className={styles.badge} aria-hidden="true">LINE</span>LINEで送る</a>
        <a className={`${styles.action} ${styles.x}`} href={x.toString()} target="_blank" rel="noopener noreferrer" onClick={() => trackVenueSeatShare("x")}>
          <span className={styles.badge} aria-hidden="true">𝕏</span>Xで送る</a>
        <button type="button" className={styles.action} onClick={copy}><Copy size={18} aria-hidden="true" />リンクをコピー</button>
        {native && <button type="button" className={styles.action} onClick={shareNative}><Share2 size={18} aria-hidden="true" />ほかのアプリで送る</button>}
      </div>
      {copied === "done" && <p className={styles.status} role="status">リンクをコピーしました</p>}
      {copied === "manual" && <input className={styles.manual} aria-label="この席のリンク" readOnly value={shareUrl(share, "copy")} onFocus={event => event.currentTarget.select()} />}
      <p className={styles.note}>送った相手が開くと、座席表がこの{share.row || share.number ? "席" : "区画"}の場所で開きます。</p>
    </div>
  </dialog>;
}
