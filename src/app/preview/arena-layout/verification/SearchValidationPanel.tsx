"use client";

import { useMemo, useState } from "react";
import { MapPin, ScanSearch } from "lucide-react";
import { type ArenaLayout } from "@/lib/arena-map/layoutModel";
import { seatKey } from "@/lib/arena-map/candidateSeatModel";
import { analyzeReports } from "@/lib/arena-map/reportEvidence";
import { searchArenaLayouts, searchHypothesisLayout, resolveSearchSeat } from "@/lib/arena-map/layoutSearch";
import { buildLayoutConsensus, describeSeatRelation } from "@/lib/arena-map/layoutConsensus";
import { createV2Layouts, fullCensusScope, validationCutoff } from "@/lib/arena-map/syntheticValidationV2";
import { validationEvent, type SyntheticSeat } from "@/lib/arena-map/syntheticValidation";
import { ArenaValidationDiagram } from "./ArenaValidationDiagram";
import styles from "./verification.module.css";

export function SearchValidationPanel({truth,truthSeats,samples,census}:{truth:ArenaLayout;truthSeats:SyntheticSeat[];samples:SyntheticSeat[];census:boolean}) {
  const [view,setView]=useState<"common"|"one">("common");
  const [seatId,setSeatId]=useState("");
  const [candidateId,setCandidateId]=useState("");
  const base=useMemo(()=>createV2Layouts().find(l=>l.id === "none-none")!,[]);
  const result=useMemo(()=>searchArenaLayouts(base,analyzeReports(samples.map(s=>s.evidence),validationEvent,validationCutoff),census ? {census:fullCensusScope()} : {}),[base,samples,census]);
  const consensus=useMemo(()=>buildLayoutConsensus(result),[result]);
  const seats=useMemo(()=>[...new Map(samples.map(s=>[seatKey(s.evidence),s.evidence])).values()].sort((a,b)=>a.block.localeCompare(b.block,"en",{numeric:true}) || a.row.localeCompare(b.row,"en",{numeric:true}) || Number(a.seat)-Number(b.seat)),[samples]);
  const seat=seats.find(s=>seatKey(s) === seatId) ?? seats[0];
  const self=useMemo(()=>seat ? describeSeatRelation(result,seat) : undefined,[result,seat]);
  const selected=result.display.find(h=>h.id === candidateId) ?? result.display[0];
  const candidate=selected ? searchHypothesisLayout(result.grid,selected) : base;
  const points=selected ? samples.flatMap(s=>{const p=resolveSearchSeat(result.grid,selected,s.evidence);return p ? [p] : [];}) : [];
  const centerText=consensus.centerPresence === "all" ? "センステありの案が残る" : consensus.centerPresence === "mixed" ? "センステの有無は未判定" : result.top.length ? "センステなしの案が残る" : "報告との矛盾を確認";
  const heading=result.state === "no-evidence" ? "座席の報告待ち" : result.state === "held-input" ? "入力の確認が必要です" : !result.top.length ? "合う配置が見つかりません"
    : result.budgetLimited ? "探索途中・保留" : !result.scoredRows && !census ? "まだ形は絞れません" : consensus.commonCells ? "共通する場所が見えてきました" : "位置はまだ絞れません";
  return <>
    <div className={styles.result} role="status" data-testid="search-result"><ScanSearch size={22}/><div><strong>{heading}</strong><span>{census ? "全数確認" : "部分報告"} · {result.state === "no-evidence" ? "座席を入れると探索します" : centerText}</span></div></div>
    <div className={styles.figures}>
      <section><h2>先に決めた正解</h2><ArenaValidationDiagram layout={truth} points={samples.map(s=>s.actualPoint)} chairs={truthSeats.map(s=>s.actualPoint)} title="独立に決めた正解配置"/><p>抽出 {samples.length} / {truthSeats.length}席</p></section>
      <section><h2>{view === "common" ? "みんなの報告から" : "探索した1案"}</h2><ArenaValidationDiagram layout={candidate} points={points} consensus={view === "common" ? consensus : undefined} self={self} title={view === "common" ? "全適合案の共通部分と上位案の候補域" : "探索した配置候補の例"}/><p>{view === "common" ? "濃い所＝共通の予想" : "1案の例・未確定"}<br/>点＝報告席の推定位置</p></section>
    </div>
    <div className={styles.legend} aria-label="図の凡例"><span><i className={styles.commonSwatch}/>共通の予想</span><span><i className={styles.possibleSwatch}/>候補の幅</span><span><i className={styles.seatSwatch}/>報告席</span></div>
    {!!seats.length && <div className={styles.selfSeat}>
      <label className={styles.selectRow}>報告した席<select aria-label="自分の席として見る報告" value={seatKey(seat)} onChange={e=>setSeatId(e.target.value)}>{seats.map(s=><option key={seatKey(s)} value={seatKey(s)}>{s.block} · {s.row}列 · {s.seat}番</option>)}</select></label>
      <div className={styles.relation} data-testid="seat-relation"><MapPin size={18}/><strong>{self?.label}</strong><small>図の向き</small></div>
    </div>}
    <div className={styles.mode} aria-label="探索結果の表示"><button type="button" aria-pressed={view === "common"} onClick={()=>setView("common")}>共通部分を見る</button><button type="button" aria-pressed={view === "one"} onClick={()=>setView("one")} disabled={!selected}>1案を見る</button></div>
    {view === "one" && selected && <label className={styles.selectRow}>探索候補<select value={selected.id} onChange={e=>setCandidateId(e.target.value)}>{result.display.map((h,i)=><option key={h.id} value={h.id}>案{i+1} · {searchHypothesisLayout(result.grid,h).label} · {h.numbering === "row-reset" ? "振り直し" : "番号維持"}</option>)}</select></label>}
    <details className={styles.searchDetails}><summary>探索の内訳</summary>
      <p>{result.evaluatedGeometries.toLocaleString("ja-JP")}配置を探索 · 適合{result.compatibleCount.toLocaleString("ja-JP")}採番案 · 上位{result.top.length.toLocaleString("ja-JP")}案。濃い部分は全適合案の共通部分、薄い部分は上位案の候補域です。</p>
      <p>センステの位置・大きさ・花道幅を変更して探索。番号維持と振り直しを両方比較します。右図へ正解の位置・大きさ・採番は渡していません。</p>
      <p>円・四角・直線・横花道が対象。ブロック位置とメインは既知の条件です。濃い部分も探索した案に共通する予想で、実測の確定ではありません。</p>
      <p>比較に使った隣接列{result.scoredRows}列 · 入力保留{result.analysis.held.length}件。番号未対応や矛盾がある配置は採用しません。輪郭が一意にならない時も候補の幅を残します。</p>
      {self?.bounds && <p>選択席は全適合案{self.mappedCandidates.toLocaleString("ja-JP")}件に対応。ピンクの枠は推定位置の幅です。</p>}
    </details>
  </>;
}
