"use client";
import { trackVenueSeatSearch } from "@/lib/venueAnalytics";

import { useMemo, useState, type FormEvent } from "react";
import { LocateFixed, X } from "lucide-react";
import type { DedicatedVenueGuide, SeatArea } from "@/data/venueGuides/types";
import { DomeSeatFrame } from "../template/DomeSeatFrame";
import ReadySearchControl from "../template/ReadySearchControl";
import styles from "./KyoceraSeatMap.module.css";
import type { Box } from "./mapGeometry";
import KyoceraNumberNavigator from "./KyoceraNumberNavigator";
import { kyoceraBlockCamera, kyoceraDrawingBlocks, kyoceraAreaCamera, kyoceraMatchesArea, kyoceraSelectedDirection, type DrawingBlock } from "./kyoceraMapDrawing";
import { findKyoceraSeats, normalizeKyoceraTicket, type KyoceraSeatCandidate } from "./kyoceraSeatSearch";

type Props = { guide: DedicatedVenueGuide; selectedId: string | null; rowLabel: string | null; seatNumber: string;
  onSelect: (area: SeatArea) => void; onClear: () => void; onRow: (row: string | null) => void;
  onTicket: (area: SeatArea, row: string, number: string) => void };
const levels = [{ id: "すべて", label: "すべて", color: "#a93164" }, { id: "下段", label: "下段", color: "#db78a7" },
  { id: "上段", label: "上段", color: "#a696c8" }];
const directions = [{ id: "all", label: "全体" }, { id: "first", label: "1塁側" }, { id: "home", label: "中央" }, { id: "third", label: "3塁側" }, { id: "outfield-right", label: "外野ライト" }, { id: "outfield-left", label: "外野レフト" }];

export default function KyoceraSeatMap({ guide, selectedId, rowLabel, seatNumber, onSelect, onClear, onRow, onTicket }: Props) {
  const whole = guide.seatMap!.viewBox;
  const blocks = useMemo(() => kyoceraDrawingBlocks(guide), [guide]);
  const [box, setBox] = useState<Box>([...whole] as Box);
  const [level, setLevel] = useState("すべて");
  const [direction, setDirection] = useState("all");
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [specialRow, setSpecialRow] = useState<string | null>(null);
  const [specialNumber, setSpecialNumber] = useState("");
  const [searchRow, setSearchRow] = useState("");
  const [number, setNumber] = useState("");
  const [error, setError] = useState("");
  const [candidates, setCandidates] = useState<KyoceraSeatCandidate[]>([]);
  const selected = blocks.find(b => b.code === selectedCode && (b.special || b.areaId === selectedId));
  const currentRow = selected?.special ? specialRow : rowLabel;
  const currentNumber = selected?.special ? specialNumber : seatNumber;
  const emptyScope = !blocks.some(block => kyoceraMatchesArea(block, whole, direction, level));
  const feedback = error || (emptyScope ? "この組合せに表示できる席がありません。" : "");
  function resetFeedback() { setError(""); setCandidates([]); }
  function clear() { onClear(); setSelectedCode(null); setSpecialRow(null); setSpecialNumber(""); resetFeedback(); }
  function showWhole() { clear(); setBox([...whole] as Box); setDirection("all"); setLevel("すべて"); }
  function showDirection(id: string, tier = level) {
    if (id === "all") { showWhole(); return; }
    clear(); setDirection(id); setLevel(tier);
    setBox(kyoceraAreaCamera(blocks, whole, id, tier));
  }
  function chooseBlock(block: DrawingBlock) {
    if (block.special) { onClear(); setSpecialRow(null); setSpecialNumber(""); }
    else { const area = guide.seats.find(a => a.id === block.areaId)!; onSelect(area); if (selectedId === area.id) onRow(null); }
    setSelectedCode(block.code); setDirection(kyoceraSelectedDirection(block, whole, direction)); setLevel(block.special ? "すべて" : block.tier); resetFeedback();
    // At detail scale, selecting another visible block keeps the camera and page.
    if (!selected || Math.max(box[2], box[3]) > 550) setBox(kyoceraBlockCamera(block, whole));
  }
  function zoom(factor: number) { setBox(current => {
    const width = Math.max(60, Math.min(whole[2], current[2] * factor));
    const height = Math.max(60, Math.min(whole[3], current[3] * factor));
    return [current[0] + (current[2] - width) / 2, current[1] + (current[3] - height) / 2, width, height];
  }); }
  function selectCandidate(candidate: KyoceraSeatCandidate, preferred = direction) {
    const { block, row, number: seat } = candidate;
    if (block.special) { onClear(); setSpecialRow(row); setSpecialNumber(seat); }
    else { onTicket(guide.seats.find(area => area.id === block.areaId)!, row, seat); setSpecialRow(null); setSpecialNumber(""); }
    setSelectedCode(block.code); setDirection(kyoceraSelectedDirection(block, whole, preferred)); setLevel(block.special ? "すべて" : block.tier);
    setBox(kyoceraBlockCamera(block, whole)); resetFeedback();
  }
  function search(scope = direction, tier = level) {
    clear();
    const input = normalizeKyoceraTicket(searchRow, number);
    if (!input) { trackVenueSeatSearch("invalid"); setError("列と番号を確認してください。列は数字または英字、番号は数字で入力できます。"); return; }
    const hits = findKyoceraSeats(blocks, whole, input, scope, tier);
    if (hits.length === 1) { trackVenueSeatSearch("matched",1); selectCandidate(hits[0], scope); return; }
    if (hits.length > 1) { trackVenueSeatSearch("multiple",hits.length); setCandidates(hits); return; }
    const conflict = blocks.find(block => block.code === "X_BM_57");
    trackVenueSeatSearch(input.row === "27" && input.number === "46" && conflict && kyoceraMatchesArea(conflict, whole, scope, tier) ? "unverified" : "empty");
    setError(input.row === "27" && input.number === "46" && conflict && kyoceraMatchesArea(conflict, whole, scope, tier)
      ? "この列・番号は公式資料の表記が一致しないため、位置を表示できません。主催者の案内で確認してください。"
      : "この条件で席が見つかりません。列・番号や上のボタンを確認してください。");
  }
  function submit(event: FormEvent) { event.preventDefault(); search(); }
  function searchWhole() { setDirection("all"); setLevel("すべて"); setBox([...whole] as Box); search("all", "すべて"); }
  function showLevel(value: string) {
    clear(); setLevel(value);
    setBox(kyoceraAreaCamera(blocks, whole, direction, value));
  }
  return <DomeSeatFrame className={styles.seatFrame} levels={levels} level={level} onLevel={showLevel}
    directions={directions} direction={direction} onDirection={showDirection} onZoom={zoom} onWhole={showWhole} zoomLabel="座席図" shortcuts={[]}
    directionExtra={<form className={styles.ticketForm} data-testid="kyocera-ticket-search" onSubmit={submit} aria-label="チケットの座席情報で探す">
        <label>列<ReadySearchControl><input aria-label="検索する列" placeholder="例：8 / A" value={searchRow} onChange={e => { setSearchRow(e.target.value); resetFeedback(); }} required /></ReadySearchControl></label>
        <label>番号<ReadySearchControl><input aria-label="検索する席番号" inputMode="numeric" placeholder="例：41" value={number} onChange={e => { setNumber(e.target.value); resetFeedback(); }} required /></ReadySearchControl></label>
        <ReadySearchControl><button className={styles.searchSubmit} type="submit">場所を見る</button></ReadySearchControl>
      </form>}>
    {(feedback || candidates.length > 1) && <div className={styles.search}>
      {feedback && <div className={styles.searchFeedback}><p className={styles.error} role="alert">{feedback}</p>{(direction !== "all" || level !== "すべて") && <button type="button" onClick={searchWhole}>全体から探す</button>}</div>}
      {candidates.length > 1 && <div className={styles.candidates} data-testid="kyocera-seat-candidates" aria-live="polite">
        <p>{candidates[0].row}列{candidates[0].number}番の場所を選んでください</p>
        <div>{candidates.map(candidate => <button key={`${candidate.block.areaId}:${candidate.block.code}`} type="button" data-candidate-code={candidate.block.code} onClick={() => selectCandidate(candidate)}>
          {candidate.block.label}・{candidate.block.tier === "公式の別区分" ? "別区分" : candidate.block.tier}
          {candidates.filter(other => other.block.label === candidate.block.label && other.block.tier === candidate.block.tier).length > 1 && <small>{candidate.range.start}〜{candidate.range.end}番のブロック</small>}
        </button>)}</div>
      </div>}
    </div>}
    <div className={styles.selectionBand} data-testid="map-selection-summary" aria-live="polite">{selected ? <>
      <div><strong>{selected.label}・{selected.tier}</strong><span>{selected.rowLabelIsPrinted ? `${selected.rowLabel}列（${selected.rows.length}列）` : "公式検索：0列"}・{selected.firstSeat}〜{selected.lastSeat}番{currentRow && selected.rowLabelIsPrinted && <> ／ <b className={styles.selectedRow}>{currentRow}列</b></>}{currentNumber && <> ・ <b className={styles.selectedSeat} data-selected-seat-number>選択：{currentNumber}番</b></>}</span></div>
      <button type="button" disabled={!selected} aria-label="選んだ場所を表示" onClick={() => selected && setBox(kyoceraBlockCamera(selected, whole))}><LocateFixed size={19} /></button>
      <button type="button" disabled={!selected} aria-label="座席の選択を解除" onClick={clear}><X size={18} /></button>
    </> : <span>{direction === "all" ? "座席の全体図" : `${directions.find(item => item.id === direction)?.label ?? "座席"}の範囲`}</span>}</div>
    <KyoceraNumberNavigator guide={guide} blocks={blocks} level={level} selectedCode={selected?.code} rowLabel={currentRow}
      box={box} onView={setBox} onBlock={chooseBlock} onWhole={showWhole} onDirection={showDirection} onArea={areaId => {
        const area = guide.seats.find(a => a.id === areaId); if (!area) return;
        setLevel(area.type); showDirection(area.label === "1塁側" ? "first" : area.label === "3塁側" ? "third" : "home", area.type);
      }} />
    {selected && <p className={styles.note}>{selected.rowLabelIsPrinted ? "列線は等間隔の目安。矢印は番号が増える向きです。端の番号は列によって変わります。" : "FBは列の印字がない席です。検索では0列を入力してください。矢印は番号が増える向きです。"}</p>}
    {selected && <details className={styles.rowDetails} key={selected.code} data-testid="selected-block-numbers" data-block-code={selected.code}>
      <summary>このブロックの列別の番号・通路</summary><div className={styles.rowBody}>
        <table><caption>{selected.label}・{selected.tier} ／ 掲載{selected.seatCount}席</caption><thead><tr><th scope="col">列</th><th scope="col">席番号</th><th scope="col">通路</th></tr></thead><tbody>
          {selected.rows.map(row => <tr key={row.row} data-block-row={row.row} aria-current={row.row === currentRow ? "true" : undefined}><th scope="row">{selected.rowLabelIsPrinted ? `${row.row}列` : "列の印字なし（検索：0列）"}</th><td>{row.ranges.map(r => `${r.start}〜${r.end}番`).join("・")}{row.row === currentRow && currentNumber && <strong>選択中：{currentNumber}番</strong>}</td><td>{[...new Set(row.ranges.map(r => r.passage))].filter(Boolean).join("・") || "—"}</td></tr>)}
        </tbody></table>
        <p>地図はブロックの範囲を示します。個々の椅子の位置は表示していません。公演別アリーナ・ビスタの配置は主催者の案内で確認してください。</p>
        <a href="https://www.kyoceradome-osaka.jp/seat/pdf/kyoceradome_seat.pdf" target="_blank" rel="noopener noreferrer">公式座席図 ↗</a>
      </div>
    </details>}
  </DomeSeatFrame>;
}
