"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type PointerEvent as ReactPointerEvent } from "react";
import ReadySearchControl from "./template/ReadySearchControl";
import geometry from "@/data/tokyoDomeSeatGeometry.json";
import { TOKYO_DOME_GATE_ANCHORS } from "@/data/tokyoDomeGateAnchors";
import { TOKYO_DOME_INNER_GATE_BOUNDARIES, TOKYO_DOME_OUTER_GATE_BOUNDARIES, TOKYO_DOME_OVERVIEW_HOME_CAP } from "@/data/tokyoDomeGateStructure";
import { TOKYO_DOME_SPECIAL_LABELS } from "@/data/tokyoDomeSpecialSeatLabels";
import { TOKYO_DOME_ROW_CORRECTIONS } from "@/data/tokyoDomeSeatRowCorrections";
import { TOKYO_DOME_NARROW_ROW_CORRECTIONS, TOKYO_DOME_SHAPE_CORRECTIONS } from "@/data/tokyoDomeSeatShapeCorrections";
import { buildTokyoDomeBalconySegments } from "@/lib/tokyoDomeBalconySegments";
import { findTokyoDomeVerifiedSeats, getTokyoDomeVerifiedRowRange, getTokyoDomeVerifiedSeatBlock, getTokyoDomeVerifiedPrintedRows, isTokyoDomeSectionRowSelectable, getTokyoDomeNumberReference, parseTokyoDomeSection, type TokyoDomeSection } from "@/lib/tokyoDomeSeatLocator";
import { sectionRowGuides } from "@/lib/tokyoDomeSeatRows";
import { placeTokyoDomeRowMarker, tokyoDomeNumberClearOfRows, layoutTokyoDomeSeatLabels, TOKYO_DOME_OVERVIEW_AREAS, tokyoDomeOverviewView } from "@/lib/tokyoDomeSeatLabels";
import { LocateFixed, X } from "lucide-react";
import styles from "./TokyoDomeSeatLocator.module.css";
import controls from "./guides/KyoceraSeatMap.module.css";
import { TOKYO_DOME_SEAT_NUMBER_GUIDES } from "@/data/tokyoDomeSeatNumberGuides";
import { spatialSeatTarget } from "@/lib/seatMapInteraction";
import { numberBadgePath, placeNumberLabel } from "./guides/kyoceraNumberLabels";
import { DomeSeatFrame } from "./template/DomeSeatFrame";
import { getTokyoDomeVenueSeatSelection, TOKYO_DOME_SEAT_SELECTION_EVENT } from "@/lib/tokyoDomeVenueSelection";

type SeatArea = { code: string; label: [number, number]; path: string | null; shared: boolean; rows: [number, number] | null };
const SOURCE_AREAS = geometry.sections as SeatArea[];
const SPECIAL_BY_CODE = new Map<string, (typeof TOKYO_DOME_SPECIAL_LABELS)[number]>(TOKYO_DOME_SPECIAL_LABELS.map((area) => [area.code, area]));
const AREAS = SOURCE_AREAS.map((area) => ({
  ...area,
  path: TOKYO_DOME_SHAPE_CORRECTIONS[area.code]
    ?? area.path
    ?? null,
  shared: TOKYO_DOME_SHAPE_CORRECTIONS[area.code] ? false : area.shared,
  rows: getTokyoDomeVerifiedRowRange(area.code) ?? area.rows ?? TOKYO_DOME_ROW_CORRECTIONS[area.code] ?? TOKYO_DOME_NARROW_ROW_CORRECTIONS[area.code] ?? null,
}));
const AREA_BY_CODE = new Map(AREAS.map((area) => [area.code, area]));
const BALCONY_SEGMENTS = buildTokyoDomeBalconySegments();
const BALCONY_GROUP_PATHS = [...new Set(BALCONY_SEGMENTS.map((segment) => segment.sourcePath))];
const BALCONY_DIVIDERS = [...new Map(BALCONY_SEGMENTS.flatMap((segment) => [segment.beforeDivider, segment.afterDivider])
  .map((divider) => [`${divider[0].join(",")}-${divider[1].join(",")}`, divider])).values()];
const SHAPES = [...new Map(AREAS.filter((area) => area.path && /^[ABDEF]/.test(area.code)).map((area) => [area.path!, area])).values()]
  .sort((left, right) => Number(right.shared) - Number(left.shared));
const ROW_GUIDES = new Map(AREAS.filter((area) => area.path && area.rows && !area.shared)
  .map((area) => [area.code, sectionRowGuides(area.path!, area.rows!, area.label, getTokyoDomeVerifiedPrintedRows(area.code))]));
const MAP_VIEWS = {
  all: { label: "全体", box: "145 26 900 790" },
  first: { label: "1塁側", box: "585 143 435 485" },
  home: { label: "ホーム側", box: "333 396 492 415" },
  third: { label: "3塁側", box: "140 143 435 485" },
  right: { label:"外野ライト", box:"575 26 390 320" },
  left: { label:"外野レフト", box:"180 26 390 320" },
  outfield: { label: "外野側", box: "282 26 594 300" },
} as const;
type MapViewBox = { x: number; y: number; width: number; height: number };
type MapPoint = { x: number; y: number };
type MapGesture =
  | { kind: "pan"; start: MapPoint; box: MapViewBox }
  | { kind: "pinch"; startDistance: number; startMidpoint: MapPoint; box: MapViewBox };

const FULL_MAP_VIEW_BOX = parseMapViewBox(MAP_VIEWS.all.box);
const MIN_MAP_VIEW_WIDTH = 82;

function parseMapViewBox(value: string): MapViewBox {
  const [x, y, width, height] = value.split(" ").map(Number);
  return { x, y, width, height };
}

function serializeMapViewBox(box: MapViewBox) {
  return `${box.x} ${box.y} ${box.width} ${box.height}`;
}

function distance(left: MapPoint, right: MapPoint) {
  return Math.hypot(right.x - left.x, right.y - left.y);
}

function midpoint(left: MapPoint, right: MapPoint): MapPoint {
  return { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 };
}

function mapScale(rect: DOMRect, box: MapViewBox) {
  return Math.min(rect.width / box.width, rect.height / box.height);
}

function mapPointAtClient(rect: DOMRect, box: MapViewBox, point: MapPoint): MapPoint {
  const scale = mapScale(rect, box);
  return {
    x: box.x + (point.x - rect.left - (rect.width - box.width * scale) / 2) / scale,
    y: box.y + (point.y - rect.top - (rect.height - box.height * scale) / 2) / scale,
  };
}

function boxAtAnchor(rect: DOMRect, next: MapViewBox, anchor: MapPoint, client: MapPoint): MapViewBox {
  const scale = mapScale(rect, next);
  return constrainMapViewBox({
    ...next,
    x: anchor.x - (client.x - rect.left - (rect.width - next.width * scale) / 2) / scale,
    y: anchor.y - (client.y - rect.top - (rect.height - next.height * scale) / 2) / scale,
  });
}

function constrainMapViewBox(next: MapViewBox): MapViewBox {
  const maxWidth = FULL_MAP_VIEW_BOX.width;
  const width = Math.max(MIN_MAP_VIEW_WIDTH, Math.min(maxWidth, next.width));
  const scale = width / next.width;
  const height = Math.min(FULL_MAP_VIEW_BOX.height, next.height * scale);
  const padding=width<maxWidth?{x:width/2,y:height/2}:{x:0,y:0};
  return {
    x: Math.max(FULL_MAP_VIEW_BOX.x-padding.x, Math.min(FULL_MAP_VIEW_BOX.x + FULL_MAP_VIEW_BOX.width - width+padding.x, next.x)),
    y: Math.max(FULL_MAP_VIEW_BOX.y-padding.y, Math.min(FULL_MAP_VIEW_BOX.y + FULL_MAP_VIEW_BOX.height - height+padding.y, next.y)),
    width,
    height,
  };
}
const ZONE_COLORS: Record<string, string> = {
  A: "#f8b9d0", B: "#e98eb4", C: "#f9d2ab",
  D: "#d0c7ef", E: "#aeb6e8", F: "#9ddacb",
};
const ZONE_NAMES = [
  { key: "A", label: "1階 前方" }, { key: "B", label: "1階 後方" },
  { key: "C", label: "バルコニー" }, { key: "D", label: "2階 前方" },
  { key: "E", label: "2階 後方" }, { key: "F", label: "外野" },
] as const;
const SEAT_LEVELS = [
  { id: "all", label: "すべて", prefixes: "ABCDEF", color: "#a93164" },
  { id: "lower", label: "1階席", prefixes: "AB", color: "#e98eb4" },
  { id: "upper", label: "2階席", prefixes: "DE", color: "#aeb6e8" },
  { id: "balcony", label: "バルコニー", prefixes: "C", color: "#f9d2ab" },
  { id: "outfield", label: "外野", prefixes: "F", color: "#9ddacb" },
] as const;
type SeatLevel = typeof SEAT_LEVELS[number]["id"];
function levelForPrefix(prefix: string): SeatLevel {
  return SEAT_LEVELS.find(level => level.id !== "all" && level.prefixes.includes(prefix))?.id ?? "all";
}
function selectedMapViewBox(_section: TokyoDomeSection, label: [number, number], width=320) {
  return serializeMapViewBox(constrainMapViewBox({x:label[0]-width/2,y:label[1]-width*.44,width,height:width*.88}));
}

export function TokyoDomeSeatLocator() {
  const mapSvgRef = useRef<SVGSVGElement>(null);
  const mapCanvasRef = useRef<HTMLDivElement>(null);
  const [canvasSize,setCanvasSize]=useState({width:900,height:650});
  useEffect(()=>{const node=mapCanvasRef.current;if(!node)return;const observer=new ResizeObserver(([entry])=>setCanvasSize({width:entry.contentRect.width,height:entry.contentRect.height}));observer.observe(node);return()=>observer.disconnect();},[]);
  const [tapHint, setTapHint] = useState(false);
  const hintFinishedRef = useRef(false);
  useEffect(() => {
    const node = mapCanvasRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || hintFinishedRef.current) return;
      hintFinishedRef.current = true;
      setTapHint(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
      observer.disconnect();
    }, { threshold: .3 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const pointerPositionsRef = useRef(new Map<number, MapPoint>());
  const pointerStartsRef = useRef(new Map<number, { point: MapPoint; code: string | null }>());
  const gestureRef = useRef<MapGesture | null>(null);
  const didPanRef = useRef(false);
  const [seatLevel, setSeatLevel] = useState<SeatLevel>("all");
  const [direction,setDirection]=useState<keyof typeof MAP_VIEWS>("all");
  const [candidates,setCandidates]=useState<SeatArea[]>([]);
  const [rowInput, setRowInput] = useState("");
  const [seatInput, setSeatInput] = useState("");
  const [selected, setSelected] = useState<TokyoDomeSection | null>(null);
  const [focusedCode, setFocusedCode] = useState("B26");
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const selectedArea = selected ? AREA_BY_CODE.get(selected.code) : undefined;
  const selectedSpecial = selected ? SPECIAL_BY_CODE.get(selected.code) : undefined;
  const selectedLabel = selectedArea?.label ?? selectedSpecial?.label;
  const verifiedBlock = selected ? getTokyoDomeVerifiedSeatBlock(selected.code) : undefined;
  useEffect(() => {
    window.dispatchEvent(new CustomEvent(TOKYO_DOME_SEAT_SELECTION_EVENT, {
      detail: selected ? getTokyoDomeVenueSeatSelection(selected.code, selectedRow, selectedLabel) : null,
    }));
  }, [selected, selectedRow, selectedLabel]);
  const selectedZone = selectedArea ? ZONE_NAMES.find((zone) => zone.key === selectedArea.code[0])?.label : undefined;
  const selectedSide = verifiedBlock ? { first: "1塁側", home: "ホーム側", third: "3塁側" }[verifiedBlock.area]
    : selectedArea?.code.startsWith("F") ? "外野側" : selectedLabel
    ? selectedLabel[0] < 564 ? "3塁側" : selectedLabel[0] > 594 ? "1塁側" : "ホーム側"
    : undefined;
  const [interactiveViewBox, setInteractiveViewBox] = useState<MapViewBox>(FULL_MAP_VIEW_BOX);
  const showDetail = interactiveViewBox.width <= 680;
  const activePrefixes = SEAT_LEVELS.find(level => level.id === seatLevel)!.prefixes;
  const matchesLevel = (code: string) => seatLevel === "all" || activePrefixes.includes(code[0]);
  const screenScale = Math.min(canvasSize.width / interactiveViewBox.width, canvasSize.height / interactiveViewBox.height);
  const overviewScale = Math.min(canvasSize.width / FULL_MAP_VIEW_BOX.width, canvasSize.height / FULL_MAP_VIEW_BOX.height);
  const detailStage=Boolean(selected)&&interactiveViewBox.width<=360;
  const mapLabels = layoutTokyoDomeSeatLabels(AREAS.filter(area => matchesLevel(area.code)), interactiveViewBox)
    .map(label => detailStage ? label : { ...label, angle: 0, fontSize: Math.max(label.fontSize, 12 / screenScale) });
  const visibleAreas = AREAS.filter(area => {
    if (area.shared || (!area.path && !BALCONY_SEGMENTS.some(segment => segment.code === area.code))) return false;
    const x = (canvasSize.width - interactiveViewBox.width * screenScale) / 2 + (area.label[0] - interactiveViewBox.x) * screenScale;
    const y = (canvasSize.height - interactiveViewBox.height * screenScale) / 2 + (area.label[1] - interactiveViewBox.y) * screenScale;
    return x >= 0 && x <= canvasSize.width && y >= 0 && y <= canvasSize.height;
  });
  const activeFocus = visibleAreas.some(area => area.code === focusedCode) ? focusedCode : visibleAreas.find(area => matchesLevel(area.code))?.code;
  function keyArea(event: React.KeyboardEvent<SVGPathElement>, area: SeatArea) {
    if (["Enter", " "].includes(event.key)) { event.preventDefault(); chooseArea(area); return; }
    const next = spatialSeatTarget(visibleAreas.map(a => ({ id: a.code, x: a.label[0], y: a.label[1] })), area.code, event.key);
    if (!next) return;
    event.preventDefault(); setFocusedCode(next.id);
    mapSvgRef.current?.querySelector<SVGPathElement>(`path[data-seat-code="${next.id}"]`)?.focus({ preventScroll: true });
  }
  const verifiedEdge = verifiedBlock?.numberEdge;
  const numberReference = selected ? getTokyoDomeNumberReference(selected.code, selectedRow) : null;
  const selectedRowNote = verifiedBlock?.rows.find(row => row.row === selectedRow)?.note;
  const verifiedNumberGuide = detailStage && verifiedEdge ? (() => {
    const [x,y] = verifiedEdge.numberEdgeMiddle;
    const dx = verifiedEdge.opposite[0]-x, dy = verifiedEdge.opposite[1]-y, length = Math.hypot(dx,dy);
    return { id: `verified-${verifiedBlock!.code}`, number: numberReference!.start, point: [x,y], direction: [dx/length,dy/length] };
  })() : null;
  const numberGuides=detailStage?TOKYO_DOME_SEAT_NUMBER_GUIDES.filter(guide=>
    (seatLevel==="all"||guide.level===seatLevel) && (!verifiedNumberGuide ||
      Math.abs(guide.point[0]-verifiedNumberGuide.point[0])*screenScale>80 || Math.abs(guide.point[1]-verifiedNumberGuide.point[1])*screenScale>38)) : [];
  const selectedEdgeMarkers = [...new Set(selectedArea?.rows ?? [])].map(row=>{
    const anchor=selectedArea?ROW_GUIDES.get(selectedArea.code)?.marker(row):null;
    if(!anchor)return {row,point:null,anchor:null};
    const occupied=[...TOKYO_DOME_GATE_ANCHORS.map(gate=>({x:gate.label.x,y:gate.label.y,halfWidth:17,halfHeight:7})),...(verifiedNumberGuide ? [verifiedNumberGuide] : []).map(guide=>({x:guide.point[0],y:guide.point[1],halfWidth:28/screenScale,halfHeight:18/screenScale}))];
    return {row,anchor,point:placeTokyoDomeRowMarker(anchor,occupied,screenScale)};
  });
  const clearNumberGuides = numberGuides.filter(guide =>
    tokyoDomeNumberClearOfRows(guide.point, selectedEdgeMarkers.map(marker => marker.point), screenScale));
  const displayedNumberGuides = verifiedNumberGuide ? [...clearNumberGuides, verifiedNumberGuide] : clearNumberGuides;

  function resetGestures() {
    pointerPositionsRef.current.clear();
    pointerStartsRef.current.clear();
    gestureRef.current = null;
  }

  const animationRef=useRef<number|null>(null);
  useEffect(()=>()=>{if(animationRef.current!==null)cancelAnimationFrame(animationRef.current);},[]);
  function animateTo(next:MapViewBox) {
    hintFinishedRef.current = true; setTapHint(false);
    if(animationRef.current!==null)cancelAnimationFrame(animationRef.current);
    if(window.matchMedia("(prefers-reduced-motion: reduce)").matches){setInteractiveViewBox(next);return;}
    const from=interactiveViewBox;let start:number|null=null;
    const step=(now:number)=>{
      start??=now;
      const progress=Math.min(1,(now-start)/220),eased=1-Math.pow(1-progress,3);
      setInteractiveViewBox({x:from.x+(next.x-from.x)*eased,y:from.y+(next.y-from.y)*eased,width:from.width+(next.width-from.width)*eased,height:from.height+(next.height-from.height)*eased});
      animationRef.current=progress<1?requestAnimationFrame(step):null;
    };
    animationRef.current=requestAnimationFrame(step);
  }

  function showMapView(view: keyof typeof MAP_VIEWS) {
    setDirection(view);
    const area = TOKYO_DOME_OVERVIEW_AREAS.find(area => area.id === view);
    animateTo(area ? constrainMapViewBox(tokyoDomeOverviewView(area.id, canvasSize)) : parseMapViewBox(MAP_VIEWS[view].box));
    resetGestures();
  }

  function showSelectedView(section: TokyoDomeSection, label: [number, number]) {
    animateTo(parseMapViewBox(selectedMapViewBox(section, label,Math.max(140,Math.min(320,(mapCanvasRef.current?.clientWidth??840)*.48)))));
    resetGestures();
  }

  const zoomMap = useCallback((factor: number, clientPoint?: MapPoint) => {
    hintFinishedRef.current = true; setTapHint(false);
    if(animationRef.current!==null)cancelAnimationFrame(animationRef.current);
    const svg = mapSvgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const point = clientPoint ?? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    setInteractiveViewBox((current) => {
      const nextWidth = Math.max(MIN_MAP_VIEW_WIDTH, Math.min(FULL_MAP_VIEW_BOX.width, current.width * factor));
      const actualFactor = nextWidth / current.width;
      const nextHeight = current.height * actualFactor;
      return boxAtAnchor(rect, { ...current, width: nextWidth, height: nextHeight }, mapPointAtClient(rect, current, point), point);
    });
  }, []);

  useEffect(() => {
    const svg = mapSvgRef.current;
    if (!svg) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      zoomMap(Math.exp(event.deltaY * 0.0015), { x: event.clientX, y: event.clientY });
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [zoomMap]);



  function startGesture() {
    const points = [...pointerPositionsRef.current.values()];
    if (points.length >= 2) {
      gestureRef.current = {
        kind: "pinch",
        startDistance: distance(points[0], points[1]),
        startMidpoint: midpoint(points[0], points[1]),
        box: interactiveViewBox,
      };
    } else if (points.length === 1) {
      gestureRef.current = { kind: "pan", start: points[0], box: interactiveViewBox };
    } else {
      gestureRef.current = null;
    }
  }

  function handleMapPointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    hintFinishedRef.current = true; setTapHint(false);
    event.preventDefault();
    if(animationRef.current!==null)cancelAnimationFrame(animationRef.current);
    const target = event.target instanceof Element ? event.target.closest<SVGElement>("[data-seat-code]") : null;
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = { x: event.clientX, y: event.clientY };
    pointerPositionsRef.current.set(event.pointerId, point);
    pointerStartsRef.current.set(event.pointerId, { point, code: target?.dataset.seatCode ?? null });
    if (pointerPositionsRef.current.size === 1) didPanRef.current = false;
    else didPanRef.current = true;
    startGesture();
  }

  function handleMapPointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    if (!pointerPositionsRef.current.has(event.pointerId)) return;
    pointerPositionsRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const svg = mapSvgRef.current;
    const gesture = gestureRef.current;
    if (!svg || !gesture) return;
    const rect = svg.getBoundingClientRect();
    const points = [...pointerPositionsRef.current.values()];

    if (gesture.kind === "pinch" && points.length >= 2) {
      const currentDistance = Math.max(1, distance(points[0], points[1]));
      const currentMidpoint = midpoint(points[0], points[1]);
      const rawScale = gesture.startDistance / currentDistance;
      const nextWidth = Math.max(MIN_MAP_VIEW_WIDTH, Math.min(FULL_MAP_VIEW_BOX.width, gesture.box.width * rawScale));
      const actualScale = nextWidth / gesture.box.width;
      const nextHeight = gesture.box.height * actualScale;
      didPanRef.current = true;
      setInteractiveViewBox(boxAtAnchor(rect, { ...gesture.box, width: nextWidth, height: nextHeight }, mapPointAtClient(rect, gesture.box, gesture.startMidpoint), currentMidpoint));
      return;
    }

    if (gesture.kind === "pan" && points.length === 1) {
      const dx = points[0].x - gesture.start.x;
      const dy = points[0].y - gesture.start.y;
      if (Math.hypot(dx, dy) > 6) didPanRef.current = true;
      if (!didPanRef.current) return;
      setInteractiveViewBox(constrainMapViewBox({
        ...gesture.box,
        x: gesture.box.x - dx / mapScale(rect, gesture.box),
        y: gesture.box.y - dy / mapScale(rect, gesture.box),
      }));
    }
  }

  function handleMapPointerEnd(event: ReactPointerEvent<SVGSVGElement>) {
    if (!pointerPositionsRef.current.has(event.pointerId)) return;
    if (event.type !== "pointerup") {
      const ids = [...pointerPositionsRef.current.keys()]; resetGestures(); didPanRef.current = true;
      for (const id of ids) if (event.currentTarget.hasPointerCapture(id)) event.currentTarget.releasePointerCapture(id);
      return;
    }
    const start = pointerStartsRef.current.get(event.pointerId);
    const shouldSelect = event.type === "pointerup" && pointerPositionsRef.current.size === 1 && !didPanRef.current
      && start?.code && distance(start.point, { x: event.clientX, y: event.clientY }) <= 6;
    pointerPositionsRef.current.delete(event.pointerId);
    pointerStartsRef.current.delete(event.pointerId);
    startGesture();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (pointerPositionsRef.current.size === 0) didPanRef.current = false;
    if (shouldSelect && start?.code) {
      const area = AREA_BY_CODE.get(start.code);
      if (area) chooseArea(area);
    }
  }

  function clearSelection() {
    setSelected(null); setSelectedRow(null); setSelectedSeat(null); setNotice(""); setError(""); setCandidates([]);
  }

  function showWhole() {clearSelection();setSeatLevel("all");showMapView("all");}
  function chooseDirection(view:keyof typeof MAP_VIEWS) {
    if(view==="all"){showWhole();return;}
    clearSelection();showMapView(view);
  }
  function chooseLevel(level:SeatLevel) {
    setSeatLevel(level);clearSelection();
    showMapView(level==="outfield"&&direction==="all"?"outfield":direction);
  }
  function chooseArea(area:SeatArea,locate=false) {
    const section=parseTokyoDomeSection(area.code);if(!section)return;
    const shouldMove=locate||!selected||interactiveViewBox.width>360;
    setFocusedCode(area.code);setSeatLevel(levelForPrefix(section.prefix));setSelected(section);setSelectedRow(null);setSelectedSeat(null);setError("");setNotice("");setCandidates([]);
    if(shouldMove)showSelectedView(section,area.label);else{resetGestures();}
    setDirection(getTokyoDomeVerifiedSeatBlock(area.code)?.area ?? (area.code.startsWith("F")?(area.label[0]>579?"right":"left"):area.label[0]>594?"first":area.label[0]<564?"third":"home"));
  }

  function chooseCode(code: string) {
    const area = AREA_BY_CODE.get(code);
    if (area) { chooseArea(area,true); return; }
    const special = SPECIAL_BY_CODE.get(code), section = parseTokyoDomeSection(code);
    if (!special || !section) return;
    setSeatLevel("all"); setSelected(section); setSelectedRow(null); setSelectedSeat(null); setNotice(""); setError("");
    showSelectedView(section, special.label);
  }

  function handleSubmit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();clearSelection();
    const raw=seatInput.normalize("NFKC").trim().toUpperCase();
    const normalizedRow=rowInput.normalize("NFKC").replace(/\s/g,"").replace(/列$/,""), row=Number(normalizedRow);
    const code=parseTokyoDomeSection(raw);
    if(code){
      const target=AREA_BY_CODE.get(code.code);
      if(rowInput.trim()&&(!/^\d+$/.test(normalizedRow)||!isTokyoDomeSectionRowSelectable(code.code,row,target?.rows))){setError("このブロックの列を確認してください。");return;}
      chooseCode(code.code);if(rowInput.trim())setSelectedRow(row);return;
    }
    const num=raw.replace(/番$/,"");
    if(!/^\d+$/.test(normalizedRow)||!/^\d+$/.test(num)){setError("列と番号、またはブロック名（例：E23）を入力してください。");return;}
    if(["balcony","outfield"].includes(seatLevel)||["left","right","outfield"].includes(direction)){setError("この席種は地図、または区画名（例：F12）で探せます。列・番号検索は準備中です。");return;}
    const found=findTokyoDomeVerifiedSeats(row,Number(num),seatLevel,direction).flatMap(block=>{const area=AREA_BY_CODE.get(block.code);return area?[area]:[];});
    if(!found.length){setError("この列・番号はまだ確認できていません。区画名（例：A25）で探すか、公式の座席図を確認してください。");return;}
    if(found.length>1){setCandidates(found);return;}
    chooseArea(found[0],true);setSelectedRow(row);setSelectedSeat(Number(num));setNotice("列の線は位置の目安です。");
  }

  return <section className="border-y border-[#eddfe5] bg-[#fffafb] py-8 sm:py-10" aria-labelledby="tokyo-dome-map-title">
    <div className="zr-container">
      <p className="artist-kicker">Seat finder</p>
      <h2 id="tokyo-dome-map-title" className={`artist-heading ${styles.title}`}>東京ドームの座席を探す</h2>
      <DomeSeatFrame className={`mt-5 ${controls.seatFrame}`} levels={SEAT_LEVELS} level={seatLevel}
        onLevel={id=>chooseLevel(id as SeatLevel)} directions={(["all","first","home","third","right","left"] as const).map(id=>({id,label:MAP_VIEWS[id].label}))}
        direction={direction} onDirection={id=>chooseDirection(id as keyof typeof MAP_VIEWS)} onZoom={zoomMap} onWhole={showWhole} shortcuts={[]}
        directionExtra={<form className={controls.ticketForm} onSubmit={handleSubmit} aria-label="チケットの座席情報で探す">
          <label>列<ReadySearchControl><input aria-label="列" inputMode="numeric" value={rowInput} placeholder="例：15" onChange={e=>{setRowInput(e.target.value);setError("");setCandidates([]);}}/></ReadySearchControl></label>
          <label>番号・区画<ReadySearchControl><input aria-label="番号・ブロック名" value={seatInput} placeholder="55 / E23" required onChange={e=>{setSeatInput(e.target.value);setError("");setCandidates([]);}}/></ReadySearchControl></label>
          <ReadySearchControl><button className={controls.searchSubmit} type="submit">場所を見る</button></ReadySearchControl>
        </form>}>
        {error&&<p role="alert" className={styles.message}>{error} <a href="https://giants-seat.jp/seatmap/" target="_blank" rel="noopener noreferrer">公式の座席図 ↗</a></p>}
        {candidates.length>0&&<div className={controls.candidates}><p>確認できた区画から選んでください</p><div>{candidates.map(area=><button type="button" key={area.code} onClick={()=>{chooseArea(area,true);setSelectedRow(Number(rowInput.normalize("NFKC").replace(/\s/g,"").replace(/列$/,"")));setSelectedSeat(Number(seatInput.normalize("NFKC").trim().replace(/番$/,"")));setNotice("列の線は位置の目安です。");}}>{levelForPrefix(area.code[0])==="upper"?"2階席":"1階席"}・{area.code}</button>)}</div></div>}
        <div className={styles.selection} aria-live="polite" aria-label="選んだ座席">{selected ? <>
          <div className={styles.selectionName}><strong>{selected.code}</strong><span>{selectedZone??"記号の位置"}{selectedSide?`・${selectedSide}`:""}{selectedRow!==null?`・${selectedRow}列`:""}{selectedSeat!==null?`・${selectedSeat}番`:""}</span></div>
          {selectedArea?.rows&&<span>{selectedArea.rows[0]}〜{selectedArea.rows[1]}列</span>}
          {selectedLabel&&<button type="button" onClick={()=>showSelectedView(selected,selectedLabel)} aria-label="選んだ場所を表示"><LocateFixed size={19}/></button>}
          <button type="button" onClick={clearSelection} aria-label="座席の選択を解除"><X size={18}/></button>
        </> : <span>座席の全体図</span>}</div>
        {selectedSpecial&&<p className={styles.hint}>図の記号の位置です。個別の席・列は表示していません。</p>}
        {notice&&<p className={styles.hint}>{notice}</p>}
        {selectedRowNote&&<p className={styles.hint}>{selectedRowNote}</p>}
        {verifiedBlock?.rowCoverage === "representative" && numberReference && <p className={styles.hint}>番号は代表列のみ確認済みです。ほかの列は区画名で選べます。番号札は{numberReference.row}列の開始番号です。</p>}
        <div ref={mapCanvasRef} className={styles.map} aria-label="東京ドームの座席図">
            <svg ref={mapSvgRef} viewBox={serializeMapViewBox(interactiveViewBox)}
              onPointerDown={handleMapPointerDown} onPointerMove={handleMapPointerMove} onPointerUp={handleMapPointerEnd} onPointerCancel={handleMapPointerEnd} onLostPointerCapture={handleMapPointerEnd} onPointerLeave={event => { if (!event.currentTarget.hasPointerCapture(event.pointerId)) handleMapPointerEnd(event); }}
              className="block h-full w-full touch-none select-none cursor-grab active:cursor-grabbing" role="group"
              aria-label={selected ? `${selected.code}を強調した東京ドームの座席区画図` : "区画名と列の目安を描いた東京ドーム座席図"}>
              <defs><marker id="tokyo-seat-number-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M2 2 L8 5 L2 8" fill="none" stroke="#783b59" strokeWidth="1.5"/></marker>
                {SHAPES.filter((area) => ROW_GUIDES.has(area.code)).map((area) => <clipPath key={area.code} id={`tokyo-rows-${area.code}`}><path d={area.path!} /></clipPath>)}
                {BALCONY_GROUP_PATHS.map((path, index) => <clipPath key={index} id={`tokyo-balcony-${index}`}><path d={path} /></clipPath>)}
              </defs>
              <rect x="0" y="0" width="1190.55" height="841.89" fill="#fff" />
              <g pointerEvents="none">
                <path d="M579 450 L365 235 Q579 97 793 235 Z" fill="#fff6fa" stroke="#f0dce5" strokeWidth="2" />
                <path d="M579 447 L455 324 M579 447 L703 324" fill="none" stroke="#edd3df" strokeWidth="1.5" strokeDasharray="4 7" />
              </g>
              {SHAPES.map((area) => {
                const active = selected?.code === area.code && !area.shared;
                const rowGuides = ROW_GUIDES.get(area.code);
                const selectedBand = active && selectedRow !== null ? rowGuides?.band(selectedRow) : null;
                const selectedMarker = active && selectedRow !== null ? rowGuides?.marker(selectedRow) : null;
                return <g key={area.path} opacity={matchesLevel(area.code) ? 1 : .16}>
                  <path d={area.path!} fill={active ? "#db3d7b" : ZONE_COLORS[area.code[0]]}
                    stroke={active ? "#71254a" : "#fff"} strokeWidth={active ? 2.2 : 1.6} vectorEffect="non-scaling-stroke"
                    className={area.shared ? undefined : "cursor-pointer"} data-seat-code={area.shared ? undefined : area.code}
                    onKeyDown={area.shared ? undefined : event => keyArea(event, area)} onFocus={() => setFocusedCode(area.code)}
                    tabIndex={area.shared ? undefined : area.code === activeFocus ? 0 : -1} role={area.shared ? undefined : "button"}
                    aria-label={area.shared ? undefined : `${area.code}${area.rows ? `・${area.rows[0]}〜${area.rows[1]}列` : "・列範囲確認中"}を拡大`} />
                  {detailStage && rowGuides && <g clipPath={`url(#tokyo-rows-${area.code})`} pointerEvents="none">
                    {<path d={rowGuides.lines} fill="none" stroke={active ? "#fff" : "#665f7a"} strokeWidth={showDetail ? "0.65" : "0.45"} vectorEffect="non-scaling-stroke" opacity={active ? "0.55" : showDetail ? "0.32" : "0.2"} />}
                    {selectedBand && <path d={selectedBand} fill="#ffda70" fillOpacity="0.96" fillRule="evenodd" />}
                  </g>}
                  {selectedMarker && <circle cx={selectedMarker[0]} cy={selectedMarker[1]} r="1.9" fill="#392943" stroke="#fff" strokeWidth="1.2" vectorEffect="non-scaling-stroke" pointerEvents="none" />}
                </g>;
              })}
              {!showDetail && <g pointerEvents="none" aria-hidden="true">
                {/* 全体図ではGATE構造帯を座席より前に置き、縮小時だけ細かな外周差を整理する。 */}
                <g fill="none" stroke="#f1e8ed" strokeWidth="34" strokeLinecap="round" strokeLinejoin="round">
                  {TOKYO_DOME_OUTER_GATE_BOUNDARIES.map((boundary) => <path key={`gate-band-${boundary.id}`} d={boundary.path} />)}
                </g>
                <g fill="none" stroke="#f1e8ed" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round">
                  <path d={TOKYO_DOME_OVERVIEW_HOME_CAP} />
                </g>
                <g fill="none" stroke="#dfd2d9" strokeWidth="1.1" strokeLinecap="round" vectorEffect="non-scaling-stroke">
                  {TOKYO_DOME_OUTER_GATE_BOUNDARIES.map((boundary) => <path key={`gate-outer-${boundary.id}`} d={boundary.path} />)}
                  {TOKYO_DOME_INNER_GATE_BOUNDARIES.map((boundary) => <path key={`gate-inner-${boundary.id}`} d={boundary.path} />)}
                </g>
              </g>}
              {BALCONY_GROUP_PATHS.map((path, index) => <path key={`balcony-band-${index}`} d={path} fill={ZONE_COLORS.C} opacity={matchesLevel("C") ? 1 : .16} stroke="#fff" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />)}
              {BALCONY_SEGMENTS.map((segment) => {
                const area = AREA_BY_CODE.get(segment.code)!;
                const active = selected?.code === area.code;
                return <g key={area.code} clipPath={`url(#tokyo-balcony-${segment.groupId})`}>
                  <path d={segment.regionPath} fill={active ? "#db3d7b" : "transparent"} data-seat-code={area.code}
                    stroke="none" vectorEffect="non-scaling-stroke"
                    className="cursor-pointer"
                    onKeyDown={event => keyArea(event, area)} onFocus={() => setFocusedCode(area.code)}
                    tabIndex={area.code === activeFocus ? 0 : -1} role="button" aria-label={`${area.code}・バルコニー区画を拡大`} />
                </g>;
              })}
              <g pointerEvents="none">
                {BALCONY_DIVIDERS.map((divider) => <path key={`${divider[0].join("-")}-${divider[1].join("-")}`} d={`M${divider[0][0]},${divider[0][1]} L${divider[1][0]},${divider[1][1]}`} fill="none" stroke="#fff" strokeWidth="1.05" vectorEffect="non-scaling-stroke" />)}
              </g>
              {mapLabels.map(label => <text key={label.code} data-seat-label={label.code} x={label.x} y={label.y}
                transform={`rotate(${label.angle},${label.x},${label.y})`} textAnchor="middle" dominantBaseline="central"
                fontSize={label.fontSize} fontWeight="800" fontFamily="ui-sans-serif, sans-serif"
                fill={selected?.code === label.code ? "#fff" : "#483340"} stroke={selected?.code === label.code ? "#a93164" : "#fff"}
                strokeWidth={1} vectorEffect="non-scaling-stroke" paintOrder="stroke" pointerEvents="all" data-seat-code={label.code} style={{cursor:"pointer"}}>{label.code}</text>)}
              <g pointerEvents="none" aria-label="席番号の目印と増える方向">{displayedNumberGuides.map(guide => {
                const active = guide.id === verifiedNumberGuide?.id;
                const sign = placeNumberLabel({ x: guide.point[0], y: guide.point[1] }, { x: guide.point[0] + guide.direction[0], y: guide.point[1] + guide.direction[1] }, 52 / screenScale, 28 / screenScale, 6 / screenScale, 20 / screenScale);
                return <g key={guide.id} data-seat-number={guide.number} data-number-block={active?selected?.code:undefined}>
                  <path data-number-badge="" d={numberBadgePath(sign.rect, 5 / screenScale)} fill={active?"#a93164":"#fff0f6"} stroke={active?"#fff":"#b97494"} strokeWidth={active?2:1} vectorEffect="non-scaling-stroke" />
                  <text x={guide.point[0]} y={guide.point[1]} textAnchor="middle" dominantBaseline="central" fontSize={(active?14:12) / screenScale} fontWeight="800" fill={active?"#fff":"#783b59"}>{guide.number}番</text>
                  <path d={`M${sign.from.x},${sign.from.y} l${guide.direction[0]*20/screenScale},${guide.direction[1]*20/screenScale}`} stroke="#783b59" strokeWidth="1.4" vectorEffect="non-scaling-stroke" markerEnd="url(#tokyo-seat-number-arrow)"/>
                </g>;
              })}</g>
              {detailStage && selectedEdgeMarkers.map(({ row, point, anchor }) => point && <g key={`edge-${row}`} pointerEvents="none">
                {anchor&&(anchor[0]!==point[0]||anchor[1]!==point[1])&&<path d={`M${anchor[0]},${anchor[1]}L${point[0]},${point[1]}`} stroke="#913455" strokeWidth=".6"/>}
                <rect x={point[0] - 28 / screenScale} y={point[1] - 14 / screenScale} width={56 / screenScale} height={28 / screenScale} rx={4 / screenScale} fill="#fff" stroke="#913455" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
                <text x={point[0]} y={point[1] + 4 / screenScale} textAnchor="middle" fontSize={12 / screenScale} fontWeight="900" fill="#913455">{row}列</text>
              </g>)}
              {TOKYO_DOME_GATE_ANCHORS.filter(gate => {
                if (showDetail) return true;
                if (!["GATE 11", "GATE 25", "GATE 40", "GATE 41"].includes(gate.gate)) return false;
                return TOKYO_DOME_OVERVIEW_AREAS.every(area => Math.abs(area.point[0] - gate.label.x) * overviewScale >= 80
                  || Math.abs(area.point[1] - gate.label.y) * overviewScale >= 36);
              }).map((gate) => <g key={gate.gate} pointerEvents="none">
                <rect x={gate.label.x - (showDetail ? 15 : 31 / screenScale)} y={gate.label.y - (showDetail ? 5.5 : 12 / screenScale)}
                  width={showDetail ? 30 : 62 / screenScale} height={showDetail ? 11 : 24 / screenScale} rx="6" fill="#393148" stroke="#fff" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
                <text x={gate.label.x} y={gate.label.y + (showDetail ? 1.8 : 4 / screenScale)} textAnchor="middle"
                  fontSize={showDetail ? 5.1 : 12 / screenScale} fontWeight="900" letterSpacing="0.3" fill="#fff">{gate.gate}</text>
              </g>)}
              {selectedSpecial && <g pointerEvents="none">
                <circle cx={selectedSpecial.label[0]} cy={selectedSpecial.label[1]} r="12" fill="none" stroke="#e62468" strokeWidth="2.4" vectorEffect="non-scaling-stroke" />
                <circle cx={selectedSpecial.label[0]} cy={selectedSpecial.label[1]} r="16" fill="none" stroke="#e62468" strokeWidth="1" strokeDasharray="3 2" vectorEffect="non-scaling-stroke" />
                <path d={`M${selectedSpecial.label[0]},${selectedSpecial.label[1] - 16} v-4`} fill="none" stroke="#a82458" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                <rect x={selectedSpecial.label[0] - 17} y={selectedSpecial.label[1] - 33} width="34" height="13" rx="6.5" fill="#a82458" stroke="#fff" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                <text x={selectedSpecial.label[0]} y={selectedSpecial.label[1] - 24} textAnchor="middle" fontSize="6.2" fontWeight="900" fill="#fff">{selectedSpecial.code}</text>
              </g>}
            </svg>
          {!showDetail && <div className={styles.areaLabels} aria-label="大きな場所から探す">
            {TOKYO_DOME_OVERVIEW_AREAS.map(area => <button key={area.id} type="button" data-major-area={area.id}
              className={tapHint ? styles.areaPrompt : undefined} onAnimationEnd={() => setTapHint(false)}
              style={{left:(canvasSize.width-interactiveViewBox.width*screenScale)/2+(area.point[0]-interactiveViewBox.x)*screenScale,
                top:(canvasSize.height-interactiveViewBox.height*screenScale)/2+(area.point[1]-interactiveViewBox.y)*screenScale}}
              onClick={() => chooseDirection(area.id)}>{area.label}</button>)}
          </div>}
        </div>
        <div className={styles.wholeButton}><button type="button" onClick={showWhole}>全体図へ</button></div>
        <nav aria-label="座席確認後の会場案内" className={styles.footer}>
          <a href="#dome-access">駅・入場ゲートを確認 ↓</a>
          <a href="#dome-spots">トイレ・ロッカー・売店を探す ↓</a>
        </nav>
      </DomeSeatFrame>
    </div>
  </section>;
}
