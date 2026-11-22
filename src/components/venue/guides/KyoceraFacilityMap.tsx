"use client";

import { useEffect, useRef, useState } from "react";
import { Baby, HeartPulse, Info } from "lucide-react";
import type { DedicatedVenueGuide, GuideDiagram, GuideFacility } from "@/data/venueGuides/types";
import { AccessibleSign, FoodSign, LockerSign, MenSign, ToiletSign, WomenSign } from "../DomeFacilitySigns";
import { placeMapLabels, type MapLabel } from "@/lib/facilityMapLabels";
import { diagramFieldArt } from "@/data/venueFieldArt";
import VenueGateLabel from "../template/VenueGateLabel";
import mapStyles from "../template/VenueFacilityMapCanvas.module.css";
import styles from "./KyoceraFacilityMap.module.css";
import { FacilityIcon, facilityIconKind } from "./VenueFacilityMap";
import { groupKyoceraFacilityAreas } from "./kyoceraFacilityAreas";
import { kyoceraFacilityCamera, pointInKyoceraCamera } from "./kyoceraFacilityState";
import type { GuideOrigin, ResolvedGuideOrigin } from "./guideState";
import type { Box } from "./mapGeometry";

// Same frame and mark sizes as the template finder (VenueFacilityFinder): half a mark above/below the plan.
const PAD_X = 20, PAD_TOP = 26, PAD_BOTTOM = 28;
const MARK_W = 46, MARK_H = 48;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const textWidth = (text: string, ascii: number, wide: number) => [...text].reduce((n, c) => n + (/[\x00-\x7f]/.test(c) ? ascii : wide), 0);
// The ring floors are drawn with seat blocks as their grey shapes; other plans show the venue outline.
const SEAT_PLANS = new Set(["kyocera-f3", "kyocera-f5"]);

/** Plan colours, only for the layers this plan has. Shown in the map panel's heading row. */
export function KyoceraPlanLegend({ diagram }: { diagram: GuideDiagram }) {
  const concourse = diagram.concoursePaths.length > 0, context = diagram.contextPaths.length > 0;
  if (!concourse && !context) return null;
  return <span className={mapStyles.legend} aria-hidden="true">{concourse && <span><i className={mapStyles.concourseSwatch}/>通路</span>}{context && <span><i className={mapStyles.contextSwatch}/>{SEAT_PLANS.has(diagram.id) ? "客席" : "会場"}</span>}</span>;
}

const purposeIcons = { 荷物: LockerSign, 飲食: FoodSign, 赤ちゃん: Baby, 案内: Info, AED: HeartPulse } as const;
function GroupIcon({ items, compact }: { items: GuideFacility[]; compact: boolean }) {
  const size = compact ? 17 : 26;
  if (items[0].purpose === "トイレ") {
    const types = new Set(items.map(f => f.toiletType));
    const pair = types.has("mixed") || (types.has("women") && types.has("men"));
    return <span className={mapStyles.toiletIcon}><span>{pair || (!types.has("women") && !types.has("men") && !types.has("accessible")) ? <ToiletSign size={size}/> : types.has("women") ? <WomenSign size={size}/> : types.has("men") ? <MenSign size={size}/> : null}</span>{types.has("accessible") && <AccessibleSign size={compact ? 16 : 22}/>}</span>;
  }
  // One pictogram per mark: the facility's own when they all share it, otherwise the purpose's.
  if (new Set(items.map(facilityIconKind)).size === 1) return <FacilityIcon item={items[0]} size={size}/>;
  const Icon = purposeIcons[items[0].purpose as keyof typeof purposeIcons] ?? Info;
  return <Icon size={size} aria-hidden="true"/>;
}

function landmarkText(mark: GuideDiagram["landmarks"][number]) {
  const number = mark.label.replace(/^[GS]/, "");
  return mark.kind === "gate" && /^\d+$/.test(number) ? `${number}ゲート` : mark.kind === "passage" && /^\d+$/.test(number) ? `${number}通路` : mark.label;
}

type Mark = { id: string; memberIds: string[]; x: number; y: number };
type Props = { guide: DedicatedVenueGuide; diagram: GuideDiagram; items: GuideFacility[]; origin: ResolvedGuideOrigin | null;
  purpose: string; floor: string; scope: "場内" | "場外"; selectedId: string | null; groupIds: string[] | null;
  onGroup: (ids: string[], trigger: HTMLButtonElement) => void; onOrigin: (origin: GuideOrigin) => void };

export default function KyoceraFacilityMap({ guide, diagram, items, origin, purpose, floor, scope, selectedId, groupIds, onGroup, onOrigin }: Props) {
  // Only the width is measured: the height follows from it and the plan's shape.
  const [width, setWidth] = useState(650);
  const canvas = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const now = element.getBoundingClientRect().width;
    if (now > 0) setWidth(now);
    const observer = new ResizeObserver(([entry]) => { if (entry.contentRect.width > 0) setWidth(entry.contentRect.width); });
    observer.observe(element);
    return () => observer.disconnect();
  }, [diagram.id]);
  const compactPins = width <= 480;
  const camera: Box = kyoceraFacilityCamera(diagram, origin);
  const zoomed = Boolean(origin);
  const art = diagramFieldArt(guide.venueId, diagram.id);
  // The whole-plan frame includes the field art, so no screen size crops it; a landmark zoom keeps its own frame.
  const frame: Box = art && !zoomed ? (() => {
    const boxes = [camera, [art.x, art.y, art.width, art.height], ...(art.cameraArea ? [[art.cameraArea.x, art.cameraArea.y, art.cameraArea.width, art.cameraArea.height]] : [])];
    const x0 = Math.min(...boxes.map(b => b[0])), y0 = Math.min(...boxes.map(b => b[1]));
    return [x0, y0, Math.max(...boxes.map(b => b[0] + b[2])) - x0, Math.max(...boxes.map(b => b[1] + b[3])) - y0] as Box;
  })() : camera;
  // As tall as the plan needs at this width (no empty bands); phones cap it so the map stays on screen above the list.
  const drawWidth = Math.max(1, width - PAD_X * 2);
  const mapHeight = Math.round(clamp(drawWidth * frame[3] / frame[2] + PAD_TOP + PAD_BOTTOM, 200, compactPins ? 320 : 520));
  const fit = Math.min(drawWidth / frame[2], (mapHeight - PAD_TOP - PAD_BOTTOM) / frame[3]);
  const offsetX = (width - frame[2] * fit) / 2, offsetY = PAD_TOP + (mapHeight - PAD_TOP - PAD_BOTTOM - frame[3] * fit) / 2;
  const project = (x: number, y: number) => [offsetX + (x - frame[0]) * fit, offsetY + (y - frame[1]) * fit];

  // Outside gates are facilities with the gate's own ID: the gate label is their sign, so no second mark is drawn.
  const gateIds = new Set(diagram.landmarks.filter(mark => mark.kind === "gate").map(mark => mark.id));
  const shown = items.filter(item => item.anchor?.diagramId === diagram.id && pointInKyoceraCamera(item.anchor, camera) && !gateIds.has(item.id));
  const byId = new Map(shown.map(item => [item.id, item]));
  // Reviewed display areas keep their members together; each mark sits on its members' own spot (exact for one).
  const areas = groupKyoceraFacilityAreas(shown.map(item => ({ id: item.id, x: item.anchor!.x, y: item.anchor!.y, kind: facilityIconKind(item) })), floor, purpose, scope);
  // Facility marks sit exactly on their place (clamped inside the map), never moved or tied to it by a line.
  // Marks that would overlap are shown as one mark counting both; landmark labels move around them instead.
  let marks: Mark[] = areas.map(area => {
    const [x, y] = project(area.x, area.y);
    return { id: area.id, memberIds: area.points.map(point => point.id), x: clamp(x, MARK_W / 2 + 4, width - MARK_W / 2 - 4), y: clamp(y, MARK_H / 2 + 4, mapHeight - MARK_H / 2 - 4) };
  });
  const touching = (a: Mark, b: Mark) => Math.abs(a.x - b.x) < MARK_W + 2 && Math.abs(a.y - b.y) < MARK_H + 2;
  for (let merged = true; merged;) {
    merged = false;
    for (let i = 0; i < marks.length && !merged; i++) for (let j = i + 1; j < marks.length && !merged; j++) {
      const a = marks[i], b = marks[j];
      if (!touching(a, b)) continue;
      const wa = a.memberIds.length, wb = b.memberIds.length, mix = (p: number, q: number) => (p * wa + q * wb) / (wa + wb);
      marks = [...marks.slice(0, i), { id: `${a.id}+${b.id}`, memberIds: [...a.memberIds, ...b.memberIds], x: mix(a.x, b.x), y: mix(a.y, b.y) }, ...marks.slice(i + 1, j), ...marks.slice(j + 1)];
      merged = true;
    }
  }

  const artBox = art && !zoomed ? (() => { const [x, y] = project(art.x + art.width / 2, art.y + art.height / 2); return { x, y, width: art.width * fit, height: art.height * fit }; })() : null;
  // Side names sit beside the art on the first spot clear of every mark; only with the art in view.
  const sideLabels = art?.sideNames && artBox ? art.sideNames.map((name, i) => {
    const dir = i === 0 ? -1 : 1, sideW = textWidth(name, 7, 11.5) + 8, sideH = 18;
    const start = { x: artBox.x + dir * (artBox.width / 2 + sideW / 2 + 6), y: artBox.y };
    const clear = (c: { x: number; y: number }) => c.x - sideW / 2 >= 4 && c.x + sideW / 2 <= width - 4 && c.y - sideH / 2 >= 4 && c.y + sideH / 2 <= mapHeight - 4
      && !marks.some(m => Math.abs(m.x - c.x) < (MARK_W + sideW) / 2 + 3 && Math.abs(m.y - c.y) < (MARK_H + sideH) / 2 + 3);
    const tries = [0, 1, 2, 3].flatMap(step => [-1, 1, 0].map(v => ({ x: start.x + dir * step * 14, y: start.y + v * step * 16 })));
    const at = tries.find(clear) ?? start;
    return { name, x: at.x, y: at.y, width: sideW, height: sideH };
  }) : [];

  // Landmarks: on the ring floors a few gates and passages spread around the ring, like the main numbers on a
  // clock (all of them inside a landmark zoom); other plans show their entrances, stations and plazas.
  const ring = SEAT_PLANS.has(diagram.id);
  const inView = diagram.landmarks.filter(mark => pointInKyoceraCamera(mark, camera) && (ring ? ["gate", "passage"].includes(mark.kind) : !["stairs", "shop"].includes(mark.kind)));
  const centre = { x: camera[0] + camera[2] / 2, y: camera[1] + camera[3] / 2 };
  const angle = (mark: { x: number; y: number }) => Math.atan2(mark.y - centre.y, mark.x - centre.x);
  const turn = (a: number, b: number) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
  const representatives = new Set<string>();
  for (const kind of ["gate", "passage"]) {
    const candidates = inView.filter(mark => mark.kind === kind).sort((a, b) => a.label.localeCompare(b.label, "ja", { numeric: true }));
    const picked: typeof candidates = [];
    while (candidates.length && (zoomed || picked.length < 4)) {
      const best = picked.length ? candidates.reduce((a, b) => {
        const gap = (m: typeof a) => Math.min(...picked.map(p => turn(angle(m), angle(p))));
        return gap(b) > gap(a) ? b : a;
      }) : candidates[0];
      picked.push(best); candidates.splice(candidates.indexOf(best), 1);
    }
    picked.forEach(mark => representatives.add(mark.id));
  }
  const pinned = (id: string) => (origin?.kind === "landmark" && origin.id === id) || selectedId === id;
  const mapMarks = inView.filter(mark => !["gate", "passage"].includes(mark.kind) || representatives.has(mark.id) || pinned(mark.id));
  for (const mark of diagram.landmarks) if (pinned(mark.id) && !mapMarks.includes(mark) && pointInKyoceraCamera(mark, camera)) mapMarks.push(mark);
  // Labels move around the marks, side names and art. The chosen landmark is always shown; others are dropped
  // when no free spot is near.
  const labelInputs: MapLabel[] = mapMarks.map(mark => {
    const text = landmarkText(mark), labelWidth = Math.min(Math.max(44, textWidth(text, 7, 12) + 18), width - 8);
    const [x, y] = project(mark.x, mark.y);
    return { id: mark.id, kind: pinned(mark.id) ? "gate" : "passage", x: clamp(x, labelWidth / 2 + 4, width - labelWidth / 2 - 4), y: clamp(y, 24, mapHeight - 24), width: labelWidth, height: 44 };
  });
  const placedLabels = placeMapLabels(labelInputs, width, mapHeight, {
    reserved: [...marks.map(m => ({ x: m.x, y: m.y, width: MARK_W, height: MARK_H })), ...sideLabels, ...(artBox ? [artBox] : [])],
  });
  const labels = placedLabels.map(label => {
    const mark = mapMarks.find(item => item.id === label.id)!;
    return { mark, x: label.left, y: label.top, point: project(mark.x, mark.y) };
  });
  const selected = selectedId ? shown.find(item => item.id === selectedId) ?? items.find(item => item.id === selectedId && item.anchor?.diagramId === diagram.id) : undefined;

  return <div ref={canvas} className={mapStyles.canvas} style={{ height: mapHeight }} data-testid="facility-map" data-diagram-id={diagram.id} data-camera={camera.join(" ")}>
    <svg viewBox={`0 0 ${width} ${mapHeight}`} role="img" aria-label={`${guide.name} ${scope === "場外" ? "場外" : floor}の設備図`}>
      <g transform={`translate(${offsetX} ${offsetY}) scale(${fit}) translate(${-frame[0]} ${-frame[1]})`}>
        <defs><clipPath id={`kyocera-extent-${diagram.id}`}><rect x={diagram.viewBox[0]} y={diagram.viewBox[1]} width={diagram.viewBox[2]} height={diagram.viewBox[3]}/></clipPath></defs>
        <g clipPath={`url(#kyocera-extent-${diagram.id})`}>
          {diagram.contextPaths.map((d, i) => <path key={`context-${i}`} d={d} className={styles.contextArea}/>)}
          {/* The art sits on the grey fills but under every plan line. */}
          {art && <image href={art.image.href} x={art.x} y={art.y} width={art.width} height={art.height} preserveAspectRatio="xMidYMid meet" data-field-art=""/>}
          {diagram.contextPaths.map((d, i) => <path key={`context-line-${i}`} d={d} className={styles.contextLine} strokeWidth={1 / fit}/>)}
          {diagram.concoursePaths.map((d, i) => <path key={`concourse-${i}`} d={d} className={styles.concourseArea} strokeWidth={1.4 / fit}/>)}
        </g>
        {origin && <circle data-origin={origin.id} data-origin-kind={origin.kind} cx={origin.x} cy={origin.y} r={9 / fit} strokeWidth={3 / fit} className={styles.originDot}/>}
        {selected?.anchor && <circle data-destination={selected.id} cx={selected.anchor.x} cy={selected.anchor.y} r={5 / fit} strokeWidth={1.5 / fit} className={styles.destinationDot}/>}
      </g>
    </svg>
    <svg viewBox={`0 0 ${width} ${mapHeight}`} aria-hidden="true">{labels.filter(l => Math.hypot(l.x - l.point[0], l.y - l.point[1]) > 8).map(l => <g key={l.mark.id}><line x1={l.point[0]} y1={l.point[1]} x2={l.x} y2={l.y} stroke="#c7b395"/><circle cx={l.point[0]} cy={l.point[1]} r={2} fill="#9c8462"/></g>)}</svg>
    {sideLabels.map(side => <span key={side.name} className={mapStyles.sideName} style={{ left: side.x, top: side.y, width: side.width }} aria-hidden="true">{side.name}</span>)}
    {marks.map(mark => {
      const members = mark.memberIds.map(id => byId.get(id)!);
      const pressed = (selectedId !== null && mark.memberIds.includes(selectedId)) || Boolean(groupIds?.some(id => mark.memberIds.includes(id)));
      const names = members.map(item => item.name).filter((name, i, all) => all.indexOf(name) === i);
      return <button type="button" key={mark.id} className={mapStyles.marker} style={{ left: mark.x, top: mark.y }} data-pin-density={compactPins ? "compact" : undefined}
        data-facility-group={mark.id} data-spot-ids={mark.memberIds.join(" ")} aria-pressed={pressed}
        aria-label={`${names.length > 2 ? `${names.slice(0, 2).join("・")}ほか` : names.join("・")}・${purpose} ${members.length}件`}
        onClick={event => onGroup(mark.memberIds, event.currentTarget)}>
        <span className={mapStyles.markerFace}><GroupIcon compact={compactPins} items={members}/></span>{members.length > 1 && <small>{members.length}</small>}
      </button>;
    })}
    {labels.map(({ mark, x, y }) => {
      const chosen = origin?.kind === "landmark" && origin.id === mark.id;
      const text = landmarkText(mark);
      return <button type="button" key={mark.id} className={`${mapStyles.landmark} ${styles.landmark}`} style={{ left: x, top: y }} data-landmark-id={mark.id} data-landmark-kind={mark.kind}
        data-selected={selectedId === mark.id || undefined} aria-pressed={chosen} aria-label={`${mark.name ?? text}の周辺を見る`} title={mark.name ?? text}
        onClick={() => onOrigin({ diagramId: diagram.id, landmarkId: mark.id })}>{mark.kind === "gate" ? <VenueGateLabel label={text}/> : text}</button>;
    })}
    {scope === "場外" && <span className={mapStyles.schematic}>位置関係の略図</span>}
  </div>;
}
