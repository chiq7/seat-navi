"use client";
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type KeyboardEvent } from "react";
import type { DedicatedVenueGuide } from "@/data/venueGuides/types";
import { projectMapPoint, type Box } from "./mapGeometry";
import { pathBounds, simplifiedRows, type DrawingBlock } from "./kyoceraMapDrawing";
import { arrowOverlapsRect, clearNumberArrow, compactNeighbourNumber, numberAnchorVisible, placeNumberLabel, numberBadgePath, rectanglesOverlap, type LabelRect, type NumberLabel } from "./kyoceraNumberLabels";
import { SEAT_DRAG_THRESHOLD, seatTapAllowed, spatialSeatTarget } from "@/lib/seatMapInteraction";
import SeatNumberArrow from "../SeatNumberArrow";
import gates from "@/data/venueGuides/kyocera-dome/seat-gates.json";
import styles from "./KyoceraNumberNavigator.module.css";
import { VenueOverviewArt, overviewArtworkOpacity } from "../template/VenueOverviewArt";

type Props = { guide: DedicatedVenueGuide; blocks: DrawingBlock[]; level: string; selectedCode?: string; rowLabel: string | null;
  box: Box; onView: (box: Box) => void; onBlock: (block: DrawingBlock) => void; onWhole: () => void; onArea: (areaId: string) => void;
  onDirection: (direction: string) => void };
type Contact = { x: number; y: number; startX: number; startY: number; code: string | null };
export default function KyoceraNumberNavigator({ guide, blocks, level, selectedCode, rowLabel, box, onView, onBlock, onWhole, onArea, onDirection }: Props) {
  const frame = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const skipAnimation = useRef(false);
  const [focusedCode, setFocusedCode] = useState(blocks[0]?.code);
  const [size, setSize] = useState({ width: 640, height: 560 });
  const [shown, setShown] = useState<Box>(box);
  const footprints = useMemo(() => blocks.map(b => ({ id: b.code, path: b.path, level: b.tier })), [blocks]);
  // Source outlines and unselected row geometry are constant while the camera moves.
  const geometry = useMemo(() => new Map(blocks.map(b => [b.code, {
    bounds: pathBounds([b.path])!, drawing: simplifiedRows(b),
  }])), [blocks]);
  const selectedDrawing = useMemo(() => {
    const selected = blocks.find(b => b.code === selectedCode);
    return selected ? simplifiedRows(selected, rowLabel) : null;
  }, [blocks, selectedCode, rowLabel]);
  const artOpacity = overviewArtworkOpacity(shown[2], 1600, 550);
  const rendered = useRef<Box>(box);
  const contacts = useRef(new Map<number, Contact>());
  const gesture = useRef<{ box: Box; x: number; y: number; distance: number } | null>(null);
  const moved = useRef(false);
  const [dragging, setDragging] = useState(false);
  const [tapHint, setTapHint] = useState<"pending" | "active" | "done">("pending");
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    if (svg.current) observer.observe(svg.current); return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const from = rendered.current, start = performance.now(); let request = 0;
    const duration = skipAnimation.current || dragging || window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : Math.max(from[2], box[2]) >= 1360 ? 420 : 220;
    function tick(now: number) {
      const fraction = duration ? Math.min(1, (now - start) / duration) : 1;
      const eased = 1 - (1 - fraction) ** 3;
      const next = from.map((n, i) => n + (box[i] - n) * eased) as Box;
      rendered.current = next; setShown(next);
      if (fraction < 1) request = requestAnimationFrame(tick);
    }
    skipAnimation.current = false;
    request = requestAnimationFrame(tick); return () => cancelAnimationFrame(request);
  }, [box, dragging]);
  const project = (x: number, y: number) => projectMapPoint(x, y, shown, size.width, size.height);
  const origin = project(0, 0), scale = origin.scale;
  const overview = Math.max(shown[2], shown[3]) > 950;
  const areaScale = Math.max(shown[2], shown[3]) > 550;
  const detail = !overview && !areaScale && Boolean(selectedCode);
  if (!overview && tapHint !== "done") setTapHint("done");
  useEffect(() => {
    if (!overview || tapHint !== "pending" || !frame.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && entry.intersectionRatio >= .2) setTapHint(window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "done" : "active");
    }, { threshold: .2 });
    observer.observe(frame.current); return () => observer.disconnect();
  }, [overview, tapHint]);
  function centre() {
    const points = [...contacts.current.values()];
    return { x: points.reduce((sum, p) => sum + p.x, 0) / points.length, y: points.reduce((sum, p) => sum + p.y, 0) / points.length,
      distance: points.length > 1 ? Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y) : 0 };
  }
  function start(event: ReactPointerEvent<SVGSVGElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault(); // SVG focus must not scroll the document on selection.
    skipAnimation.current = true;
    onView([...rendered.current]); // Freeze an in-progress transition at the touched position.
    const rect = event.currentTarget.getBoundingClientRect();
    const target = (event.target as Element).closest("[data-seat-block], [data-block-start]");
    contacts.current.set(event.pointerId, { x: event.clientX - rect.left, y: event.clientY - rect.top, startX: event.clientX - rect.left, startY: event.clientY - rect.top, code: target?.getAttribute("data-seat-block") ?? target?.getAttribute("data-block-start") ?? null });
    event.currentTarget.setPointerCapture(event.pointerId);
    const c = centre(); gesture.current = { box: rendered.current, ...c }; if (contacts.current.size === 1) moved.current = false; else moved.current = true; setDragging(true);
  }
  function move(event: ReactPointerEvent<SVGSVGElement>) {
    if (!contacts.current.has(event.pointerId) || !gesture.current) return;
    const rect = event.currentTarget.getBoundingClientRect(), previous = contacts.current.get(event.pointerId)!;
    contacts.current.set(event.pointerId, { ...previous, x: event.clientX - rect.left, y: event.clientY - rect.top });
    const c = centre(), initial = gesture.current;
    if (Math.hypot(event.clientX - rect.left - previous.startX, event.clientY - rect.top - previous.startY) > SEAT_DRAG_THRESHOLD || contacts.current.size > 1) moved.current = true;
    if (!moved.current) return;
    const ratio = contacts.current.size > 1 && initial.distance ? initial.distance / Math.max(c.distance, 1) : 1;
    const width = Math.max(60, Math.min(1600, initial.box[2] * ratio)), height = width * initial.box[3] / initial.box[2];
    const p = projectMapPoint(0, 0, initial.box, size.width, size.height);
    const sourceX = (initial.x - p.x) / p.scale, sourceY = (initial.y - p.y) / p.scale;
    const nextScale = Math.min(size.width / width, size.height / height);
    const left = sourceX - (c.x - (size.width - width * nextScale) / 2) / nextScale;
    const top = sourceY - (c.y - (size.height - height * nextScale) / 2) / nextScale;
    skipAnimation.current = true;
    onView([Math.max(-width / 2, Math.min(1600 - width / 2, left)), Math.max(-height / 2, Math.min(1600 - height / 2, top)), width, height]);
  }
  function cancel() {
    const ids = [...contacts.current.keys()];
    contacts.current.clear(); gesture.current = null; moved.current = true; setDragging(false);
    for (const id of ids) if (svg.current?.hasPointerCapture(id)) svg.current.releasePointerCapture(id);
  }
  function end(event: ReactPointerEvent<SVGSVGElement>) {
    const contact = contacts.current.get(event.pointerId);
    if (!contact) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const travel = Math.hypot(event.clientX - rect.left - contact.startX, event.clientY - rect.top - contact.startY);
    const tap = contacts.current.size === 1 && seatTapAllowed(travel, moved.current);
    contacts.current.delete(event.pointerId);
    if (!contacts.current.size) { gesture.current = null; setDragging(false); }
    else { gesture.current = { box: rendered.current, ...centre() }; moved.current = true; }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (tap && contact.code) { const block = blocks.find(b => b.code === contact.code); if (block) { setFocusedCode(block.code); onBlock(block); } }
  }
  useEffect(() => {
    const el = svg.current!;
    const wheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault(); setTapHint("done");
      const current = rendered.current, rect = el.getBoundingClientRect();
      const p = projectMapPoint(0, 0, current, size.width, size.height);
      const x = event.clientX - rect.left, y = event.clientY - rect.top;
      const width = Math.max(60, Math.min(1600, current[2] * Math.exp(Math.max(-100, Math.min(100, event.deltaY)) * .004)));
      const height = current[3] * width / current[2], nextScale = Math.min(size.width / width, size.height / height);
      skipAnimation.current = true;
      onView([(x - p.x) / p.scale - (x - (size.width - width * nextScale) / 2) / nextScale,
        (y - p.y) / p.scale - (y - (size.height - height * nextScale) / 2) / nextScale, width, height]);
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [onView, size.width, size.height]);
  useEffect(() => {
    const reset = () => { contacts.current.clear(); gesture.current = null; moved.current = true; setDragging(false); };
    window.addEventListener("blur", reset); document.addEventListener("visibilitychange", reset);
    return () => { window.removeEventListener("blur", reset); document.removeEventListener("visibilitychange", reset); };
  }, []);
  const annotations: { rect: LabelRect; from?: NumberLabel["from"]; to?: NumberLabel["to"] }[] = [];
  const visible = blocks.filter(block => { const b = geometry.get(block.code)!.bounds; const a = project(b.left, b.top), z = project(b.right, b.bottom); return z.x >= 0 && a.x <= size.width && z.y >= 0 && a.y <= size.height; });
  const selectedBlock = visible.find(b => b.code === selectedCode);
  const focusBlock = detail && !selectedBlock ? visible.filter(block => {
    const b = geometry.get(block.code)!.bounds, a = project(b.left, b.top), z = project(b.right, b.bottom);
    return block.rowLabelIsPrinted && (level === "すべて" || block.tier === level) && a.x >= 0 && a.y >= 0 && z.x <= size.width && z.y <= size.height && Math.min(z.x - a.x, z.y - a.y) >= 24;
  }).sort((a, b) => {
    const p = project(a.x, a.y), q = project(b.x, b.y);
    return Math.hypot(p.x - size.width / 2, p.y - size.height / 2) - Math.hypot(q.x - size.width / 2, q.y - size.height / 2);
  })[0] : undefined;
  const closestView = shown[2] <= 90;
  const focusRows = !closestView && focusBlock ? (() => {
    const p = project(focusBlock.x, focusBlock.y), text = focusBlock.rows.length === 1 ? `${focusBlock.rows[0].row}列` : `${focusBlock.rows[0].row}〜${focusBlock.rows.at(-1)!.row}列`;
    const rect = { x: p.x, y: p.y, width: text.length * 7 + 12, height: 24 };
    annotations.push({ rect }); return { code: focusBlock.code, rect, text };
  })() : null;
  const rowEnds = detail && selectedBlock?.rowLabelIsPrinted ? (() => {
    const drawing = geometry.get(selectedBlock.code)!.drawing;
    const points = selectedBlock.rows.length === 1 ? [drawing.front] : [drawing.front, drawing.back];
    return points.flatMap((point, i) => {
      const p = project(point.x, point.y);
      if (p.x < 0 || p.x > size.width || p.y < 0 || p.y > size.height) return [];
      const rect = { x: Math.max(28, Math.min(size.width - 28, p.x)), y: Math.max(14, Math.min(size.height - 14, p.y)), width: 56, height: 28 };
      annotations.push({ rect });
      return [{ rect, anchor: p, row: (i ? selectedBlock.rows.at(-1)! : selectedBlock.rows[0]).row, end: i ? "back" : "front" }];
    });
  })() : [];
  const centralLabels = !detail || closestView ? [] : visible.filter(block => block.label.startsWith("中央") && block.code !== selectedCode).flatMap(block => {
    const p = project(block.x, block.y), rect = { x: p.x, y: p.y + 23, width: 16, height: 16 };
    if (rect.x < 8 || rect.x > size.width - 8 || rect.y < 8 || rect.y > size.height - 8) return [];
    annotations.push({ rect });
    return [{ code: block.code, rect, letter: block.label.replace("中央", "") }];
  });
  function available(x: number, y: number, width: number, height: number) {
    const rect = { x, y, width, height };
    if (x < width / 2 + 4 || x > size.width - width / 2 - 4 || y < height / 2 + 4 || y > size.height - height / 2 - 4 || annotations.some(p => rectanglesOverlap(p.rect, rect, 4) || (p.from && p.to && arrowOverlapsRect(p.from, p.to, rect, 4)))) return false;
    annotations.push({ rect }); return true;
  }
  const reserved = annotations.map(a => a.rect);
  // Before choosing a block, keep a single start-number marker at its centre.
  // Faded tiers remain context; their labels return at the detailed scale.
  const blockLabels = overview || detail ? [] : [...visible].sort((a, b) => {
    const p = geometry.get(a.code)!.bounds, q = geometry.get(b.code)!.bounds;
    return (q.right - q.left) * (q.bottom - q.top) - (p.right - p.left) * (p.bottom - p.top);
  }).flatMap(block => {
    if (level !== "すべて" && block.tier !== level && block.code !== selectedCode) return [];
    const bounds = geometry.get(block.code)!.bounds, a = project(bounds.left, bounds.top), z = project(bounds.right, bounds.bottom);
    const p = project(block.x, block.y), drawing = geometry.get(block.code)!.drawing;
    const text = `${block.label.startsWith("中央") ? `${block.label.replace("中央", "")} ` : ""}${drawing.seatStart}番〜`;
    const units = [...text].reduce((sum, char) => sum + (/\d|[A-Z]/.test(char) ? .7 : char === " " ? .35 : 1), 0);
    const fontSize = 12;
    if (z.y - a.y < 18 || z.x - a.x < 18) return [];
    const rect = { x: p.x, y: p.y, width: units * fontSize, height: fontSize * 1.4 };
    if (fontSize < 8 || p.x - rect.width / 2 < 2 || p.x + rect.width / 2 > size.width - 2 || p.y - rect.height / 2 < 2 || p.y + rect.height / 2 > size.height - 2) return [];
    if (annotations.some(label => rectanglesOverlap(rect, label.rect, 2))) return [];
    annotations.push({ rect });
    return [{ block, drawing, p, text, fontSize }];
  });
  const placedLabels = [...visible].sort((a, b) => Number(b.code === selectedCode) - Number(a.code === selectedCode)).flatMap(block => {
    if (!detail) return [];
    const bounds = geometry.get(block.code)!.bounds;
    const a = project(bounds.left, bounds.top), z = project(bounds.right, bounds.bottom);
    const width = Math.min(size.width, z.x) - Math.max(0, a.x), height = Math.min(size.height, z.y) - Math.max(0, a.y);
    // Omit only unreadably small edge fragments; neighbouring upper/lower
    // blocks retain their numbering even when the other tier is selected.
    if (block.code !== selectedCode && (Math.min(width, height) < (areaScale ? 28 : 12) || Math.max(width, height) < (areaScale ? 48 : 36))) return [];
    const drawing = (block.code === selectedCode ? selectedDrawing! : geometry.get(block.code)!.drawing);
    const low = project(drawing.low.x, drawing.low.y), high = project(drawing.high.x, drawing.high.y);
    const rowsText = block.rows.length === 1 ? `${block.rows[0].row}列` : `${block.rows[0].row}〜${block.rows.at(-1)!.row}列`;
    const rowRange = block.label.startsWith("中央") ? `${block.label.replace("中央", "")}・${rowsText}` : rowsText;
    const fullyVisible = a.x >= 0 && a.y >= 0 && z.x <= size.width && z.y <= size.height;
    const rangeReadable = !closestView && block.rowLabelIsPrinted && block.code !== selectedCode && block.code !== focusRows?.code && fullyVisible && Math.min(width, height) >= 28 && Math.max(width, height) >= 30;
    const sign = placeNumberLabel(low, high, Math.max(48, String(drawing.seatStart).length * 8 + 20));
    // An off-canvas fixed anchor must not leave a misleading badge fragment.
    if (!numberAnchorVisible(sign, size.width, size.height)) return [];
    annotations.push(sign);
    return [{ block, drawing, sign, rowRange, rangeReadable, compact: false, showRange: false, rangeRect: null as LabelRect | null }];
  });
  for (const label of placedLabels) {
    if (label.block.code === selectedCode) continue;
    const compact = compactNeighbourNumber(label.sign, project(label.drawing.high.x, label.drawing.high.y), label.drawing.seatStart,
      placedLabels.filter(other => other !== label).map(other => other.sign.rect));
    Object.assign(label.sign, compact.sign); label.compact = compact.compact;
  }
  for (const row of rowEnds) {
    const anchor = { ...row.rect };
    const obstacles = placedLabels.map(label => label.sign.rect);
    const shifts = [[0, 0], [0, -34], [0, 34], [-60, 0], [60, 0], [-60, -34], [60, 34]];
    const chosen = shifts.map(([dx, dy]) => ({ ...anchor, x: anchor.x + dx, y: anchor.y + dy }))
      .find(rect => rect.x >= 30 && rect.x <= size.width - 30 && rect.y >= 16 && rect.y <= size.height - 16
        && obstacles.every(other => !rectanglesOverlap(rect, other, 3)));
    if (chosen) Object.assign(row.rect, chosen);
  }
  // Number anchors have priority. Add a quiet row range underneath wherever
  // it fits, rather than displacing a neighbouring block's young number.
  for (const label of placedLabels) {
    if (!label.rangeReadable) continue;
    const rect = { x: label.sign.rect.x, y: label.sign.rect.y + 32, width: label.rowRange.length * 7 + 12, height: 24 };
    if (rect.x - rect.width / 2 < 4 || rect.x + rect.width / 2 > size.width - 4 || rect.y + rect.height / 2 > size.height - 4) continue;
    const others = reserved.filter(rect => !centralLabels.some(c => c.code === label.block.code && c.rect === rect));
    if ([...others, ...placedLabels.map(other => other.sign.rect), ...placedLabels.flatMap(other => other.rangeRect ? [other.rangeRect] : [])].some(other => rectanglesOverlap(rect, other, 3))) continue;
    label.rangeRect = rect; label.showRange = true; annotations.push({ rect });
  }
  const numberLabels = placedLabels.map(label => ({ ...label, arrow: clearNumberArrow(label.sign, [...reserved, ...placedLabels.map(other => other.sign.rect), ...placedLabels.flatMap(other => other.rangeRect ? [other.rangeRect] : [])]) }));
  const focusCode = visible.some(b => b.code === focusedCode) ? focusedCode : selectedBlock?.code ?? visible[0]?.code;
  function keyBlock(event: KeyboardEvent<SVGGElement>, block: DrawingBlock) {
    if (["Enter", " "].includes(event.key)) { event.preventDefault(); onBlock(block); return; }
    const target = spatialSeatTarget(visible.map(b => ({ id: b.code, ...project(b.x, b.y) })), block.code, event.key);
    if (!target) return;
    event.preventDefault(); setFocusedCode(target.id);
    frame.current?.querySelector<SVGGElement>(`[data-seat-block="${target.id}"]`)?.focus({ preventScroll: true });
  }
  return <div ref={frame} className={styles.canvas} data-testid="kyocera-seat-map" data-camera={box.join(" ")} data-map-mode="unified" data-map-stage={overview ? "overview" : detail ? "detail" : "blocks"}
    onPointerDownCapture={() => setTapHint("done")} onKeyDownCapture={() => setTapHint("done")}>
    <svg ref={svg} viewBox={`0 0 ${size.width} ${size.height}`} role="group" aria-label={`${guide.name}の座席表`} onPointerDown={start} onPointerMove={move}
      onPointerUp={end} onPointerCancel={cancel} onLostPointerCapture={event => { if (contacts.current.has(event.pointerId)) cancel(); }} onPointerLeave={event => { if (!event.currentTarget.hasPointerCapture(event.pointerId)) cancel(); }}>
      <defs>
        {visible.map(b => <clipPath id={`seat-clip-${b.code}`} key={b.code}><path d={b.path} /></clipPath>)}
      </defs>
      <g transform={`translate(${origin.x} ${origin.y}) scale(${scale})`}>
        <VenueOverviewArt diagramId="kyocera-seat-original" blocks={footprints} opacity={artOpacity} unit={16}/>
        {blocks.map(block => <g key={block.code} data-seat-block={block.code} data-source-block={block.sourceCode} data-area-id={block.areaId} role="button" tabIndex={block.code === focusCode ? 0 : -1} onFocus={() => setFocusedCode(block.code)}
          aria-label={`${block.label}・${block.tier} ${block.rowLabelIsPrinted ? `${block.rowLabel}列` : "列の印字なし（公式検索：0列）"} ${block.firstSeat}〜${block.lastSeat}番`} aria-pressed={block.code === selectedCode}
          onKeyDown={event => keyBlock(event, block)}>
          <path d={block.path} fill={block.code === selectedCode ? "#ac2e66" : block.special ? "#eadac1" : block.tier === "上段" ? "#c1b4da" : "#ebbad0"}
            opacity={level !== "すべて" && block.tier !== level && block.code !== selectedCode ? .2 : 1} stroke={block.code === selectedCode ? "#5d263f" : "white"} strokeWidth={(block.code === selectedCode ? 2.5 : .6) / scale} />
          <title>{`${block.label}・${block.tier} ／ ${block.rowLabelIsPrinted ? `${block.rowLabel}列` : "列の印字なし（検索：0列）"} ／ ${block.firstSeat}〜${block.lastSeat}番`}</title>
        </g>)}
        {detail && visible.filter(b => (level === "すべて" || b.tier === level || b.code === selectedCode) && (b.code === selectedCode || Math.max(...[geometry.get(b.code)!.bounds].map(r => Math.max(r.right - r.left, r.bottom - r.top))) * scale >= 65)).map(block => <g key={`rows:${block.code}`} clipPath={`url(#seat-clip-${block.code})`} pointerEvents="none" data-row-guides={block.code}>
          {(block.code === selectedCode ? selectedDrawing! : geometry.get(block.code)!.drawing).rows.map(row => <line key={row.row} data-row-line={row.row} x1={row.from.x} y1={row.from.y} x2={row.to.x} y2={row.to.y}
            stroke={row.selected ? "#fff3a5" : block.code === selectedCode ? "#ffe6f0" : "#ab7593"} strokeWidth={(row.selected ? 2 : .6) / scale} opacity={row.selected ? 1 : .65} />)}
        </g>)}
      </g>
      <g pointerEvents="none" className={styles.numbers}>
        {blockLabels.map(({ block, drawing, p, text, fontSize }) => <text key={block.code} data-block-start={block.code} data-start-number={drawing.seatStart} x={p.x} y={p.y} dominantBaseline="central" textAnchor="middle" fontSize={fontSize} fill="#672442" pointerEvents="all" style={{ cursor: "pointer" }} aria-hidden="true">{text}</text>)}
        {numberLabels.map(({ block, drawing, sign: { rect }, arrow, rowRange, rangeRect, compact }) => <g key={block.code} data-number-guide={block.code} data-reference-row={drawing.referenceRow} data-start-number={drawing.seatStart} data-compact-number={compact || undefined}>
          <title>{block.rowLabelIsPrinted ? `${drawing.referenceRow}列の番号目安。列によって端の番号が変わります。` : "FBの印字された開始番号と番号が増える向き。検索の列は0です。"}</title>
          {arrow && <SeatNumberArrow from={arrow.from} to={arrow.to} />}
          <path data-number-badge="" d={numberBadgePath(rect, compact ? 3 : 5)} fill="#fff" stroke={block.code === selectedCode ? "#ac2e66" : "#b97494"} strokeWidth={block.code === selectedCode ? 2 : 1} />
          <text data-number-text="" x={rect.x} y={rect.y + (compact ? 4 : 5)} textAnchor="middle" fontSize={compact ? 12 : 14} fill="#672442">{drawing.seatStart}{!compact && <tspan fontSize="12">番</tspan>}</text>
          {rangeRect && <g><rect data-row-range-badge={block.code} x={rangeRect.x - rangeRect.width / 2} y={rangeRect.y - 12} width={rangeRect.width} height="24" rx="4" fill="#fffc" /><text data-row-range={block.code} x={rangeRect.x} y={rangeRect.y + 4} textAnchor="middle" fontSize="12" fontWeight="600" fill="#76576a">{rowRange}</text></g>}
        </g>)}
        {centralLabels.filter(c => !placedLabels.some(l => l.block.code === c.code && l.showRange)).map(({ code, rect, letter }) => <text key={code} x={rect.x} y={rect.y + 4} textAnchor="middle" fontSize="12">{letter}</text>)}
        {focusRows && <g><rect data-row-range-badge={focusRows.code} x={focusRows.rect.x - focusRows.rect.width / 2} y={focusRows.rect.y - 12} width={focusRows.rect.width} height="24" rx="4" fill="#fffffff0" /><text data-row-range={focusRows.code} x={focusRows.rect.x} y={focusRows.rect.y + 4} textAnchor="middle" fontSize="12" fontWeight="600" fill="#76576a">{focusRows.text}</text></g>}
        {rowEnds.map(({ rect: p, anchor, row, end }) => <g key={end} data-row-end={end}>{(p.x !== anchor.x || p.y !== anchor.y) && <path d={`M${anchor.x},${anchor.y}L${p.x},${p.y}`} stroke="#a93164" strokeWidth="1"/>}<rect x={p.x - 28} y={p.y - 14} width="56" height="28" rx="4" fill="white" stroke="#a93164" /><text x={p.x} y={p.y + 4} textAnchor="middle" fontSize="12" fill="#a93164">{row}列</text></g>)}
        {gates.gates.filter(g => !overview || [1, 5, 9, 12].includes(g.number)).flatMap(gate => { const p = project(gate.x, gate.y); if (!available(p.x, p.y, 64, 24)) return [];
          return [<g key={gate.id} data-seat-gate={gate.number}><rect x={p.x - 32} y={p.y - 12} width="64" height="24" rx="12" fill="#514452" /><text x={p.x} y={p.y + 4} fill="white" textAnchor="middle" fontSize="12">GATE {gate.number}</text></g>]; })}
      </g>
    </svg>
    {overview && <div className={styles.areaLabels} aria-label="座席エリアから拡大する" data-tap-hint={tapHint} onAnimationEnd={() => setTapHint("done")}>
      {[{ id: "outfield-right", label: "ライト", x: .65, y: .25 }, { id: "outfield-left", label: "レフト", x: .35, y: .25 }].map(area => {
        const p = project(area.x * 1600, area.y * 1600);
        return p.x >= 36 && p.x <= size.width - 36 && p.y >= 24 && p.y <= size.height - 24 ? <button key={area.id} type="button" className={styles.outfieldLabel} data-map-direction={area.id} aria-label={`外野${area.label}`} style={{ left: p.x, top: p.y }} onClick={() => onDirection(area.id)}>外野<small>{area.label}</small></button> : null;
      })}
      {[{ id: "1塁側-下段", x: .67, y: .53 }, { id: "3塁側-下段", x: .33, y: .53 }, { id: "1塁側-上段", x: .83, y: .57 }, { id: "3塁側-上段", x: .17, y: .57 }, { id: "中央C-下段", x: .5, y: .76 }]
        .filter(a => level === "すべて" || a.id.endsWith(level)).map(area => { const p = project(area.x * 1600, area.y * 1600); const seat = guide.seats.find(a => a.id === area.id)!;
          return p.x >= 30 && p.x <= size.width - 30 && p.y >= 24 && p.y <= size.height - 24 ? <button key={area.id} type="button" style={{ left: p.x, top: p.y }} onClick={() => onArea(area.id)}>{seat.label.startsWith("中央") ? "中央" : seat.label}<small>{seat.type}</small></button> : null; })}
    </div>}
    <button type="button" className={styles.whole} onClick={onWhole}>全体図へ</button>
  </div>;
}
