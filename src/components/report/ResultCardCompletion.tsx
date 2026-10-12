"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Download, Eye, EyeOff, Share2, Shuffle, ShieldCheck } from "lucide-react";
import { ResultCardImage } from "./ResultCardImage";
import { RESULT_PHRASES, nextPhraseIndex, resultPhraseKind, type PublicResultCard } from "@/lib/resultCard";
import { completionLinks, completionShareText } from "@/lib/resultCardCompletion";
import { downloadPngBlob, renderMapImageAsPngBlob } from "@/lib/arena-map/exportMapImage";
import { trackEvent } from "@/lib/analytics";
import { shareResultImage } from "@/lib/resultImageShare";
import styles from "./ResultCardPreview.module.css";
import { seatMapReturnHref } from "@/lib/arena-map/seatMapNavigation";

export function ResultCardCompletion({ card, eventId, artistSlug, onOther, sample = false, savedSeatReportId }: {
  card: PublicResultCard; eventId: string; artistSlug: string | null; onOther: () => void; sample?: boolean; savedSeatReportId?: string | null;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [prepared, setPrepared] = useState<{ key: string; file: File } | null>(null);
  const [status, setStatus] = useState("");
  const [imageError, setImageError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [sharing, setSharing] = useState(false);
  const [canShareFile, setCanShareFile] = useState(false);
  const [saved, setSaved] = useState(false);
  const links = completionLinks(eventId);
  const ownSeatHref = !sample && card.result === "won" && card.seat?.area === "アリーナ" ? seatMapReturnHref(eventId, savedSeatReportId) : null;
  const dataHref = (card.result === "lost" || (card.seat && card.seat.area !== "アリーナ")) && artistSlug ? `/artists/${encodeURIComponent(artistSlug)}#ticket-data` : links.event;
  const pool = RESULT_PHRASES[resultPhraseKind(card, sample && !card.previousLosses && card.seat?.layout === "sample")];
  const phrase = visible ? pool[index % pool.length] : null;
  const key = JSON.stringify([card, phrase, sample, retry]);
  const ready = prepared?.key === key ? prepared.file : null;
  const text = `${sample ? "【試作・架空の結果】\n" : ""}${completionShareText(card)}`;
  const shareUrl = sample ? "https://tixrepo.com" : links.share;
  const xHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;

  useEffect(() => {
    let cancelled = false;
    async function prepare() {
      try {
        await document.fonts.ready;
        if (cancelled || !svgRef.current) return;
        const blob = await renderMapImageAsPngBlob(svgRef.current, { scale: 2 });
        if (cancelled) return;
        const file = new File([blob], `tixrepo-${sample ? "SAMPLE-" : ""}result.png`, { type: "image/png" });
        let supported = false;
        try { supported = typeof navigator.share === "function" && typeof navigator.canShare === "function" && navigator.canShare({ files: [file] }); } catch { /* Save + X fallback. */ }
        setCanShareFile(supported); setImageError(false); setPrepared({ key, file });
      } catch { if (!cancelled) setImageError(true); }
    }
    void prepare();
    return () => { cancelled = true; };
  }, [key, sample]);

  function record(method: string) {
    try { if (!sample) trackEvent("result_image_action", { method, event_id: eventId }); } catch { /* Sharing must not depend on analytics. */ }
  }
  function save() {
    if (!ready) return;
    downloadPngBlob(ready, ready.name); setSaved(true);
    setStatus("保存を開始しました。Xでは保存した画像を添付してください。"); record("save");
  }
  async function share() {
    if (!ready || sharing) return;
    setSharing(true); setStatus("");
    const outcome = await shareResultImage(navigator, { files: [ready], title: "ちけレポ", text, url: shareUrl });
    if (outcome === "shared") record("share_sheet"); // Not proof of an X post.
    if (outcome === "failed" || outcome === "unavailable") {
      setCanShareFile(false); setStatus("この端末では画像共有できません。保存してXに添付してください。");
    }
    setSharing(false);
  }
  function changeCopy() { setStatus(""); setSaved(false); }

  return <main className={styles.page}><div className={styles.shell}>
    <header className={styles.header}><span className={styles.brand}>ちけレポ</span><span className={styles.previewLabel}>{sample ? "保存完了の動作テスト" : "投稿完了"}</span></header>
    <h1 className={styles.title}>{sample ? "投稿後は、この画面に。" : "投稿できました。"}</h1>
    <div className={styles.cardFrame}><ResultCardImage card={card} phrase={phrase} svgRef={svgRef} sample={sample} /></div>
    <div className={styles.copyTools}>
      <button type="button" disabled={sharing} onClick={() => { setIndex(nextPhraseIndex(pool.length, index)); setVisible(true); changeCopy(); }}><Shuffle size={17} aria-hidden="true" />別のひとこと</button>
      <button type="button" disabled={sharing} aria-label={visible ? "ひとことを隠す" : "ひとことを表示"} onClick={() => { setVisible(!visible); changeCopy(); }}>{visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}{visible ? "隠す" : "表示"}</button>
    </div>
    {imageError ? <div role="alert" className="mb-3 text-sm"><p>画像を作れませんでした。{sample ? "" : "投稿は保存されています。"}</p><button type="button" className="min-h-11 underline" onClick={() => { setImageError(false); setRetry(v => v + 1); }}>画像だけ再作成</button></div> : null}
    <div className="grid grid-cols-2 gap-2">
      <button type="button" className={styles.save} disabled={!ready || sharing} onClick={save}><Download size={18} aria-hidden="true" />{ready ? "画像を保存" : imageError ? "画像作成失敗" : "画像を準備中"}</button>
      {canShareFile ? <button type="button" className={styles.save} disabled={!ready || sharing} onClick={share}><Share2 size={18} aria-hidden="true" />{sharing ? "共有中…" : "画像を共有"}</button> : <a href={xHref} target="_blank" rel="noopener noreferrer" className="flex min-h-12 items-center justify-center rounded-lg border border-[#d62a6b] text-sm font-bold text-[#b72359]" onClick={() => record("x_intent")}>Xで投稿文を開く</a>}
    </div>
    {!canShareFile && <p className="mt-2 text-xs text-[#736574]">{saved ? "保存した画像をXで添付してください。" : "画像を保存 → Xで画像を添付"}</p>}
    <p role="status" className={styles.status}>{status}</p>
    <p className={styles.privacy}><ShieldCheck size={15} aria-hidden="true" />列・席番号は画像に出ません</p>
    <div className="mt-5 grid gap-2 border-t border-[#ded4de] pt-4 text-sm font-bold">
      <Link className="flex min-h-11 items-center justify-center rounded-lg bg-white" href={ownSeatHref ?? dataHref}>{ownSeatHref ? "追加した座席を座席表で見る →" : dataHref !== links.event ? "当落・座席データを見る →" : "この公演の座席表・報告を見る →"}</Link>
      <button type="button" className="min-h-11" onClick={onOther}>別の結果を報告する</button>
      {artistSlug && <Link className="flex min-h-11 items-center justify-center text-[#736574]" href={`/artists/${encodeURIComponent(artistSlug)}`}>アーティストページへ</Link>}
    </div>
    {sample && <p className={styles.disclaimer}>架空の結果です。DBへの書き込み・X投稿は行いません。</p>}
  </div></main>;
}
