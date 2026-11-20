"use client";

import type { FormEvent } from "react";
import ReadySearchControl from "./ReadySearchControl";
import { seatQueryDescription, type SeatFinderQuery } from "./seatFinderLabels";
import styles from "./SeatFinderControls.module.css";

export type FinderMode = "ticket" | "block";
type Props = {
  mode: FinderMode; onMode: (value: FinderMode) => void; blockOnly?: boolean;
  row: string; number: string; block: string;
  onRow: (value: string) => void; onNumber: (value: string) => void; onBlock: (value: string) => void;
  rowHint?: string; numberHint?: string; blockHint: string; testId?: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function SeatFinderControls(props: Props) {
  const byBlock = props.mode === "block" || props.blockOnly;
  return <form className={styles.form} data-seat-finder-form data-testid={props.testId} onSubmit={props.onSubmit} aria-label="チケットの座席で検索">
    {!props.blockOnly && <div className={styles.modes} role="group" aria-label="座席の検索方法">
      <ReadySearchControl><button type="button" aria-pressed={!byBlock} onClick={() => props.onMode("ticket")}>列・番号で探す</button></ReadySearchControl>
      <ReadySearchControl><button type="button" aria-pressed={byBlock} onClick={() => props.onMode("block")}>区画名で探す</button></ReadySearchControl>
    </div>}
    <div className={styles.fields}>
      {byBlock ? <label>ブロック・区画名<ReadySearchControl><input value={props.block} placeholder={props.blockHint}
        onChange={event => props.onBlock(event.target.value)} /></ReadySearchControl></label> : <>
        <label>列<ReadySearchControl><input value={props.row} placeholder={props.rowHint ?? "例：15"} onChange={event => props.onRow(event.target.value)} /></ReadySearchControl></label>
        <label>座席番号<ReadySearchControl><input value={props.number} placeholder={props.numberHint ?? "例：55"} onChange={event => props.onNumber(event.target.value)} /></ReadySearchControl></label>
      </>}
      <ReadySearchControl><button type="submit">場所を見る</button></ReadySearchControl>
    </div>
  </form>;
}

export function SeatFinderMiss({ query, detail, advice, choices, choose, onReset }: {
  query?: SeatFinderQuery;
  detail?: string; advice?: string; choices: { id: string; label: string }[]; choose: (id: string) => void; onReset?: () => void;
}) {
  const input = query && seatQueryDescription(query);
  const description = query?.block?.trim() ? `「${input}」` : input;
  const nextStep = query?.block?.trim() ? "チケットの区画名を確認するか、下の座席図から選んでください。"
    : "チケットの方向・階を確認するか、ブロック名で探してください。";
  const message = description && query
    ? `${query.scope}では${description}は見つかりませんでした。${nextStep}`
    : detail || "チケットの列・座席番号、またはブロック名を入力してください。";
  return <div className={styles.miss} data-seat-finder-miss>
    <p role="alert">{message}</p>
    {advice && <p>{advice}</p>}
    {(choices.length > 0 || onReset) && <div role="group" aria-label="地図で選べる区画">
      {choices.length > 0 && <span><strong>近い区画の候補</strong>　同じ列で、入力した番号に近い区画から表示しています。</span>}
      {choices.map(item => <button type="button" key={item.id} data-browse-block={item.id} onClick={() => choose(item.id)}>{item.label}</button>)}
      {onReset && <button type="button" onClick={onReset}>条件を解除</button>}
    </div>}
  </div>;
}
