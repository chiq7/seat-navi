"use client";

import type { FormEvent } from "react";
import { MapPin, Search, Ticket } from "lucide-react";
import styles from "./TokyoDomeTicketForm.module.css";

export type TicketLevel = "all" | "lower" | "upper" | "balcony" | "outfield";
export type TicketSide = "all" | "first" | "home" | "third" | "right" | "left" | "outfield";

const LEVELS: readonly { id: Exclude<TicketLevel, "all">; label: string; color: string }[] = [
  { id: "lower", label: "1階", color: "#e98eb4" },
  { id: "upper", label: "2階", color: "#aeb6e8" },
  { id: "balcony", label: "バルコニー", color: "#f9d2ab" },
  { id: "outfield", label: "外野", color: "#9ddacb" },
];
const INFIELD_SIDES: readonly { id: TicketSide; label: string }[] = [
  { id: "third", label: "3塁側" }, { id: "home", label: "ホーム" }, { id: "first", label: "1塁側" },
];
const OUTFIELD_SIDES: readonly { id: TicketSide; label: string }[] = [
  { id: "left", label: "レフト" }, { id: "right", label: "ライト" },
];

type Props = {
  ready: boolean;
  level: TicketLevel; onLevel: (level: TicketLevel) => void;
  side: TicketSide; onSide: (side: TicketSide) => void;
  byBlock: boolean; blockOnly: boolean; onBlockMode: (value: boolean) => void;
  row: string; number: string; block: string;
  onRow: (value: string) => void; onNumber: (value: string) => void; onBlock: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

/** Ticket-ordered seat search: floor → side → row/number, one compact line per step. */
export function TokyoDomeTicketForm(props: Props) {
  const sides = props.level === "outfield" ? OUTFIELD_SIDES : INFIELD_SIDES;
  const blockHint = props.level === "outfield" ? "F12" : props.level === "balcony" ? "C20" : "A16";
  return <form className={styles.form} onSubmit={props.onSubmit} aria-label="チケットの座席で検索" data-seat-finder-form>
    <div className={styles.head}>
      <Ticket size={18} aria-hidden="true" /><strong>チケットの席</strong>
      {!props.blockOnly && <button type="button" className={styles.modeToggle} aria-pressed={props.byBlock} disabled={!props.ready}
        onClick={() => props.onBlockMode(!props.byBlock)}><MapPin size={14} aria-hidden="true" />区画名</button>}
    </div>
    <div className={styles.line} role="group" aria-label="階">
      <span className={styles.label} aria-hidden="true">階</span>
      <div className={styles.chips}>{LEVELS.map(item => <button key={item.id} type="button" disabled={!props.ready}
        aria-pressed={props.level === item.id} onClick={() => props.onLevel(props.level === item.id ? "all" : item.id)}>
        <i style={{ background: item.color }} aria-hidden="true" />{item.label}</button>)}</div>
    </div>
    <div className={styles.line} role="group" aria-label={props.level === "outfield" ? "ライト・レフト" : "塁側"}>
      <span className={styles.label} aria-hidden="true">{props.level === "outfield" ? "外野" : "塁側"}</span>
      <div className={styles.chips}>{sides.map(item => <button key={item.id} type="button" disabled={!props.ready}
        aria-pressed={props.side === item.id} onClick={() => props.onSide(props.side === item.id ? "all" : item.id)}>{item.label}</button>)}</div>
    </div>
    <div className={styles.inputs}>
      {props.byBlock || props.blockOnly
        ? <label className={styles.field}><span>区画</span><input value={props.block} placeholder={blockHint} disabled={!props.ready}
          autoCapitalize="characters" onChange={event => props.onBlock(event.target.value)} /></label>
        : <>
          <label className={styles.field}><span>列</span><input value={props.row} placeholder="15" inputMode="numeric" disabled={!props.ready}
            onChange={event => props.onRow(event.target.value)} /></label>
          <label className={styles.field}><span>番</span><input value={props.number} placeholder="189" inputMode="numeric" disabled={!props.ready}
            onChange={event => props.onNumber(event.target.value)} /></label>
        </>}
      <button type="submit" className={styles.submit} disabled={!props.ready} aria-label="席の場所を見る"><Search size={18} aria-hidden="true" /><span>探す</span></button>
    </div>
  </form>;
}
