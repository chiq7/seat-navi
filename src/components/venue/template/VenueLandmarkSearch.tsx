"use client";

import { useState, type FormEvent } from "react";
import styles from "./VenueFacilityFinder.module.css";
import { searchVenueLandmarks, type SearchLandmark } from "@/lib/venueLandmarkSearch";

type Landmark = SearchLandmark;
export default function VenueLandmarkSearch({ landmarks, onShow }: { landmarks: Landmark[]; onShow: (id: string) => void }) {
  const [kind, setKind] = useState<Landmark["kind"]>("passage");
  const [number, setNumber] = useState("");
  const [error, setError] = useState("");
  const [matches, setMatches] = useState<Landmark[]>([]);
  const active = landmarks.some(mark => mark.kind === kind) ? kind : kind === "gate" ? "passage" : "gate";
  const available = landmarks.some(mark => mark.kind === active);
  function submit(event: FormEvent) {
    event.preventDefault();
    const found = searchVenueLandmarks(landmarks, active, number);
    setMatches(found.length > 1 ? found : []);
    if (!found.length) { setError("名前・番号と階を確認してください。"); return; }
    setError(""); if (found.length === 1) onShow(found[0].id);
  }
  return <div className={styles.numberControl}><form className={styles.numberForm} onSubmit={submit} aria-label="通路・ゲートを探す">
    <div className={styles.buttons} role="group" aria-label="番号の種類">{(["passage", "gate"] as const).map(value => <button key={value} type="button" disabled={!landmarks.some(mark => mark.kind === value)} aria-pressed={available && active === value} onClick={() => { setKind(value); setError(""); setMatches([]); }}>{value === "passage" ? "通路" : "ゲート"}</button>)}</div>
    <input aria-label="通路・ゲートの番号" placeholder="名前・番号" value={number} disabled={!available} required onChange={event => { setNumber(event.target.value); setError(""); setMatches([]); }}/>
    <button type="submit" disabled={!available}>表示</button>
  </form>{error && <p className={styles.error} role="alert">{error}</p>}{matches.length > 1 && <div className={styles.buttons} aria-label="目印の候補">{matches.map(mark => <button key={mark.id} type="button" onClick={() => { setMatches([]); onShow(mark.id); }}>{mark.name ?? mark.label}</button>)}</div>}</div>;
}
