"use client";
// The phone "full-screen seat map" shell shared by maps that are not StandSeatMap (Tokyo Dome, Kyocera Dome):
// a still preview in the page, opening into a full-screen map with a top bar and the photo board.
// The map element itself is lifted out of the page (position: fixed) so its state stays as it is.
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode, type RefObject } from "react";
import { Camera, Send, X } from "lucide-react";
import styles from "./StandSeatMap.module.css";

const QUERY = "(max-width: 767px)";
const HINT_KEY = "tixrepo:seat-map-photo-hint";
function subscribe(callback: () => void) {
  const query = window.matchMedia(QUERY);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

/** A map box [x, y, width, height] fitted so `box` fills the part of the map above the photo board. */
export function fitAboveBoard(box: [number, number, number, number], width: number, height: number, board: number): [number, number, number, number] {
  const visible = Math.max(140, height - board - 8);
  const scale = Math.min(width / box[2], visible / box[3]);
  const cx = box[0] + box[2] / 2, cy = box[1] + box[3] / 2;
  return [cx - width / 2 / scale, cy - visible / 2 / scale, width / scale, height / scale];
}

export function useImmersiveMap({ enabled, onOpened }: { enabled: boolean; onOpened?: () => void }) {
  const narrow = useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => false);
  const immersive = enabled && narrow;
  const [fullscreen, setFullscreen] = useState(false);
  const [slotHeight, setSlotHeight] = useState<number>();
  const [hintSeen, setHintSeen] = useState(true);
  const [openCount, setOpenCount] = useState(0);
  const fullscreenRef = useRef(false), pushed = useRef(false), pageScroll = useRef(0);
  const frameRef = useRef<HTMLDivElement>(null), closeRef = useRef<HTMLButtonElement>(null), openRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLElement | null>(null), mapRef = useRef<HTMLElement | null>(null);
  const opened = useRef(onOpened); opened.current = onOpened;
  const locked = immersive && !fullscreen;

  const open = useCallback(() => {
    if (fullscreenRef.current) return;
    pageScroll.current = window.scrollY;
    setSlotHeight(frameRef.current?.parentElement?.getBoundingClientRect().height);
    fullscreenRef.current = true; setFullscreen(true); setOpenCount(count => count + 1);
    setHintSeen(true); try { localStorage.setItem(HINT_KEY, "1"); } catch { /* private mode */ }
    try { window.history.pushState({ tixrepoSeatMap: "open" }, ""); pushed.current = true; } catch { pushed.current = false; }
  }, []);
  const close = useCallback(() => { if (!fullscreenRef.current) return; fullscreenRef.current = false; setFullscreen(false); }, []);
  const requestClose = useCallback(() => {
    if (!fullscreenRef.current) return;
    if (pushed.current) { pushed.current = false; window.history.back(); return; }
    close();
  }, [close]);
  useEffect(() => { try { setHintSeen(localStorage.getItem(HINT_KEY) === "1"); } catch { setHintSeen(false); } }, []);
  useEffect(() => { if (!immersive && fullscreenRef.current) requestClose(); }, [immersive, requestClose]);
  useEffect(() => {
    if (!fullscreen) return;
    const onPop = () => { pushed.current = false; close(); };
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape" && !document.querySelector("dialog[open]")) { event.preventDefault(); requestClose(); } };
    window.addEventListener("popstate", onPop); window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("popstate", onPop); window.removeEventListener("keydown", onKey); };
  }, [fullscreen, close, requestClose]);
  const was = useRef(false);
  useLayoutEffect(() => {
    if (was.current === fullscreen) return;
    was.current = fullscreen;
    if (fullscreen) {
      const root = document.documentElement, overflow = root.style.overflow;
      root.style.overflow = "hidden";
      const focus = () => closeRef.current?.focus({ preventScroll: true });
      focus(); const timer = window.setTimeout(focus, 80);
      opened.current?.();
      return () => { root.style.overflow = overflow; window.clearTimeout(timer); };
    }
    setSlotHeight(undefined);
    const y = pageScroll.current; window.scrollTo(0, y);
    let frames = 0, id = 0;
    const hold = () => { if (Math.abs(window.scrollY - y) > 2) window.scrollTo(0, y); if (++frames < 6) id = requestAnimationFrame(hold); };
    id = requestAnimationFrame(hold);
    openRef.current?.focus({ preventScroll: true });
    return () => cancelAnimationFrame(id);
  }, [fullscreen]);

  /** How much of the map the photo board (or its folded tab) covers, from the map's bottom. */
  const boardHeight = useCallback(() => {
    const sheet = sheetRef.current?.getBoundingClientRect(), map = mapRef.current?.getBoundingClientRect();
    return sheet && map ? Math.max(0, Math.min(map.height * .7, map.bottom - sheet.top)) : 0;
  }, []);

  return { immersive, fullscreen, locked, open, requestClose, slotHeight, hintSeen, openCount, frameRef, closeRef, openRef, sheetRef, mapRef, boardHeight };
}

export type ImmersiveMap = ReturnType<typeof useImmersiveMap>;

/** The slot keeping the page's height and the frame that becomes the full-screen map. */
export function ImmersiveFrame({ frameRef, slotHeight, fullscreen, className, children, label, ...rest }: {
  frameRef: RefObject<HTMLDivElement | null>; slotHeight?: number; fullscreen: boolean; className: string; children: ReactNode; label: string;
} & Record<`data-${string}`, string | undefined>) {
  return <div className={styles.mapSlot} style={slotHeight ? { height: slotHeight } : undefined}>
    <div ref={frameRef} className={`${className} ${fullscreen ? styles.immersive : ""}`} {...rest}
      data-seat-map-fullscreen={fullscreen ? "" : undefined} role={fullscreen ? "dialog" : undefined} aria-modal={fullscreen || undefined}
      aria-label={fullscreen ? label : undefined}>
      {children}
    </div>
  </div>;
}

/** Top bar of the full-screen map: ×, venue, what is chosen, and "この席を送る" when it can be sent. */
export function ImmersiveBar({ closeRef, onClose, venueName, title, onShare }: {
  closeRef: RefObject<HTMLButtonElement | null>; onClose: () => void; venueName: string; title: string | null; onShare?: () => void;
}) {
  return <div className={styles.immersiveBar}>
    <button ref={closeRef} type="button" className={styles.immersiveClose} aria-label="座席表を閉じる" onClick={onClose}><X size={22} aria-hidden="true" /></button>
    <div className={styles.immersiveTitle} aria-live="polite"><span>{venueName}</span><strong>{title ?? "区画をタップすると写真が見られます"}</strong></div>
    {onShare && <button type="button" className={styles.immersiveShare} onClick={onShare} data-seat-share-open=""><Send size={17} aria-hidden="true" />この席を送る</button>}
  </div>;
}

/** Below the still preview: the button that opens the full-screen map (and a first-time hint). */
export function ImmersiveOpenButton({ openRef, hint, onOpen }: { openRef: RefObject<HTMLButtonElement | null>; hint: boolean; onOpen: () => void }) {
  return <div className={styles.previewOpen} id="venue-seat-photos">
    {hint && <p className={styles.previewHint}><Camera size={14} aria-hidden="true" />カメラ印の区画をタップすると、席からの見え方が見られます</p>}
    <button ref={openRef} type="button" onClick={onOpen}><Camera size={18} aria-hidden="true" /><span>座席表を開いて写真を見る</span></button>
  </div>;
}
