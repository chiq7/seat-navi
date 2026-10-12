import type { GuideDiagram, GuideFacility } from "@/data/venueGuides/types";
import type { ReactNode } from "react";
import tokyo from "../TokyoDomeFacilityMap.module.css";
import styles from "./DomeGuideLayout.module.css";

export function DomeFloorPicker({ diagrams, items, floor, onFloor, children }: {
  diagrams: GuideDiagram[]; items: GuideFacility[]; floor: string; onFloor: (floor: string) => void;
  children?: ReactNode;
}) {
  return <div className={`${tokyo.root} ${styles.floorPicker}`} data-testid="dome-floor-picker">
    <header className={tokyo.heading}><div><strong>{floor === "すべて" ? "フロアから探す" : `${floor} フロアガイド`}</strong>
      <small>下段は3F・上段は5F。掲載された階の設備を確認</small></div></header>
    <div className={tokyo.floorPicker} role="group" aria-label="フロアを選ぶ">
      <button aria-pressed={floor === "すべて"} onClick={() => onFloor("すべて")}>全階</button>
      {diagrams.map(diagram => <button key={diagram.id} aria-pressed={floor === diagram.floor} onClick={() => onFloor(diagram.floor)}><strong>{diagram.floor}</strong><small>{diagram.floor === "3F" ? "下段" : "上段"}</small></button>)}
    </div>
    {floor === "すべて" && <div className={tokyo.overview}>{diagrams.map(diagram => {
      const points = items.filter(item => item.anchor?.diagramId === diagram.id);
      return <button key={diagram.id} className={tokyo.tile} aria-label={`${diagram.floor}の設備図を開く`} onClick={() => onFloor(diagram.floor)}>
        <strong>{diagram.floor}</strong><small>{diagram.floor === "3F" ? "下段の設備" : "上段の設備"}</small>
        <svg className={styles.thumbnail} viewBox={diagram.viewBox.join(" ")} aria-hidden="true">
          {diagram.contextPaths.map((d, i) => <path key={`c${i}`} d={d} fill="#f5edf2" stroke="#d4beca" />)}
          {diagram.concoursePaths.map((d, i) => <path key={`p${i}`} d={d} fill="#fff" stroke="#b68da2" />)}
          {points.map(item => <circle key={item.id} cx={item.anchor!.x} cy={item.anchor!.y} r={Math.max(diagram.viewBox[2], diagram.viewBox[3]) / 125} fill="#a93164" />)}
        </svg><span className={tokyo.tileCounts}>掲載設備 {points.length}件</span>
      </button>;
    })}</div>}
    {floor !== "すべて" && children}
    <p className={styles.floorNote}>設備の位置と当日の利用可否は別です。図上位置未確認の案内は、一覧の記述で確認してください。</p>
  </div>;
}
