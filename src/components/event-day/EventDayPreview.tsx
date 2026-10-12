"use client";

import { useEffect, useRef, useState } from "react";
import { Download, ExternalLink } from "lucide-react";
import { EVENT_DAY_OSAKA_EXAMPLE } from "@/data/eventDayOsakaExample";
import { eventDayFilename, eventDayXHref, type EventDaySummary } from "@/lib/eventDaySummary";
import { renderMapImageAsPngBlob, downloadPngBlob } from "@/lib/arena-map/exportMapImage";
import { EventDaySheet } from "./EventDaySheet";
import { EventDayReader } from "./EventDayReader";
import { eventDayImageScale } from "@/lib/eventDayImage";
import styles from "./EventDayPreview.module.css";

export default function EventDayPreview({ day = EVENT_DAY_OSAKA_EXAMPLE, failFirstImage = false, textScale = 1, publicUrl }: { day?: EventDaySummary; failFirstImage?: boolean; textScale?: number; publicUrl?: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [image, setImage] = useState<File | null>(null);
  const [imageError, setImageError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [status, setStatus] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function prepare() {
      try {
        await document.fonts.ready;
        if (cancelled || !svgRef.current) return;
        if (failFirstImage && retry === 0) throw new Error("Development QA: first image attempt fails");
        const { width, height } = svgRef.current.viewBox.baseVal;
        const blob = await renderMapImageAsPngBlob(svgRef.current, { scale: eventDayImageScale(width, height) });
        if (cancelled) return;
        const file = new File([blob], eventDayFilename(day), { type: "image/png" });
        setImageError(false); setImage(file);
      } catch { if (!cancelled) setImageError(true); }
    }
    void prepare();
    return () => { cancelled = true; };
  }, [retry, day, failFirstImage]);

  function save() {
    if (!image) return;
    downloadPngBlob(image, image.name);
    setStatus("画像の保存を開始しました。Xでは保存した画像を添付してください。");
  }

  const shareHref = publicUrl
    ? `${eventDayXHref(day)}&url=${encodeURIComponent(publicUrl)}`
    : eventDayXHref(day);

  return <>
    <EventDayReader day={day} textScale={textScale} tools={<>
      <button className={styles.secondary} type="button" disabled={!image} onClick={save}><Download size={20} aria-hidden="true" />{image ? "画像を保存" : imageError ? "画像生成に失敗" : "画像を準備中…"}</button>
      <a className={styles.secondary} aria-label="Xで投稿文を開く" href={shareHref} target="_blank" rel="noopener noreferrer"><span className={styles.xMark} aria-hidden="true">𝕏</span>投稿文を開く<ExternalLink size={16} aria-hidden="true" /></a>
      <p role="status" className={styles.status}>{status}</p>
      {imageError && <div role="alert" className={styles.imageError}><p>画像を作れませんでした。</p><button type="button" className={styles.secondary} onClick={() => { setImageError(false); setImage(null); setRetry(v => v + 1); }}>もう一度作る</button></div>}
    </>} />
    <div hidden aria-hidden="true" data-testid="event-day-sheet"><EventDaySheet day={day} svgRef={svgRef} /></div>
  </>;
}
