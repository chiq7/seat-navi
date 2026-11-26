"use client";

import { useId, useState, type CSSProperties, type ReactNode, type Ref } from "react";
import { Camera, ChevronDown, MapPin, Search } from "lucide-react";
import { seatViewMatchesForSelection, seatViewPosts, type SeatViewSelection } from "@/lib/seatViewPosts";
import styles from "./DomeSeatFrame.module.css";
import { useSeatControlsReady } from "./ReadySearchControl";
import { directionName } from "./seatFinderLabels";
import { SeatViewDialog, type SeatPhotoShare } from "./SeatViewPosts";

type Choice = { id: string; label: string; color?: string };
type Shortcut = { label: string; kind: "block" | "number"; expanded: boolean; onClick: () => void;
  buttonRef?: Ref<HTMLButtonElement>; controlsId?: string };
type Props = {
  levels: readonly Choice[]; level: string; onLevel: (id: string) => void;
  directions: readonly Choice[]; direction: string; onDirection: (id: string) => void;
  onZoom: (factor: number) => void; onWhole: () => void;
  zoomLabel?: string; shortcuts: readonly Shortcut[]; children: ReactNode; className?: string;
  directionHint?: string; directionExtra?: ReactNode; seatView?: SeatViewSelection;
  /** Which of the selection's photos the enlarged viewer opens on. */
  seatViewIndex?: number;
  share?: SeatPhotoShare;
  compactMobileControls?: boolean; photoLegend?: "camera" | "outline" | "map";
  /** Phones: only `directionExtra` (the ticket boxes) stays above the map; levels, directions and zoom live in the full-screen map. */
  simpleMobile?: boolean;
  /** Replaces the shared level/direction/search controls (Tokyo Dome ticket form). */
  customControls?: ReactNode;
};

// Presentation extracted from Tokyo Dome. Venue-specific geometry, search and
// seat/facility state remain in each controller; the operation surface is shared.
export function DomeSeatFrame({ levels, level, onLevel, directions, direction, onDirection,
  onZoom, onWhole, zoomLabel = "地図", shortcuts, children, className = "", directionHint, directionExtra, seatView, seatViewIndex = 0,
  compactMobileControls = true, photoLegend = "camera", share, customControls, simpleMobile = false }: Props) {
  const ready = useSeatControlsReady();
  const hintId = useId();
  const panelId = `seat-view-${useId()}`;
  const [dismissedRequest, setDismissedRequest] = useState(0);
  const request = seatView?.request ?? 0;
  const posts = seatView ? seatViewPosts(seatView.diagram) : [];
  const matches = seatView ? seatViewMatchesForSelection(posts, seatView) : [];
  const directionControls = <div className={styles.directions} role="group" aria-label="見る方向" aria-describedby={directionHint ? hintId : undefined}>
    {directions.map(item => <button key={item.id} type="button" disabled={!ready} aria-pressed={direction === item.id}
      onClick={() => onDirection(item.id)}>{directionName(item.label)}</button>)}
  </div>;
  return <div className={`${styles.shell} ${compactMobileControls ? styles.compactMobile : ""} ${simpleMobile ? styles.simpleMobile : ""} ${className}`} data-seat-template="tokyo-dome" inert={!ready}
    style={{ "--level-count": levels.length, "--mobile-level-columns": Math.min(5, levels.length) } as CSSProperties}>
    {customControls ?? <div className={`${styles.controls} ${directionExtra ? styles.inlineControls : ""}`}>
      <div className={styles.levels} role="group" aria-label="席の種類">
        {levels.map(item => <button key={item.id} type="button" disabled={!ready} aria-pressed={level === item.id} onClick={() => onLevel(item.id)}>
          <i style={{ background: item.color }} aria-hidden="true" />{item.label}
        </button>)}
      </div>
      <div className={styles.tools}>
        {directionControls}
        {compactMobileControls && <label className={styles.mobileDirection}><span>方向</span>
          <select aria-label="見る方向" aria-describedby={directionHint ? hintId : undefined} value={direction} disabled={!ready} onChange={event => onDirection(event.target.value)}>
            {directions.map(item => <option key={item.id} value={item.id}>{directionName(item.label)}</option>)}
          </select>
        </label>}
        <div className={styles.zoom} aria-label={`${zoomLabel}の拡大縮小`}>
          <button type="button" disabled={!ready} onClick={() => onZoom(1.28)} aria-label={`${zoomLabel}を縮小`}>−</button>
          <button type="button" disabled={!ready} onClick={onWhole}>全体を見る</button>
          <button type="button" disabled={!ready} onClick={() => onZoom(.78)} aria-label={`${zoomLabel}を拡大`}>＋</button>
        </div>
        {directionHint && <p id={hintId} className={styles.directionHint}>{directionHint}</p>}
        {directionExtra && <div className={styles.directionExtra}>{directionExtra}</div>}
      </div>
      <div className={styles.shortcuts}>
        {shortcuts.map(item => <button key={item.kind} ref={item.buttonRef} type="button" disabled={!ready} aria-expanded={item.expanded}
          aria-controls={item.controlsId} onClick={item.onClick}>
          {item.kind === "block" ? <MapPin size={15} aria-hidden="true" /> : <Search size={15} aria-hidden="true" />}
          {item.label}<ChevronDown size={14} aria-hidden="true" />
        </button>)}
      </div>
    </div>}
    {posts.length > 0 && photoLegend !== "map" && <p className={styles.photoLegend}>{photoLegend === "outline"
      ? <><span className={styles.photoOutlineKey} aria-hidden="true" />囲み・小点の区画に写真あり</>
      : <><Camera size={15} aria-hidden="true" />写真あり</>}</p>}
    {children}
    {matches.length > 0 && request > dismissedRequest && <SeatViewDialog
      key={matches.map(({ post }) => post.url + ":" + (post.photo ?? "")).join("|")}
      panelId={panelId} matches={matches} initialIndex={seatViewIndex} compact share={share} onClose={() => setDismissedRequest(request)} />}
  </div>;
}
