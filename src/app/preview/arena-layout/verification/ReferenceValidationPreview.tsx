"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowLeft, Check, ChevronDown, MapPin, RefreshCw, ScanSearch } from "lucide-react";
import { layoutPatterns, type PatternFamily } from "@/lib/arena-map/historicalLayoutPatterns";
import type { PatternVariant } from "@/lib/arena-map/historicalLayoutPatterns";
import { proposalCandidate, type PatternPrediction } from "@/lib/arena-map/patternInference";
import { distinctProposals, proposalSeatRelationV5 } from "@/lib/arena-map/patternInferenceV5";
import { createReferenceTruth, sampleReferenceSeats, sampleHistoricalContext, referenceEvent, referenceCutoff, type ReferenceNumbering, type ReferenceProfile } from "@/lib/arena-map/referenceValidationV3";
import { seatKey } from "@/lib/arena-map/candidateSeatModel";
import { focusBounds, containsPoint } from "@/lib/arena-map/layoutModel";
import { verificationCases } from "@/lib/arena-map/verificationCases";
import { ArenaValidationDiagram } from "./ArenaValidationDiagram";
import type { PatternWorkerRequest, PatternWorkerResponse, SeatAgreement } from "./patternInference.worker";
import { ReferenceEvidencePanel } from "./ReferenceEvidencePanel";
import styles from "./reference-validation.module.css";

const profiles: { id: ReferenceProfile; label: string }[] = [{ id: "0", label: "0席" }, { id: "3", label: "3席" }, { id: "30", label: "30席" }, { id: "100", label: "100席" }, { id: "front", label: "前方だけ" }, { id: "left", label: "片側だけ" }, { id: "cluster", label: "一部だけ" }, { id: "all", label: "全席" }];
const numberingLabels = { preserved: "欠番を維持", "row-reset": "列ごとに番号", "block-continuous": "ブロック通し番号" };
const variantLabel = (v: PatternVariant, family: PatternFamily) => v.mainOnly ? family === "main-only" ? "機材なし" : "センステなし" : [v.offset < 0 ? "前寄り" : v.offset > 0 ? "後寄り" : "", v.width < 1 ? "幅狭" : v.width > 1 ? "幅広" : "", v.grid < 1 ? "区画狭" : v.grid > 1 ? "区画広" : ""].filter(Boolean).join("・") || "基本";
const SyntheticValidationPreview = dynamic(() => import("./SyntheticValidationPreview").then(module => module.SyntheticValidationPreview), { loading: () => <p>検証画面を準備中</p> });

export function ReferenceValidationPreview() {
  const [legacy, setLegacy] = useState(false);
  return legacy ? <><button className={styles.returnButton} type="button" onClick={() => setLegacy(false)}>見本7枚の検証へ戻る</button><SyntheticValidationPreview /></> : <ReferencePanel onLegacy={() => setLegacy(true)} />;
}

function ReferencePanel({ onLegacy }: { onLegacy: () => void }) {
  const [family, setFamily] = useState<PatternFamily>("square"), [profile, setProfile] = useState<ReferenceProfile>("100");
  const [numbering, setNumbering] = useState<ReferenceNumbering>("block-continuous"), [seed, setSeed] = useState(7309);
  const [history, setHistory] = useState(false), [baseline, setBaseline] = useState(false), [answer, setAnswer] = useState(true);
  const [testCase, setTestCase] = useState("compound-b"), [reverseTruth, setReverseTruth] = useState(false), [census, setCensus] = useState(false), [overlay, setOverlay] = useState(false);
  const [job, setJob] = useState<{ key: string; result?: PatternPrediction; error?: string } | null>(null);
  const [proposalId, setProposalId] = useState(""), [seatId, setSeatId] = useState("");
  const [focused, setFocused] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const [agreementJob, setAgreementJob] = useState<{ key: string; agreement: SeatAgreement } | null>(null);
  const pattern = layoutPatterns.find(p => p.family === family)!;
  const truth = useMemo(() => createReferenceTruth(family, numbering, { ...verificationCases.find(c => c.id === testCase)!.parameters, direction: reverseTruth ? -1 : 1 }), [family, numbering, testCase, reverseTruth]);
  const samples = useMemo(() => sampleReferenceSeats(truth.seats, profile, seed), [truth, profile, seed]);
  const reports = useMemo(() => samples.map(s => s.evidence), [samples]);
  const context = useMemo(() => history ? sampleHistoricalContext(family) : {}, [history, family]);
  const jobKey = JSON.stringify([family, profile, numbering, seed, history, baseline, testCase, reverseTruth, census]);
  const result = job?.key === jobKey ? job.result ?? null : null;
  const error = job?.key === jobKey ? job.error ?? "" : "";
  useEffect(() => {
    const worker = new Worker(new URL("./patternInference.worker.ts", import.meta.url));
    workerRef.current = worker;
    worker.onmessage = (event: MessageEvent<PatternWorkerResponse>) => {
      if (event.data.kind === "prediction") setJob({ key: jobKey, result: event.data.result });
      else if (event.data.kind === "error") setJob({ key: jobKey, error: event.data.error });
      else setAgreementJob({ key: event.data.requestId, agreement: event.data.agreement });
    };
    worker.onerror = () => setJob({ key: jobKey, error: "計算を再試行してください" });
    const rows = [...new Map(reports.map(r => [JSON.stringify([r.block, r.row]), { block: r.block, row: r.row }])).values()];
    const options = census && profile === "all" ? { census: { eventId: referenceEvent, sourceRef: "test:explicit-complete-observed-rows", rows } } : {};
    const request: PatternWorkerRequest = { kind: "infer", reports, eventId: referenceEvent, cutoff: referenceCutoff, context, baseline, options };
    worker.postMessage(request);
    return () => { worker.terminate(); if (workerRef.current === worker) workerRef.current = null; }; // Superseded jobs cannot overwrite new results.
  }, [reports, context, baseline, census, profile, jobKey]);
  const proposals = useMemo(() => distinctProposals(result?.evaluated.filter(p => !p.conflicts) ?? []), [result]);
  const selected = result?.evaluated.find(p => !p.conflicts && p.id === proposalId) ?? proposals[0];
  const selectorProposals = selected && !proposals.some(p => p.id === selected.id) ? [selected, ...proposals] : proposals;
  const candidate = useMemo(() => selected ? proposalCandidate(selected, referenceEvent) : null, [selected]);
  const selfOptions = samples.slice(0,200); // Display sample only; inference and dots still use every report.
  const seat = selfOptions.find(s => seatKey(s.address) === seatId) ?? selfOptions[0];
  const relation = candidate && seat ? proposalSeatRelationV5(candidate, seat.address) : null;
  const reversed = selected ? result?.top.find(p => p.family === selected.family && JSON.stringify(p.variant) === JSON.stringify(selected.variant) && p.numbering.kind === selected.numbering.kind && p.numbering.start === selected.numbering.start && p.numbering.direction !== selected.numbering.direction) : undefined;
  const reverseCandidate = useMemo(() => reversed ? proposalCandidate(reversed, referenceEvent) : null, [reversed]);
  const reverseRelation = reverseCandidate && seat ? proposalSeatRelationV5(reverseCandidate, seat.address) : null;
  const comparisons = useMemo(() => candidate ? {
    collisions: samples.filter(s => candidate.layout.landmarks.some(l => containsPoint(l.shape, s.point))).length,
    missing: samples.filter(s => !candidate.byLabel.has(seatKey(s.address))).length,
  } : null, [candidate, samples]);
  const agreementKey = seat ? `${jobKey}:${seatKey(seat.address)}` : "";
  const agreement = agreementJob?.key === agreementKey ? agreementJob.agreement : null;
  useEffect(() => {
    if (!result || !seat || !result.top.length) return;
    workerRef.current?.postMessage({ kind: "agreement", address: seat.address, requestId: agreementKey } satisfies PatternWorkerRequest);
  }, [result, seat, agreementKey]);
  const mappedPoints = candidate ? samples.flatMap(s => candidate.byLabel.get(seatKey(s.address))?.map(p => p.point) ?? []) : [];
  const visibleBlocks = candidate ? new Set(candidate.rows.filter(r => r.seats.length).map(r => r.block)) : new Set<string>();
  const shownLayout = candidate ? { ...candidate.layout, blocks: candidate.layout.blocks.filter(b => visibleBlocks.has(b.id)) } : null;
  const self = relation?.mapped ? { bounds: { ...relation.point, width: 0, height: 0 }, representative: relation.point, label: "自分の席", mappedCandidates: 1, candidateCount: proposals.length } : undefined;
  const targetStage = candidate?.layout.landmarks.find(l => l.id === (relation?.mapped ? relation.centerId : undefined))?.label ?? "センステ";
  const focus = focused && candidate && relation?.mapped ? focusBounds(candidate.layout, relation.point, relation.centerId ?? "main") : undefined;
  const answerTarget = relation?.mapped && relation.centerId && truth.layout.landmarks.some(l => l.id === relation.centerId) ? relation.centerId : "main";
  const answerFocus = focused && seat ? focusBounds(truth.layout, seat.point, answerTarget) : undefined;
  const status = error || (!result ? "配置を比較中" : result.state === "no-evidence" ? "座席の報告待ち" : result.state === "needs-review" ? "この探索では配置を絞れません" : result.budgetLimited ? "探索途中の候補" : result.top.length > 1 ? `${distinctProposals(result.top).length}種類の候補` : "今回の予想");
  const showPrediction = result && result.state !== "no-evidence" && result.state !== "needs-review" && shownLayout;
  return <main className={styles.page}>
    <header><Link href="/preview/arena-layout" aria-label="座席図の試作へ戻る"><ArrowLeft size={20} /></Link><span>ちけレポ</span><small>合成試験 · v5改</small></header>
    <h1>座席から、配置を予想。</h1>
    <label className={styles.caseLabel}>見本<select aria-label="検証する配置の見本" value={family} onChange={e => { setFamily(e.target.value as PatternFamily); setProposalId(""); setSeatId(""); }}>{layoutPatterns.map(p => <option key={p.family} value={p.family}>{p.label}</option>)}</select></label>
    <label className={styles.caseLabel}>完成図<select aria-label="先に決めた完成図" value={testCase} onChange={e => { const c = verificationCases.find(c => c.id === e.target.value)!; setTestCase(c.id); setSeed(c.seed); setProposalId(""); setSeatId(""); }}>{verificationCases.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select></label>
    <div className={styles.profiles} aria-label="投入する座席サンプル">{profiles.map(p => <button key={p.id} type="button" aria-pressed={profile === p.id} onClick={() => { setProfile(p.id); setCensus(false); }}>{p.label}</button>)}</div>
    <p className={styles.event}>{pattern.venue} · 架空公演 9/28</p>
    <div className={styles.mode}><button type="button" aria-pressed={!baseline} onClick={() => { setBaseline(false); setProposalId(""); }}>改良版 v5</button><button type="button" aria-pressed={baseline} onClick={() => { setBaseline(true); setProposalId(""); }}>旧方式 v3</button></div>
    <div className={styles.status} role="status" aria-live="polite"><ScanSearch size={20} /><strong>{status}</strong>{result && <span>{samples.length}席</span>}</div>
    <div className={answer ? styles.answerGrid : styles.singleGrid}>
      <section className={styles.mapPanel} aria-busy={!result && !error}>
        <div className={styles.mapTitle}><strong>{baseline ? "旧方式の予想" : "今回の予想"}</strong><span>予想</span></div>
        {showPrediction ? <ArenaValidationDiagram layout={shownLayout} points={mappedPoints} self={self} alternateSelf={reverseRelation?.mapped && relation?.mapped && Math.hypot(reverseRelation.point.x-relation.point.x,reverseRelation.point.y-relation.point.y)>1 ? reverseRelation.point : undefined} comparison={overlay ? truth.layout : undefined} viewportBounds={focus} outlines title="座席報告から選んだ配置の予想と自分の席" /> : <div className={styles.empty}><ScanSearch size={30} /><span>{status}</span></div>}
      </section>
      {answer && <section className={styles.mapPanel}><div className={styles.mapTitle}><strong>先に決めた完成図</strong><Check size={18} /></div><ArenaValidationDiagram layout={truth.layout} points={samples.map(s => s.point)} chairs={truth.seats.filter((_, i) => i % 4 === 0).map(s => s.point)} self={seat ? { bounds: { ...seat.point, width: 0, height: 0 }, representative: seat.point, label: "自分の席", mappedCandidates: 1, candidateCount: 1 } : undefined} viewportBounds={answerFocus} outlines title="独立に作ったサンプルの正解配置" /></section>}
    </div>
    {!!samples.length && <label className={styles.seatLabel}><MapPin size={19} /><span>自分の席</span><select aria-label="自分の席として見る報告" value={seat ? seatKey(seat.address) : ""} onChange={e => setSeatId(e.target.value)}>{selfOptions.map(s => <option key={seatKey(s.address)} value={seatKey(s.address)}>{s.address.block} · {s.address.row}列 · {s.address.seat}番</option>)}</select></label>}
    {showPrediction && relation?.mapped && <div className={styles.relations} data-testid="pattern-seat-relation"><small>選択中の予想</small><strong>{relation.main === "センステ寄り" ? `${targetStage}寄り` : relation.main}</strong>{relation.center !== "なし" && <span>{targetStage}の{relation.center}</span>}{relation.runway === "花道の横" && <span>花道の横</span>}{agreement && selected?.top && <small data-testid="candidate-agreement">{agreement.all ? agreement.position ? "有力候補で一致" : "関係は一致・席の位置は候補別" : "別案では位置関係が変わります"}</small>}</div>}
    {reversed && <button type="button" className={styles.directionButton} onClick={() => setProposalId(reversed.id)}>番号の向き未確定 <RefreshCw size={15}/> 反転して比較</button>}
    {answer && comparisons && <div className={styles.comparison} data-testid="truth-comparison"><span>席番号の不一致 <strong>{comparisons.missing}</strong></span><span>完成図の席と舞台の重なり <strong>{comparisons.collisions}</strong></span>{relation?.mapped && seat && <span>自席のずれ <strong>{Math.round(Math.hypot(relation.point.x-seat.point.x,relation.point.y-seat.point.y)*10)/10}</strong></span>}</div>}
    {!!proposals.length && result?.state !== "no-evidence" && <label className={styles.caseLabel}>別案<select aria-label="予想の別案" value={selected?.id ?? ""} onChange={e => setProposalId(e.target.value)}>{selectorProposals.map((p, i) => <option key={p.id} value={p.id}>{p.top ? "候補" : "別案"}{i + 1} · {layoutPatterns.find(l => l.family === p.family)!.label} · {variantLabel(p.variant,p.family)} · {numberingLabels[p.numbering.kind]}{p.numbering.direction === -1 ? "（逆向き）" : ""}</option>)}</select></label>}
    <div className={styles.actions}><button type="button" onClick={() => setAnswer(!answer)} aria-pressed={answer}><Check size={17} />{answer ? "予想だけ見る" : "答え合わせ"}</button><button type="button" onClick={() => setFocused(!focused)} aria-pressed={focused} disabled={!showPrediction || !relation?.mapped}><MapPin size={17} />{focused ? "全体" : "自席周辺"}</button><button type="button" aria-label="別の座席サンプルで再検証" onClick={() => setSeed(seed + 1)}><RefreshCw size={17} /></button></div>
    <details><summary>検証条件<ChevronDown size={16} /></summary>
      <label>採番<select aria-label="サンプル生成の採番" value={numbering} onChange={e => setNumbering(e.target.value as ReferenceNumbering)}>{Object.entries(numberingLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
      <label className={styles.checkbox}><input type="checkbox" checked={history} onChange={e => setHistory(e.target.checked)} />過去の同ツアー例を参考にする（架空の資料）</label>
      <label className={styles.checkbox}><input type="checkbox" checked={reverseTruth} onChange={e => setReverseTruth(e.target.checked)} />完成図の番号を逆向きにする</label>
      <label className={styles.checkbox}><input type="checkbox" checked={overlay} onChange={e => setOverlay(e.target.checked)} />完成図を重ねる（水色の点線）</label>
      <label className={styles.checkbox}><input type="checkbox" disabled={profile !== "all"} checked={census} onChange={e => setCensus(e.target.checked)} />全数確認として判定（全席入力時のみ）</label>
      <p>見本を参考に作った合成例。追加確認0件。採番の正解と答え合わせの図は予想処理に渡していません。</p>
      <p>既定の番号向きは表示の約束で、推定結果ではありません。逆向きも成り立つ場合は両方の自席を表示。ずれの単位は検証図の座標で、メートルではありません。</p>
      {samples.length>200 && <p>自席の選択欄は先頭200席。予想と報告点には全席を使っています。</p>}
      <p>読取：{pattern.observed.join("・") || "既存の円形合成例"}<br />仮定：{pattern.assumed.join("・")}<br />未確認：{pattern.unknown.join("・")}</p>
      {agreement && <p>全有力候補の一致：メイン{agreement.main ? "○" : "—"} · センステ{agreement.center ? "○" : "—"} · 花道{agreement.runway ? "○" : "—"} · 自席座標{agreement.position ? "○" : "—"}。選択肢でまとめた寸法違いも含めて確認しています。</p>}
      {result && <p>比較{result.evaluated.length}案 · 上位{result.top.length}案 · {Math.round(result.milliseconds)}ms · seed {seed}<br />優先材料：{result.basis === "reports" ? history ? "座席報告＋参考資料" : "座席報告" : result.basis === "history" ? "参考資料（報告で区別できない案あり）" : "配置の型（区別する報告不足）"} · 入力保留{result.heldCount}件</p>}
      <button className={styles.legacy} type="button" onClick={onLegacy}>以前の円・四角の探索検証へ</button>
    </details>
    <ReferenceEvidencePanel />
  </main>;
}
