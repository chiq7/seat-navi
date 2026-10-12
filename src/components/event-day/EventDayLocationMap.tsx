"use client";

import type { EventDaySummary } from "@/lib/eventDaySummary";
import { getEventDayMap } from "@/lib/eventDayMap";
import { Check, TrainFront } from "lucide-react";
import { EVENT_DAY_ACTION_ICONS } from "./eventDayIcons";
import styles from "./EventDayLocationMap.module.css";

type Pin = NonNullable<ReturnType<typeof getEventDayMap>>["top"][number];

function PinButton({ pin, selectedId, onSelect }: { pin: Pin; selectedId: string | null; onSelect: (id: string) => void }) {
  const { booth } = pin;
  const Icon = EVENT_DAY_ACTION_ICONS[booth.kind];
  const selected = selectedId === booth.id;
  return <button type="button" data-map-action-id={booth.id} aria-label={`地図：${booth.label}`}
    aria-pressed={selected} className={styles.pinButton} onClick={() => onSelect(booth.id)}>
    <span className={styles.pinName}><Icon size={22} aria-hidden="true" /><span>{booth.label}</span>
      {selected && <Check size={16} aria-hidden="true" className={styles.check} />}</span>
    <span className={styles.floor}>{booth.floor ?? "階未確認"}</span>
  </button>;
}

export function EventDayLocationMap({ day, selectedId, onSelect }: {
  day: EventDaySummary; selectedId: string | null; onSelect: (id: string) => void;
}) {
  const model = getEventDayMap(day);
  if (!model) return <p className={styles.unavailable}>案内図は未掲載です。各用事の場所を確認してください。</p>;
  const pins = [...model.top, ...model.bottom];
  return <div className={styles.map} role="group" aria-label="地図から用事を選ぶ">
    <div className={styles.topRow}>
      <span className={styles.station}><TrainFront size={20} aria-hidden="true" />{model.base.stationLabel}</span>
      <div className={styles.pinRow}>{model.top.map(pin => <PinButton key={pin.booth.id} pin={pin} selectedId={selectedId} onSelect={onSelect} />)}</div>
    </div>
    <div className={styles.drawing}>
      <svg viewBox={`0 0 ${model.base.width} ${model.base.height}`} role="img" aria-label={`${day.venue}のブース位置関係図`} data-testid="event-day-map">
        <path d={model.base.road} stroke="#c3b9c2" strokeWidth="8" />
        <path d={model.base.road} stroke="white" strokeWidth="2" strokeDasharray="7 10" />
        <ellipse {...model.base.dome} fill="#fff8fb" stroke="#d9cbd4" strokeWidth="2" />
        <ellipse {...model.base.innerDome} fill="white" />
        {pins.map(({ booth, point, callout }) => <g key={booth.id} data-map-point-id={booth.id} data-selected={selectedId === booth.id}>
          <line x1={point.x} y1={point.y} x2={callout.x} y2={callout.y} stroke={selectedId === booth.id ? "#aa2f66" : "#8d7a86"} strokeWidth="2" vectorEffect="non-scaling-stroke" />
          <circle cx={point.x} cy={point.y} r="9" fill={booth.color} stroke="white" strokeWidth="3" />
          <circle cx={point.x} cy={point.y} r="15" fill="none" stroke={selectedId === booth.id ? "#aa2f66" : "transparent"} strokeWidth="2" vectorEffect="non-scaling-stroke" />
        </g>)}
      </svg>
      {model.base.labels.map(label => <span key={label.id} style={label.position}
        className={label.id === "dome" ? styles.domeName : undefined}>
        {label.lines.map(line => <span key={line}>{line}</span>)}
      </span>)}
    </div>
    <div className={`${styles.pinRow} ${styles.bottomRow}`}>{model.bottom.map(pin => <PinButton key={pin.booth.id} pin={pin} selectedId={selectedId} onSelect={onSelect} />)}</div>
    {pins.length === 0 && <p className={styles.unavailable}>ブースの位置は未確認です。</p>}
  </div>;
}
