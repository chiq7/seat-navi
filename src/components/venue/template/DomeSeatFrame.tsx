"use client";

import { useId, useState, type CSSProperties, type ReactNode, type Ref } from "react";
import { ChevronDown, MapPin, Search } from "lucide-react";
import { seatViewMatch, seatViewPosts, type SeatViewSelection } from "@/lib/seatViewPosts";
import styles from "./DomeSeatFrame.module.css";
import { useSeatControlsReady } from "./ReadySearchControl";
import { SeatViewNotice, SeatViewDialog, type SeatViewMatch } from "./SeatViewPosts";

type Choice = { id: string; label: string; color?: string };
type Shortcut = { label: string; kind: "block" | "number"; expanded: boolean; onClick: () => void;
  buttonRef?: Ref<HTMLButtonElement>; controlsId?: string };
type Props = {
  levels: readonly Choice[]; level: string; onLevel: (id: string) => void;
  directions: readonly Choice[]; direction: string; onDirection: (id: string) => void;
  onZoom: (factor: number) => void; onWhole: () => void;
  zoomLabel?: string; shortcuts: readonly Shortcut[]; children: ReactNode; className?: string;
  directionExtra?: ReactNode; seatView?: SeatViewSelection;
};

function matchPriority({ post, label }: SeatViewMatch) {
  if (label === "同じ座席") return 0;
  if (label === "同じ列の参考") return 1;
  if (post.place.kind === "section") return 2;
  return 3;
}

// Presentation extracted from Tokyo Dome. Venue-specific geometry, search and
// seat/facility state remain in each controller; the operation surface is shared.
export function DomeSeatFrame({ levels, level, onLevel, directions, direction, onDirection,
  onZoom, onWhole, zoomLabel = "地図", shortcuts, children, className = "", directionExtra, seatView }: Props) {
  const ready = useSeatControlsReady();
  const panelId = `seat-view-${useId()}`;
  const [dismissedRequest, setDismissedRequest] = useState(0);
  const request = seatView?.request ?? 0;
  const posts = seatView ? seatViewPosts(seatView.diagram) : [];
  const matches = seatView ? posts.flatMap<SeatViewMatch>(post => {
    const label = seatViewMatch(post, seatView);
    return label ? [{ post, label }] : [];
  }).sort((a, b) => matchPriority(a) - matchPriority(b)) : [];
  return <div className={`${styles.shell} ${className}`} data-seat-template="tokyo-dome" inert={!ready}
    style={{ "--level-count": levels.length } as CSSProperties}>
    <div className={`${styles.controls} ${directionExtra ? styles.inlineControls : ""}`}>
      <div className={styles.levels} role="group" aria-label="席の種類">
        {levels.map(item => <button key={item.id} type="button" disabled={!ready} aria-pressed={level === item.id} onClick={() => onLevel(item.id)}>
          <i style={{ background: item.color }} aria-hidden="true" />{item.label}
        </button>)}
      </div>
      <div className={styles.tools}>
        <div className={styles.directions} role="group" aria-label="見る方向">
          {directions.map(item => <button key={item.id} type="button" disabled={!ready} aria-pressed={direction === item.id}
            onClick={() => onDirection(item.id)}>{item.label}</button>)}
        </div>
        <div className={styles.zoom} aria-label={`${zoomLabel}の拡大縮小`}>
          <button type="button" disabled={!ready} onClick={() => onZoom(1.28)} aria-label={`${zoomLabel}を縮小`}>−</button>
          <button type="button" disabled={!ready} onClick={onWhole}>全体を見る</button>
          <button type="button" disabled={!ready} onClick={() => onZoom(.78)} aria-label={`${zoomLabel}を拡大`}>＋</button>
        </div>
        {directionExtra && <div className={styles.directionExtra}>{directionExtra}</div>}
      </div>
      <div className={styles.shortcuts}>
        {shortcuts.map(item => <button key={item.kind} ref={item.buttonRef} type="button" disabled={!ready} aria-expanded={item.expanded}
          aria-controls={item.controlsId} onClick={item.onClick}>
          {item.kind === "block" ? <MapPin size={15} aria-hidden="true" /> : <Search size={15} aria-hidden="true" />}
          {item.label}<ChevronDown size={14} aria-hidden="true" />
        </button>)}
      </div>
    </div>
    {seatView && posts.length > 0 && <SeatViewNotice posts={posts} selection={seatView} />}
    {children}
    {matches.length > 0 && request > dismissedRequest && <SeatViewDialog
      key={matches.map(({ post }) => post.url + ":" + (post.photo ?? "")).join("|")}
      panelId={panelId} matches={matches} onClose={() => setDismissedRequest(request)} />}
  </div>;
}
