"use client";

import { useEffect, useState } from "react";
import { Check, Heart, Loader2, Users } from "lucide-react";
import { hasRequestedSeatPhoto, requestSeatPhoto, seatPhotoRequestCounts } from "@/lib/seatPhotoRequests";
import { trackVenueSeatPhotoRequest } from "@/lib/venueAnalytics";
import styles from "./SeatPhotoRequest.module.css";

/** Shown for a block with no photo yet: one tap asks for one, and everyone sees how many visitors wait. */
export default function SeatPhotoRequest({ venueId, section }: { venueId: string; section: string }) {
  const [count, setCount] = useState<number | null>(null);
  const [state, setState] = useState<"idle" | "sending" | "done" | "rate" | "failed">("idle");

  useEffect(() => {
    let current = true;
    setState(hasRequestedSeatPhoto(venueId, section) ? "done" : "idle");
    setCount(null);
    seatPhotoRequestCounts(venueId).then(counts => { if (current) setCount(counts.get(section) ?? 0); }).catch(() => undefined);
    return () => { current = false; };
  }, [venueId, section]);

  async function send() {
    setState("sending");
    const result = await requestSeatPhoto(venueId, section);
    if (result.ok) { setCount(result.count); setState("done"); trackVenueSeatPhotoRequest(venueId); }
    else setState(result.reason);
  }

  const waiting = count !== null && count > 0 ? <span className={styles.waiting}><Users size={14} aria-hidden="true" />{count}人が待っています</span> : null;
  return <div className={styles.request} data-seat-photo-request={section}>
    {state === "done"
      ? <p className={styles.done} role="status"><Check size={18} aria-hidden="true" />リクエスト済み{waiting}</p>
      : <>
        <button type="button" className={styles.button} disabled={state === "sending"} onClick={send}>
          {state === "sending" ? <Loader2 size={18} className={styles.spin} aria-hidden="true" /> : <Heart size={18} aria-hidden="true" />}
          {section}の写真がほしい
        </button>
        {waiting}
        {state === "rate" && <p className={styles.error} role="alert">今日はここまでです。明日また押せます。</p>}
        {state === "failed" && <p className={styles.error} role="alert">送れませんでした。もう一度押してください。</p>}
      </>}
  </div>;
}
