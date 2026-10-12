"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState, useId, type PointerEvent } from "react";
import { Crosshair, X } from "lucide-react";
import { DomeSeatFrame } from "./DomeSeatFrame";
import { boundsOf, edgeNumberGuide, clampCamera, detailBox, isSeatTap, labelCoversOtherBlock, mapProjection, normalizeSeatInput, placeRowLabel, searchStandSeats, standBlockLabel, standDisplayRows, standLabelOrder, youngEdgeMidpoint, zoomCamera, zoneLabelPositions, type MapBox, type Point, type StandBlock, type StandMapData, type StandPosition } from "./standMap";
import styles from "./StandSeatMap.module.css";

type Choice = { id: string; label: string; color: string; point: Point };
type Props = { data: StandMapData; levels: Choice[]; areas: { id: string; label: string }[]; onEquipment: (floor: string | null) => void };
export type StandSeatMapHandle = { showRegion: (level: string, area: string) => void };
type Gesture = { points: Map<number, Point>; start: Point; last: Point; travel: number; multi: boolean; block: string | null; distance: number };
const freshGesture = (): Gesture => ({ points: new Map(), start: [0, 0], last: [0, 0], travel: 0, multi: false, block: null, distance: 0 });
const rowSummary = (block: StandBlock) => {
  const rows = standDisplayRows(block);
  return block.rowNameLookup === "unavailable" ? "列名は公式図に未掲載" : rows.length === 1 ? `${rows[0].label}列` : rows.length ? `${rows[0].label}〜${rows.at(-1)!.label}列` : "区画で探す";
};

const StandSeatMap = forwardRef<StandSeatMapHandle, Props>(function StandSeatMap({ data, levels, areas, onEquipment }, ref) {
  const [level, setLevel] = useState("all"), [area, setArea] = useState("all");
  const [row, setRow] = useState(""), [number, setNumber] = useState("");
  const [selected, setSelected] = useState<string | null>(null), [focused, setFocused] = useState(data.blocks[0].id);
  const [zone, setZone] = useState<string | null>(null);
  const [matches, setMatches] = useState<StandBlock[]>([]), [error, setError] = useState("");
  const [position, setPosition] = useState<StandPosition | null>(null);
  const [view, setView] = useState<MapBox>(data.viewBox as MapBox), [size, setSize] = useState({ width: 900, height: 620 });
  const [pulse, setPulse] = useState(false);
  const stage = useRef<HTMLDivElement>(null), svg = useRef<SVGSVGElement>(null), frame = useRef<number | null>(null);
  const camera = useRef(view), gesture = useRef(freshGesture()), interacted = useRef(false);
  const uid = useId().replace(/:/g, ""), instructionId = `${uid}-keys`;
  const block = data.blocks.find(b => b.id === selected);
  const projection = mapProjection(view, size.width, size.height);
  // A direction narrows the camera and ticket search, not the neighbouring map labels.
  const shown = data.blocks.filter(b => level === "all" || b.level === level);
  const availableAreas = areas.filter(a => a.id === "all" || data.blocks.some(b => b.area === a.id && (level === "all" || b.level === level)));
  const blockOnlySearch = data.blocks.every(b => b.numberLookup === "unavailable");
  const whole = !selected && !zone && level === "all" && area === "all" && view[2] >= data.viewBox[2] * .9;
  const wholeNumbers = whole && data.wholeStartNumbers !== false && !data.wholeBlockLabels && data.blocks.some(b => b.label.includes("番"));

  function stop() { if (frame.current !== null) cancelAnimationFrame(frame.current); frame.current = null; }
  function interaction() { interacted.current = true; setPulse(false); stop(); }
  function renderCamera(next: MapBox) { camera.current = next; setView(next); }
  function move(next: MapBox, animate = true) {
    stop(); const target = clampCamera(next, data.viewBox, data.detailSpan * .45);
    if (!animate || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { renderCamera(target); return; }
    const from = [...camera.current] as MapBox, start = performance.now();
    function tick(now: number) {
      const progress = Math.min(1, (now - start) / 220), eased = 1 - (1 - progress) ** 3;
      renderCamera(from.map((n, i) => n + (target[i] - n) * eased) as MapBox);
      if (progress < 1) frame.current = requestAnimationFrame(tick); else frame.current = null;
    }
    frame.current = requestAnimationFrame(tick);
  }
  function clearResult() { setSelected(null); setMatches([]); setError(""); setPosition(null); }
  function reset() { interaction(); clearResult(); setZone(null); setLevel("all"); setArea("all"); move(data.viewBox as MapBox); }
  function chooseRegion(nextLevel: string, nextArea: string) {
    interaction(); clearResult(); setZone(null); setLevel(nextLevel); setArea(nextArea);
    const targets = data.blocks.filter(b => (nextLevel === "all" || b.level === nextLevel) && (nextArea === "all" || b.area === nextArea));
    if (!targets.length) { setError("この席種にはその区画がありません。席種を「すべて」に戻して探せます。"); return; }
    const next = data.regionViews?.[`${nextLevel}:${nextArea}`] as MapBox | undefined ?? (nextLevel === "all" && nextArea === "all" ? data.viewBox as MapBox
      : nextLevel === "all" && data.areaViews?.[nextArea] ? data.areaViews[nextArea] as MapBox
      : nextArea === "all" && data.levelViews?.[nextLevel] ? data.levelViews[nextLevel] as MapBox : boundsOf(targets));
    move(next);
    const center: Point = [next[0] + next[2] / 2, next[1] + next[3] / 2];
    setFocused([...targets].sort((a, b) => Math.hypot(a.center[0] - center[0], a.center[1] - center[1]) - Math.hypot(b.center[0] - center[0], b.center[1] - center[1]))[0].id);
  }
  useImperativeHandle(ref, () => ({ showRegion: chooseRegion }));
  function chooseZone(id: string) {
    const target = data.zones?.find(z => z.id === id); if (!target) return;
    interaction(); clearResult(); setZone(id); setLevel(target.level); setArea(target.area);
    const members = data.blocks.filter(b => target.blockIds.includes(b.id));
    move(target.viewBox ? target.viewBox as MapBox : boundsOf(members, 72)); setFocused(members[0].id);
  }
  function select(b: StandBlock, recenter = false) {
    interaction(); setSelected(b.id); setZone(b.zone ?? null); setFocused(b.id); setLevel(b.level); setArea(b.area); setMatches([]); setError(""); setPosition(null);
    if (!selected || recenter) move(detailBox(b, data.detailSpan));
  }
  function search(event: React.FormEvent) {
    event.preventDefault(); interaction();
    const result = searchStandSeats(data, level, area, row, number, zone);
    if (result.zone) { chooseZone(result.zone.id); return; }
    if (result.position) {
      const p = result.position; clearResult(); setPosition(p); setLevel(p.level); setArea("all"); setZone(null);
      move([p.point[0]-p.span/2,p.point[1]-p.span/2,p.span,p.span]); return;
    }
    setPosition(null);
    setError(result.error); setMatches(result.matches.length > 1 ? result.matches : []);
    if (result.matches.length === 1) select(result.matches[0], true);
    else setSelected(null);
  }
  function zoom(factor: number) {
    interaction(); const c = camera.current;
    move(zoomCamera(c, factor, [c[0] + c[2] / 2, c[1] + c[3] / 2]));
  }
  function point(event: { clientX: number; clientY: number }) {
    const rect = stage.current!.getBoundingClientRect(); return [event.clientX - rect.left, event.clientY - rect.top];
  }
  function down(event: PointerEvent<SVGSVGElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault(); interaction();
    const g = gesture.current, p = point(event);
    g.points.set(event.pointerId, p); event.currentTarget.setPointerCapture(event.pointerId);
    if (g.points.size === 1) { g.start = p; g.last = p; g.travel = 0; g.block = (event.target as Element).closest("[data-block-id]")?.getAttribute("data-block-id") ?? null; }
    if (g.points.size > 1) { g.multi = true; const [a, b] = [...g.points.values()]; g.distance = Math.hypot(a[0] - b[0], a[1] - b[1]); g.last = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; }
  }
  function drag(event: PointerEvent<SVGSVGElement>) {
    const g = gesture.current; if (!g.points.has(event.pointerId)) return;
    const p = point(event); g.points.set(event.pointerId, p);
    g.travel = Math.max(g.travel, Math.hypot(p[0] - g.start[0], p[1] - g.start[1]));
    const c = camera.current, currentProjection = mapProjection(c, size.width, size.height);
    if (g.points.size > 1) {
      const [a, b] = [...g.points.values()], middle = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      const distance = Math.max(1, Math.hypot(a[0] - b[0], a[1] - b[1]));
      const next = zoomCamera(c, g.distance / distance, currentProjection.unproject(g.last));
      const scale = mapProjection(next, size.width, size.height).scale;
      move([next[0] - (middle[0] - g.last[0]) / scale, next[1] - (middle[1] - g.last[1]) / scale, next[2], next[3]], false);
      g.distance = distance; g.last = middle;
    } else if (g.travel > 6) {
      move([c[0] - (p[0] - g.last[0]) / currentProjection.scale, c[1] - (p[1] - g.last[1]) / currentProjection.scale, c[2], c[3]], false); g.last = p;
    }
  }
  function up(event: PointerEvent<SVGSVGElement>) {
    const g = gesture.current; if (!g.points.has(event.pointerId)) return;
    const p = point(event); g.travel = Math.max(g.travel, Math.hypot(p[0] - g.start[0], p[1] - g.start[1]));
    g.points.delete(event.pointerId);
    if (g.points.size) { g.last = [...g.points.values()][0]; return; }
    const id = g.block, tap = isSeatTap(g.travel, g.multi); gesture.current = freshGesture();
    if (tap && id) { const target = data.blocks.find(b => b.id === id); if (target) select(target); }
  }
  useEffect(() => {
    const el = stage.current!;
    const resize = new ResizeObserver(entries => { const { width, height } = entries[0].contentRect; setSize({ width, height }); });
    resize.observe(el);
    const observer = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) { if (!interacted.current) setPulse(true); observer.disconnect(); } }, { threshold: .2 });
    observer.observe(el);
    const cancel = () => { gesture.current = freshGesture(); };
    window.addEventListener("blur", cancel); document.addEventListener("visibilitychange", cancel);
    return () => { resize.disconnect(); observer.disconnect(); stop(); window.removeEventListener("blur", cancel); document.removeEventListener("visibilitychange", cancel); };
  }, []);
  useEffect(() => {
    const el = svg.current!;
    const wheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault(); interaction(); const c = camera.current;
      move(zoomCamera(c, Math.exp(Math.max(-100, Math.min(100, event.deltaY)) * .004), mapProjection(c, size.width, size.height).unproject(point(event))), false);
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
    // Camera is read from the ref so wheel never uses an animation's stale frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.width, size.height, data]);

  // Floor buttons above the map remain available; whole-map numbers take priority over duplicate floor tags.
  const levelTags = whole && !wholeNumbers && !data.zones ? levels.filter(l => !data.wholeBlockLabels || data.blocks.filter(b => b.level === l.id).length === 1) : [];
  const zoneTags = whole ? (data.zones ?? []).filter(z => !z.hideOnWhole) : [];
  const areaTags = whole ? data.overviewAreas ?? [] : [];
  const zonePositions = zoneLabelPositions(zoneTags, view, size.width, size.height);
  const areaPositions = new Map(areaTags.map(a => {
    const p = projection.project(a.point);
    return [a.id, [Math.max(22, Math.min(size.width - 22, p[0])), Math.max(22, Math.min(size.height - 22, p[1]))]];
  }));
  const occupied = [...levelTags.map(l => { const p = projection.project(l.point); return [p[0], p[1], Math.max(64, l.label.length * 14 + 28), 44]; }), ...zoneTags.map(z => { const p = zonePositions.get(z.id)!; return [p[0], p[1], 44, 44]; })];
  occupied.push(...areaTags.map(a => { const p = areaPositions.get(a.id)!; return [p[0], p[1], 44, 44]; }));
  occupied.push([size.width - 50, size.height - 34, 76, 44]);
  const labels: { id: string; text: string; x: number; y: number; width: number; height: number; kind: "row" | "number" | "block"; selected: boolean; anchor?: Point }[] = [];
  const blockCenters = shown.flatMap(b => [b.center, ...(b.labelAvoidancePoints ?? [])].map(point => ({ id: b.id, point: projection.project(point) })));
  function addLabel(id: string, text: string, position: Point, important = false, width?: number) {
    const kind = id === "first-row" || id === "last-row" ? "row" : text.includes("番") ? "number" : "block";
    const fontSize = important ? 14 : 12;
    const textWidth = [...text].reduce((sum, char) => sum + fontSize * (char.charCodeAt(0) < 128 ? .6 : 1), 0);
    const w = width ?? Math.max(important || text.length > 2 ? 48 : 32, textWidth + 14), h = wholeNumbers && kind === "number" ? 22 : kind === "block" ? 26 : 28;
    const offsets = important || wholeNumbers ? [[0, 0]] : [[0, 0], [-12, 12], [12, 12], [-12, -12], [12, -12], [0, 28], [0, -28]];
    for (const [dx, dy] of offsets) {
      const x = position[0] + dx, y = position[1] + dy;
      if (x < w / 2 + 2 || x > size.width - w / 2 - 2 || y < h / 2 + 3 || y > size.height - h / 2 - 3) continue;
      if (!important && !whole && labelCoversOtherBlock(id, [x, y], w, h, blockCenters)) continue;
      if (!important && occupied.some(r => Math.abs(x - r[0]) < (w + r[2]) / 2 + 4 && Math.abs(y - r[1]) < (h + r[3]) / 2 + 3)) continue;
      occupied.push([x, y, w, h]); labels.push({ id, text, x, y, width: w, height: h, kind, selected: important, anchor: dx || dy ? position : undefined }); return;
    }
  }
  let arrow: { start: Point; end: Point } | null = null;
  const rowStems: { a: Point; b: Point }[] = [];
  const displayRows = block ? standDisplayRows(block) : [];
  if (block && !displayRows.length) addLabel("selected-block", block.label, projection.project(block.center), true);
  if (block && displayRows.length) {
    const first = displayRows[0], lastRow = displayRows.at(-1)!;
    const last = block.referenceRows?.some(row => row.label === lastRow.label)
      ? lastRow : block.rows.length ? block.rowEdges?.last ?? block.rows.at(-1)!.segments.at(-1)! : lastRow;
    const a = projection.project(first.a), b = projection.project(first.b), la = projection.project(last.a), lb = projection.project(last.b);
    const fm = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], lm = [(la[0] + lb[0]) / 2, (la[1] + lb[1]) / 2];
    const depth = Math.hypot(lm[0] - fm[0], lm[1] - fm[1]);
    const tangent = Math.max(1, Math.hypot(b[0] - a[0], b[1] - a[1]));
    const dx = depth > 1 ? (lm[0] - fm[0]) / depth : -(b[1] - a[1]) / tangent;
    const dy = depth > 1 ? (lm[1] - fm[1]) / depth : (b[0] - a[0]) / tangent;
    const rowObstacles: number[][] = [];
    const reference = block.numberReference;
    if (reference) {
      const young = projection.project(reference.young), old = projection.project(reference.older);
      const numberText = `${block.numberPrefix ?? ""}${reference.start}`;
      const labelWidth = Math.max(48, numberText.length * 8 + 28);
      const guide = edgeNumberGuide(projection.project(youngEdgeMidpoint(block)), young, old, labelWidth);
      addLabel("start-number", `${numberText}番`, guide.number, true, labelWidth);
      rowObstacles.push([...guide.number, labelWidth, 28]);
      if (labels.some(l => l.id === "start-number")) arrow = guide.arrow;
      if (arrow) rowObstacles.push([(arrow.start[0] + arrow.end[0]) / 2, (arrow.start[1] + arrow.end[1]) / 2, Math.abs(arrow.end[0] - arrow.start[0]) + 8, Math.abs(arrow.end[1] - arrow.start[1]) + 8]);
    }
    if (block.rowNameLookup !== "unavailable") {
      const firstOffset = displayRows.length === 1 ? 44 : 21;
      for (const [id, row, point, direction] of [
        ["first-row", displayRows[0], [fm[0] - dx * firstOffset, fm[1] - dy * firstOffset], [-dx, -dy]],
        ...(lastRow !== displayRows[0] ? [["last-row", lastRow, [lm[0] + dx * 21, lm[1] + dy * 21], [dx, dy]] as const] : []),
      ] as const) {
        const text = `${row.label}列`;
        const width = Math.max(48, [...text].reduce((sum, char) => sum + 14 * (char.charCodeAt(0) < 128 ? .6 : 1), 0) + 14);
        const placed = placeRowLabel(point, direction, width, rowObstacles);
        addLabel(id, text, placed, true, width);
        rowObstacles.push([...placed, width, 28]);
      }
    }
    for (const [id, anchor] of [["first-row", fm], ["last-row", lm]] as const) {
      const label = labels.find(l => l.id === id);
      if (label) rowStems.push({ a: anchor, b: [label.x, label.y] });
    }
  }
  if ((!whole || data.wholeBlockLabels || wholeNumbers) && !(whole && data.zones)) for (const b of standLabelOrder(shown, block)) {
    if (b.id === selected) continue;
    if (whole && data.blocks.filter(o => o.level === b.level).length === 1) continue;
    if (wholeNumbers && b.label.includes("番") && b.numberReference) {
      const text = `${b.numberReference.start}番`;
      addLabel(b.id, text, projection.project(b.center), false, Math.max(34, `${b.numberReference.start}`.length * 7 + 22));
    } else addLabel(b.id, standBlockLabel(data, b), projection.project(b.center));
  }
  const focusable = shown.filter(b => { const p = projection.project(b.center); return p[0] > 0 && p[0] < size.width && p[1] > 0 && p[1] < size.height; });
  return <DomeSeatFrame className={data.levelViews ? styles.levelControls : undefined} levels={[{ id: "all", label: "すべて" }, ...levels]} level={level} onLevel={id => chooseRegion(id, "all")}
    directions={availableAreas} direction={area} onDirection={id => chooseRegion(level, id)} onZoom={zoom} onWhole={reset} shortcuts={[]}
    directionExtra={<form className={styles.search} onSubmit={search} aria-label="チケットの座席で検索">
      <label><span>列</span><input value={row} disabled={blockOnlySearch} onChange={e => setRow(e.target.value)} placeholder={blockOnlySearch ? "検索準備中" : data.rowSearchPlaceholder ?? "例：12"} aria-label="列" /></label>
      <label><span>{blockOnlySearch ? "区画名" : "番号・区画"}</span><input value={number} onChange={e => setNumber(e.target.value)} placeholder={data.searchPlaceholder ?? (blockOnlySearch ? "例：A / 北" : "例：79")} aria-label={blockOnlySearch ? "区画名" : "番号"} /></label>
      <button type="submit">場所を見る</button>
    </form>}>
    {(error || matches.length > 0) && <div className={styles.message} role="status">{error || "席種・列を選ぶか、該当する範囲を選んでください。"}
      {matches.map(b => <button key={b.id} type="button" onClick={() => select(b, true)}>{levels.find(l => l.id === b.level)?.label ?? b.level}{b.balcony && !levels.find(l => l.id === b.level)?.label.includes("バルコニー") ? " バルコニー" : ""}・{rowSummary(b)}・{b.label}</button>)}
      {error && <button type="button" onClick={reset}>条件を解除</button>}
    </div>}
    <div className={styles.selection} aria-live="polite"><div>{block ? <><strong>{levels.find(l => l.id === block.level)?.label ?? block.level}{block.balcony && !levels.find(l => l.id === block.level)?.label.includes("バルコニー") ? "・バルコニー" : ""}　{block.label}</strong><span>{rowSummary(block)}</span></> : <span>{zone ? data.zones?.find(z => z.id === zone)?.label ?? zone : level === "all" ? "座席の全体図" : levels.find(l => l.id === level)?.label ?? level}</span>}</div>
      <button type="button" disabled={!block} aria-label="選んだ場所を表示" onClick={() => block && move(detailBox(block, data.detailSpan))}><Crosshair size={19}/></button>
      <button type="button" disabled={!block} aria-label="座席の選択を解除" onClick={clearResult}><X size={19}/></button>
    </div>
    <p id={instructionId} className={styles.srOnly}>矢印キーで画面内のブロックを選び、Enterで拡大します。地図をドラッグして移動できます。</p>
    <div className={`${styles.stage} ${data.zones ? styles.zonedStage : ""}`} ref={stage} data-testid="stand-seat-map" data-camera={view.map(n => n.toFixed(2)).join(",")} data-selected={selected ?? ""}>
      <svg ref={svg} viewBox={`0 0 ${size.width} ${size.height}`} role="group" aria-label="座席の全体図" aria-describedby={instructionId} tabIndex={0}
        onPointerDown={down} onPointerMove={drag} onPointerUp={up} onPointerCancel={() => { gesture.current = freshGesture(); }} onLostPointerCapture={e => { if (gesture.current.points.has(e.pointerId)) gesture.current = freshGesture(); }}
        onKeyDown={e => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); const b = focusable.find(b => b.id === focused) ?? focusable[0]; if (b) select(b); }
          if (e.key.startsWith("Arrow")) { e.preventDefault(); interaction(); const current = focusable.find(b => b.id === focused) ?? focusable[0]; if (!current) return;
            const axis = e.key === "ArrowLeft" || e.key === "ArrowRight" ? 0 : 1, sign = e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 1;
            const next = focusable.filter(b => (b.center[axis] - current.center[axis]) * sign > 0).sort((a, b) => Math.hypot(a.center[0] - current.center[0], a.center[1] - current.center[1]) - Math.hypot(b.center[0] - current.center[0], b.center[1] - current.center[1]))[0];
            if (next) setFocused(next.id);
          }
        }}>
        <defs><marker id={`${uid}-arrow`} markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto"><path d="M1 1L5 3.5L1 6" fill="none" stroke="#fff" strokeWidth="1.5"/></marker></defs>
        <svg width={size.width} height={size.height} viewBox={view.join(" ")}>
          {data.contextLabels?.map((l, i) => <text key={`context-${i}`} x={l.point[0]} y={l.point[1]} textAnchor="middle" fill="#a38b98" fontSize={14 / projection.scale} pointerEvents="none">{l.text}</text>)}
          {data.blocks.map(b => <path key={b.id} d={b.path} fillRule="evenodd" data-block-id={b.id} className={`${styles.block} ${whole && pulse && data.wholeBlockLabels && !data.zones ? styles.blockPrompt : ""}`}
            fill={b.id === selected ? "#a93164" : levels.find(l => l.id === b.level)!.color}
            opacity={shown.includes(b) || selected ? 1 : .17} stroke={b.id === selected ? "#682840" : "#fff"} strokeWidth={b.id === selected ? 1.8 : 1}>
            <title>{`${b.level}${b.balcony ? " バルコニー" : ""} ${rowSummary(b)} ${b.label}`}</title>
          </path>)}
          {block?.rows.flatMap((r, ri) => r.segments.map((s, i) => <polyline key={`${ri}-${i}`} points={(s.points ?? [s.a, s.b]).map(p => p.join(",")).join(" ")} fill="none" stroke="#fff" strokeOpacity={row && r.label === normalizeSeatInput(row) ? .95 : .35} strokeWidth={row && r.label === normalizeSeatInput(row) ? 1.4 : .45} pointerEvents="none"/>))}
          {block && !block.rows.length && block.referenceRows?.map(r => <line key={`reference-${r.label}`} x1={r.a[0]} y1={r.a[1]} x2={r.b[0]} y2={r.b[1]} stroke="#fff" strokeOpacity=".5" strokeWidth=".6" pointerEvents="none"/>)}
          {data.blocks.filter(b => b.id === focused).map(b => <path key={b.id} d={b.path} fill="none" stroke="#512e47" strokeWidth={3 / projection.scale} className={styles.keyboardFocus} pointerEvents="none"/>)}
        </svg>
        {rowStems.map((stem, i) => <line key={`row-stem-${i}`} x1={stem.a[0]} y1={stem.a[1]} x2={stem.b[0]} y2={stem.b[1]} stroke="#a93164" strokeWidth="1.2" pointerEvents="none"/>)}
        {arrow && <><line x1={arrow.start[0]} y1={arrow.start[1]} x2={arrow.end[0]} y2={arrow.end[1]} stroke="#81294d" strokeWidth="5" strokeLinecap="round" pointerEvents="none"/><line data-number-arrow="" x1={arrow.start[0]} y1={arrow.start[1]} x2={arrow.end[0]} y2={arrow.end[1]} stroke="#fff" strokeWidth="2" markerEnd={`url(#${uid}-arrow)`} pointerEvents="none"/></>}
        {labels.filter(l => l.anchor).map(l => <line key={`label-stem-${l.id}`} x1={l.anchor![0]} y1={l.anchor![1]} x2={l.x} y2={l.y} stroke="#a93164" strokeWidth="1" pointerEvents="none"/>)}
        {labels.map(l => <g key={l.id} data-annotation={l.id} data-annotation-kind={l.kind} transform={`translate(${l.x},${l.y})`} data-block-id={l.selected ? undefined : l.id} className={l.selected ? undefined : `${styles.block} ${wholeNumbers && pulse ? styles.blockPrompt : ""}`} pointerEvents={l.selected ? "none" : "all"}>
          {l.kind === "number" ? <path d={`M${-l.width / 2 + 5},${-l.height / 2}H${l.width / 2 - 5}L${l.width / 2},${-l.height / 2 + 5}V${l.height / 2 - 5}L${l.width / 2 - 5},${l.height / 2}H${-l.width / 2 + 5}L${-l.width / 2},${l.height / 2 - 5}V${-l.height / 2 + 5}Z`} fill={l.selected ? "#81294d" : "#fff0f6"} stroke={l.selected ? "#fff" : "#e0a9c1"} strokeWidth={l.selected ? 2 : 1}/>
            : <rect x={-l.width / 2} y={-l.height / 2} width={l.width} height={l.height} rx={l.kind === "row" ? 4 : 12} fill="#fff" fillOpacity={l.selected ? 1 : .87} stroke={l.kind === "row" ? "#b97494" : "none"} strokeWidth="1.3"/>}
          <text textAnchor="middle" y="5" fill={l.kind === "number" && l.selected ? "#fff" : l.kind === "row" ? "#522e45" : "#7c284d"} fontSize={l.selected ? 14 : 12} fontWeight={l.kind === "number" ? 800 : 750} style={{ fontVariantNumeric: "tabular-nums" }}>{l.text}</text>
        </g>)}
      </svg>
      {position && <span className={styles.front}>{position.label}付近</span>}
      {whole && !data.overviewAreas && <span className={styles.front}>{data.frontLabel ?? "↑ ステージ方向"}</span>}
      {zoneTags.map(z => { const p = zonePositions.get(z.id)!; return <button type="button" key={z.id} data-zone-id={z.id} aria-label={`${z.label}ブロックを拡大`} className={`${styles.zoneTag} ${pulse ? styles.zonePulse : ""}`} style={{ left: p[0], top: p[1] }} onClick={() => chooseZone(z.id)}><span>{z.label}</span></button>; })}
      {areaTags.map(a => { const p = areaPositions.get(a.id)!; return <button type="button" key={a.id} data-area-id={a.id} aria-label={`${a.label}側を拡大`} className={`${styles.zoneTag} ${pulse ? styles.zonePulse : ""}`} style={{ left: p[0], top: p[1] }} onClick={() => chooseRegion("all", a.area)}><span>{a.label}</span></button>; })}
      {levelTags.map(l => { const p = projection.project(l.point); return <button type="button" key={l.id} className={`${styles.levelTag} ${pulse ? styles.pulse : ""}`} style={{ left: p[0], top: p[1] }} onClick={() => chooseRegion(l.id, "all")}>{l.label}</button>; })}
    </div>
    <div className={styles.mapActions}><button type="button" className={styles.whole} onClick={reset}>全体図へ</button></div>
    {block && <div className={styles.footer}><button type="button" onClick={() => onEquipment(block.equipmentFloor)}>{block.equipmentFloor ? `${block.equipmentFloor}の設備を探す` : "設備を探す"} ↓</button>
      {block.seatNote && <p>{block.seatNote}</p>}
      {block.numberLookup !== "unavailable" && <details><summary>{block.rowNameLookup === "unavailable" ? "この範囲の番号" : "列ごとの番号"}</summary>{block.numberLookup === "partial" && <p>確認できた番号だけを表示しています。他の列・番号は確認中です。</p>}{block.rows.map(r => <p key={r.label}>{block.rowNameLookup === "unavailable" ? "" : `${r.label}列　`}{r.segments.map(s => `${block.numberPrefix ?? ""}${s.start}〜${s.end}番`).join("・")}</p>)}</details>}
    </div>}
  </DomeSeatFrame>;
});
export default StandSeatMap;
