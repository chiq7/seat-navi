"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Shuffle, ScanSearch } from "lucide-react";
import { resolveSeat } from "@/lib/arena-map/layoutModel";
import { createV2Layouts, runV2Validation, sampleV2Seats, v2Cases, v2Profiles, validationCutoff, type V2Case, type V2Profile } from "@/lib/arena-map/syntheticValidationV2";
import { createSearchTruthSeats, createSquareTruthLayout, searchTruthCases } from "@/lib/arena-map/syntheticSearchValidation";
import { analyzeReports, compareLayouts } from "@/lib/arena-map/reportEvidence";
import { validationEvent } from "@/lib/arena-map/syntheticValidation";
import { ArenaValidationDiagram as Diagram } from "./ArenaValidationDiagram";
import { SearchValidationPanel } from "./SearchValidationPanel";
import styles from "./verification.module.css";

export function SyntheticValidationPreview() {
  const [caseId, setCaseId] = useState<V2Case|"search-square">("circle-straight");
  const [profile, setProfile] = useState<V2Profile>("100");
  const [seed, setSeed] = useState(1);
  const [renumber, setRenumber] = useState(false);
  const [candidateId, setCandidateId] = useState("");
  const [mode, setMode] = useState<"search" | "new" | "old">("search");
  const [census, setCensus] = useState(false);
  const [includeHeldout, setIncludeHeldout] = useState(false);
  const auditCase=caseId === "search-square";
  const result = useMemo(() => runV2Validation(caseId === "search-square" ? "square-straight" : caseId, profile, seed, renumber, census, includeHeldout), [caseId, profile, seed, renumber, census, includeHeldout]);
  const audit=useMemo(()=>{
    if(!auditCase) return null;
    const truth=searchTruthCases.find(t=>t.id === "new-square")!;
    const truthSeats=createSearchTruthSeats(truth,renumber);
    return {truth:createSquareTruthLayout(truth),truthSeats,samples:sampleV2Seats(truthSeats,profile,seed)};
  },[auditCase,renumber,profile,seed]);
  const oldLayouts = useMemo(() => createV2Layouts(includeHeldout), [includeHeldout]);
  const baseline = useMemo(() => compareLayouts(oldLayouts, analyzeReports(result.samples.map(s => s.evidence), validationEvent, validationCutoff)), [oldLayouts, result.samples]);
  const truth = audit?.truth ?? createV2Layouts(true).find(c => c.id === caseId)!;
  const selected = result.comparison.evaluated.find(e => e.candidate.id === candidateId) ?? result.comparison.evaluated[0];
  const candidate = mode === "new" ? selected.candidate.layout : oldLayouts.find(c => c.id === candidateId) ?? oldLayouts[0];
  const oldChecked = baseline.candidates.find(c => c.id === candidate.id);
  const reportedPoints = mode === "new" ? selected.mapped.map(m => m.point) : result.samples.flatMap(s => {
    const mapped = resolveSeat(candidate, s.evidence);
    return mapped.status === "mapped" ? [mapped.point] : [];
  });
  const collisions = oldChecked?.check?.mapped.filter(m => m.conflicts.length).length ?? 0;
  const unmapped = mode === "new" ? result.samples.length - selected.mapped.length : oldChecked?.check?.unmapped.length ?? 0;
  const topShapes = result.comparison.topShapeIds.length;
  const changeConditions = () => setCandidateId("");
  return <main className={styles.page}>
    <header><Link href="/preview/arena-layout" aria-label="座席図の試作へ戻る"><ArrowLeft size={20} /></Link><span>ちけレポ</span><small>架空公演の検証</small></header>
    <h1>報告を入れて、答え合わせ。</h1>
    <label className={styles.selectRow}>正解配置<select value={caseId} onChange={e => { setCaseId(e.target.value as V2Case|"search-square"); if(e.target.value === "search-square") setMode("search"); changeConditions(); }}>
      {v2Cases.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
      <option value="search-square">修正検証：探索漏れの四角</option>
    </select></label>
    <div className={styles.profiles} aria-label="投入する座席サンプル">
      {v2Profiles.map(p => <button key={p.id} type="button" aria-pressed={profile === p.id} onClick={() => { setProfile(p.id); setCensus(false); changeConditions(); }}>{p.label}</button>)}
    </div>
    <div className={styles.mode} aria-label="判定方式">
      <button type="button" aria-pressed={mode === "search"} onClick={() => { setMode("search"); changeConditions(); }}>報告から探索</button>
      <button type="button" disabled={auditCase} aria-pressed={mode === "new"} onClick={() => { setMode("new"); changeConditions(); }}>固定24案</button>
      <button type="button" disabled={auditCase} aria-pressed={mode === "old"} onClick={() => { setMode("old"); changeConditions(); }}>旧方式</button>
    </div>
    {mode === "search" ? <SearchValidationPanel truth={audit?.truth ?? truth} truthSeats={audit?.truthSeats ?? result.truthSeats} samples={audit?.samples ?? result.samples} census={census}/> : <>
    <div className={styles.result} role="status" data-testid="validation-result">
      <ScanSearch size={22} />
      <div><strong>{mode === "old" ? `${baseline.compatibleIds.length}案残る・順位なし` : profile === "0" ? "報告待ち" : !topShapes ? "一致する候補なし" : topShapes === 1 ? "上位の形は1案・未確定" : `上位の形は${topShapes}案・保留`}</strong>
        <span>{mode === "old" ? "番号維持の格子で照合" : `${census ? "全数確認" : "部分報告"} · ${result.comparison.compatibleCount}採番案が適合 · ${result.comparison.topIds.length}案が1位群`}</span>
      </div>
    </div>
    <div className={styles.figures}>
      <section><h2>先に決めた正解</h2><Diagram layout={truth} points={result.samples.map(s => s.actualPoint)} chairs={result.truthSeats.map(s => s.actualPoint)} title="正解配置と実在するサンプル座席" /><p>抽出 {result.samples.length} / {result.truthSeats.length}席</p></section>
      <section><h2>{mode === "new" ? "推定した候補" : "旧方式の候補"}</h2><Diagram layout={candidate} points={reportedPoints} title="候補配置に報告番号を対応付けた結果" />
        <p className={mode === "new" ? selected.compatible ? styles.fit : styles.conflict : collisions ? styles.conflict : styles.fit}>
          {mode === "new" ? `${selected.top ? "1位群" : selected.compatible ? "下位候補" : "不適合"} · 矛盾${selected.conflicts.length}件` : `重なり${collisions}席`}<br />未対応{unmapped}席<br />点＝推定位置
        </p>
      </section>
    </div>
    <label className={styles.selectRow}>候補<select value={mode === "new" ? selected.candidate.id : candidate.id} onChange={e => setCandidateId(e.target.value)}>
      {mode === "new" ? result.comparison.evaluated.map(e => <option key={e.candidate.id} value={e.candidate.id}>{e.top ? "1位群" : e.compatible ? "下位" : "×"} · {e.candidate.layout.label} · {e.candidate.numbering.kind === "row-reset" ? "振り直し" : "番号維持"}</option>)
        : oldLayouts.map(c => <option key={c.id} value={c.id}>{baseline.compatibleIds.includes(c.id) ? "○" : "×"} {c.label}</option>)}
    </select></label>
    </>}
    <button type="button" className={styles.shuffle} onClick={() => { setSeed(s => s + 1); changeConditions(); }} disabled={profile === "all" || profile === "biased" || profile === "0"}><Shuffle size={16} />抽出する席を変える</button>
    <details><summary>条件・投入した座席</summary>
      <label className={styles.check}><input type="checkbox" checked={renumber} onChange={e => { setRenumber(e.target.checked); changeConditions(); }} />サンプルの番号を振り直す</label>
      <label className={styles.check}><input type="checkbox" checked={census} disabled={profile !== "all" || mode === "old"} onChange={e => { setCensus(e.target.checked); changeConditions(); }} />全数確認として判定</label>
      <p>{mode === "old" ? "旧方式は全数確認を使いません。" : census ? "A1・A2・B1・B2の各1〜14列を全数確認済みとして渡します。" : "部分報告として判定。全席ボタンだけでは、全数確認済みとは伝えません。"}</p>
      <label className={styles.check}><input type="checkbox" checked={includeHeldout} disabled={mode === "search"} onChange={e => { setIncludeHeldout(e.target.checked); changeConditions(); }} />固定比較に未使用の2配置も含める</label>
      <p>改良版は採番を両方比較。サンプル側の振り直し設定は判定へ渡しません。seed: {seed}</p>
      <p>正解の席と配置候補は別々に作成。判定へ入れるのは座席ラベルと時刻だけです。</p>
      <p>今回はブロックの位置・座席間隔を共通条件として与えています。配置そのものを白紙から当てるテストではありません。</p>
      {mode !== "search" && <><p>固定比較の答え合わせ：{result.correctInLibrary ? `正解候補${result.correctRetained ? "は残る" : "を除外"} · 正しい採番での位置ずれ${result.coordinateErrors}席` : "正解形状は候補にありません"}。これは候補を選んだ後の検証で、推定の入力ではありません。</p>
      <p>固定比較は隣接する観測列{result.comparison.scoredRows}列を比較。同点幅はスコア差2以内。確率や実公演の正解率ではありません。</p></>}
      {mode === "new" && selected.conflicts.length > 0 && <p>矛盾内訳：{Object.entries(selected.conflicts.reduce<Record<string,number>>((counts, c) => { counts[c.kind] = (counts[c.kind] ?? 0) + 1; return counts; }, {})).map(([kind,count]) => `${kind} ${count}`).join(" / ")}</p>}
      <ul>{(audit?.samples ?? result.samples).slice(0, 12).map(s => <li key={s.evidence.id}>{s.evidence.block} · {s.evidence.row}列 · {s.evidence.seat}番</li>)}</ul>
      <p>先頭12件／全{(audit?.samples ?? result.samples).length}件。画面内のサンプルのみ。</p>
    </details>
  </main>;
}
