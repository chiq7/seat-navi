"use client";

import { useState, type ReactNode, type CSSProperties } from "react";
import Link from "next/link";
import { MapPin, ChevronDown, Check } from "lucide-react";
import { getEventDayActions, eventDayDeadlineLabel, eventDayActionHours, type EventDaySummary } from "@/lib/eventDaySummary";
import { EVENT_DAY_GATE_NOTE } from "@/lib/eventDayMap";
import { EVENT_DAY_ACTION_ICONS } from "./eventDayIcons";
import { EventDayLocationMap } from "./EventDayLocationMap";
import styles from "./EventDayReader.module.css";

type Action = ReturnType<typeof getEventDayActions>[number];

function ActionDetails({ action }: { action: Action }) {
  return <>
    <dl className={styles.actionFacts}>
      <div><dt>{action.locationType === "booth" ? "営業時間" : "受付時間"}</dt><dd className={styles.hours}>{eventDayActionHours(action)}</dd></div>
      <div><dt>場所</dt><dd>{action.floor && <span className={styles.floor}>{action.floor}</span>}{action.place ?? "未確認"}</dd></div>
      {action.deadlines.map(d => <div key={d.id} className={styles.deadline}><dt>{eventDayDeadlineLabel(d.kind)}</dt><dd><strong>{d.time ?? "未発表"}</strong>{d.time && <span className={styles.until}>まで</span>}<span>{d.note}</span></dd></div>)}
      {action.conditions === null ? <div><dt>対象</dt><dd>未確認</dd></div> : action.conditions.length > 0 && <div><dt>対象</dt><dd>{action.conditions.map((condition, i) => <span className={styles.requirement} key={i}>{condition}</span>)}</dd></div>}
      {action.preparation === null ? <div><dt>準備</dt><dd>未確認</dd></div> : action.preparation.length > 0 && <div><dt>準備</dt><dd>{action.preparation.map((item, i) => <span className={styles.requirement} key={i}>{item}</span>)}</dd></div>}
    </dl>
    {action.benefits.map(a => <p key={a.id} className={styles.benefit}>{a.detail}</p>)}
    {action.reminders.map(r => <p key={r.id} className={styles.caution}><strong>{r.label}</strong><span>{r.detail}</span></p>)}
  </>;
}

export function EventDayReader({ day, tools, textScale = 1 }: { day: EventDaySummary; tools: ReactNode; textScale?: number }) {
  const actions = getEventDayActions(day);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = actions.find(a => a.id === selectedId);
  function select(id: string) { setSelectedId(current => current === id ? null : id); }

  return <main className={styles.page} style={{ "--event-day-text-scale": textScale } as CSSProperties}>
    <div className={styles.shell}>
      <header className={styles.header}><Link href="/" className={styles.brand}>ちけレポ</Link><div className={styles.headerMeta}><span>当日まとめ</span>{day.state === "past-example" && <span>終了済み・見本</span>}{day.state === "past" && <span>終了した公演</span>}</div></header>
      <section className={styles.show} aria-label="公演情報">
        <h1>{day.artist}<span>{day.tour}</span></h1>
        <p className={styles.showMeta}><time dateTime={day.date}>{day.dateLabel}</time><span>{day.venue}</span></p>
        <dl className={styles.showTimes}><div><dt>開場</dt><dd>{day.open ?? "未発表"}</dd></div><div><dt>開演</dt><dd>{day.start ?? "未発表"}</dd></div></dl>
      </section>
      <div className={styles.workspace}>
        <nav className={styles.quickActions} aria-label="主な用事を選ぶ">
          {day.booths.map(b => { const Icon = EVENT_DAY_ACTION_ICONS[b.kind]; return <button key={b.id} type="button" data-long-label={b.label.length > 8} aria-pressed={selectedId === b.id} onClick={() => select(b.id)}><Icon size={22} aria-hidden="true" /><span>{b.label}</span></button>; })}
        </nav>
        <section className={styles.mapPanel} aria-labelledby="map-title">
          <div className={styles.sectionTop}><h2 id="map-title">ブースの場所</h2><span>位置関係図</span></div>
          <EventDayLocationMap day={day} selectedId={selectedId} onSelect={select} />
          {actions.length > 0 && <><div className={styles.selection} aria-live="polite" aria-atomic="true">
            {selected ? <><strong>{selected.label}</strong><span>{eventDayActionHours(selected)} · {selected.floor && `${selected.floor} `}{selected.place ?? "場所未確認"}</span></> : <span>用事や地図のボタンを押すと、時間と場所が分かります。</span>}
          </div>
          <button className={styles.reset} type="button" onClick={() => setSelectedId(null)}>すべてを見る</button></>}
          <p className={styles.mapNote}>{EVENT_DAY_GATE_NOTE}</p>
        </section>
        <section className={styles.actionList} aria-labelledby="actions-title">
          <h2 id="actions-title">時間・場所・やること</h2>
          {actions.length === 0 && <p>用事の案内はまだありません。</p>}
          {actions.map(action => { const Icon = EVENT_DAY_ACTION_ICONS[action.kind]; return <article key={action.id} data-action-id={action.id} data-selected={selectedId === action.id} className={styles.action}>
            <h3><button type="button" aria-pressed={selectedId === action.id} onClick={() => select(action.id)}><Icon size={24} aria-hidden="true" /><span>{action.label}</span>{selectedId === action.id && <Check size={20} aria-hidden="true" />}</button></h3>
            <ActionDetails action={action} />
          </article>; })}
        </section>
      </div>
      <section className={styles.tools} aria-label="保存と共有">{tools}</section>
      <nav className={styles.related} aria-label="関連案内">
        <Link href={`/venues/${day.venueSlug}`}><MapPin size={20} aria-hidden="true" />座席・会場ガイド<span aria-hidden="true">↗</span></Link>
        {day.eventHref && <Link href={day.eventHref}>この公演の座席・レポ<span aria-hidden="true">↗</span></Link>}
      </nav>
      <details className={styles.details}><summary>公式案内<ChevronDown size={18} aria-hidden="true" /></summary><ul>{day.sources.map(s => <li key={s.id}><a href={s.url} target="_blank" rel="noopener noreferrer">{s.title}<span aria-hidden="true"> ↗</span></a></li>)}</ul></details>
    </div>
  </main>;
}
