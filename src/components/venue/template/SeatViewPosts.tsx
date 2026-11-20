"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Camera, ChevronLeft, ChevronRight, ExternalLink, Link2, X } from "lucide-react";
import { seatViewInlinePhotoUrl, seatViewPhotoSourceUrl, seatViewSingleImageEmbedUrl, seatViewXStatusId } from "@/lib/seatViewPhotoAssets";
import { seatViewMatchesForSelection, seatViewPosts, type seatViewMatch, type SeatViewPost, type SeatViewSelection } from "@/lib/seatViewPosts";
import { venueSeatSectionHref, type VenueSeatLinkTarget } from "@/lib/venueSeatLinks";
import { trackVenueSeatPhotoShareClick } from "@/lib/venueAnalytics";
import { SeatPhotoCreditLine } from "@/components/common/SeatPhotoCreditLine";
import { photoSelectionCaption, photoSelectionRelation } from "@/lib/seatPhotoCaption";
import styles from "./SeatViewPosts.module.css";

export type SeatViewMatch = { post: SeatViewPost; label: NonNullable<ReturnType<typeof seatViewMatch>>; context?: string };
export type SeatPhotoShare = { venueId: string; venueName: string; target: VenueSeatLinkTarget };

export const SEAT_PHOTO_MAP_COLOR = "#713d67";

export function SeatPhotoMapSummary({ selection, count, onOpen }: {
  selection: SeatViewSelection;
  count: number;
  onOpen: () => void;
}) {
  const summary = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!count) return;
    let frame = 0;
    const scrollToPhotos = () => {
      if (window.location.hash !== "#venue-seat-photos") return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => summary.current?.scrollIntoView({ block: "start" }));
    };
    scrollToPhotos();
    window.addEventListener("hashchange", scrollToPhotos);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", scrollToPhotos);
    };
  }, [count]);
  if (!count) return null;
  const matches = seatViewMatchesForSelection(seatViewPosts(selection.diagram), selection);
  const hasSelection = Boolean(selection.section || selection.zone || selection.position);
  const first = matches[0];
  return <div ref={summary} id="venue-seat-photos" className={`${styles.mapPhotoSummary} scroll-mt-[90px]`} data-seat-photo-summary>
    {first ? <SeatPhotoPreview key={first.post.url + ":" + first.post.photo}
      match={first} count={matches.length} onClick={onOpen} /> : <>
      <span className={styles.mapPhotoHeading}><Camera size={19} aria-hidden="true" />
        {hasSelection ? "この区画の写真はまだありません" : <>写真がある区画<span>{count}か所</span></>}
      </span>
      <span className={styles.mapPhotoHint}>カメラ印の場所を選んで確認</span>
    </>}
  </div>;
}

function SeatPhotoPreview({ match, count, onClick }: { match: SeatViewMatch; count: number; onClick: () => void }) {
  const [failed, setFailed] = useState(false);
  const image = failed ? null : seatViewInlinePhotoUrl(match.post);
  return <button type="button" className={styles.photoPreview} data-seat-photo-preview
    aria-haspopup="dialog" onClick={onClick}>
    <span className={styles.photoPreviewImage} aria-hidden="true">
      {image ? <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt="" width={76} height={52} decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
      </> : <Camera size={24} />}
    </span>
    <span className={styles.photoPreviewCopy}>
      <strong>写真を見る<span>{count}枚</span></strong>
      <span>{photoSelectionCaption(match)}</span>
    </span>
    <ChevronRight size={20} aria-hidden="true" />
  </button>;
}

export function SeatPhotoMarker({ x, y, size, highlighted = false }: { x: number; y: number; size: number; highlighted?: boolean }) {
  return <g transform={`translate(${x} ${y}) scale(${size / 24})`} aria-hidden="true" pointerEvents="none">
    <circle r="11" fill={highlighted ? SEAT_PHOTO_MAP_COLOR : "#90254f"} stroke="#fff" strokeWidth="1.8" />
    <path d="M-7 -3.6h3l1.4-2h5.2l1.4 2h3v9h-14z" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
    <circle cy=".8" r="2.35" fill="none" stroke="#fff" strokeWidth="1.5" />
  </g>;
}

function SeatPhoto({ post, location }: { post: SeatViewPost; location: string }) {
  const [failedVariants, setFailedVariants] = useState(0);
  const [loadedUrl, setLoadedUrl] = useState<string>();
  const fullImage = seatViewInlinePhotoUrl(post);
  const isX = Boolean(seatViewXStatusId(post));
  const isNote = post.url.startsWith("https://note.com/");
  const variants = fullImage && isX ? [fullImage, fullImage.replace("name=large", "name=small")] : [fullImage];
  const inlineUrl = variants[failedVariants];
  const embedUrl = inlineUrl ? undefined : seatViewSingleImageEmbedUrl(post);
  const sourceUrl = seatViewPhotoSourceUrl(post);
  const sourceLabel = isX ? "元のX投稿を見る" : isNote ? "元のnote記事を見る" : "撮影者のレポート";

  return <>
    {inlineUrl ? <div className={styles.imageFrame} aria-busy={loadedUrl !== inlineUrl}>
      {loadedUrl !== inlineUrl && <span className={styles.loading} data-photo-loading role="status">写真を読み込み中…</span>}
      {/* Use the exact source image URL without resizing or rehosting the asset. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img data-seat-view-image src={inlineUrl} alt={`${location}からの見え方`}
        decoding="async" referrerPolicy="no-referrer" onLoad={() => setLoadedUrl(inlineUrl)} onError={() => setFailedVariants(value => value + 1)} />
    </div> : <>
      {embedUrl && <iframe className={styles.embed} src={embedUrl} title={location + "からの見え方（元のX投稿）"} referrerPolicy="no-referrer" />}
      <div className={styles.status}><span role="status">写真を読み込めませんでした。</span>
        <button type="button" onClick={() => setFailedVariants(0)}>写真を再読み込み</button>
      </div>
    </>}
    {sourceUrl && <a className={styles.original} href={sourceUrl} target="_blank" rel="noopener noreferrer">
      {sourceLabel}<ExternalLink size={13} aria-hidden="true" />
    </a>}
  </>;
}

function SeatPhotoShareActions({ share }: { share: SeatPhotoShare }) {
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "manual">("idle");
  const url = new URL(venueSeatSectionHref(share.venueId, share.target), "https://tixrepo.com");
  const sharedOnX = new URL(url);
  sharedOnX.searchParams.set("utm_source", "x");
  sharedOnX.searchParams.set("utm_medium", "social");
  sharedOnX.searchParams.set("utm_campaign", "seat_photo_share");
  const intent = new URL("https://x.com/intent/tweet");
  intent.searchParams.set("text", `${share.venueName} ${share.target.section}区画からの見え方｜ちけレポ`);
  intent.searchParams.set("url", sharedOnX.toString());

  async function copy() {
    try {
      await navigator.clipboard.writeText(url.toString());
      setCopyStatus("copied");
    } catch {
      setCopyStatus("manual");
    }
  }

  return <div className={styles.share} aria-label="この区画を共有">
    <a href={intent.toString()} target="_blank" rel="noopener noreferrer" onClick={() => {
      trackVenueSeatPhotoShareClick(share.venueId, "photo_viewer");
    }}>Xで共有<ExternalLink size={14} aria-hidden="true" /></a>
    <button type="button" onClick={copy}><Link2 size={15} aria-hidden="true" />リンクをコピー</button>
    {copyStatus === "copied" && <p role="status">リンクをコピーしました</p>}
    {copyStatus === "manual" && <input aria-label="この区画のリンク" readOnly value={url.toString()} onFocus={event => event.currentTarget.select()} />}
  </div>;
}

export function SeatViewDialog({ matches, panelId, onClose, compact = false, share }: {
  matches: SeatViewMatch[];
  panelId: string;
  onClose: () => void;
  compact?: boolean;
  share?: SeatPhotoShare;
}) {
  const [index, setIndex] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const backdropPress = useRef(false);
  const swipeStart = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const match = matches[index] ?? matches[0];
  const { post } = match;
  const location = post.area + (post.row ? `・${post.row}列` : "") + (post.seatVerified && post.seat ? `・${post.seat}番` : "");
  const hasMorePhotos = matches.length > 1;

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    const focus = document.activeElement;
    const overflow = document.body.style.overflow;
    const viewport = window.visualViewport;
    function fitViewport() {
      if (!viewport) return;
      element!.style.setProperty("--seat-viewport-x", (viewport.offsetLeft + viewport.width / 2) + "px");
      element!.style.setProperty("--seat-viewport-y", (viewport.offsetTop + viewport.height / 2) + "px");
      element!.style.setProperty("--seat-viewport-width", viewport.width + "px");
      element!.style.setProperty("--seat-viewport-height", viewport.height + "px");
    }
    fitViewport();
    viewport?.addEventListener("resize", fitViewport);
    viewport?.addEventListener("scroll", fitViewport);
    element.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      viewport?.removeEventListener("resize", fitViewport);
      viewport?.removeEventListener("scroll", fitViewport);
      element.close();
      document.body.style.overflow = overflow;
      if ((focus instanceof HTMLElement || focus instanceof SVGElement) && focus.isConnected) {
        focus.focus({ preventScroll: true });
      }
    };
  }, []);

  function changePhoto(next: number) {
    if (next < 0 || next >= matches.length) return;
    setIndex(next);
    if (panel.current) panel.current.scrollTop = 0;
  }

  function startSwipe(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "touch") return;
    swipeStart.current = event.isPrimary && event.target instanceof HTMLImageElement
      ? { pointerId: event.pointerId, x: event.clientX, y: event.clientY }
      : null;
  }

  function finishSwipe(event: PointerEvent<HTMLDivElement>) {
    const start = swipeStart.current;
    if (!start || start.pointerId !== event.pointerId) return;
    swipeStart.current = null;
    const horizontalDistance = event.clientX - start.x;
    const verticalDistance = event.clientY - start.y;
    if (Math.abs(horizontalDistance) >= 44 && Math.abs(horizontalDistance) > Math.abs(verticalDistance) * 1.4) {
      changePhoto(index + (horizontalDistance < 0 ? 1 : -1));
    }
  }

  return <dialog ref={dialog} id={panelId} className={compact ? `${styles.dialog} ${styles.compact}` : styles.dialog} aria-labelledby={`${panelId}-title`}
    onCancel={event => { event.preventDefault(); onClose(); }}
    onPointerDown={event => { backdropPress.current = event.target === event.currentTarget; }}
    onPointerCancel={() => { backdropPress.current = false; }}
    onClick={event => {
      // Map pointerup opens the modal before the browser dispatches its click.
      // Only dismiss when the press itself also started on the backdrop.
      if (event.target === event.currentTarget && backdropPress.current) onClose();
      backdropPress.current = false;
    }}>
    <header className={styles.dialogHeader}>
      <h3 id={`${panelId}-title`} aria-live={compact ? "polite" : undefined}>
        {compact ? <span>{location}<small className={styles.photoRelation}>{photoSelectionRelation(match)}</small></span> : <><Camera size={18} aria-hidden="true" />座席の写真</>}
      </h3>
      <button type="button" onClick={onClose} autoFocus aria-label={compact ? "座席表に戻る" : undefined}>
        {!compact && "座席表に戻る"}<X size={18} aria-hidden="true" />
      </button>
    </header>
    <div ref={panel} className={styles.panel}
      onPointerDown={compact && hasMorePhotos ? startSwipe : undefined}
      onPointerUp={compact && hasMorePhotos ? finishSwipe : undefined}
      onPointerCancel={compact && hasMorePhotos ? () => { swipeStart.current = null; } : undefined}>
      {!compact && <p className={styles.context}><strong>{location}</strong></p>}
      <SeatPhotoCreditLine key={index} event={post.event} verified={post.seatVerified} relation={photoSelectionRelation(match)} />
      <SeatPhoto key={`${index}:${post.url}:${post.photo ?? 1}`} post={post} location={location} />
      {hasMorePhotos && <div className={styles.pager} role="group" aria-label="座席写真を切り替える">
        <button type="button" disabled={index === 0} onClick={() => changePhoto(index - 1)} aria-label={compact ? "前の写真" : undefined}>
          {compact ? <ChevronLeft size={18} aria-hidden="true" /> : "前の写真"}
        </button>
        <span aria-live="polite" aria-atomic="true">{index + 1} / {matches.length}</span>
        <button type="button" disabled={index === matches.length - 1} onClick={() => changePhoto(index + 1)} aria-label={compact ? "次の写真" : undefined}>
          {compact ? <ChevronRight size={18} aria-hidden="true" /> : "次の写真"}
        </button>
      </div>}
      {share && <SeatPhotoShareActions share={share} />}
    </div>
  </dialog>;
}
