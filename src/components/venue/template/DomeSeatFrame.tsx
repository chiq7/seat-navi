"use client";

import type { CSSProperties, ReactNode, Ref } from "react";
import { ChevronDown, MapPin, Search } from "lucide-react";
import styles from "./DomeSeatFrame.module.css";
import { useSeatControlsReady } from "./ReadySearchControl";

type Choice = { id: string; label: string; color?: string };
type Shortcut = { label: string; kind: "block" | "number"; expanded: boolean; onClick: () => void;
  buttonRef?: Ref<HTMLButtonElement>; controlsId?: string };
type Props = {
  levels: readonly Choice[]; level: string; onLevel: (id: string) => void;
  directions: readonly Choice[]; direction: string; onDirection: (id: string) => void;
  onZoom: (factor: number) => void; onWhole: () => void;
  zoomLabel?: string; shortcuts: readonly Shortcut[]; children: ReactNode; className?: string;
  directionExtra?: ReactNode;
};

// Presentation extracted from Tokyo Dome. Venue-specific geometry, search and
// seat/facility state remain in each controller; the operation surface is shared.
export function DomeSeatFrame({ levels, level, onLevel, directions, direction, onDirection,
  onZoom, onWhole, zoomLabel = "地図", shortcuts, children, className = "", directionExtra }: Props) {
  const ready = useSeatControlsReady();
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
    {children}
  </div>;
}
