"use client";

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState, useId, type PointerEvent } from "react";
import { ChevronDown, ChevronRight, Crosshair, Info, ListOrdered, X } from "lucide-react";
import { DomeSeatFrame } from "./DomeSeatFrame";
import { seatNumberBadge, seatNumberBadgeBounds, seatNumberArrowInk, seatNumberBadgeTipDistance } from "@/lib/seatNumberBadge";
import ReadySearchControl from "./ReadySearchControl";
import { boundsOf, fitStandArrowToCanvas, edgeNumberGuide, fitStandNumberGuide, clampCamera, standDetailCamera, standRowDetailTransition, isSeatTap, labelCoversOtherBlock, mapProjection, normalizeSeatInput, placeVisibleRowLabel, searchStandSeats, standContextLabel, standDisplayRows, standVisibleRowHints, standLabelOrder, standGroupReferenceLabels, standReferenceLabelKey, standRedundantContextLabel, standRedundantContextText, standLabelInsideCanvas, standSelectedNumberRun, standSelectedRow, youngEdgeMidpoint, zoomCamera, zoneLabelPositions, type MapBox, type Point, type StandBlock, type StandMapData, type StandPosition } from "./standMap";
import { hasStandCanvasArea, overviewAreaLabelPosition, overviewAreaLabelWidth } from "./standMap";
import styles from "./StandSeatMap.module.css";
import { VenueOverviewArt, StandOverviewTexture, overviewArtworkOpacity, VENUE_OVERVIEW_PROFILES } from "./VenueOverviewArt";

type Choice = { id: string; label: string; color: string; point: Point };
type Props = { data: StandMapData; levels: Choice[]; areas: { id: string; label: string }[]; onEquipment: (floor: string | null) => void };
export type StandSeatMapHandle = { showRegion: (level: string, area: string) => void };
type Gesture = { points: Map<number, Point>; start: Point; last: Point; travel: number; multi: boolean; block: string | null; distance: number };
const freshGesture = (): Gesture => ({ points: new Map(), start: [0, 0], last: [0, 0], travel: 0, multi: false, block: null, distance: 0 });
const rowSummary = (block: StandBlock) => {
  const rows = standDisplayRows(block);
  return block.rowNameLookup === "unavailable" ? "列名は公式図に未掲載" : rows.length === 1 ? `${rows[0].label}列` : rows.length ? `${rows[0].label}〜${rows.at(-1)!.label}列` : "区画で探す";
};

// Reuse the source name while omitting only exact metadata repeated beside it.
const blockDisplayTitle = (block: StandBlock, levelLabel: string) =>
  block.label.split("・").filter(part => part.trim() !== rowSummary(block) && part.trim() !== levelLabel).join("・") || block.label;

const StandSeatMap = forwardRef<StandSeatMapHandle, Props>(function StandSeatMap({ data, levels, areas, onEquipment }, ref) {
  
  // The three stacked floor plans need room for their outer rim and heading.
  // This pads the overview and outer pan bounds; seat geometry and floor/detail target definitions stay intact.
  const overviewBox: MapBox = data.diagramId === "pia-arena-mm-seat-plans"
    ? [data.viewBox[0] - 180, data.viewBox[1] - 180, data.viewBox[2] + 360, data.viewBox[3] + 360]
    : data.viewBox as MapBox;
  const [level, setLevel] = useState("all"), [area, setArea] = useState("all");
  const [row, setRow] = useState(""), [number, setNumber] = useState("");
  const [selected, setSelected] = useState<string | null>(null), [focused, setFocused] = useState(data.blocks[0].id);
  const [zone, setZone] = useState<string | null>(null);
  const [matches, setMatches] = useState<StandBlock[]>([]), [error, setError] = useState("");
  const [position, setPosition] = useState<StandPosition | null>(null);
  const [view, setView] = useState<MapBox>(overviewBox as MapBox), [size, setSize] = useState({ width: 900, height: 620 });
  const [pulse, setPulse] = useState(false);
  
  const stage = useRef<HTMLDivElement>(null), svg = useRef<SVGSVGElement>(null), frame = useRef<number | null>(null);
  const camera = useRef(view), gesture = useRef(freshGesture()), interacted = useRef(false);
  const previousSize = useRef(size);
  const uid = useId().replace(/:/g, ""), instructionId = `${uid}-keys`;
  const block = data.blocks.find(b => b.id === selected);
  const selectedLevelLabel = block ? levels.find(l => l.id === block.level)?.label ?? block.level : "";
  const selectedRows = block ? rowSummary(block) : "";
  // Remove only exact repeated display fragments; retain the source block name and seat data.
  const selectedTitle = block ? blockDisplayTitle(block, selectedLevelLabel) : "";
  const highlightedRow = standSelectedRow(data, block, row);
  const projection = mapProjection(view, size.width, size.height);
  
  
  
  
  // A direction narrows the camera and ticket search, not the neighbouring map labels.
  const shown = data.blocks.filter(b => level === "all" || b.level === level);
  const availableAreas = areas.filter(a => a.id === "all" || data.blocks.some(b => b.area === a.id && (level === "all" || b.level === level)));
  const blockOnlySearch = data.blocks.every(b => b.numberLookup === "unavailable");
  const whole = !selected && !zone && level === "all" && area === "all" && view[2] >= data.viewBox[2] * .9;
  const wholeNumbers = whole && data.wholeStartNumbers !== false && !data.wholeBlockLabels && data.blocks.some(b => b.label.includes("番"));
  const overviewArt = Boolean(VENUE_OVERVIEW_PROFILES[data.diagramId]);
  const artOpacity = overviewArt ? overviewArtworkOpacity(view[2], overviewBox[2], data.detailSpan) : 0;
  const artUnit = Math.min(data.viewBox[2], data.viewBox[3]) / 100;
  const closestDetail = Boolean(block) && view[2] <= data.detailSpan * .55;
  const groupReferenceLabels = standGroupReferenceLabels(data, block, view[2]);
  const blockShapes = useMemo(() => (block?.selectionPaintOnTop ? [...data.blocks.filter(b => b.id !== block.id), block] : data.blocks).map(b => <path key={b.id} d={b.path} fillRule="evenodd" data-block-id={b.id} className={`${styles.block} ${whole && pulse && data.wholeBlockLabels && !data.zones ? styles.blockPrompt : ""}`}
            fill={b.id === selected ? "#a93164" : levels.find(l => l.id === b.level)!.color}
            opacity={level === "all" || b.level === level || selected ? 1 : .17} stroke={b.id === selected ? "#682840" : "#fff"} strokeWidth={b.id === selected ? 1.8 : 1}>
            <title>{`${b.level}${b.balcony ? " バルコニー" : ""} ${rowSummary(b)} ${b.label}`}</title>
          </path>), [block, data.blocks, data.wholeBlockLabels, data.zones, level, levels, pulse, selected, whole]);

  function stop() { if (frame.current !== null) cancelAnimationFrame(frame.current); frame.current = null; }
  function interaction() { interacted.current = true; setPulse(false); stop(); }
  function renderCamera(next: MapBox) { camera.current = next; setView(next); }
  function move(next: MapBox, animate = true) {
    stop(); const target = clampCamera(next, overviewBox, data.detailSpan * .45);
    if (!animate || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { renderCamera(target); return; }
    const from = [...camera.current] as MapBox, start = performance.now();
    const duration = overviewArt && Math.max(from[2], target[2]) >= overviewBox[2] * .85 ? 420 : 220;
    function tick(now: number) {
      const progress = Math.min(1, (now - start) / duration), eased = 1 - (1 - progress) ** 3;
      renderCamera(from.map((n, i) => n + (target[i] - n) * eased) as MapBox);
      if (progress < 1) frame.current = requestAnimationFrame(tick); else frame.current = null;
    }
    frame.current = requestAnimationFrame(tick);
  }
  function clearResult() { setSelected(null); setMatches([]); setError(""); setPosition(null); }
  function reset() { interaction(); clearResult(); setZone(null); setLevel("all"); setArea("all"); move(overviewBox as MapBox); }
  function chooseRegion(nextLevel: string, nextArea: string) {
    interaction(); clearResult(); setZone(null); setLevel(nextLevel); setArea(nextArea);
    const targets = data.blocks.filter(b => (nextLevel === "all" || b.level === nextLevel) && (nextArea === "all" || b.area === nextArea));
    if (!targets.length) { setError("この席種にはその区画がありません。席種を「すべて」に戻して探せます。"); return; }
    const next = data.regionViews?.[`${nextLevel}:${nextArea}`] as MapBox | undefined ?? (nextLevel === "all" && nextArea === "all" ? overviewBox
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
    if (!selected || recenter) move(standDetailCamera(b, data, size));
  }
  function search(event: React.FormEvent) {
    event.preventDefault(); interaction();
    const result = searchStandSeats(data, level, area, row, number, zone);
    if (result.zone) { chooseZone(result.zone.id); setError(result.notice ?? ""); return; }
    if (result.position) {
      const p = result.position; clearResult(); setPosition(p); setLevel(p.level); setArea("all"); setZone(null);
      move([p.point[0]-p.span/2,p.point[1]-p.span/2,p.span,p.span]); return;
    }
    setPosition(null);
    setError(result.error); setMatches(result.matches.length > 1 ? result.matches : []);
    if (result.matches.length === 1) { select(result.matches[0], true); setError(result.notice ?? ""); }
    else setSelected(null);
  }
  function zoom(factor: number) {
    interaction(); const c = camera.current;
    let next = clampCamera(zoomCamera(c, factor, [c[0] + c[2] / 2, c[1] + c[3] / 2]), overviewBox, data.detailSpan * .45);
    const run = standSelectedNumberRun(data, block, row, number);
    if (run) {
      const text = `${run.row}列 ${block?.numberPrefix ?? ""}${run.segment.start}`;
      const older = run.segment.start === run.segment.end ? run.segment.a : run.segment.points?.find(p => Math.hypot(p[0] - run.segment.a[0], p[1] - run.segment.a[1]) > .001) ?? run.segment.b;
      const before = mapProjection(c, size.width, size.height).project(run.segment.a);
      const wasVisible = before[0] >= 0 && before[0] <= size.width && before[1] >= 0 && before[1] <= size.height;
      if (wasVisible) next = fitStandNumberGuide(next, size, run.segment.a, older, Math.max(48, text.length * 8 + 28), true);
      else if (block) next = standRowDetailTransition(block, data, c, next, size, row, number);
    }
    move(next);
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
    const resize = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      if (hasStandCanvasArea({ width, height })) setSize({ width, height });
    });
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

  useEffect(() => {
    const before = previousSize.current; previousSize.current = size;
    if (before.width === size.width && before.height === size.height) return;
    const run = standSelectedNumberRun(data, block, row, number);
    if (!run) return;
    const oldPoint = mapProjection(camera.current, before.width, before.height).project(run.segment.a);
    if (oldPoint[0] < 0 || oldPoint[0] > before.width || oldPoint[1] < 0 || oldPoint[1] > before.height) return;
    const text = `${run.row}列 ${block?.numberPrefix ?? ""}${run.segment.start}`;
    const older = run.segment.start === run.segment.end ? run.segment.a : run.segment.points?.find(p => Math.hypot(p[0] - run.segment.a[0], p[1] - run.segment.a[1]) > .001) ?? run.segment.b;
    move(fitStandNumberGuide(camera.current, size, run.segment.a, older, Math.max(48, text.length * 8 + 28), true), false);
    // Resize preserves a previously visible endpoint; panning never enters here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.width, size.height, data, block, row, number]);

  // Floor buttons above the map remain available; whole-map numbers take priority over duplicate floor tags.
  const levelTags = whole && !wholeNumbers && !data.zones ? levels.filter(l => !data.wholeBlockLabels || data.blocks.filter(b => b.level === l.id).length === 1) : [];
  
  const zoneTags = whole ? (data.zones ?? []).filter(z => !z.hideOnWhole) : [];
  const areaTags = whole ? data.overviewAreas ?? [] : [];
  const zonePositions = zoneLabelPositions(zoneTags, view, size.width, size.height);
  const areaPositions = new Map(areaTags.map(a => {
    return [a.id, overviewAreaLabelPosition(a.point, a.label, view, size.width, size.height)];
  }));
  const occupied = [...levelTags.map(l => { const p = projection.project(l.point); return [p[0], p[1], Math.max(64, l.label.length * 14 + 28), 44]; }), ...zoneTags.map(z => { const p = zonePositions.get(z.id)!; return [p[0], p[1], overviewAreaLabelWidth(z.label), 44]; })];
  occupied.push(...areaTags.map(a => { const p = areaPositions.get(a.id)!; return [p[0], p[1], overviewAreaLabelWidth(a.label), 44]; }));
  const labels: { id: string; text: string; x: number; y: number; width: number; height: number; kind: "row" | "number" | "block"; selected: boolean; plain: boolean; anchor?: Point }[] = [];
  const selectedRowLabel = (label: typeof labels[number]) => label.kind === "row" && (label.id === "selected-row" ||
    (Boolean(highlightedRow) && (label.id === "first-row" || label.id === "last-row") && normalizeSeatInput(label.text.replace(/列$/, "")) === normalizeSeatInput(highlightedRow)));
  const blockCenters = shown.flatMap(b => [b.center, ...(b.labelAvoidancePoints ?? [])].map(point => ({ id: b.id, point: projection.project(point) })));
  // Keep context captions off both ends of the interval chosen by the seat search.
  const labelRun = standSelectedNumberRun(data, block, row, number);
  if (block && labelRun) {
    const id = block.id;
    blockCenters.push(...[labelRun.segment.a, labelRun.segment.b].map(point => ({ id, point: projection.project(point) })));
  }
  function addLabel(id: string, text: string, position: Point, important = false, width?: number, fixed = false, rowHint = false) {
    const kind = rowHint || id === "first-row" || id === "last-row" || id === "selected-row" ? "row" : text.includes("番") && !text.endsWith("番側") ? "number" : "block";
    const plainName = rowHint || (!whole && kind === "block" && !important);
    const fontSize = important && !rowHint ? 14 : 12;
    const textWidth = [...text].reduce((sum, char) => sum + fontSize * (char.charCodeAt(0) < 128 ? .6 : 1), 0);
    const w = width ?? (plainName ? textWidth + 6 : Math.max(important || text.length > 2 ? 48 : 32, textWidth + 14)), h = plainName ? 18 : wholeNumbers && kind === "number" ? 22 : kind === "block" ? 26 : 28;
    const offsets = important || wholeNumbers || fixed ? [[0, 0]] : [[0, 0], [-12, 12], [12, 12], [-12, -12], [12, -12], [0, 28], [0, -28]];
    for (const [dx, dy] of offsets) {
      const x = position[0] + dx, y = position[1] + dy;
      if (!standLabelInsideCanvas([x, y], w, h, size)) continue;
      // Plain context names are passive; they cannot redirect a tap to a different block.
      if (!important && !plainName && labelCoversOtherBlock(id, [x, y], w, h, blockCenters)) continue;
      if (!important && occupied.some(r => Math.abs(x - r[0]) < (w + r[2]) / 2 + 4 && Math.abs(y - r[1]) < (h + r[3]) / 2 + 3)) continue;
      occupied.push([x, y, w, h]); labels.push({ id, text, x, y, width: w, height: h, kind, selected: important, plain: plainName, anchor: dx || dy ? position : undefined }); return;
    }
  }
  let arrow: { start: Point; end: Point } | null = null;
  const rowStems: { a: Point; b: Point }[] = [];
  const displayRows = block ? standDisplayRows(block) : [];
  if (block && !displayRows.length) addLabel("selected-block", block.label, projection.project(block.numberLookup === "unavailable" ? standContextLabel(data, block, closestDetail).point : block.center), true);
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
    const selectedRun = closestDetail ? standSelectedNumberRun(data, block, row, number) : null;
    const reference = selectedRun ? { start: selectedRun.segment.start, young: selectedRun.segment.a, older: selectedRun.segment.end === selectedRun.segment.start ? selectedRun.segment.a : selectedRun.segment.points?.find(p => Math.hypot(p[0] - selectedRun.segment.a[0], p[1] - selectedRun.segment.a[1]) > .001) ?? selectedRun.segment.b } : block.numberReference;
    if (reference) {
      const young = projection.project(reference.young), old = projection.project(reference.older);
      const numberText = `${block.numberPrefix ?? ""}${reference.start}`;
      const labelWidth = Math.max(48, numberText.length * 8 + 28);
      const anchor = selectedRun ? young : projection.project(youngEdgeMidpoint(block));
      // For the narrow Yoyogi F sliver, put the badge outside and keep the arrow tip at the sourced edge.
      const length = Math.hypot(old[0] - young[0], old[1] - young[1]);
      let numberAnchor = anchor;
      if (data.diagramId === "yoyogi-stand-reference" && block.id === "yoyogi-s1F-2" && length > .001 && length < labelWidth
        && anchor[0] >= 0 && anchor[0] <= size.width && anchor[1] >= 0 && anchor[1] <= size.height) {
        const ux = (old[0] - young[0]) / length, uy = (old[1] - young[1]) / length;
        // This sourced edge is nearly horizontal: the arrow exits the straight
        // vertical side of the badge. Its 20px tip then lands on the source edge.
        const straightSide = Math.abs(ux) > .001 && Math.abs(uy / ux) * labelWidth / 2 <= 9;
        const offset = straightSide ? labelWidth / (2 * Math.abs(ux)) + 20 : 0;
        const outside: Point = [anchor[0] - ux * offset, anchor[1] - uy * offset];
        if (straightSide && anchor[0] >= 9 && anchor[0] <= size.width - 9 && anchor[1] >= 9 && anchor[1] <= size.height - 9
          && standLabelInsideCanvas(outside, labelWidth, 28, size)) numberAnchor = outside;
      }
      // This two-seat K Arena block is shorter than its badge. Preserve the
      // sourced number edge at the joined arrow tip, including diagonal tips.
      if (data.diagramId === "k-arena-permanent-stands" && block.id === "k-level7-62" && length > .001 && length < labelWidth
        && anchor[0] >= 9 && anchor[0] <= size.width - 9 && anchor[1] >= 9 && anchor[1] <= size.height - 9) {
        const u: Point = [(old[0] - young[0]) / length, (old[1] - young[1]) / length];
        const offset = seatNumberBadgeTipDistance(u, labelWidth, 28, 20);
        if (offset !== null) {
          const outside: Point = [anchor[0] - u[0] * offset, anchor[1] - u[1] * offset];
          if (standLabelInsideCanvas(outside, labelWidth, 28, size)) numberAnchor = outside;
        }
      }
      const guide = edgeNumberGuide(numberAnchor, young, old, labelWidth);
      addLabel("start-number", `${numberText}番`, guide.number, true, labelWidth);
      rowObstacles.push([...guide.number, labelWidth, 28]);
      if (labels.some(l => l.id === "start-number")) arrow = fitStandArrowToCanvas(guide.arrow, size);
      if (arrow) {
        const bounds = seatNumberBadgeBounds([arrow.end[0] - arrow.start[0], arrow.end[1] - arrow.start[1]], labelWidth, 28, Math.hypot(arrow.end[0] - arrow.start[0], arrow.end[1] - arrow.start[1]));
        const obstacle = [guide.number[0] + bounds.x, guide.number[1] + bounds.y, bounds.width, bounds.height];
        rowObstacles.push(obstacle);
        occupied.push(obstacle); // Neighbour tags must not cover the selected arrowhead.
      }
    }
    if (selectedRun && block.rowNameLookup !== "unavailable") {
      const anchor = projection.project(selectedRun.segment.a), width = Math.max(48, `${selectedRun.row}列`.length * 14 + 14);
      const point = placeVisibleRowLabel([anchor[0] - dx * 44, anchor[1] - dy * 44], [-dx, -dy], width, rowObstacles, anchor, size);
      const clear = rowObstacles.every(r => Math.abs(point[0] - r[0]) >= (width + r[2]) / 2 + 4 || Math.abs(point[1] - r[1]) >= (28 + r[3]) / 2 + 3);
      if (clear && Math.hypot(point[0] - anchor[0], point[1] - anchor[1]) <= 64) {
        addLabel("selected-row", `${selectedRun.row}列`, point, true, width);
        if (labels.some(l => l.id === "selected-row")) { rowStems.push({ a: anchor, b: point }); rowObstacles.push([...point, width, 28]); }
      }
    }
    if (block.rowNameLookup !== "unavailable") {
      const firstOffset = displayRows.length === 1 ? 44 : 21;
      for (const [id, row, point, direction, anchor] of [
        ["first-row", displayRows[0], [fm[0] - dx * firstOffset, fm[1] - dy * firstOffset], [-dx, -dy], fm],
        ...(lastRow !== displayRows[0] ? [["last-row", lastRow, [lm[0] + dx * 21, lm[1] + dy * 21], [dx, dy], lm] as const] : []),
      ] as const) {
        if (selectedRun && normalizeSeatInput(row.label) === normalizeSeatInput(selectedRun.row)) continue;
        const text = `${row.label}列`;
        const width = Math.max(48, [...text].reduce((sum, char) => sum + 14 * (char.charCodeAt(0) < 128 ? .6 : 1), 0) + 14);
        const placed = placeVisibleRowLabel(point, direction, width, rowObstacles, anchor, size);
        // If no clear nearby placement exists, retain the row in the summary/table.
        // Never cover a fixed number or direction to force a boundary tag onto the map.
        if (rowObstacles.some(r => Math.abs(placed[0] - r[0]) < (width + r[2]) / 2 + 4 && Math.abs(placed[1] - r[1]) < (28 + r[3]) / 2 + 3)) continue;
        addLabel(id, text, placed, true, width);
        rowObstacles.push([...placed, width, 28]);
      }
    }
    // At a tight zoom both boundary markers can be outside while real rows
    // remain visible. Add only a few passive row names, anchored to those lines.
    if (closestDetail && block.rowNameLookup !== "unavailable" && displayRows.length > 2
      && (!labels.some(l => l.id === "first-row") || !labels.some(l => l.id === "last-row"))) {
      const alreadyNamed = new Set(labels.filter(l => l.kind === "row").map(l => normalizeSeatInput(l.text)));
      if (selectedRun) alreadyNamed.add(normalizeSeatInput(selectedRun.row));
      const candidates = standVisibleRowHints(block, view, size).filter(r => !alreadyNamed.has(normalizeSeatInput(r.label)));
      const order = [...new Set([0, candidates.length - 1, Math.floor(candidates.length / 2), ...candidates.map((_, i) => i)])];
      const placedHints: Point[] = [];
      for (const index of order) {
        const hint = candidates[index]; if (!hint || placedHints.length >= 3) continue;
        const text = `${hint.label}列`, width = Math.max(32, [...text].reduce((sum, char) => sum + 12 * (char.charCodeAt(0) < 128 ? .6 : 1), 0) + 6);
        const desired = hint.anchor.map((n, axis) => n + hint.outward[axis] * (width / 2 + 8));
        const point = placeVisibleRowLabel(desired, hint.outward, width, rowObstacles, hint.anchor, size);
        if (Math.hypot(point[0] - hint.anchor[0], point[1] - hint.anchor[1]) > 64
          || placedHints.some(p => Math.hypot(p[0] - point[0], p[1] - point[1]) < 44)
          || rowObstacles.some(r => Math.abs(point[0] - r[0]) < (width + r[2]) / 2 + 4 && Math.abs(point[1] - r[1]) < (22 + r[3]) / 2 + 3)) continue;
        const id = `visible-row-${index}`;
        addLabel(id, text, point, true, width, false, true);
        if (!labels.some(l => l.id === id)) continue;
        placedHints.push(point); rowObstacles.push([...point, width, 22]);
        rowStems.push({ a: hint.anchor, b: point });
      }
    }
    for (const [id, anchor] of [["first-row", fm], ["last-row", lm]] as const) {
      const label = labels.find(l => l.id === id);
      if (label) rowStems.push({ a: anchor, b: [label.x, label.y] });
    }
  }
  const referenceLabels = new Set<string>();
  const contextCaptions = new Set<string>();
  const selectedReferenceKey = block && standReferenceLabelKey(block, groupReferenceLabels);
  if (selectedReferenceKey && (displayRows.length || labels.some(l => l.id === "selected-block"))) referenceLabels.add(selectedReferenceKey);
  if ((!whole || data.wholeBlockLabels || wholeNumbers) && !(whole && data.zones)) for (const b of standLabelOrder(shown, block)) {
    if (b.id === selected) continue;
    if (whole && data.blocks.filter(o => o.level === b.level).length === 1) continue;
    if (wholeNumbers && b.label.includes("番") && b.numberReference) {
      const text = `${b.numberReference.start}番`;
      addLabel(b.id, text, projection.project(b.center), false, Math.max(34, `${b.numberReference.start}`.length * 7 + 22));
    } else {
      if (standRedundantContextLabel(b, block, closestDetail)) continue;
      const context = standContextLabel(data, b, closestDetail || groupReferenceLabels, !whole && !selected);
      const captionKey = !whole && !context.fixed && (/^\d+付近$/.test(context.text) || /(?:・|の)参考区画$/.test(context.text))
        ? JSON.stringify([b.level, b.area, b.zone ?? "", context.text]) : null;
      if (captionKey && contextCaptions.has(captionKey)) continue;
      const referenceKey = standReferenceLabelKey(b, groupReferenceLabels);
      if (referenceKey && referenceLabels.has(referenceKey)) continue;
      const before = labels.length;
      addLabel(b.id, context.text, projection.project(context.point), false, undefined, context.fixed);
      if (referenceKey && labels.length > before) referenceLabels.add(referenceKey);
      if (captionKey && labels.length > before) contextCaptions.add(captionKey);
    }
  }
  
  
  const focusable = shown.filter(b => { const p = projection.project(b.center); return p[0] > 0 && p[0] < size.width && p[1] > 0 && p[1] < size.height; });
  return <DomeSeatFrame className={data.levelViews ? styles.levelControls : undefined} levels={[{ id: "all", label: "すべて" }, ...levels]} level={level} onLevel={id => chooseRegion(id, "all")}
    directions={availableAreas} direction={area} onDirection={id => chooseRegion(level, id)} onZoom={zoom} onWhole={reset} shortcuts={[]}
    directionExtra={<form className={styles.search} onSubmit={search} aria-label="チケットの座席で検索">
      <label><span>列</span><ReadySearchControl><input value={row} disabled={blockOnlySearch} onChange={e => setRow(e.target.value)} placeholder={blockOnlySearch ? "検索準備中" : data.rowSearchPlaceholder ?? "例：12"} aria-label="列" /></ReadySearchControl></label>
      <label><span>{blockOnlySearch ? "区画名" : "番号・区画"}</span><ReadySearchControl><input value={number} onChange={e => setNumber(e.target.value)} placeholder={data.searchPlaceholder ?? (blockOnlySearch ? "例：A / 北" : "例：79")} aria-label={blockOnlySearch ? "区画名" : "番号"} /></ReadySearchControl></label>
      <ReadySearchControl><button type="submit">場所を見る</button></ReadySearchControl>
    </form>}>
    
    {error && <div className={styles.message} role="status">{error}<button type="button" onClick={reset}>条件を解除</button></div>}
    {matches.length > 0 && <section className={styles.searchResults} data-seat-search-results aria-label="座席の検索結果">
      <div className={styles.resultsHeading} role="status">
        <strong>{matches.length}区画が見つかりました</strong>
        <p>席種・列で絞るか、区画を選んでください。</p>
      </div>
      <ul className={styles.candidateList} aria-label="座席の検索候補">
        {matches.map(b => {
          const levelLabel = levels.find(l => l.id === b.level)?.label ?? b.level;
          return <li key={b.id}><button className={styles.candidateButton} type="button" data-seat-candidate={b.id} onClick={() => select(b, true)}>
            <span className={styles.candidateCopy}>
              <strong>{blockDisplayTitle(b, levelLabel)}</strong>
              <span className={styles.candidateMeta}><span>{levelLabel}{b.balcony && !levelLabel.includes("バルコニー") ? "・バルコニー" : ""}</span><span>{rowSummary(b)}</span></span>
            </span>
            <ChevronRight size={18} aria-hidden="true" />
          </button></li>;
        })}
      </ul>
    </section>}
    <div className={styles.selection} aria-live="polite" aria-label="選んだ座席">
      <div className={styles.selectionCopy}>{block ? <>
        <span className={styles.selectionMeta}>{selectedLevelLabel}{block.balcony && !selectedLevelLabel.includes("バルコニー") ? "・バルコニー" : ""}<span>{selectedRows}</span></span>
        <strong>{selectedTitle}</strong>
        {labelRun && <span className={styles.ticketSelection}><b className={styles.selectedRow}>{labelRun.row}列</b><b className={styles.selectedSeat} data-selected-seat-number>選択：{normalizeSeatInput(number)}番</b></span>}
      </> : <><strong>{zone ? data.zones?.find(z => z.id === zone)?.label ?? zone : level === "all" ? (overviewArt ? "全体図から区画を選ぶ" : "座席の全体図") : levels.find(l => l.id === level)?.label ?? level}</strong><span className={styles.selectionHint}>区画をタップすると、列・番号の詳細へ</span></>}</div>
      <button type="button" disabled={!block} aria-label="選んだ場所を表示" onClick={() => block && move(standDetailCamera(block, data, size))}><Crosshair size={19}/></button>
      <button type="button" disabled={!block} aria-label="座席の選択を解除" onClick={clearResult}><X size={19}/></button>
    </div>
    <p id={instructionId} className={styles.srOnly}>矢印キーで画面内のブロックを選び、Enterで拡大します。地図をドラッグして移動できます。</p>
    <div className={`${styles.stage} ${overviewArt ? styles.venueOverview : ""} ${data.zones ? styles.zonedStage : ""} ${data.diagramId === "vantelin-prime-unfolded" ? styles.unfoldedStage : ""}`} ref={stage} data-testid="stand-seat-map" data-camera={view.map(n => n.toFixed(2)).join(",")} data-selected={selected ?? ""}>
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
        <svg width={size.width} height={size.height} viewBox={view.join(" ")}>
          {overviewArt && <VenueOverviewArt diagramId={data.diagramId} blocks={data.blocks} opacity={artOpacity} unit={artUnit}/> }
          {data.contextLabels?.filter(l => !standRedundantContextText(l.text, block, closestDetail)
            && !(whole && size.width < 500 && data.diagramId === "vantelin-prime-unfolded")).map((l, i) => {
              const footer = whole && size.width < 500 && ["belluna-seats", "paypay-stand-reference", "mufg-seats", "koshien-seats", "vantelin-seat-reference", "makuhari-seats", "sapporo-baseball", "sapporo-soccer"].includes(data.diagramId) && l.text.includes("公演");
              const lines = footer && l.text.length * 12 > size.width - 24 && l.text.includes("・") ? [l.text.slice(0, l.text.indexOf("・") + 1), l.text.slice(l.text.indexOf("・") + 1)] : [l.text];
              const point = footer ? projection.unproject([size.width / 2, size.height - 14 - (lines.length - 1) * 16]) : l.point;
              return <text key={`context-${i}`} data-context-label={l.text} x={point[0]} y={point[1]} textAnchor="middle" fill={artOpacity > 0 ? "#405563" : "#a38b98"} fontSize={(footer ? 12 : 14) / projection.scale} pointerEvents="none">{lines.map((line, index) => <tspan key={index} x={point[0]} dy={index ? 16 / projection.scale : 0}>{line}</tspan>)}</text>;
            })}
          {blockShapes}
          {overviewArt && <StandOverviewTexture blocks={data.blocks} opacity={selected ? 0 : artOpacity} selected={selected} unit={artUnit}/> }
          
          {block?.rows.flatMap((r, ri) => r.segments.map((s, i) => <polyline key={`${ri}-${i}`} points={(s.points ?? [s.a, s.b]).map(p => p.join(",")).join(" ")} fill="none" stroke={highlightedRow && normalizeSeatInput(r.label) === highlightedRow ? "#1673ad" : "#fff"} vectorEffect="non-scaling-stroke" strokeOpacity={highlightedRow && normalizeSeatInput(r.label) === highlightedRow ? .95 : .35} strokeWidth={highlightedRow && normalizeSeatInput(r.label) === highlightedRow ? 2.2 : .45} pointerEvents="none"/>))}
          {block && !block.rows.length && block.referenceRows?.map(r => <line key={`reference-${r.label}`} x1={r.a[0]} y1={r.a[1]} x2={r.b[0]} y2={r.b[1]} stroke="#fff" vectorEffect="non-scaling-stroke" strokeOpacity=".5" strokeWidth=".6" pointerEvents="none"/>)}
          {data.blocks.filter(b => b.id === focused).map(b => <path key={b.id} d={b.path} fill="none" stroke="#512e47" strokeWidth={3 / projection.scale} className={styles.keyboardFocus} pointerEvents="none"/>)}
        </svg>
        {zoneTags.map(z => { const p = zonePositions.get(z.id)!, anchor = projection.project(z.point); return Math.hypot(p[0] - anchor[0], p[1] - anchor[1]) > 8
          ? <line key={`zone-stem-${z.id}`} x1={anchor[0]} y1={anchor[1]} x2={p[0]} y2={p[1]} stroke="#d5a0ba" strokeWidth="1.2" pointerEvents="none"/> : null; })}
        {rowStems.map((stem, i) => <line key={`row-stem-${i}`} x1={stem.a[0]} y1={stem.a[1]} x2={stem.b[0]} y2={stem.b[1]} stroke="#a93164" strokeWidth="1.2" pointerEvents="none"/>)}

        {labels.filter(l => l.anchor).map(l => <line key={`label-stem-${l.id}`} x1={l.anchor![0]} y1={l.anchor![1]} x2={l.x} y2={l.y} stroke="#a93164" strokeWidth="1" pointerEvents="none"/>)}
        {labels.map(l => <g key={l.id} data-annotation={l.id} data-annotation-kind={l.kind} transform={`translate(${l.x},${l.y})`} data-block-id={l.selected ? undefined : l.id} className={l.selected ? undefined : `${styles.block} ${wholeNumbers && pulse ? styles.blockPrompt : ""}`} pointerEvents={l.selected || (!whole && l.kind === "block") ? "none" : "all"}>
          <title>{data.blocks.find(b => b.id === l.id)?.label ?? l.text}</title>
          {l.kind === "number" ? <><path data-number-badge="" data-connected-number-arrow={l.id === "start-number" && arrow ? "" : undefined} d={seatNumberBadge(l.id === "start-number" && arrow ? [arrow.end[0] - arrow.start[0], arrow.end[1] - arrow.start[1]] : [0, 0], l.width, l.height, l.id === "start-number" && arrow ? Math.hypot(arrow.end[0] - arrow.start[0], arrow.end[1] - arrow.start[1]) : 0)} fill="#fff" stroke={l.selected ? "#81294d" : "#d5c5cd"} strokeWidth={l.selected ? 2 : 1}/>
            {l.id === "start-number" && arrow && <path data-number-arrow-ink="" d={seatNumberArrowInk([arrow.end[0] - arrow.start[0], arrow.end[1] - arrow.start[1]], l.width, l.height, Math.hypot(arrow.end[0] - arrow.start[0], arrow.end[1] - arrow.start[1]))} fill="none" stroke="#a93164" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>}</>
            : !l.plain && (l.selected || whole || l.kind === "row") && <rect x={-l.width / 2} y={-l.height / 2} width={l.width} height={l.height} rx={l.kind === "row" ? 4 : 12} fill={l.kind === "row" ? selectedRowLabel(l) ? "#155786" : "#e8f3ff" : "#fff"} fillOpacity={l.selected ? 1 : .87} stroke={l.kind === "row" ? "#23679a" : "none"} strokeWidth="1.3"/>}
          <text textAnchor="middle" y="5" fill={l.kind === "row" ? selectedRowLabel(l) ? "#fff" : "#155786" : l.selected ? "#522e45" : "#5b4652"} fontSize={l.selected && !l.plain ? 14 : 12} fontWeight={l.selected && !l.plain ? 800 : 600}
            stroke={l.plain ? "#fff" : undefined} strokeWidth="3" strokeLinejoin="round" paintOrder="stroke"
            style={{ fontVariantNumeric: "tabular-nums" }}>{l.text}</text>
        </g>)}
      </svg>
      {position && <span className={styles.front}>{position.label}付近</span>}
      {whole && !data.overviewAreas && <span className={styles.front}>{data.frontLabel ?? "↑ ステージ方向"}</span>}
      {zoneTags.map(z => { const p = zonePositions.get(z.id)!; return <button type="button" key={z.id} data-zone-id={z.id} aria-label={`${z.label}ブロックを拡大`} className={`${styles.zoneTag} ${pulse ? styles.zonePulse : ""}`} style={{ left: p[0], top: p[1] }} onClick={() => chooseZone(z.id)}><span>{z.label}</span></button>; })}
      {areaTags.map(a => { const p = areaPositions.get(a.id)!; return <button type="button" key={a.id} data-area-id={a.id} aria-label={`${a.label}${a.label.endsWith("側") ? "" : "側"}を拡大`} className={`${styles.zoneTag} ${pulse ? styles.zonePulse : ""}`} style={{ left: p[0], top: p[1] }} onClick={() => chooseRegion("all", a.area)}><span>{a.label}</span></button>; })}
      {levelTags.map(l => { const p = projection.project(l.point); return <button type="button" key={l.id} className={`${styles.levelTag} ${pulse ? styles.pulse : ""}`} style={{ left: p[0], top: p[1] }} onClick={() => chooseRegion(l.id, "all")}>{l.label}</button>; })}
    </div>
    <div className={styles.mapActions}>{data.diagramId === "vantelin-prime-unfolded" && <span className={styles.primeOrientation}>ツイン：3塁側 L／1塁側 R<br/>ボックス：4F／レストラン：3F</span>}<button type="button" className={styles.whole} onClick={reset}>全体図へ</button></div>
    {block && <div className={styles.footer} key={block.id} aria-label="選択した区画の詳細">
      {block.numberLookup && <p className={styles.coverageNote}><Info size={16} aria-hidden="true"/><span>{block.numberLookup === "partial" ? "確認できた番号だけを表示しています。他の列・番号は確認中です。" : "この区画は番号での検索に対応していません。"}</span></p>}
      {block.numberLookup !== "unavailable" && block.rows.length > 0 && <details className={styles.detailDisclosure} onToggle={event => {
        if (!event.currentTarget.open) return;
        const viewport = event.currentTarget.querySelector<HTMLElement>('[role="region"]');
        const currentRow = viewport?.querySelector<HTMLElement>('tr[aria-current="true"]');
        if (!viewport || !currentRow) return;
        const headerHeight = viewport.querySelector("thead")?.getBoundingClientRect().height ?? 0;
        const container = viewport.getBoundingClientRect(), target = currentRow.getBoundingClientRect();
        // Scroll only the number list; preserve page position, map camera and selection.
        if (target.top < container.top + headerHeight || target.bottom > container.bottom)
          viewport.scrollTop += target.top - container.top - headerHeight;
      }}>
        <summary><ListOrdered size={18} aria-hidden="true"/><span>{block.rowNameLookup === "unavailable" ? "この範囲の番号" : "列ごとの番号"}{highlightedRow && block.rowNameLookup !== "unavailable" && <small className={styles.inputRowHint}>入力した{block.rows.find(r => normalizeSeatInput(r.label) === highlightedRow)?.label}列へ</small>}</span><ChevronDown size={18} aria-hidden="true"/></summary>
        <div className={styles.numberTableWrap} tabIndex={0} role="region" aria-label="列ごとの番号一覧">
          <table className={styles.numberTable}>
            <caption className={styles.srOnly}>{block.label}の確認済み番号</caption>
            <thead><tr>{block.rowNameLookup !== "unavailable" && <th scope="col">列</th>}<th scope="col">確認済みの番号</th></tr></thead>
            <tbody>{block.rows.map((r, index) => <tr key={`${block.id}-row-${index}`} aria-current={highlightedRow && normalizeSeatInput(r.label) === highlightedRow ? "true" : undefined}>
              {block.rowNameLookup !== "unavailable" && <th scope="row">{r.label}列</th>}
              <td>{r.segments.map((s, segmentIndex) => <span key={segmentIndex}>{block.numberPrefix ?? ""}{s.start}{s.start !== s.end ? "〜" + s.end : ""}番</span>)}</td>
            </tr>)}</tbody>
          </table>
        </div>
      </details>}
      {block.seatNote && <details className={styles.detailDisclosure}>
        <summary><Info size={18} aria-hidden="true"/><span>この区画の見方・注意事項</span><ChevronDown size={18} aria-hidden="true"/></summary>
        <div className={styles.detailNotes}>{block.seatNote.match(/[^。]+。?/g)?.map((sentence, index) => <p key={index}>{sentence}</p>)}</div>
      </details>}
      <button className={styles.equipmentLink} type="button" onClick={() => onEquipment(block.equipmentFloor)}>{block.equipmentFloor ? `${block.equipmentFloor}の設備を探す` : "設備を探す"}<span aria-hidden="true">↓</span></button>
    </div>}
  </DomeSeatFrame>;
});
export default StandSeatMap;
