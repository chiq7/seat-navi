"use client";

import { useRef, useState, type PointerEvent, type ReactNode, type Ref } from "react";
import { Camera, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ListOrdered, Maximize2 } from "lucide-react";
import { seatViewInlinePhotoUrl, seatViewXStatusId } from "@/lib/seatViewPhotoAssets";
import { seatPhotoCredit, SEAT_VERIFIED_LABEL } from "@/lib/seatPhotoCaption";
import type { SeatViewMatch } from "./SeatViewPosts";
import styles from "./SeatPhotoSheet.module.css";

/** A neighbouring block with photos on the same level, reached with the 前の区画 / 次の区画 buttons. */
export type SheetNeighbor = { label: string; go: () => void } | null;
/** The block's rows and their seat numbers; choosing one lights that row on the map. */
export type SheetRows = { rows: { label: string; numbers: string }[]; active: string | null; choose: (label: string) => void } | null;

function RowList({ rows }: { rows: NonNullable<SheetRows> }) {
  return <ul className={styles.rowList} aria-label="列ごとの番号">
    {rows.rows.map(row => <li key={row.label}><button type="button" aria-pressed={rows.active === row.label} onClick={() => rows.choose(row.label)}>
      <b>{row.label}列</b><span>{row.numbers}</span></button></li>)}
  </ul>;
}
function RowToggle({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return <button type="button" className={styles.rowToggle} aria-expanded={open} onClick={onToggle}>
    {open ? <><Camera size={14} aria-hidden="true" />写真に戻る</> : <><ListOrdered size={14} aria-hidden="true" />列ごとの番号</>}</button>;
}

/** Swiping the sheet's top edge down by this much folds it away (like the たたむ button). */
const FOLD_DISTANCE = 48;

function useFoldGesture(onFold: () => void) {
  const start = useRef<{ id: number; y: number } | null>(null);
  return {
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      if ((event.target as Element).closest("button, a")) return;
      start.current = { id: event.pointerId, y: event.clientY };
    },
    onPointerUp: (event: PointerEvent<HTMLElement>) => {
      const from = start.current; start.current = null;
      if (from && from.id === event.pointerId && event.clientY - from.y >= FOLD_DISTANCE) onFold();
    },
    onPointerCancel: () => { start.current = null; },
  };
}

/** The board's own image size: X's 1200px rendition, then the large one, before giving up. */
function SheetPhoto({ match, location, onEnlarge }: { match: SeatViewMatch; location: string; onEnlarge: () => void }) {
  const large = seatViewInlinePhotoUrl(match.post);
  const variants = large ? seatViewXStatusId(match.post) ? [large.replace("name=large", "name=medium"), large] : [large] : [];
  const [failed, setFailed] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const src = variants[failed];
  if (!src) return <div className={styles.photoMissing}><Camera size={22} aria-hidden="true" /><span>写真を読み込めませんでした</span>
    <button type="button" onClick={() => setFailed(0)}>もう一度読み込む</button></div>;
  return <button type="button" className={styles.photoButton} onClick={onEnlarge} aria-label={`${location}からの見え方を大きく見る`}>
    {!loaded && <span className={styles.loading} role="status">写真を読み込み中…</span>}
    {/* The source image itself (not re-hosted), fitted inside the board without cropping. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={src} alt={`${location}からの見え方`} decoding="async" referrerPolicy="no-referrer" draggable={false}
      onLoad={() => setLoaded(true)} onError={() => { setLoaded(false); setFailed(value => value + 1); }} />
    <span className={styles.enlarge} aria-hidden="true"><Maximize2 size={15} /></span>
  </button>;
}

export function SeatPhotoSheet({ title, matches, previous, next, onFold, onEnlarge, sheetRef }: {
  /** Level and block name, e.g. "LEVEL5・212番〜". The photo's own row is added per photo. */
  title: string;
  matches: SeatViewMatch[];
  previous: SheetNeighbor;
  next: SheetNeighbor;
  onFold: () => void;
  onEnlarge: (index: number) => void;
  sheetRef?: Ref<HTMLDivElement>;
}) {
  const [index, setIndex] = useState(0);
  const strip = useRef<HTMLDivElement>(null);
  // Photos on screen and beside it are loaded; anything already loaded stays.
  const [seen, setSeen] = useState<ReadonlySet<number>>(() => new Set([0, 1]));
  const fold = useFoldGesture(onFold);
  const match = matches[index] ?? matches[0];
  const { post } = match;
  const location = title + (post.row ? `・${post.row}列` : "") + (post.seatVerified && post.seat ? `・${post.seat}番` : "");
  const credit = seatPhotoCredit(post.event);
  const several = matches.length > 1;

  function settle(current: number) {
    setIndex(current);
    setSeen(seenBefore => seenBefore.has(current - 1) && seenBefore.has(current + 1) ? seenBefore : new Set([...seenBefore, current - 1, current, current + 1]));
  }

  function show(next: number) {
    const target = Math.max(0, Math.min(matches.length - 1, next));
    const element = strip.current;
    if (!element) return;
    element.scrollTo({ left: element.clientWidth * target, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }

  return <section ref={sheetRef} className={styles.sheet} aria-label={`${title}の写真`} data-seat-photo-sheet="">
    <header className={styles.head} {...fold}>
      <span className={styles.grip} aria-hidden="true" />
      <h3 aria-live="polite"><span className={styles.place}>{location}</span>
        {several && <span className={styles.count}>{index + 1}/{matches.length}</span>}</h3>
      <button type="button" className={styles.fold} onClick={onFold} aria-label="写真をたたむ"><ChevronDown size={22} aria-hidden="true" /></button>
    </header>
    <div className={styles.photos}>
      <div ref={strip} className={styles.strip} data-seat-photo-strip=""
        onScroll={event => {
          const element = event.currentTarget;
          const current = Math.round(element.scrollLeft / Math.max(1, element.clientWidth));
          if (current !== index && current >= 0 && current < matches.length) settle(current);
        }}>
        {matches.map((item, i) => <div key={`${item.post.url}:${item.post.photo ?? 1}`} className={styles.slide} aria-hidden={i !== index}>
          {seen.has(i) ? <SheetPhoto match={item} location={location} onEnlarge={() => onEnlarge(i)} /> : <span className={styles.loading}>写真を読み込み中…</span>}
        </div>)}
      </div>
      {several && <>
        <button type="button" className={`${styles.step} ${styles.stepBack}`} disabled={index === 0} onClick={() => show(index - 1)} aria-label="前の写真"><ChevronLeft size={20} aria-hidden="true" /></button>
        <button type="button" className={`${styles.step} ${styles.stepOn}`} disabled={index === matches.length - 1} onClick={() => show(index + 1)} aria-label="次の写真"><ChevronRight size={20} aria-hidden="true" /></button>
      </>}
      {/* The performance and the verified seat ride on the photo's lower edge, so the board needs no extra line. */}
      {(credit.day || credit.name || post.seatVerified) && <p className={styles.credit}>{credit.day && <span>{credit.day}</span>}
        {credit.name && <span className={styles.creditName}>{credit.name}</span>}{post.seatVerified && <span>{SEAT_VERIFIED_LABEL}</span>}</p>}
    </div>
    <nav className={styles.neighbors} aria-label="写真のある隣の区画">
      <NeighborButton neighbor={previous} direction="previous" />
      <NeighborButton neighbor={next} direction="next" />
    </nav>
  </section>;
}

function NeighborButton({ neighbor, direction }: { neighbor: SheetNeighbor; direction: "previous" | "next" }) {
  const word = direction === "previous" ? "前の区画" : "次の区画";
  return <button type="button" className={`${styles.neighbor} ${direction === "next" ? styles.neighborNext : ""}`} disabled={!neighbor} onClick={neighbor?.go}
    aria-label={neighbor ? `${word}（${neighbor.label}）の写真へ` : `${word}はありません`}>
    {direction === "previous" && <ChevronLeft size={18} aria-hidden="true" />}
    <span><strong>{word}</strong>{neighbor && <small>{neighbor.label}</small>}</span>
    {direction === "next" && <ChevronRight size={18} aria-hidden="true" />}
  </button>;
}

/** The thin board for a block without photos: the block stays chosen until a nearby block is asked for. */
export function SeatPhotoEmptySheet({ title, nearby, sheetRef, onFold, rows = null }: { title: string; nearby: SheetNeighbor; sheetRef?: Ref<HTMLDivElement>; onFold: () => void; rows?: SheetRows }) {
  const fold = useFoldGesture(onFold);
  const [listOpen, setListOpen] = useState(false);
  return <section ref={sheetRef} className={`${styles.sheet} ${styles.thin}`} aria-label={`${title}の写真`} data-seat-photo-sheet="empty" {...fold}>
    <div className={styles.emptyHead}><p className={styles.emptyLine} role="status"><Camera size={17} aria-hidden="true" /><span>{title}の写真はまだありません</span></p>
      {rows && rows.rows.length > 0 && <RowToggle open={listOpen} onToggle={() => setListOpen(open => !open)} />}</div>
    {listOpen && rows && <div className={styles.emptyRows}><RowList rows={rows} /></div>}
    {nearby && <button type="button" className={styles.nearby} onClick={nearby.go}>
      <span>近くの<strong>{nearby.label}</strong>の写真を見る</span><ChevronRight size={18} aria-hidden="true" />
    </button>}
  </section>;
}

/** After たたむ: a small tab at the bottom brings the board back. */
export function SeatPhotoSheetTab({ count, onOpen, image, tabRef }: { count: number; onOpen: () => void; image?: string; tabRef?: Ref<HTMLButtonElement> }): ReactNode {
  return <button ref={tabRef} type="button" className={styles.tab} onClick={onOpen} data-seat-photo-sheet-tab="">
    {/* eslint-disable-next-line @next/next/no-img-element -- the first photo, small, as a cue that photos open from here */}
    {image ? <img src={image} alt="" width={40} height={30} referrerPolicy="no-referrer" decoding="async" /> : <Camera size={16} aria-hidden="true" />}
    <span>見え方写真を見る</span><b>{count}枚</b><ChevronUp size={18} aria-hidden="true" />
  </button>;
}
