"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Download, Eye, EyeOff, Shuffle, ShieldCheck } from "lucide-react";
import { exportMapImageAsPng } from "@/lib/arena-map/exportMapImage";
import { nextPhraseIndex, publicResultCard, RESULT_CARD_SAMPLES, RESULT_PHRASES, resultPhraseKind, type PublicResultCard } from "@/lib/resultCard";
import styles from "./ResultCardPreview.module.css";

type SampleKind = keyof typeof RESULT_CARD_SAMPLES;
export { ResultCardImage } from "./ResultCardImage";
import { ResultCardImage } from "./ResultCardImage";

export default function ResultCardPreview() {
  const [kind, setKind] = useState<SampleKind>("won");
  const [draft, setDraft] = useState<PublicResultCard>(RESULT_CARD_SAMPLES.won);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [showPhrase, setShowPhrase] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const svgRef = useRef<SVGSVGElement>(null);
  const card = publicResultCard(draft);
  const pool = RESULT_PHRASES[resultPhraseKind(card, kind === "seat")];
  const phrase = pool[phraseIndex % pool.length];

  function selectKind(value: SampleKind) {
    setKind(value); setDraft(RESULT_CARD_SAMPLES[value]); setPhraseIndex(0); setStatus("");
  }
  function updateDraft(next: PublicResultCard) { setDraft(next); setPhraseIndex(0); setStatus(""); }
  async function saveImage() {
    if (!svgRef.current || saving) return;
    setSaving(true); setStatus("");
    try {
      await document.fonts.ready;
      await exportMapImageAsPng(svgRef.current, { scale: 2, filename: `tixrepo-SAMPLE-${kind}.png` });
      setStatus("画像を保存しました。Xで画像を添付して使えます。");
    } catch { setStatus("保存できませんでした。もう一度お試しください。"); }
    finally { setSaving(false); }
  }
  return <main className={styles.page}><div className={styles.shell}>
    <header className={styles.header}><span className={styles.brand}>ちけレポ</span><span className={styles.previewLabel}>完了画面の試作</span></header>
    <h1 className={styles.title}>あなたの結果、できました。</h1>
    <div className={styles.switcher} role="group" aria-label="サンプルの種類">
      {([["seat", "当選"], ["won", "苦戦後の当選"], ["lost", "落選"]] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={kind === value} onClick={() => selectKind(value)} disabled={saving}>{label}</button>)}
    </div>
    <div className={styles.cardFrame}><ResultCardImage card={card} phrase={showPhrase ? phrase : null} svgRef={svgRef} /></div>
    <div className={styles.copyTools}>
      <button type="button" disabled={saving} onClick={() => { setPhraseIndex(nextPhraseIndex(pool.length, phraseIndex)); setShowPhrase(true); setStatus(""); }}><Shuffle size={17} aria-hidden="true" />別のひとこと</button>
      <button type="button" disabled={saving} aria-pressed={!showPhrase} aria-label={showPhrase ? "ひとことを隠す" : "ひとことを表示"} onClick={() => { setShowPhrase(!showPhrase); setStatus(""); }}>{showPhrase ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}{showPhrase ? "隠す" : "表示"}</button>
    </div>
    <button type="button" className={styles.save} onClick={saveImage} disabled={saving}><Download size={19} aria-hidden="true" />{saving ? "画像を作成中…" : "画像を保存"}</button>
    <p className={styles.privacy}><ShieldCheck size={15} aria-hidden="true" />列・席番号は画像に出ません</p>
    <p role="status" className={styles.status}>{status}</p>
    <details className={styles.notes}><summary>サンプルを変更</summary><fieldset disabled={saving} className={styles.editor}>
      <label>アーティスト<input maxLength={32} value={draft.artist} onChange={e => updateDraft({ ...draft, artist: e.target.value })} /></label>
      <label>会場<input maxLength={22} value={draft.venue} onChange={e => updateDraft({ ...draft, venue: e.target.value })} /></label>
      <label>公演日<input type="date" value={draft.dateLabel.replaceAll(".", "-")} onChange={e => updateDraft({ ...draft, dateLabel: e.target.value.replaceAll("-", ".") })} /></label>
      <label>抽選種別<input maxLength={22} value={draft.lotteryLabel ?? ""} onChange={e => updateDraft({ ...draft, lotteryLabel: e.target.value })} /></label>
      {kind === "lost" ? <label>今回で何連続落選？<input type="number" min="1" max="999" value={draft.lossStreak ?? ""} onChange={e => updateDraft({ ...draft, lossStreak: e.target.value ? Number(e.target.value) : undefined })} /></label> : <>
        <label>座席エリア<select value={draft.seat?.area} onChange={e => updateDraft({ ...draft, seat: { area: e.target.value, block: draft.seat?.block ?? "A", layout: draft.seat?.layout ?? "unverified" } })}><option>アリーナ</option><option>スタンド</option></select></label>
        <label>ブロック<select value={draft.seat?.block} onChange={e => updateDraft({ ...draft, seat: { area: draft.seat?.area ?? "アリーナ", block: e.target.value, layout: draft.seat?.layout ?? "unverified" } })}>{["A", "B", "C", "D", "E", "F"].map(b => <option key={b}>{b}</option>)}</select></label>
        <label>位置図<select value={draft.seat?.layout} onChange={e => updateDraft({ ...draft, seat: { area: draft.seat?.area ?? "アリーナ", block: draft.seat?.block ?? "A", layout: e.target.value as "sample" | "unverified" } })}><option value="sample">架空配置で試す</option><option value="unverified">配置未確認</option></select></label>
        {kind === "won" && <label>当選前の連続落選数<input type="number" min="0" max="999" value={draft.previousLosses ?? ""} onChange={e => updateDraft({ ...draft, previousLosses: e.target.value ? Number(e.target.value) : undefined })} /></label>}
      </>}
    </fieldset></details>
    <p className={styles.disclaimer}>架空の結果・配置による試作です。投稿・集計はされません。</p>
    <Link href="/preview/result-completion" className="mt-4 flex min-h-11 items-center justify-center rounded-lg border border-[#d62a6b] text-sm font-bold text-[#b72359]">投稿後の保存・共有を試す →</Link>
  </div></main>;
}
