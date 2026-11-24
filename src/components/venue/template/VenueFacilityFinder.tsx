"use client";
import { trackVenueFacilityOpen } from "@/lib/venueAnalytics";
import { useEffect, useRef, useState, useImperativeHandle, useId, type Ref } from "react";
import { HeartPulse, Info, Milk, X, Cigarette, CircleParking, Trees } from "lucide-react";
import { AccessibleSign, ChangingSign, ElevatorSign, FoodSign, LockerSign, MenSign, StairsSign, StrollerSign, ToiletSign, WomenSign } from "../DomeFacilitySigns";
import type { DedicatedVenueGuide, GuideFacility } from "@/data/venueGuides/types";
import { availablePurposes, changeFacilityOutsideView, changeFacilityPlace, facilitiesAroundLandmark, facilitiesForOutsideView, filterFacilities, groupsAroundLandmark, hasUsableLuggage, initialFacilityState, linkFacilitySeatFloor, purposes, resolveLandmarks, selectedFacilityGroup, visibleGroups, type FacilityConfig, type FacilityGroup, type Purpose } from "./facilityFinderState";
import type { MapBox } from "./standMap";
import { placeMapLabels, type MapLabel } from "@/lib/facilityMapLabels";
import { diagramFieldArt } from "@/data/venueFieldArt";
import styles from "./VenueFacilityFinder.module.css";
import VenueGateLabel from "./VenueGateLabel";
import { VENUE_ACCESS_EVENT, type VenueAccessDetail } from "@/lib/venueAccess";
import mapStyles from "./VenueFacilityMapCanvas.module.css";
import { FacilityAreaResultsHeading, useFacilityResultNavigation } from "./FacilityResultNavigation";
import { useVenueFacilitySearchTarget } from "./useVenueFacilitySearchTarget";
import { isBabyFacilitySearch, matchesGuideBabyFacility } from "@/lib/venueFacilitySearch";
import { inScope } from "./facilityFinderState";

const purposeIcons = { トイレ: ToiletSign, 荷物: LockerSign, 飲食: FoodSign, 赤ちゃん: Milk, 案内: Info, AED: HeartPulse };
function FixtureIcon({ item, size = 23 }: { item: GuideFacility; size?: number }) {
  const Icon = item.kind === "no-storage" ? Info : item.kind === "stroller" ? StrollerSign : item.kind === "diaper" ? ChangingSign : item.kind === "stairs" || item.kind === "escalator" ? StairsSign : item.kind === "elevator" ? ElevatorSign : item.kind === "accessible-parking" ? AccessibleSign : item.kind === "smokingarea" ? Cigarette : item.kind === "parking" ? CircleParking : item.kind === "park" ? Trees : item.toiletType === "women" ? WomenSign : item.toiletType === "men" ? MenSign : item.toiletType === "accessible" ? AccessibleSign : purposeIcons[item.purpose];
  return <Icon size={size} aria-hidden="true"/>;
}
function GroupIcon({ items, compact }: { items: GuideFacility[]; compact: boolean }) {
  const toilet = items[0].purpose === "トイレ";
  const iconSize = compact ? 17 : 28;
  if (items[0].purpose === "案内" && new Set(items.map(f => f.kind)).size > 1) return <Info size={iconSize} aria-hidden="true"/>;
  if (!toilet) return <FixtureIcon item={items[0]} size={iconSize}/>;
  const types = new Set(items.map(f => f.toiletType));
  return <span className={mapStyles.toiletIcon}><span>{types.has("mixed") || types.has("women") && types.has("men") ? <ToiletSign size={compact ? 17 : 27}/> : types.has("women") ? <WomenSign size={compact ? 17 : 26}/> : types.has("men") ? <MenSign size={compact ? 17 : 26}/> : types.has("accessible") ? null : <ToiletSign size={compact ? 17 : 27}/>}</span>{types.has("accessible") && <AccessibleSign size={compact ? 16 : 23}/>}</span>;
}
export type FacilityFinderHandle = { linkSeatFloor: (floor: string | null) => void; showLuggage: () => void; showNearby?: (purpose: Purpose, query?: string) => void };
// Map frame pads (px): half a mark above/below the plan and room for the corner notes.
const PAD_X = 20, PAD_TOP = 26, PAD_BOTTOM = 28;
// A mark's tap box (px); also the size used to decide when two marks overlap.
const MARK_W = 46, MARK_H = 48;
const VENUE_LABEL_ID = "facility-venue-name";
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
function unionBox(...boxes: (readonly number[] | null | undefined)[]): MapBox {
  const shown = boxes.filter((box): box is readonly number[] => Boolean(box));
  const x0 = Math.min(...shown.map(b => b[0])), y0 = Math.min(...shown.map(b => b[1]));
  const x1 = Math.max(...shown.map(b => b[0] + b[2])), y1 = Math.max(...shown.map(b => b[1] + b[3]));
  return [x0, y0, x1 - x0, y1 - y0];
}
/** Merged marks get a joined id, so a selection made before a resize still finds the mark that now holds it. */
function findShownGroup(id: string | null, shown: FacilityGroup[]) {
  if (!id) return undefined;
  const parts = id.split("+");
  return shown.find(g => g.id === id) ?? shown.find(g => g.id.split("+").some(part => parts.includes(part)));
}
const textWidth = (text: string, ascii: number, wide: number) => [...text].reduce((n, c) => n + (/[\x00-\x7f]/.test(c) ? ascii : wide), 0);
/** Plan colours: walkway band (where facilities are) against grey venue shapes. Only layers the plan has are listed. */
function PlanLegend({ concourse, context }: { concourse: boolean; context: boolean }) {
  if (!concourse && !context) return null;
  return <span className={mapStyles.legend} aria-hidden="true">{concourse && <span><i className={mapStyles.concourseSwatch}/>通路</span>}{context && <span><i className={mapStyles.contextSwatch}/>会場</span>}</span>;
}
type Props = { guide: DedicatedVenueGuide; config: FacilityConfig; ref?: Ref<FacilityFinderHandle> };
function groupGateAreas(groups: FacilityGroup[]): FacilityGroup[] {
  const areas = new Map<string, FacilityGroup[]>();
  for (const group of groups) {
    const key = /ゲート側の掲載区域$/.test(group.area) ? group.area : group.id;
    const members = areas.get(key) ?? [];
    members.push(group);
    areas.set(key, members);
  }
  return [...areas.values()].map(groups => {
    const [first] = groups;
    if (groups.length === 1) return first;
    // These points are published as a gate-side area. Keep all individual
    // facilities in the list and use an existing location for its map marker.
    const x = groups.reduce((sum, group) => sum + group.x, 0) / groups.length;
    const y = groups.reduce((sum, group) => sum + group.y, 0) / groups.length;
    const nearest = groups.reduce((best, group) =>
      Math.hypot(group.x - x, group.y - y) < Math.hypot(best.x - x, best.y - y) ? group : best, first);
    return { ...nearest, id: "mobile-area:" + first.area, label: first.area.replace("の掲載区域", ""),
      memberIds: [...new Set(groups.flatMap(group => group.memberIds))] };
  });
}
export default function VenueFacilityFinder({ guide, config, ref }: Props) {
  const finderRef = useRef<HTMLDivElement>(null);
  const navigation = useFacilityResultNavigation(finderRef);
  const [state, setState] = useState(() => initialFacilityState(guide.facilities, config));
  const [outsideViewId, setOutsideViewId] = useState(() => config.outsideViews?.find(v => v.diagramId === config.outsideDiagramId)?.id ?? config.outsideDiagramId);
  const [landmarkText, setLandmarkText] = useState(""), [landmarkError, setLandmarkError] = useState("");
  const [landmarkCandidates, setLandmarkCandidates] = useState<string[]>([]);
  // Only the width is measured: the map's height follows from it and the plan's shape.
  const [width, setWidth] = useState(650);
  const compactPins = width <= 480;
  const canvas = useRef<HTMLDivElement>(null);
  const mapPanel = useRef<HTMLDivElement>(null);
  // Focus to restore after a row opens or closes in place (the row and its detail swap elements).
  const pendingFocus = useRef<{ id: string; open: boolean } | null>(null);
  const landmarkInputId = useId();
  const outsideView = config.outsideViews?.find(v => v.id === outsideViewId) ?? config.outsideViews?.[0];
  const baseDiagram = guide.diagrams!.find(d => state.scope === "場外" ? d.id === (outsideView?.diagramId ?? config.outsideDiagramId) : d.scope === "場内" && d.floor === state.floor)!;
  const diagram = state.scope === "場外" && outsideView?.landmarkIds ? { ...baseDiagram, landmarks: baseDiagram.landmarks.filter(m => outsideView.landmarkIds!.includes(m.id)) } : baseDiagram;
  const hasMap = Boolean(diagram.contextPaths.length || diagram.concoursePaths.length || diagram.landmarks.length || config.groups.some(g => g.diagramId === diagram.id));
  const viewFacilities = state.scope === "場外" ? facilitiesForOutsideView(guide.facilities, outsideView, config) : guide.facilities;
  const origin = diagram.landmarks.find(m => m.id === state.origin);
  const available = availablePurposes(viewFacilities, state, config);
  const filtered = facilitiesAroundLandmark(filterFacilities(viewFacilities, state, config), origin?.id ?? null, config);
  const candidates = visibleGroups(filtered, config.groups, diagram.id);
  const nearby = groupsAroundLandmark(candidates, diagram, origin, config);
  const mapGroups = compactPins && !origin && diagram.id === "paypay-floor-3F" && state.purpose === "トイレ"
    ? groupGateAreas(nearby) : nearby;
  const baseRadius = diagram.viewBox[2] * .27;
  const radius = origin && config.landmarkGroupIds?.[origin.id] !== undefined ? Math.max(baseRadius, ...nearby.map(g => Math.max(Math.abs(g.x - origin.x), Math.abs(g.y - origin.y) / .7) + diagram.viewBox[2] * .06)) : baseRadius;
  const zoomed = Boolean(origin && origin.kind !== "station");
  const camera: MapBox = zoomed && origin ? [origin.x - radius, origin.y - radius * .7, radius * 2, radius * 1.4] : diagram.viewBox as MapBox;
  const art = diagramFieldArt(guide.venueId, diagram.id);
  // The whole-plan frame includes the field art, so no screen size crops it; a landmark zoom keeps its own frame.
  const frame: MapBox = art && !zoomed ? unionBox(camera, [art.x, art.y, art.width, art.height], art.cameraArea && [art.cameraArea.x, art.cameraArea.y, art.cameraArea.width, art.cameraArea.height]) : camera;
  // As tall as the plan needs at this width (no empty bands); phones cap it so the map can stay on screen above the list.
  const drawWidth = Math.max(1, width - PAD_X * 2);
  const mapHeight = Math.round(clamp(drawWidth * frame[3] / frame[2] + PAD_TOP + PAD_BOTTOM, 200, compactPins ? 320 : 520));
  const fit = Math.min(drawWidth / frame[2], (mapHeight - PAD_TOP - PAD_BOTTOM) / frame[3]);
  const offsetX = (width - frame[2] * fit) / 2, offsetY = PAD_TOP + (mapHeight - PAD_TOP - PAD_BOTTOM - frame[3] * fit) / 2;
  const project = (p: readonly number[]) => [offsetX + (p[0] - frame[0]) * fit, offsetY + (p[1] - frame[1]) * fit];
  const primary = new Set(config.primaryLandmarks[diagram.id] ?? []);
  const primaryIds = config.primaryLandmarks[diagram.id] ?? [];
  const mapMarks = diagram.landmarks.filter(m => (primary.has(m.id) || m.id === state.origin) && (!origin || m.id === origin.id)).sort((a, b) => primaryIds.indexOf(a.id) - primaryIds.indexOf(b.id));
  // Facility marks sit exactly on their place (clamped inside the map), never moved or tied to it by a line.
  // Marks that would overlap are shown as one mark counting both; landmark labels move around them instead.
  type Mark = { g: FacilityGroup; x: number; y: number };
  let marks: Mark[] = mapGroups.filter(g => !mapMarks.some(m => g.memberIds.length === 1 && g.memberIds[0] === m.id)).map(g => {
    const [x, y] = project([g.x, g.y]);
    return { g, x: clamp(x, MARK_W / 2 + 4, width - MARK_W / 2 - 4), y: clamp(y, MARK_H / 2 + 4, mapHeight - MARK_H / 2 - 4) };
  });
  const touching = (a: Mark, b: Mark) => Math.abs(a.x - b.x) < MARK_W + 2 && Math.abs(a.y - b.y) < MARK_H + 2;
  for (let merged = true; merged;) {
    merged = false;
    for (let i = 0; i < marks.length && !merged; i++) for (let j = i + 1; j < marks.length && !merged; j++) {
      const a = marks[i], b = marks[j];
      if (!touching(a, b)) continue;
      const wa = a.g.memberIds.length, wb = b.g.memberIds.length, mix = (p: number, q: number) => (p * wa + q * wb) / (wa + wb);
      const join = (p: string, q: string) => p === q ? p : `${p}・${q}`;
      const g: FacilityGroup = { ...a.g, id: `${a.g.id}+${b.g.id}`, label: join(a.g.label, b.g.label), area: join(a.g.area, b.g.area),
        memberIds: [...new Set([...a.g.memberIds, ...b.g.memberIds])], x: mix(a.g.x, b.g.x), y: mix(a.g.y, b.g.y) };
      marks = [...marks.slice(0, i), { g, x: mix(a.x, b.x), y: mix(a.y, b.y) }, ...marks.slice(i + 1, j), ...marks.slice(j + 1)];
      merged = true;
    }
  }
  const activeGroup = findShownGroup(state.group, marks.map(m => m.g)) ?? selectedFacilityGroup(state.group, mapGroups, config.groups, diagram.id);
  const mappedIds = new Set(nearby.flatMap(g => g.memberIds));
  const placed = filtered.filter(f => mappedIds.has(f.id) && (!activeGroup || activeGroup.memberIds.includes(f.id)));
  const allMappedIds = new Set(config.groups.filter(g => g.diagramId === diagram.id).flatMap(g => g.memberIds));
  const unplaced = activeGroup ? [] : filtered.filter(f => !allMappedIds.has(f.id) && (!origin || config.landmarkFacilityIds?.[origin.id] !== undefined || origin.kind !== "station" || config.meta[f.id]?.area === origin.label)).sort((a, b) => (config.meta[a.id]?.order ?? 1e9) - (config.meta[b.id]?.order ?? 1e9) || `${config.meta[a.id]?.area} ${a.name}`.localeCompare(`${config.meta[b.id]?.area} ${b.name}`, "ja"));
  const rows = [...placed, ...unplaced];
  // A selection made elsewhere (search link) may not be among the rows; it is then shown above the list.
  const item = rows.find(f => f.id === state.selected) ?? filtered.find(f => f.id === state.selected);
  const itemInRows = Boolean(item && rows.includes(item));
  const artBox = art ? (() => { const [x, y] = project([art.x + art.width / 2, art.y + art.height / 2]); return { x, y, width: art.width * fit, height: art.height * fit }; })() : null;
  // Side names (e.g. 3塁側 / 1塁側) sit beside the art on the first spot clear of every mark; only with the art in view.
  const sideLabels = art?.sideNames && artBox && !zoomed ? art.sideNames.map((name, i) => {
    const dir = i === 0 ? -1 : 1, sideW = textWidth(name, 7, 11.5) + 8, sideH = 18;
    const start = { x: artBox.x + dir * (artBox.width / 2 + sideW / 2 + 6), y: artBox.y };
    const clear = (c: { x: number; y: number }) => c.x - sideW / 2 >= 4 && c.x + sideW / 2 <= width - 4 && c.y - sideH / 2 >= 4 && c.y + sideH / 2 <= mapHeight - 4
      && !marks.some(m => Math.abs(m.x - c.x) < (MARK_W + sideW) / 2 + 3 && Math.abs(m.y - c.y) < (MARK_H + sideH) / 2 + 3);
    const tries = [0, 1, 2, 3].flatMap(step => [-1, 1, 0].map(v => ({ x: start.x + dir * step * 14, y: start.y + v * step * 16 })));
    const at = tries.find(clear) ?? start;
    return { name, x: at.x, y: at.y, width: sideW, height: sideH };
  }) : [];
  const venueLabel = outsideView ? outsideView.venueLabel : config.venueLabel;
  const venuePoint = state.scope === "場外" && !origin && venueLabel ? project(venueLabel.point) : null;
  const venueWidth = venueLabel ? Math.min(Math.max(80, venueLabel.name.length * 13), Math.max(1, width - 16)) : 0;
  const venueHeight = venueLabel ? Math.ceil(venueLabel.name.length * 13 / venueWidth) * 18 : 0;
  // Gate, entrance and venue labels move around the marks, side names and art. The chosen landmark is always
  // shown; other labels are dropped when no free spot is near ("passage" labels are dropped on collision).
  const anchors = new Map<string, number[]>();
  const labelInputs: MapLabel[] = [];
  const landmarkNames = new Map<string, string>();
  for (const m of mapMarks) {
    const label = config.landmarkLabels?.[m.id] ?? (m.kind === "gate" && /^\d+$/.test(m.label) ? `GATE ${m.label}` : m.label);
    const labelWidth = Math.min(Math.max(72, textWidth(label, 7, 12) + 18), width - 8);
    const [lx, ly] = project(config.landmarkLabelPoints?.[m.id] ?? [m.x, m.y]);
    anchors.set(m.id, project([m.x, m.y]));
    landmarkNames.set(m.id, label);
    labelInputs.push({ id: m.id, kind: m.id === state.origin ? "gate" : "passage", x: clamp(lx, labelWidth / 2 + 4, width - labelWidth / 2 - 4), y: clamp(ly, 24, mapHeight - 24), width: labelWidth, height: 44 });
  }
  if (venuePoint) {
    anchors.set(VENUE_LABEL_ID, venuePoint);
    labelInputs.push({ id: VENUE_LABEL_ID, kind: "gate", x: clamp(venuePoint[0], venueWidth / 2 + 8, width - venueWidth / 2 - 8), y: clamp(venuePoint[1], venueHeight / 2 + 8, mapHeight - venueHeight / 2 - 8), width: venueWidth, height: venueHeight });
  }
  const placedLabels = placeMapLabels(labelInputs, width, mapHeight, {
    reserved: [...marks.map(m => ({ x: m.x, y: m.y, width: MARK_W, height: MARK_H })), ...sideLabels, ...(artBox && !zoomed ? [artBox] : [])],
  });
  const venueBox = placedLabels.find(p => p.id === VENUE_LABEL_ID);
  const markPositions = placedLabels.flatMap(p => {
    const m = mapMarks.find(mark => mark.id === p.id);
    return m ? [{ m, x: p.left, y: p.top, point: anchors.get(m.id)!, label: landmarkNames.get(m.id)! }] : [];
  });
  function clearLandmarkInput() { setLandmarkText(""); setLandmarkError(""); setLandmarkCandidates([]); }
  useVenueFacilitySearchTarget(finderRef, target => {
    const purpose = target === "luggage" ? "荷物" : "赤ちゃん";
    const specific = isBabyFacilitySearch(target);
    const findFacility = (facilities: GuideFacility[], scope: "場内" | "場外", floor: string) =>
      facilities.find(f => specific && inScope(f, { scope, floor }, config) && matchesGuideBabyFacility(target, f));
    const hasPurpose = (facilities: GuideFacility[], scope: "場内" | "場外", floor: string) => target === "luggage"
      ? hasUsableLuggage(facilities, { scope, floor }, config)
      : specific ? Boolean(findFacility(facilities, scope, floor))
        : availablePurposes(facilities, { scope, floor }, config).includes(purpose);
    const floor = [config.defaultFloor, ...config.floors].find(floor => hasPurpose(guide.facilities, "場内", floor));
    const outside = config.outsideViews?.find(view => hasPurpose(facilitiesForOutsideView(guide.facilities, view, config), "場外", config.defaultFloor));
    if (!floor && !outside && (config.outsideViews || !hasPurpose(guide.facilities, "場外", config.defaultFloor))) return false;
    if (!floor && outside) setOutsideViewId(outside.id);
    const scope = floor ? "場内" : "場外";
    const level = floor ?? config.defaultFloor;
    const facilities = scope === "場外" ? facilitiesForOutsideView(guide.facilities, outside, config) : guide.facilities;
    const selected = findFacility(facilities, scope, level);
    setState(s => ({ ...s, scope, floor: level, purpose: selected?.purpose ?? purpose, query: "", toilet: "", group: null, selected: selected?.id ?? null, origin: null }));
    clearLandmarkInput();
    return true;
  });
  function place(patch: Parameters<typeof changeFacilityPlace>[1]) { setState(s => changeFacilityPlace(s, patch, patch.scope === "場外" ? facilitiesForOutsideView(guide.facilities, outsideView, config) : guide.facilities, config)); clearLandmarkInput(); }
  function outsideArea(id: string) { setOutsideViewId(id); setState(changeFacilityOutsideView); clearLandmarkInput(); }
  function purpose(p: Purpose) { setState(s => ({ ...s, purpose: p, query: "", toilet: "", group: null, selected: null })); }
  function selectOrigin(id: string) { setState(s => ({ ...s, origin: id, group: null, selected: null })); setLandmarkCandidates([]); setLandmarkError(""); }
  function whole() { setState(s => ({ ...s, origin: null, group: null, selected: null })); clearLandmarkInput(); }
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    // Read the width now too: the observer reports only after a frame, so the plan would first be laid out at 650px.
    const now = element.getBoundingClientRect().width;
    if (now > 0) setWidth(now);
    const observer = new ResizeObserver(([entry]) => { if (entry.contentRect.width > 0) setWidth(entry.contentRect.width); });
    observer.observe(element);
    return () => observer.disconnect();
  }, [diagram.id, hasMap]);
  // The sticky map's live height goes to CSS, so jumps to a list heading stop just below the map, not behind it.
  useEffect(() => {
    const panel = mapPanel.current, finder = finderRef.current;
    if (!panel || !finder) return;
    const observer = new ResizeObserver(() => finder.style.setProperty("--facility-map-height", `${Math.round(panel.getBoundingClientRect().height)}px`));
    observer.observe(panel);
    return () => observer.disconnect();
  }, []);
  // A row and its detail swap elements; move focus to the new one without scrolling the page.
  useEffect(() => {
    const pending = pendingFocus.current;
    if (!pending) return;
    pendingFocus.current = null;
    const finder = finderRef.current;
    const target = pending.open
      ? finder?.querySelector<HTMLElement>("[data-facility-detail-heading]")
      : finder?.querySelector<HTMLElement>(`[data-facility-row="${CSS.escape(pending.id)}"]`);
    target?.focus({ preventScroll: true });
  }, [state.selected]);
  useImperativeHandle(ref, () => ({
    linkSeatFloor(floor) {
      setState(s => linkFacilitySeatFloor(s, floor, config));
      if (floor && config.floors.includes(floor)) clearLandmarkInput();
    },
    showLuggage() {
      const currentHasLuggage = hasUsableLuggage(viewFacilities, state, config);
      if (!currentHasLuggage && config.outsideViews) {
        const luggageView = config.outsideViews.find(view => hasUsableLuggage(facilitiesForOutsideView(guide.facilities, view, config), { scope: "場外", floor: state.floor }, config));
        if (luggageView) setOutsideViewId(luggageView.id);
      }
      setState(s => ({ ...s, scope: currentHasLuggage ? s.scope : "場外", purpose: "荷物", query: "", toilet: "", group: null, selected: null, origin: null }));
      clearLandmarkInput();
    },
    // Places outside the venue (parking, places to meet): the venue-and-station view, one purpose.
    showNearby(nextPurpose, query = "") {
      const view = config.outsideViews?.find(v => availablePurposes(facilitiesForOutsideView(guide.facilities, v, config), { scope: "場外", floor: state.floor }, config).includes(nextPurpose));
      if (view) setOutsideViewId(view.id);
      setState(s => ({ ...s, scope: "場外", purpose: nextPurpose, query, toilet: "", group: null, selected: null, origin: null }));
      clearLandmarkInput();
    },
  }));
  useEffect(() => {
    const open = (event: Event) => {
      const target = (event as CustomEvent<VenueAccessDetail>).detail;
      if (!target || target.venueId !== guide.venueId) return;
      const d = guide.diagrams?.find(d => d.scope === "場外" && d.id === target.diagramId && d.landmarks.some(m => m.id === target.targetId));
      if (!d) return;
      const outside = config.outsideViews?.find(v => v.diagramId === d.id && (!v.landmarkIds || v.landmarkIds.includes(target.targetId)));
      if (config.outsideViews && !outside) return;
      setOutsideViewId(outside?.id ?? d.id);
      setState(s => ({ ...changeFacilityPlace(s, {scope:"場外"}, facilitiesForOutsideView(guide.facilities, outside, config), config), origin:target.targetId }));
      clearLandmarkInput();
      requestAnimationFrame(() => mapPanel.current?.scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",block:"start"}));
    };
    window.addEventListener(VENUE_ACCESS_EVENT, open);
    return () => window.removeEventListener(VENUE_ACCESS_EVENT, open);
  }, [guide, config]);
  // Rows open in place: the detail replaces the row and the page does not move; the map above marks the place.
  function toggle(f: GuideFacility) {
    const open = state.selected !== f.id;
    if (open) trackVenueFacilityOpen(f.purpose, state.scope, guide.venueId);
    pendingFocus.current = { id: f.id, open };
    setState(s => ({ ...s, selected: open ? f.id : null }));
  }
  function resultRow(f: GuideFacility) {
    if (f.id === state.selected) return detail(f);
    const publicMeta = config.meta[f.id];
    const name = publicMeta?.name ?? f.name, location = publicMeta?.location ?? f.location;
    return <button type="button" key={f.id} className={styles.resultRow} data-facility-id={f.id} data-facility-row={f.id} aria-expanded={false} onClick={() => toggle(f)}>
      <FixtureIcon item={f}/><span><strong>{name}</strong><small>{f.floor}{location !== name ? `・${location}` : ""}</small></span><span aria-hidden="true">›</span>
    </button>;
  }
  function detail(f: GuideFacility) {
    const meta = config.meta[f.id];
    return <div key={f.id} className={styles.detail} data-facility-id={f.id}>
      <div><button type="button" className={styles.detailToggle} aria-expanded={true} data-facility-detail-heading onClick={() => toggle(f)}><FixtureIcon item={f}/><strong>{meta?.name ?? f.name}</strong></button><button type="button" aria-label="設備の詳細を閉じる" onClick={() => toggle(f)}><X size={18}/></button></div>
      <p>{f.floor}・{meta?.location ?? f.location}</p><p>{meta?.detail ?? f.detail}</p>
      {f.purpose === "荷物" && f.kind !== "no-storage" && <p>{f.kind === "baggage-port" ? "バゲッジポート" : f.storageKind === "staffed" ? "店舗での預かり" : "コインロッカー"}・{meta?.accessCondition}</p>}
      {(f.purpose !== "荷物" || f.kind === "no-storage") && meta?.accessCondition && <p>{meta.accessCondition}</p>}
      {(meta?.url || f.bookingUrl) && <a href={f.bookingUrl ?? meta?.url} target="_blank" rel="noopener noreferrer">{f.bookingUrl ? "予約・利用条件" : f.kind === "parking" ? "駐車場の公式ページ" : f.purpose === "飲食" && f.scope === "場外" && f.kind !== "convenience-store" ? "公式の店舗ページ" : f.kind === "park" ? "公園の公式ページ" : (f.purpose === "荷物" && f.kind !== "no-storage") || f.purpose === "飲食" ? "料金・利用案内" : "利用案内"} ↗</a>}
    </div>;
  }
  const band = Math.max(14, 7 / fit);
  return <div className={`${styles.finder} ${mapStyles.finder}`} ref={finderRef} data-testid="venue-facility-finder">
    <div className={styles.toolbar}>
      <div className={styles.controlRow}><span className={styles.rowLabel}>場所</span><div className={styles.topRow}>
        <div className={styles.buttons}>{(["場内", "場外"] as const).map(scope => <button type="button" key={scope} aria-pressed={scope === state.scope} onClick={() => place({ scope })}>{scope === "場外" ? "場外・入場前" : scope}</button>)}</div>
        <div className={styles.buttons}>{config.floors.map(floor => <button type="button" key={floor} disabled={state.scope === "場外"} aria-pressed={state.scope === "場内" && floor === state.floor} onClick={() => place({ floor })}>{floor}</button>)}</div>
      </div></div>
      {state.scope === "場外" && config.outsideViews && <div className={styles.controlRow}><span className={styles.rowLabel}>区域</span><div className={styles.buttons}>{config.outsideViews.map(view => <button type="button" key={view.id} aria-pressed={view.id === outsideView?.id} onClick={() => outsideArea(view.id)}>{view.label}</button>)}</div></div>}
      <div className={styles.controlRow}><span className={styles.rowLabel}>設備</span><div className={styles.purposes}>{purposes.map(p => { const Icon = purposeIcons[p]; return <button type="button" key={p} disabled={!available.includes(p)} aria-pressed={state.purpose === p} onClick={() => purpose(p)}><Icon size={21}/><span>{p}</span></button>; })}</div></div>
      {state.purpose === "トイレ" && <div className={styles.controlRow}><span className={styles.rowLabel}>種類</span><div className={styles.buttons}>{[["women", "女性"], ["men", "男性"], ["accessible", "バリアフリー"]].map(([id, label]) => <button type="button" key={id} aria-pressed={state.toilet === id} onClick={() => setState(s => ({ ...s, toilet: s.toilet === id ? "" : id, group: null, selected: null }))}>{label}</button>)}</div></div>}
      {state.purpose === "飲食" && <div className={styles.controlRow}><span className={styles.rowLabel}>検索</span><input className={styles.wordSearch} aria-label={state.purpose === "飲食" ? "店名・食べたいもの" : "駅名・施設名"} placeholder={state.purpose === "飲食" ? "店名・食べたいもの" : "駅名・施設名"} value={state.query} onChange={e => setState(s => ({ ...s, query: e.target.value, selected: null }))}/></div>}
      <div className={styles.controlRow}><span className={styles.rowLabel}>目印</span><form className={mapStyles.landmarkForm} onSubmit={e => { e.preventDefault(); const results = resolveLandmarks(diagram, landmarkText, config.aliases); if (results.length === 1) selectOrigin(results[0].id); else { setLandmarkCandidates(results.map(m => m.id)); setLandmarkError(results.length ? "場所を選んでください。" : "この階・場所では見つかりません。ゲート番号や入口名を確認してください。"); } }}>
        <label htmlFor={landmarkInputId}>{state.scope === "場内" ? "ゲート・入口・柱" : "駅・ゲート"}</label><input id={landmarkInputId} disabled={!diagram.landmarks.length} value={landmarkText} onChange={e => setLandmarkText(e.target.value)} placeholder={!diagram.landmarks.length ? "この階の目印は未掲載" : state.scope === "場内" ? config.landmarkPlaceholder?.inside ?? "例：301 / メイン" : config.landmarkPlaceholder?.outside ?? "例：新高島駅"}/><button type="submit" disabled={!diagram.landmarks.length}>表示</button>
        {landmarkError && <p role="status">{landmarkError}</p>}{landmarkCandidates.map(id => <button type="button" key={id} onClick={() => selectOrigin(id)}>{diagram.landmarks.find(m => m.id === id)!.label}</button>)}
      </form></div>
    </div>
    <div className={styles.body}>
      <div ref={mapPanel} className={`${styles.mapPanel} ${mapStyles.stickyMap}`} data-facility-map-panel tabIndex={-1}>
        <div className={styles.panelHeading}><strong>{state.scope === "場内" ? state.floor : outsideView?.floorLabel ?? outsideView?.label ?? "会場・主要駅の位置関係"}{origin ? `・${config.landmarkLabels?.[origin.id] ?? origin.label}周辺` : ""}</strong>{hasMap && state.scope === "場内" && <PlanLegend concourse={diagram.concoursePaths.length > 0} context={diagram.contextPaths.length > 0}/>}<button type="button" onClick={whole}>全体図へ</button></div>
        {hasMap ? <div ref={canvas} className={mapStyles.canvas} style={{ height: mapHeight }} data-testid="facility-map" data-diagram={diagram.id} data-access-origin={state.origin ?? ""}>
          <svg viewBox={`0 0 ${width} ${mapHeight}`} aria-hidden="true">
            <g transform={`translate(${offsetX} ${offsetY}) scale(${fit}) translate(${-frame[0]} ${-frame[1]})`}>
              {diagram.contextPaths.map((d, i) => <path key={`context-${i}`} d={d} className={mapStyles.contextFill}/>)}
              {/* The art sits on the grey fills (a filled floor would hide it) but under every plan line. */}
              {art && <image href={art.image.href} x={art.x} y={art.y} width={art.width} height={art.height} preserveAspectRatio="xMidYMid meet" data-field-art=""/>}
              {diagram.contextPaths.map((d, i) => <path key={`context-line-${i}`} d={d} className={mapStyles.contextLine} strokeWidth={1 / fit}/>)}
              {diagram.concoursePaths.map((d, i) => <path key={`concourse-edge-${i}`} d={d} className={mapStyles.concourseEdge} strokeWidth={band + 2.4 / fit}/>)}
              {diagram.concoursePaths.map((d, i) => <path key={`concourse-${i}`} d={d} className={mapStyles.concourseBand} strokeWidth={band}/>)}
            </g>
          </svg>
          <svg viewBox={`0 0 ${width} ${mapHeight}`} aria-hidden="true">{venueBox && venuePoint && Math.hypot(venueBox.left - venuePoint[0], venueBox.top - venuePoint[1]) > 8 && <line x1={venuePoint[0]} y1={venuePoint[1]} x2={venueBox.left} y2={venueBox.top} stroke="#c390a8"/>}{markPositions.filter(p => Math.hypot(p.x - p.point[0], p.y - p.point[1]) > 8).map(p => <line key={p.m.id} x1={p.point[0]} y1={p.point[1]} x2={p.x} y2={p.y} stroke="#c7b395"/>)}</svg>
          {sideLabels.map(side => <span key={side.name} className={mapStyles.sideName} style={{ left: side.x, top: side.y, width: side.width }} aria-hidden="true">{side.name}</span>)}
          {marks.map(({ g, x, y }) => <button type="button" key={g.id} className={mapStyles.marker} style={{ left: x, top: y }} data-pin-density={compactPins ? "compact" : undefined} data-spot-ids={g.memberIds.join(" ")} aria-pressed={activeGroup?.id === g.id || (state.selected !== null && g.memberIds.includes(state.selected))} aria-label={`${g.label}・${g.purpose} ${g.memberIds.length}件`} onClick={event => {
            setState(s => ({ ...s, group: g.id, selected: null }));
            navigation.openList(event.currentTarget);
          }}>
            <span className={mapStyles.markerFace}><GroupIcon compact={compactPins} items={g.memberIds.map(id => guide.facilities.find(f => f.id === id)!)}/></span>{g.memberIds.length > 1 && <small>{g.memberIds.length}</small>}
          </button>)}
          {markPositions.map(({ m, x, y, label }) => <button type="button" className={mapStyles.landmark} key={m.id} style={{ left: x, top: y }} aria-pressed={state.origin === m.id} onClick={() => selectOrigin(m.id)}>{m.kind === "gate" ? <VenueGateLabel label={label}/> : label}</button>)}
          {state.scope === "場外" && <>{(!outsideView || outsideView.northUp || outsideView.northDirection) && <span className={mapStyles.north}>北 {outsideView?.northDirection ?? "↑"}</span>}<span className={mapStyles.schematic}>位置関係の略図</span>{venueLabel && venueBox && <span className={mapStyles.venueName} style={{ left: venueBox.left, top: venueBox.top, width: venueBox.width }}>{venueLabel.name}</span>}</>}
        </div> : <p className={styles.noMap}>場所の案内から設備を選んでください。</p>}
      </div>
      <div className={styles.results}>
        {activeGroup ? <FacilityAreaResultsHeading count={placed.length} area={activeGroup.area}
          onReturn={() => { setState(s => ({ ...s, group: null, selected: null })); navigation.backToMap(); }} />
          : <div className={styles.panelHeading}><strong>{state.purpose}　地図 {placed.length}件{unplaced.length > 0 ? `・場所の案内 ${unplaced.length}件` : ""}</strong>{(state.group || state.query || state.toilet) && <button type="button" onClick={() => setState(s => ({ ...s, group: null, query: "", toilet: "", selected: null }))}>絞込み解除</button>}</div>}
        {item && !itemInRows && detail(item)}
        <div className={`${styles.list} ${styles.pageList}`}>
          {placed.map(resultRow)}
          {unplaced.length > 0 && <div className={styles.unplaced}><p>場所の案内{origin?.kind === "station" ? `・${origin.label}` : ""}　{unplaced.length}件</p>{unplaced.map(resultRow)}</div>}
          {!placed.length && !unplaced.length && <div className={styles.empty}>この条件で掲載している設備はありません。
            {state.query && <button type="button" onClick={() => setState(s => ({ ...s, query: "" }))}>検索を解除</button>}
            {origin && <button type="button" onClick={whole}>この階・場所の全体を見る</button>}
            {state.scope === "場内" && <button type="button" onClick={() => place({ scope: "場外" })}>場外・入場前で探す</button>}
            {state.scope === "場外" && config.outsideViews?.filter(view => view.id !== outsideView?.id && availablePurposes(facilitiesForOutsideView(guide.facilities, view, config), { scope: "場外", floor: state.floor }, config).includes(state.purpose)).map(view => <button type="button" key={view.id} onClick={() => outsideArea(view.id)}>{view.label}で探す</button>)}
            {config.floors.filter(f => (state.scope === "場外" || f !== state.floor) && availablePurposes(guide.facilities, { scope: "場内", floor: f }, config).includes(state.purpose)).map(f => <button type="button" key={f} onClick={() => place({ scope: "場内", floor: f })}>{state.scope === "場外" ? "場内 " : ""}{f}で探す</button>)}
          </div>}
        </div>
      </div>
    </div>
  </div>;
}
