"use client";

import { useState } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import { structuralReferences, txtPartialReferences } from "@/lib/arena-map/referenceEvidenceV5";
import { ArenaValidationDiagram } from "./ArenaValidationDiagram";
import styles from "./reference-validation.module.css";

export function ReferenceEvidencePanel() {
  const [open, setOpen] = useState(false), [id, setId] = useState("baby");
  const item = structuralReferences.find(r => r.id === id)!;
  return <details onToggle={e => setOpen(e.currentTarget.open)}><summary>実資料と見比べる<ChevronDown size={16} /></summary>{open && <>
    <label className={styles.caseLabel}>資料<select value={id} onChange={e => setId(e.target.value)} aria-label="比較する実資料">{structuralReferences.map(r => <option value={r.id} key={r.id}>{r.label}</option>)}</select></label>
    <strong className={styles.sourceKind}>{item.kind}</strong>
    <div className={styles.sourceGrid}>{item.images.map(image => <figure key={image.id}><figcaption>{image.label}</figcaption>
      {/* Local-only allowlisted reference endpoint; no original images are published. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/preview/arena-layout/verification/reference-image?id=${image.id}`} alt={`${item.label}の${image.label}`} loading="lazy" />
    </figure>)}</div>
    {item.id !== "le" && <figure className={styles.sourceModel}><figcaption>{item.id === "skz" ? "舞台の接続モデル・区画は仮定" : "読めた構造の転記"}</figcaption><ArenaValidationDiagram layout={item.createLayout()} points={[]} outlines title={`${item.label}の粗い構造転記（座席番号・実寸は未設定）`} /></figure>}
    <p>{item.read.join("／")}</p><p>反映：{item.effect}<br />未測定：{item.unknown.join("・")}</p>
    <a className={styles.sourceLink} href={item.source} target="_blank" rel="noreferrer">原投稿<ExternalLink size={14} /></a>
    {item.id === "txt" && <details><summary>個別情報15件<ChevronDown size={16} /></summary><p>受領した調査メモ。点の報告への変換・本編とサウチェの統合はしていません。</p><ol className={styles.partialList}>{txtPartialReferences.map(r => <li key={r.id}><a href={r.url} target="_blank" rel="noreferrer">{r.id}</a><small>{r.date ?? "日付不明"} · {r.phase === "soundcheck" ? "サウチェ" : r.phase === "main" ? "本編として受領" : "種別未確定"}</small><span>{r.raw}</span></li>)}</ol></details>}
  </>}</details>;
}
