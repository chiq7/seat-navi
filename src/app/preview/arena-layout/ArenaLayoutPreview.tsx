"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, LocateFixed, Maximize2, MapPin, CircleHelp, TriangleAlert } from "lucide-react";
import { checkCandidate, containsPoint, focusBounds, layoutSeats, resolveSeat, type ArenaLayout, type Bounds, type Point, type Shape } from "@/lib/arena-map/layoutModel";
import { conflictingCandidate, sampleLayout, sampleObservations, scenarios, type Scenario } from "./fixtures";
import type { SeatReport } from "@/lib/types";
import styles from "./arena-layout.module.css";

const OldMap = dynamic(() => import("@/components/arena-map/ArenaReportMap").then(m => m.ArenaReportMap), { loading: () => <p>比較図を読み込み中…</p> });

const viewBox = (b: Bounds) => `${b.x} ${b.y} ${b.width} ${b.height}`;
function ShapeElement({ shape }: { shape: Shape }) {
  return shape.kind === "circle"
    ? <circle cx={shape.center.x} cy={shape.center.y} r={shape.radius} />
    : <polygon points={shape.points.map(p => `${p.x},${p.y}`).join(" ")} />;
}

function Overview({ layout, point, bounds }: { layout: ArenaLayout; point: Point; bounds: Bounds }) {
  return <svg viewBox={viewBox(layout.bounds)} className={styles.overview} role="img" aria-label="全体図の中の拡大範囲">
    <rect width="480" height="415" fill="white" />
    <g fill="#695778">{layout.landmarks.map(l => <ShapeElement key={l.id} shape={l.shape} />)}</g>
    <rect x={bounds.x} y={bounds.y} width={bounds.width} height={bounds.height} fill="#c12d6912" stroke="#c12d69" strokeWidth="4" />
    <circle cx={point.x} cy={point.y} r="10" fill="#c12d69" />
  </svg>;
}

export function ArenaLayoutPreview() {
  const [scenario, setScenario] = useState<Scenario>("circle");
  return <main className={styles.page}>
    <header className={styles.header}>
      <Link href="/preview/dot-map" aria-label="これまでの座席図へ"><ArrowLeft size={20} /></Link>
      <span className={styles.brand}>ちけレポ</span>
      <span className={styles.sample}>架空配置の試作</span>
    </header>
    <h1>ステージと、自分の席。</h1>
    <label className={styles.scenario}>配置ケース
      <select value={scenario} onChange={e => setScenario(e.target.value as Scenario)}>
        {scenarios.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
      </select>
    </label>
    <LayoutCase key={scenario} scenario={scenario} />
  </main>;
}

function LayoutCase({ scenario }: { scenario: Scenario }) {
  const [renumber, setRenumber] = useState(false);
  const [address, setAddress] = useState({ block: "B2", row: "3", seat: "12" });
  const [focus, setFocus] = useState<string | null>(null);
  const [density, setDensity] = useState<"few" | "more" | "none">("few");
  const [wide, setWide] = useState(false);
  const [oldOpen, setOldOpen] = useState(false);
  const layout = sampleLayout(scenario, renumber);
  const candidate = wide ? conflictingCandidate(layout) : layout;
  const allObservations = sampleObservations(layout);
  const reports = density === "none" ? [] : density === "few" ? allObservations.filter((_, i) => i % 3 === 0) : allObservations;
  const check = checkCandidate(candidate, reports);
  const seat = resolveSeat(layout, address);
  const point = seat.status === "mapped" ? seat.point : undefined;
  const conflictAtSeat = point ? candidate.landmarks.some(l => containsPoint(l.shape, point)) : false;
  const bounds = focusBounds(candidate, point, focus);
  const seats = layoutSeats(layout);
  const conflicts = check.mapped.filter(m => m.conflicts.length);
  const selectedLandmark = candidate.landmarks.find(l => l.id === focus);
  const oldReports: SeatReport[] = reports.map(r => ({ id: r.id, event_id: r.eventId, block: r.block, row_num: Number(r.row), seat_num: Number(r.seat), lottery_type: "fc1", lottery_round: null, lottery_name: null, comment: null, created_at: "2026-09-27T00:00:00Z" }));

  return <>
    <section className={styles.controls} aria-label="自分の席を探す">
      <span className={styles.controlTitle}><MapPin size={16} aria-hidden="true" />自分の席</span>
      <div className={styles.address}>
        <label>ブロック<select value={address.block} onChange={e => setAddress({ ...address, block: e.target.value })}>{layout.blocks.map(b => <option key={b.id}>{b.id}</option>)}</select></label>
        <label>列<input inputMode="numeric" maxLength={5} value={address.row} onChange={e => setAddress({ ...address, row: e.target.value })} /></label>
        <label>番号<input inputMode="numeric" maxLength={6} value={address.seat} onChange={e => setAddress({ ...address, seat: e.target.value })} /></label>
      </div>
    </section>
    <section className={styles.mapSection} aria-label="配置図">
      <div className={styles.mapHeading}>
        <strong>{address.block}<span> {address.row || "—"}列 {address.seat || "—"}番</span></strong>
        <span className={styles.predicted}>予想図の見え方</span>
      </div>
      <div className={styles.status} aria-live="polite">
        {!point ? <><CircleHelp size={16} aria-hidden="true" />この配置では位置を確認できません</>
          : conflictAtSeat ? <><TriangleAlert size={16} aria-hidden="true" />自席とセンステ候補が重なっています</>
          : <><LocateFixed size={16} aria-hidden="true" />{selectedLandmark ? `${selectedLandmark.label}と自分の席` : "ピンクの目印が自分の席"}</>}
      </div>
      <div className={styles.mapWrap}>
        <svg className={styles.map} viewBox={viewBox(bounds)} role="img" aria-label={`${layout.label}の${scenarios.find(s => s.id === scenario)?.label}。${point ? `自席${address.block}、${address.row}列${address.seat}番を表示` : "自席の位置は未確認"}`}>
          <title>架空配置：ステージと自席の位置関係</title>
          <rect x="0" y="0" width="480" height="415" fill="#fcfafb" />
          {candidate.landmarks.map(l => <g key={l.id} className={l.kind === "passage" ? styles.passage : styles.stage}><ShapeElement shape={l.shape} /></g>)}
          <g className={styles.templateSeats}>{seats.map(({ address: a, point: p }) => <circle key={`${a.block}:${a.row}:${a.seat}`} cx={p.x} cy={p.y} r="1.65" />)}</g>
          <g className={styles.reportSeats}>{check.mapped.map(({ observation, position, conflicts: hit }) => <circle key={observation.id} cx={position.point.x} cy={position.point.y} r="3.2" className={hit.length ? styles.conflictingDot : undefined} />)}</g>
          {layout.blocks.map(b => <text key={b.id} x={b.labelAt.x} y={b.labelAt.y} textAnchor="middle" className={styles.blockLabel}>{b.id}</text>)}
          {candidate.landmarks.map(l => <text key={l.id} x={l.labelAt.x} y={l.labelAt.y} textAnchor="middle" dominantBaseline="middle" className={l.kind === "passage" ? styles.passageLabel : styles.stageLabel}>{l.label}</text>)}
          {point && <g data-testid="my-seat" data-x={point.x} data-y={point.y}>
            <circle cx={point.x} cy={point.y} r="12" className={styles.pinHalo} />
            <circle cx={point.x} cy={point.y} r="6" className={styles.pin} />
            <path d={`M${point.x} ${point.y - 13} v-14`} stroke="#c12d69" strokeWidth="2" />
            <rect x={point.x - 22} y={point.y - 48} width="44" height="22" rx="11" fill="#c12d69" />
            <text x={point.x} y={point.y - 33} textAnchor="middle" className={styles.pinLabel}>自分</text>
          </g>}
        </svg>
        {focus && point && <Overview layout={candidate} point={point} bounds={bounds} />}
      </div>
      <div className={styles.legend}><span><i className={styles.legendDot} />報告</span><span><i className={styles.legendTemplate} />配置例の席</span><span><i className={styles.legendStage} />ステージ候補</span></div>
      <div className={styles.focus} aria-label="ステージと自席を見る">
        <button type="button" aria-pressed={focus === null} onClick={() => setFocus(null)}><Maximize2 size={15} aria-hidden="true" />全体</button>
        {candidate.landmarks.filter(l => l.kind !== "passage").map(l => <button type="button" key={l.id} disabled={!point} aria-pressed={focus === l.id} onClick={() => setFocus(l.id)}>{l.label}</button>)}
      </div>
    </section>
    <details className={styles.details}>
      <summary>番号の振り方・追加報告を試す</summary>
      <div className={styles.testControls}>
        <label className={styles.checkLabel}><input type="checkbox" checked={renumber} onChange={e => setRenumber(e.target.checked)} />欠けた列を1番から振り直す</label>
        <p>同じ席番号でも、位置が変わる場合があります。</p>
        <label>架空の報告<select value={density} onChange={e => setDensity(e.target.value as typeof density)}><option value="few">少なめ</option><option value="more">追加する</option><option value="none">0件</option></select></label>
        <label className={styles.checkLabel}><input type="checkbox" checked={wide} onChange={e => setWide(e.target.checked)} />センステを大きくした候補と比べる</label>
        <div className={styles.checkResult} role="status">
          <strong>{check.state === "review" ? "候補の見直しが必要" : check.state === "no-evidence" ? "報告なし・候補の良否は未判定" : "この報告との重なりはなし"}</strong>
          <span>配置できた点 {check.mapped.length} · ステージ等との重なり {conflicts.length} · 位置未対応 {check.unmapped.length}</span>
          <span>重なりがないだけでは、正しい配置とは決まりません。</span>
        </div>
        <p>入力・操作はこの画面内だけです。実公演の予想・投稿ではありません。</p>
      </div>
    </details>
    <details className={styles.details} onToggle={e => setOldOpen(e.currentTarget.open)}>
      <summary>同じ報告を、今までのマスで見る</summary>
      {oldOpen && <div className={styles.oldMap}><p>同じサンプル。現行図は番号順の均等なマスです。</p><OldMap eventId="layout-sample-day1" reports={oldReports} hideShareSection positionOnlyPreview /></div>}
    </details>
  </>;
}
