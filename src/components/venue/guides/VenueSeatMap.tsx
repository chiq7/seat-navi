"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { ChevronDown, MapPin } from "lucide-react";
import type { DedicatedVenueGuide, SeatArea, SeatGeometry } from "@/data/venueGuides/types";
import { placeMapLabels } from "@/lib/facilityMapLabels";
import { fitMapPoints, projectMapPoint, type Box } from "./mapGeometry";
import styles from "./guide.module.css";
import dynamic from "next/dynamic";
const KyoceraSeatMap = dynamic(() => import("./KyoceraSeatMap"));

type Props = { guide: DedicatedVenueGuide; selectedId: string | null; rowLabel: string | null;
  onSelect: (area: SeatArea) => void; onClear: () => void; onRow: (label: string | null) => void; children?: React.ReactNode;
  seatNumber?: string; onTicket?: (area: SeatArea, row: string, number: string) => void };

export default function VenueSeatMap(props: Props) {
  return props.guide.venueId === "kyocera-dome" && props.onTicket
    ? <KyoceraSeatMap {...props} seatNumber={props.seatNumber ?? ""} onTicket={props.onTicket} />
    : <LegacyVenueSeatMap {...props} />;
}

function LegacyVenueSeatMap({ guide, selectedId, rowLabel, onSelect, onClear, onRow, children }: Props) {
  const [type, setType] = useState(guide.seatTypes[0]);
  const [box, setBox] = useState<Box>((guide.seatMap?.initialView ?? [20, -20, 680, 440]) as Box);
  const [whole, setWhole] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [size, setSize] = useState({ width: 640, height: 450 });
  const [ready, setReady] = useState(false);
  const frame = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pointerStarts = useRef(new Map<number, { areaId: string | null }>());
  const gesture = useRef<{ box: Box; center: { x: number; y: number }; distance: number } | null>(null);
  const moved = useRef(false);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => { setSize({ width: entry.contentRect.width, height: entry.contentRect.height }); setReady(true); });
    if (frame.current) observer.observe(frame.current);
    return () => observer.disconnect();
  }, []);
  const map = guide.seatMap;
  const seats = guide.seats.filter(area => area.type === type);
  const selected = guide.seats.find(area => area.id === selectedId);
  const allBox = map?.viewBox ?? [20, -20, 680, 440];
  const geometry = (area: SeatArea): SeatGeometry => map?.groups[area.id] ?? { x: area.x, y: area.y, precision: "landmark-area", sourceIds: area.sourceIds, reference: "旧暫定配置・図形未確認" };
  const labels = useMemo(() => {
    if (whole) return [];
    const input = seats.flatMap(area => {
      const point = map?.groups[area.id] ?? area;
      const projected = projectMapPoint(point.x, point.y, box, size.width, size.height);
      if (projected.x < 0 || projected.y < 0 || projected.x > size.width || projected.y > size.height) return [];
      const short = area.label.replace("中央", "").replace("ブロック", "");
      return [{ id: area.id, kind: "facility" as const, x: projected.x, y: projected.y,
        width: short.length > 3 ? 76 : 44, height: 44 }];
    });
    return placeMapLabels(input, size.width, size.height, { facilitiesFirst: true });
  }, [seats, map, whole, box, size]);

  function choose(area: SeatArea) {
    onSelect(area); setType(area.type); setWhole(false);
    const item = geometry(area);
    setBox(fitMapPoints("blocks" in item && item.blocks?.length ? item.blocks : [item], allBox));
  }
  function changeType(next: string) {
    setType(next); onClear(); setWhole(false); setSearchOpen(false);
    const points = guide.seats.filter(area => area.type === next).flatMap<{ x: number; y: number }>(area => {
      const item = geometry(area); return "blocks" in item && item.blocks?.length ? item.blocks : [item];
    });
    setBox(fitMapPoints(points, allBox));
  }
  function showWhole() { setBox([...allBox] as Box); setWhole(true); }
  function zoom(factor: number) {
    setWhole(false);
    setBox(current => {
      const ratio = Math.max(0.2, Math.min(allBox[2] / current[2], factor));
      const width = Math.max(140, current[2] * ratio), height = Math.max(120, current[3] * ratio);
      return [current[0] + (current[2] - width) / 2, current[1] + (current[3] - height) / 2, width, height];
    });
  }
  function gesturePoints() {
    const values = [...pointers.current.values()];
    const center = { x: values.reduce((n, p) => n + p.x, 0) / values.length, y: values.reduce((n, p) => n + p.y, 0) / values.length };
    const distance = values.length > 1 ? Math.hypot(values[0].x - values[1].x, values[0].y - values[1].y) : 0;
    return { center, distance };
  }
  function start(event: PointerEvent<SVGSVGElement>) {
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const element = event.target as Element;
    pointerStarts.current.set(event.pointerId, { areaId: element.closest("[data-seat-area]")?.getAttribute("data-seat-area") ?? null });
    const points = gesturePoints(); gesture.current = { box, ...points }; moved.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function move(event: PointerEvent<SVGSVGElement>) {
    if (!pointers.current.has(event.pointerId) || !gesture.current) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const { center, distance } = gesturePoints(), current = gesture.current;
    const dx = center.x - current.center.x, dy = center.y - current.center.y;
    if (Math.hypot(dx, dy) <= 6 && pointers.current.size === 1) return;
    moved.current = true; setWhole(false);
    const scale = projectMapPoint(0, 0, current.box, size.width, size.height).scale;
    const ratio = current.distance && distance ? Math.max(.3, Math.min(3, current.distance / distance)) : 1;
    const width = Math.max(140, Math.min(allBox[2], current.box[2] * ratio));
    const height = Math.max(120, Math.min(allBox[3], current.box[3] * ratio));
    setBox([Math.max(allBox[0] - width / 2, Math.min(allBox[0] + allBox[2] - width / 2, current.box[0] - dx / scale + (current.box[2] - width) / 2)),
      Math.max(allBox[1] - height / 2, Math.min(allBox[1] + allBox[3] - height / 2, current.box[1] - dy / scale + (current.box[3] - height) / 2)), width, height]);
  }
  function end(event: PointerEvent<SVGSVGElement>) {
    const areaId = pointerStarts.current.get(event.pointerId)?.areaId;
    const shouldSelect = event.type === "pointerup" && pointers.current.size === 1 && !moved.current && areaId;
    pointers.current.delete(event.pointerId);
    pointerStarts.current.delete(event.pointerId);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    gesture.current = pointers.current.size ? { box, ...gesturePoints() } : null;
    if (shouldSelect) { const area = guide.seats.find(item => item.id === areaId); if (area) choose(area); }
  }
  const accessibleVisible = (area: SeatArea) => {
    const point = geometry(area), projected = projectMapPoint(point.x, point.y, box, size.width, size.height);
    return projected.x >= 0 && projected.y >= 0 && projected.x <= size.width && projected.y <= size.height;
  };
  return <div className={styles.seatShell}>
    <div className={styles.seatControls}>
      <div className={styles.controls} role="group" aria-label="席の種類">{guide.seatTypes.map(value => <button key={value} aria-pressed={type === value} onClick={() => changeType(value)}><i aria-hidden="true" />{value}</button>)}</div>
      <div className={styles.mapTools}><button onClick={showWhole}>全体を見る</button><div className={styles.zoom} aria-label="座席図の拡大縮小"><button aria-label="座席図を縮小" onClick={() => zoom(1.28)}>−</button><button aria-label="座席図を拡大" onClick={() => zoom(.78)}>＋</button></div></div>
      <button className={styles.shortcut} aria-expanded={searchOpen} onClick={() => setSearchOpen(!searchOpen)}><MapPin size={15} />区画名で選ぶ<ChevronDown size={14} /></button>
      {searchOpen && <label className={styles.compactSearch}>区画<select aria-label="区画名" value={selectedId ?? ""} onChange={event => { const area = seats.find(item => item.id === event.target.value); if (area) choose(area); }}><option value="">選んでください</option>{seats.map(area => <option key={area.id} value={area.id}>{area.label}</option>)}</select></label>}
    </div>
    {selected && <div className={styles.selection} aria-live="polite"><strong>{selected.label}・{selected.type}{rowLabel ? `・${rowLabel}列` : ""}</strong>
      <label>列<select aria-label="列を選ぶ" value={rowLabel ?? ""} onChange={event => onRow(event.target.value || null)}><option value="">列を選ぶ</option>{selected.rows.map(row => <option key={row.label} value={row.label}>{row.label}列</option>)}</select></label><button onClick={onClear}>選択を解除</button>{children}</div>}
    {seats.length ? <div ref={frame} className={styles.seatCanvas} data-testid="seat-map" data-ready={ready}>
      <svg viewBox={box.join(" ")} aria-label={`${guide.name}の座席図`} role="group" onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end}>
        {seats.map(area => {
          const item = geometry(area), active = selectedId === area.id;
          return <g key={area.id} data-seat-area={area.id}>
            {"path" in item && item.path && <path d={item.path} fill={active ? "#a93164" : area.type === "BOX" ? "#bd9bc7" : "#e7b8cb"} stroke="white" strokeWidth="3" role={whole ? "button" : undefined} tabIndex={whole && accessibleVisible(area) ? 0 : -1} aria-label={whole ? `${area.label}を選ぶ` : undefined} aria-pressed={whole ? active : undefined}
              onClick={() => { if (!moved.current) choose(area); }} onKeyDown={event => { if (["Enter", " "].includes(event.key)) { event.preventDefault(); choose(area); } }} />}
            {!item.path && "blocks" in item && item.blocks?.map(point => <circle key={point.code} cx={point.x} cy={point.y} r={active ? 9 : 6} fill={active ? "#a93164" : "#b99cae"} />)}
            {selectedId === area.id && rowLabel && "rowPaths" in item && item.rowPaths?.[rowLabel]?.map((path, i) => <path key={i} d={path} stroke="#a93164" strokeWidth="4" fill="none" />)}
          </g>;
        })}
      </svg>
      {!whole && <svg className={styles.leaders} viewBox={`0 0 ${size.width} ${size.height}`} aria-hidden="true">{labels.map(label => <line key={label.id} x1={label.x} y1={label.y} x2={label.left} y2={label.top} stroke="#b596a7" strokeWidth="1" />)}</svg>}
      {labels.map(label => { const area = seats.find(item => item.id === label.id)!; return <button key={label.id} data-map-label={area.id} aria-label={`${area.label}を選ぶ`} aria-pressed={selectedId === area.id}
        className={styles.seatLabel} style={{ left: label.left, top: label.top, width: label.width, height: label.height }} onClick={() => choose(area)}>{area.label.replace("中央", "").replace("ブロック", "")}</button>; })}
    </div> : <p className={styles.empty}>公演ごとの配置を確認してください。この種類の区画・列は未対応です。</p>}
    {rowLabel && selected && !geometry(selected).rowPaths?.[rowLabel]?.length && <p className={styles.mapStatus}>列番号は確認済みです。列線の図上位置は確認中です。</p>}
    {guide.venueId === "kyocera-dome" && seats.length > 0 && <p className={styles.mapStatus}>公式内部ブロックの境界を検索グループごとに表示しています。個別の列線・席位置は確認中です。</p>}
  </div>;
}
