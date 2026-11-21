"use client";

import SeatSearchOffer from "@/components/seat-campaign/SeatSearchOffer";
import { trackVenueSeatSearch } from "@/lib/venueAnalytics";
import { seatNumberArrowInk } from "@/lib/seatNumberBadge";
import { tokyoDomeNumberBadge } from "@/lib/tokyoDomeNumberBadge";

import { useCallback, useEffect, useRef, useState, type FormEvent, type PointerEvent as ReactPointerEvent } from "react";
import { useSeatControlsReady } from "./template/ReadySearchControl";
import { nearSeatNumbers } from "./template/seatFinderLabels";
import { SeatFinderMiss, type FinderMode } from "./template/SeatFinderControls";
import { TokyoDomeTicketForm } from "./TokyoDomeTicketForm";
import geometry from "@/data/tokyoDomeSeatGeometry.json";
import { TOKYO_DOME_GATE_ANCHORS } from "@/data/tokyoDomeGateAnchors";
import { TOKYO_DOME_INNER_GATE_BOUNDARIES, TOKYO_DOME_OUTER_GATE_BOUNDARIES, TOKYO_DOME_OVERVIEW_HOME_CAP } from "@/data/tokyoDomeGateStructure";
import { TOKYO_DOME_SPECIAL_LABELS } from "@/data/tokyoDomeSpecialSeatLabels";
import { TOKYO_DOME_ROW_CORRECTIONS } from "@/data/tokyoDomeSeatRowCorrections";
import { TOKYO_DOME_NARROW_ROW_CORRECTIONS, TOKYO_DOME_SHAPE_CORRECTIONS } from "@/data/tokyoDomeSeatShapeCorrections";
import { buildTokyoDomeBalconySegments } from "@/lib/tokyoDomeBalconySegments";
import { findTokyoDomeVerifiedSeats, getTokyoDomeVerifiedRowRange, getTokyoDomeVerifiedSeatBlock, getTokyoDomeVerifiedPrintedRows, isTokyoDomeSectionRowSelectable, getTokyoDomeNumberReference, parseTokyoDomeSection, parseTokyoDomeSeatInput, type TokyoDomeSection } from "@/lib/tokyoDomeSeatLocator";
import { sectionRowGuides } from "@/lib/tokyoDomeSeatRows";
import { placeTokyoDomeRowMarker, tokyoDomeNumberClearOfRows, tokyoDomeDuplicateReferenceId, tokyoDomeSeatFocus, layoutTokyoDomeSeatLabels, TOKYO_DOME_OVERVIEW_AREAS, tokyoDomeOverviewView, tokyoDomeTierView } from "@/lib/tokyoDomeSeatLabels";
import { ArrowUp, Camera, LocateFixed, Map as MapIcon, X } from "lucide-react";
import styles from "./TokyoDomeSeatLocator.module.css";
import controls from "./guides/KyoceraSeatMap.module.css";
import { TOKYO_DOME_SEAT_NUMBER_GUIDES } from "@/data/tokyoDomeSeatNumberGuides";
import { spatialSeatTarget } from "@/lib/seatMapInteraction";
import { placeNumberLabel } from "./guides/kyoceraNumberLabels";
import { useSeatMapTouch } from "./template/useSeatMapTouch";
import { SEAT_PHOTO_MAP_COLOR, SeatPhotoMapSummary, SeatPhotoMarker } from "./template/SeatViewPosts";
import { seatPhotoOffsets, useSeatPhotoHitTest } from "./template/useSeatPhotoHitTest";
import { DomeSeatFrame } from "./template/DomeSeatFrame";
import { seatViewPosts } from "@/lib/seatViewPosts";
import { announceTokyoDomeMapScope, getTokyoDomeVenueSeatSelection, TOKYO_DOME_SEAT_SELECTION_EVENT } from "@/lib/tokyoDomeVenueSelection";
import { useArenaMaps } from "./ArenaMapsSheet";
import SeatPhotoRequest from "./SeatPhotoRequest";
import SeatPhotoPostLink from "./SeatPhotoPostLink";
import { useVenueSeatTarget } from "./VenueSeatTarget";

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
const NUMBERED_AREA_CODES = new Set(AREAS.filter(area => getTokyoDomeVerifiedSeatBlock(area.code)?.numberEdge).map(area => area.code));
const AREA_BY_CODE = new Map(AREAS.map((area) => [area.code, area]));
const SEAT_PHOTO_DIAGRAM = "tokyo-dome-fixed";
const PHOTO_SECTION_CODES = new Set(seatViewPosts(SEAT_PHOTO_DIAGRAM)
  .filter(post => post.place.kind === "section").map(post => post.place.id));
const PHOTO_COUNTS = seatViewPosts(SEAT_PHOTO_DIAGRAM).filter(post => post.place.kind === "section")
  .reduce((counts, post) => counts.set(post.place.id, (counts.get(post.place.id) ?? 0) + 1), new Map<string, number>());
/** Middle of the arena floor; the zoomed map points here so the stage side stays obvious. */
const FIELD_CENTER = { x: 579, y: 290 };
const ZONE_KEY = [
  { key: "A", label: "1階前" }, { key: "B", label: "1階後" }, { key: "D", label: "2階前" },
  { key: "E", label: "2階後" }, { key: "C", label: "バルコニー" }, { key: "F", label: "外野" },
] as const;
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
// Illustration only: these surfaces carry no seats, gates or walking routes.
// Interactive paths, row geometry and all search coordinates remain in AREAS.
const OVERVIEW_SURFACES = {
  bowl: "M579 30 C510 25 474 47 427 89 C340 162 233 248 186 339 C145 420 187 505 263 607 C350 723 469 812 579 812 C689 812 808 723 895 607 C971 505 1013 420 972 339 C925 248 818 162 731 89 C684 47 648 25 579 30Z",
  floor: "M579 89 C512 89 451 140 381 214 L370 243 C389 313 486 471 561 491 Q579 499 597 491 C672 471 769 313 788 243 L777 214 C707 140 646 89 579 89Z",
};
const OVERVIEW_TONES: Record<string, readonly [string, string]> = {
  A: ["#e7c6d2", "#cb92a8"], B: ["#d6a5b8", "#b87d98"],
  C: ["#e8d9c6", "#c8ae8d"], D: ["#c8d6e5", "#9db3cc"],
  E: ["#aebfd3", "#829fbf"], F: ["#b5d7cc", "#7fad9e"],
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
function selectedMapViewBox(section: TokyoDomeSection, label: [number, number], width=320) {
  const focus = tokyoDomeSeatFocus(section.code, label, AREA_BY_CODE.get(section.code)?.path ?? null);
  return serializeMapViewBox(constrainMapViewBox({x:focus[0]-width/2,y:focus[1]-width*.44,width,height:width*.88}));
}

function selectedMapWidth(canvasWidth: number) {
  return Math.max(140, Math.min(320, canvasWidth * .48));
}

function directionForArea(area: SeatArea): keyof typeof MAP_VIEWS {
  return getTokyoDomeVerifiedSeatBlock(area.code)?.area
    ?? (area.code.startsWith("F") ? (area.label[0] > 579 ? "right" : "left")
      : area.label[0] > 594 ? "first" : area.label[0] < 564 ? "third" : "home");
}

/** Every block of one side (and tier) in one screen, shaped to the canvas so nothing is letterboxed. */
function sideFitView(view: keyof typeof MAP_VIEWS, prefixes: string, canvas: { width: number; height: number }): MapViewBox | null {
  const areas = AREAS.filter(area => !area.shared && prefixes.includes(area.code[0]) && directionForArea(area) === view);
  if (areas.length === 0) return null;
  const pad = 26;
  const xs = areas.map(area => area.label[0]), ys = areas.map(area => area.label[1]);
  let x = Math.min(...xs) - pad, y = Math.min(...ys) - pad;
  let width = Math.max(...xs) + pad - x, height = Math.max(...ys) + pad - y;
  const aspect = canvas.width / canvas.height;
  if (width / height < aspect) { const next = height * aspect; x -= (next - width) / 2; width = next; }
  else { const next = width / aspect; y -= (next - height) / 2; height = next; }
  return { x, y, width, height };
}

/** The canvas size the map will have once a side is open (the whole view is shorter on phones). */
function openMapSize(canvasWidth: number) {
  const phone = typeof window !== "undefined" && window.matchMedia("(max-width: 600px)").matches;
  const height = phone ? 440 : Math.min(650, Math.max(480, (typeof window !== "undefined" ? window.innerHeight : 900) * .7));
  return { width: canvasWidth, height };
}

function rowRangeLabel(rows: SeatArea["rows"]) {
  if (!rows) return "列範囲は未確認";
  return rows[0] === rows[1] ? `${rows[0]}列のみ` : `${rows[0]}〜${rows[1]}列`;
}

export function TokyoDomeSeatLocator() {
  const target = useVenueSeatTarget();
  const [initial] = useState(() => {
    if (target?.mode !== "fixed") return null;
    const area = AREA_BY_CODE.get(target.section);
    // Photo-only links identify the mapped block without selecting a row or seat.
    // Blocks without a photo open too: links in visitors' X posts point at the block they sat in.
    if (!getTokyoDomeVerifiedSeatBlock(target.section) && !area) return null;
    const section = area ? parseTokyoDomeSection(area.code) : null; // balcony blocks have no outline of their own but are still selectable
    return area && section ? { area, section } : null;
  });
  const initialCanvasPending = useRef(Boolean(initial));
  const controlsReady = useSeatControlsReady();
  const mapSvgRef = useRef<SVGSVGElement>(null);
  const mapCanvasRef = useRef<HTMLDivElement>(null);
  const [photoCenters, setPhotoCenters] = useState<ReadonlyMap<string, MapPoint>>(() => new Map());
  useEffect(() => {
    const svg = mapSvgRef.current;
    if (!svg) return;
    const frame = requestAnimationFrame(() => {
      const centers = new Map<string, MapPoint>();
      for (const path of svg.querySelectorAll<SVGPathElement>("path[data-seat-photo-outline]")) {
        const bounds = path.getBBox();
        if (bounds.width > 0 && bounds.height > 0) {
          centers.set(path.getAttribute("data-seat-photo-outline")!, {
            x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2,
          });
        }
      }
      setPhotoCenters(centers);
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  const suppressMapClick = useSeatMapTouch(mapCanvasRef);
  const [canvasSize,setCanvasSize]=useState({width:900,height:650});
  useEffect(() => {
    const node = mapCanvasRef.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setCanvasSize({ width, height });
      if (width > 1 && initial && initialCanvasPending.current) {
        initialCanvasPending.current = false;
        setInteractiveViewBox(parseMapViewBox(selectedMapViewBox(initial.section, initial.area.label, selectedMapWidth(width))));
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [initial]);
  const [tapHint, setTapHint] = useState(false);
  const hintFinishedRef = useRef(Boolean(initial));
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
  const arenaMaps = useArenaMaps();
  const [seatLevel, setSeatLevel] = useState<SeatLevel>(initial ? levelForPrefix(initial.section.prefix) : "all");
  const [direction,setDirection]=useState<keyof typeof MAP_VIEWS>(() => initial ? directionForArea(initial.area) : "all");
  const [candidates,setCandidates]=useState<SeatArea[]>([]);
  const [finderMode, setFinderMode] = useState<FinderMode>("ticket");
  const [blockInput, setBlockInput] = useState("");
  const [rowInput, setRowInput] = useState("");
  const [seatInput, setSeatInput] = useState("");
  const [selected, setSelected] = useState<TokyoDomeSection | null>(initial?.section ?? null);
  const [photoRequest, setPhotoRequest] = useState(0);
  const [focusedCode, setFocusedCode] = useState(initial?.section.code ?? "B26");
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [offsideArea, setOffsideArea] = useState<SeatArea | null>(null);
  const selectedArea = selected ? AREA_BY_CODE.get(selected.code) : undefined;
  const selectedSpecial = selected ? SPECIAL_BY_CODE.get(selected.code) : undefined;
  const selectedLabel = selectedArea?.label ?? selectedSpecial?.label;
  const verifiedBlock = selected ? getTokyoDomeVerifiedSeatBlock(selected.code) : undefined;
  useEffect(() => {
    window.dispatchEvent(new CustomEvent(TOKYO_DOME_SEAT_SELECTION_EVENT, {
      detail: selected ? getTokyoDomeVenueSeatSelection(selected.code, selectedRow, selectedLabel) : null,
    }));
  }, [selected, selectedRow, selectedLabel]);
  // Tell the photo row which part of the venue is on the map: the blocks around a chosen block, or the chosen floor and side.
  const selectedCode = selected?.code, labelX = selectedLabel?.[0], labelY = selectedLabel?.[1];
  useEffect(() => {
    if (selectedCode && labelX !== undefined && labelY !== undefined) {
      const near = AREAS.filter(area => !area.shared)
        .map(area => ({ code: area.code, distance: Math.hypot(area.label[0] - labelX, area.label[1] - labelY) }))
        .sort((a, b) => a.distance - b.distance).slice(0, 16);
      announceTokyoDomeMapScope({ label: `${selectedCode}の近く`, codes: near.map(area => area.code), section: selectedCode });
      return;
    }
    if (seatLevel === "all" && direction === "all") { announceTokyoDomeMapScope({ label: null, codes: [] }); return; }
    const level = SEAT_LEVELS.find(item => item.id === seatLevel)!;
    const outfieldSide = direction === "left" || direction === "right" || direction === "outfield";
    announceTokyoDomeMapScope({
      label: [seatLevel !== "all" && !outfieldSide && level.label, direction !== "all" && MAP_VIEWS[direction].label].filter(Boolean).join("・"),
      codes: AREAS.filter(area => !area.shared && (seatLevel === "all" || level.prefixes.includes(area.code[0]))
        && (direction === "all" || directionForArea(area) === direction)).map(area => area.code),
    });
  }, [selectedCode, labelX, labelY, seatLevel, direction]);
  const selectedZone = selectedArea ? ZONE_NAMES.find((zone) => zone.key === selectedArea.code[0])?.label : undefined;
  const selectedSide = verifiedBlock ? { first: "1塁側", home: "ホーム側", third: "3塁側", left: "外野レフト", right: "外野ライト" }[verifiedBlock.area]
    : selectedArea?.code.startsWith("F") ? "外野側" : selectedLabel
    ? selectedLabel[0] < 564 ? "3塁側" : selectedLabel[0] > 594 ? "1塁側" : "ホーム側"
    : undefined;
  const [interactiveViewBox, setInteractiveViewBox] = useState<MapViewBox>(() => initial
    ? parseMapViewBox(selectedMapViewBox(initial.section, initial.area.label)) : FULL_MAP_VIEW_BOX);
  const showDetail = interactiveViewBox.width <= 680;
  // Fade the illustration through the existing camera motion; detail is unchanged.
  const overviewOpacity = Math.max(0, Math.min(1, (interactiveViewBox.width - 520) / 380));
  const activePrefixes = SEAT_LEVELS.find(level => level.id === seatLevel)!.prefixes;
  const matchesLevel = (code: string) => seatLevel === "all" || activePrefixes.includes(code[0]);
  const screenScale = Math.min(canvasSize.width / interactiveViewBox.width, canvasSize.height / interactiveViewBox.height);
  const visibleMapBox = {
    x: interactiveViewBox.x - (canvasSize.width / screenScale - interactiveViewBox.width) / 2,
    y: interactiveViewBox.y - (canvasSize.height / screenScale - interactiveViewBox.height) / 2,
    width: canvasSize.width / screenScale, height: canvasSize.height / screenScale,
  };
  const overviewScale = Math.min(canvasSize.width / FULL_MAP_VIEW_BOX.width, canvasSize.height / FULL_MAP_VIEW_BOX.height);
  const detailStage=Boolean(selected)&&interactiveViewBox.width<=360;
  const sourceMapLabels = layoutTokyoDomeSeatLabels(AREAS.filter(area => matchesLevel(area.code)), interactiveViewBox, {
    screenScale, detailStage,
    numberedCodes: NUMBERED_AREA_CODES,
  });
  const visibleAreas = AREAS.filter(area => {
    if (area.shared || (!area.path && !BALCONY_SEGMENTS.some(segment => segment.code === area.code))) return false;
    const x = (canvasSize.width - interactiveViewBox.width * screenScale) / 2 + (area.label[0] - interactiveViewBox.x) * screenScale;
    const y = (canvasSize.height - interactiveViewBox.height * screenScale) / 2 + (area.label[1] - interactiveViewBox.y) * screenScale;
    return x >= 0 && x <= canvasSize.width && y >= 0 && y <= canvasSize.height;
  });
  const overviewPhotoCounts = new Map(TOKYO_DOME_OVERVIEW_AREAS.map(group => [group.id,
    AREAS.filter(area => PHOTO_SECTION_CODES.has(area.code) && matchesLevel(area.code) && directionForArea(area) === group.id).length,
  ]));
  const activeFocus = visibleAreas.some(area => area.code === focusedCode) ? focusedCode : visibleAreas.find(area => matchesLevel(area.code))?.code;
  function keyArea(event: React.KeyboardEvent<SVGElement>, area: SeatArea) {
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
  
  
  const duplicateReferenceId = verifiedNumberGuide && verifiedBlock && verifiedEdge
    ? tokyoDomeDuplicateReferenceId(TOKYO_DOME_SEAT_NUMBER_GUIDES, {
      level: verifiedBlock.level, number: verifiedNumberGuide.number, edge: verifiedEdge.edge,
    }) : null;
  const numberGuides=detailStage?TOKYO_DOME_SEAT_NUMBER_GUIDES.filter(guide=>
    guide.id !== duplicateReferenceId && (seatLevel==="all"||guide.level===seatLevel) && (!verifiedNumberGuide ||
      Math.abs(guide.point[0]-verifiedNumberGuide.point[0])*screenScale>80 || Math.abs(guide.point[1]-verifiedNumberGuide.point[1])*screenScale>38)) : [];
  const selectedEdgeMarkers = (() => {
    const occupied = [...TOKYO_DOME_GATE_ANCHORS.map(gate=>({x:gate.label.x,y:gate.label.y,halfWidth:17,halfHeight:7})),
      ...(verifiedNumberGuide ? [{x:verifiedNumberGuide.point[0],y:verifiedNumberGuide.point[1],halfWidth:28/screenScale,halfHeight:18/screenScale}] : [])];
    const rows = [...new Set([...(selectedArea?.rows ?? []), ...(selectedRow !== null ? [selectedRow] : [])])];
    return rows.map(row => {
      const anchor = selectedArea ? ROW_GUIDES.get(selectedArea.code)?.marker(row) : null;
      if (!anchor) return {row,point:null,anchor:null};
      const point = placeTokyoDomeRowMarker(anchor,occupied,screenScale,visibleMapBox);
      occupied.push({x:point[0],y:point[1],halfWidth:28/screenScale,halfHeight:16/screenScale});
      return {row,anchor,point};
    });
  })();
  // An off-canvas row anchor must not leave a fragment of its badge at the edge.
  const visibleEdgeMarkers = selectedEdgeMarkers.filter(({anchor}) => anchor
    && anchor[0] >= visibleMapBox.x && anchor[0] <= visibleMapBox.x + visibleMapBox.width
    && anchor[1] >= visibleMapBox.y && anchor[1] <= visibleMapBox.y + visibleMapBox.height);
  const clearNumberGuides = numberGuides.filter(guide => {
    const sign = placeNumberLabel({ x: guide.point[0], y: guide.point[1] }, { x: guide.point[0] + guide.direction[0], y: guide.point[1] + guide.direction[1] }, 52 / screenScale, 28 / screenScale, 6 / screenScale, 20 / screenScale);
    const end = { x: sign.from.x + guide.direction[0] * 20 / screenScale, y: sign.from.y + guide.direction[1] * 20 / screenScale };
    const left = Math.min(guide.point[0] - 28 / screenScale, sign.from.x - 7 / screenScale, end.x - 7 / screenScale);
    const right = Math.max(guide.point[0] + 28 / screenScale, sign.from.x + 7 / screenScale, end.x + 7 / screenScale);
    const top = Math.min(guide.point[1] - 16 / screenScale, sign.from.y - 7 / screenScale, end.y - 7 / screenScale);
    const bottom = Math.max(guide.point[1] + 16 / screenScale, sign.from.y + 7 / screenScale, end.y + 7 / screenScale);
    return left >= visibleMapBox.x && right <= visibleMapBox.x + visibleMapBox.width
      && top >= visibleMapBox.y && bottom <= visibleMapBox.y + visibleMapBox.height
      && tokyoDomeNumberClearOfRows(guide.point, selectedEdgeMarkers.map(marker => marker.point), screenScale);
  });
  const displayedNumberGuides = verifiedNumberGuide ? [...clearNumberGuides, verifiedNumberGuide] : clearNumberGuides;
  // Names provide orientation; row/number badges and their arrows take priority.
  // Keep original anchors and hit geometry. Only suppress a colliding caption.
  const captionObstacles = [
    // Overview buttons float above the SVG. Reserve their visible captions and
    // badges before placing small block names; their seat hit areas stay intact.
    ...(!showDetail ? TOKYO_DOME_OVERVIEW_AREAS.flatMap(area => {
      const [x, y] = area.point;
      const hasCount = Boolean(overviewPhotoCounts.get(area.id));
      const word = { x, y: y - (hasCount ? 9 / screenScale : 0),
        width: (area.id === "home" ? 46 : 35) / screenScale, height: 17 / screenScale };
      return hasCount ? [word, { x, y: y + 9 / screenScale, width: 40 / screenScale, height: 18 / screenScale }] : [word];
    }) : []),
    ...displayedNumberGuides.flatMap(guide => {
      const sign = placeNumberLabel({ x: guide.point[0], y: guide.point[1] }, { x: guide.point[0] + guide.direction[0], y: guide.point[1] + guide.direction[1] }, 52 / screenScale, 28 / screenScale, 6 / screenScale, 20 / screenScale);
      return [
        { x: guide.point[0], y: guide.point[1], width: 58 / screenScale, height: 34 / screenScale },
        { x: sign.from.x + guide.direction[0] * 10 / screenScale, y: sign.from.y + guide.direction[1] * 10 / screenScale,
          width: (Math.abs(guide.direction[0]) * 20 + 14) / screenScale, height: (Math.abs(guide.direction[1]) * 20 + 14) / screenScale },
      ];
    }),
    ...visibleEdgeMarkers.flatMap(marker => marker.point ? [{ x: marker.point[0], y: marker.point[1], width: 62 / screenScale, height: 34 / screenScale }] : []),
  ];
  const mapLabels = [...sourceMapLabels].sort((a, b) => {
    const origin = selectedLabel ?? [interactiveViewBox.x + interactiveViewBox.width / 2, interactiveViewBox.y + interactiveViewBox.height / 2];
    return Math.hypot(a.x - origin[0], a.y - origin[1]) - Math.hypot(b.x - origin[0], b.y - origin[1]);
  }).filter(label => {
    if (verifiedNumberGuide && label.code === selected?.code) return false;
    const width = label.code.length * label.fontSize * .65 + 6 / screenScale, height = 20 / screenScale;
    if (label.x - width / 2 < visibleMapBox.x || label.x + width / 2 > visibleMapBox.x + visibleMapBox.width
      || label.y - height / 2 < visibleMapBox.y || label.y + height / 2 > visibleMapBox.y + visibleMapBox.height) return false;
    if (captionObstacles.some(other => Math.abs(label.x - other.x) < (width + other.width) / 2
      && Math.abs(label.y - other.y) < (height + other.height) / 2)) return false;
    captionObstacles.push({ x: label.x, y: label.y, width, height });
    return true;
  });

  const photoHitTest = useSeatPhotoHitTest();
  const photoObstacles = [...captionObstacles, ...TOKYO_DOME_GATE_ANCHORS.map(gate => ({
    x: gate.label.x, y: gate.label.y, width: 68 / screenScale, height: 30 / screenScale,
  }))];
  // A whole-side view: block names carry the photo highlight, so marks are only added where no name is drawn.
  const sideOverview = showDetail && !selected && interactiveViewBox.width > 360;
  const labelledCodes = new Set(mapLabels.map(label => label.code));
  // Orientation aids for the zoomed map: where the arena is, which part of the dome is on screen, and what the colours mean.
  const fieldScreen = {
    x: (canvasSize.width - interactiveViewBox.width * screenScale) / 2 + (FIELD_CENTER.x - interactiveViewBox.x) * screenScale,
    y: (canvasSize.height - interactiveViewBox.height * screenScale) / 2 + (FIELD_CENTER.y - interactiveViewBox.y) * screenScale,
  };
  // The arena opens the shows' arena-layout posts. In the whole view the button takes the place of the "アリーナ" caption.
  const arenaAnchor = showDetail ? FIELD_CENTER : { x: 579, y: 240 }; // between the outfield and base-side captions
  const arenaButton = {
    left: (canvasSize.width - interactiveViewBox.width * screenScale) / 2 + (arenaAnchor.x - interactiveViewBox.x) * screenScale,
    top: (canvasSize.height - interactiveViewBox.height * screenScale) / 2 + (arenaAnchor.y - interactiveViewBox.y) * screenScale,
  };
  const arenaButtonInView = arenaButton.left >= 56 && arenaButton.left <= canvasSize.width - 56 && arenaButton.top >= 24 && arenaButton.top <= canvasSize.height - 24;
  const fieldInView = fieldScreen.x >= 40 && fieldScreen.x <= canvasSize.width - 40 && fieldScreen.y >= 30 && fieldScreen.y <= canvasSize.height - 30;
  const fieldPointer = fieldInView ? null : (() => {
    const cx = canvasSize.width / 2, cy = canvasSize.height / 2;
    const dx = fieldScreen.x - cx, dy = fieldScreen.y - cy;
    const t = Math.min(dx ? (cx - 52) / Math.abs(dx) : Infinity, dy ? (cy - 22) / Math.abs(dy) : Infinity);
    return { left: cx + dx * t, top: cy + dy * t, angle: Math.atan2(dy, dx) * 180 / Math.PI + 90 };
  })();
  const miniFrame = (() => {
    const x0 = Math.max(FULL_MAP_VIEW_BOX.x, visibleMapBox.x), y0 = Math.max(FULL_MAP_VIEW_BOX.y, visibleMapBox.y);
    const x1 = Math.min(FULL_MAP_VIEW_BOX.x + FULL_MAP_VIEW_BOX.width, visibleMapBox.x + visibleMapBox.width);
    const y1 = Math.min(FULL_MAP_VIEW_BOX.y + FULL_MAP_VIEW_BOX.height, visibleMapBox.y + visibleMapBox.height);
    return { x: x0, y: y0, width: Math.max(30, x1 - x0), height: Math.max(30, y1 - y0) };
  })();
  const visibleZones = ZONE_KEY.filter(zone => sourceMapLabels.some(label => label.code[0] === zone.key && matchesLevel(label.code)));
  const photoMarkers = showDetail ? visibleAreas.filter(area => matchesLevel(area.code) && PHOTO_SECTION_CODES.has(area.code)).flatMap(area => {
    const balcony = BALCONY_SEGMENTS.find(segment => segment.code === area.code);
    const shape = balcony?.sourcePath ?? area.path;
    if (!shape) return [];
    const center = photoCenters.get(area.code) ?? { x: area.label[0], y: area.label[1] };
    const candidates = seatPhotoOffsets
      .map(([dx, dy]) => ({ x: center.x + dx / screenScale, y: center.y + dy / screenScale }))
      .filter(point => point.x >= visibleMapBox.x + 14 / screenScale
        && point.x <= visibleMapBox.x + visibleMapBox.width - 14 / screenScale
        && point.y >= visibleMapBox.y + 14 / screenScale
        && point.y <= visibleMapBox.y + visibleMapBox.height - 14 / screenScale
        && photoObstacles.every(other => Math.abs(point.x - other.x) >= (28 / screenScale + other.width) / 2
          || Math.abs(point.y - other.y) >= (28 / screenScale + other.height) / 2));
    // Thin blocks on a whole-side view cannot hold the mark inside; then it sits on the block's centre line.
    const point = sideOverview && labelledCodes.has(area.code) ? undefined : candidates.find(point => photoHitTest([shape], point, 10 / screenScale)
        && (!balcony || photoHitTest([balcony.regionPath], point, 10 / screenScale)))
      ?? (sideOverview ? candidates.find(point => photoHitTest([shape], point, 0)) : undefined);
    if (!point) return [];
    photoObstacles.push({ ...point, width: 28 / screenScale, height: 28 / screenScale });
    return [{ area, ...point }];
  }) : [];

  function resetGestures() {
    initialCanvasPending.current = false;
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
      const duration=from.width>680||next.width>680?420:220;
      const progress=Math.min(1,(now-start)/duration),eased=1-Math.pow(1-progress,3);
      setInteractiveViewBox({x:from.x+(next.x-from.x)*eased,y:from.y+(next.y-from.y)*eased,width:from.width+(next.width-from.width)*eased,height:from.height+(next.height-from.height)*eased});
      animationRef.current=progress<1?requestAnimationFrame(step):null;
    };
    animationRef.current=requestAnimationFrame(step);
  }

  function showMapView(view: keyof typeof MAP_VIEWS, level: SeatLevel = seatLevel) {
    setDirection(view);
    // Picking only a floor keeps the whole map: its blocks stay lit and the rest dim, so the user can
    // see both sides before choosing one. The map zooms once a side or a block is tapped.
    const camera = view;
    const area = TOKYO_DOME_OVERVIEW_AREAS.find(area => area.id === camera);
    const prefixes = SEAT_LEVELS.find(item => item.id === level)!.prefixes;
    const fitted = view !== "all" ? sideFitView(view, prefixes, openMapSize(mapCanvasRef.current?.clientWidth ?? canvasSize.width)) : null;
    animateTo(fitted ?? (area ? constrainMapViewBox(level === "all" || view === "all" ? tokyoDomeOverviewView(area.id, canvasSize) : tokyoDomeTierView(area.id, prefixes, canvasSize, AREAS)) : parseMapViewBox(MAP_VIEWS[view].box)));
    resetGestures();
  }

  function showSelectedView(section: TokyoDomeSection, label: [number, number]) {
    animateTo(parseMapViewBox(selectedMapViewBox(section, label, selectedMapWidth(mapCanvasRef.current?.clientWidth ?? 840))));
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

  function handleMapPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    hintFinishedRef.current = true; setTapHint(false);
    const control = (event.target as Element).closest("button");
    if (!control && (event.pointerType !== "touch" || interactiveViewBox.width < FULL_MAP_VIEW_BOX.width * .99)) event.preventDefault();
    if(animationRef.current!==null)cancelAnimationFrame(animationRef.current);
    const target = event.target instanceof Element ? event.target.closest<SVGElement>("[data-seat-code]") : null;
    if (!control) event.currentTarget.setPointerCapture(event.pointerId);
    const point = { x: event.clientX, y: event.clientY };
    pointerPositionsRef.current.set(event.pointerId, point);
    pointerStartsRef.current.set(event.pointerId, { point, code: target?.dataset.seatCode ?? null });
    if (pointerPositionsRef.current.size === 1) { didPanRef.current = false; suppressMapClick.current = false; }
    else { didPanRef.current = true; suppressMapClick.current = true; }
    startGesture();
  }

  function handleMapPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
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
      if (!didPanRef.current || (event.pointerType === "touch" && gesture.box.width >= FULL_MAP_VIEW_BOX.width * .99)) return;
      suppressMapClick.current = true;
      setInteractiveViewBox(constrainMapViewBox({
        ...gesture.box,
        x: gesture.box.x - dx / mapScale(rect, gesture.box),
        y: gesture.box.y - dy / mapScale(rect, gesture.box),
      }));
    }
  }

  function handleMapPointerEnd(event: ReactPointerEvent<HTMLDivElement>) {
    if (!pointerPositionsRef.current.has(event.pointerId)) return;
    if (event.type !== "pointerup") {
      const ids = [...pointerPositionsRef.current.keys()]; resetGestures(); didPanRef.current = true; suppressMapClick.current = true;
      for (const id of ids) if (event.currentTarget.hasPointerCapture(id)) event.currentTarget.releasePointerCapture(id);
      return;
    }
    const start = pointerStartsRef.current.get(event.pointerId);
    const shouldSelect = event.type === "pointerup" && pointerPositionsRef.current.size === 1 && !didPanRef.current
      && start?.code && distance(start.point, { x: event.clientX, y: event.clientY }) <= 6;
    suppressMapClick.current ||= didPanRef.current;
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
    setOffsideArea(null);
    setSelected(null); setSelectedRow(null); setSelectedSeat(null); setNotice(""); setError(""); setCandidates([]);
  }

  function showWhole() {clearSelection();setSeatLevel("all");showMapView("all", "all");}
  function chooseDirection(view:keyof typeof MAP_VIEWS) {
    if(view==="all"){clearSelection();showMapView("all");return;}
    const level = ["left", "right"].includes(view) ? "outfield" : seatLevel === "outfield" ? "all" : seatLevel;
    setSeatLevel(level);clearSelection();showMapView(view, level);
  }
  function chooseLevel(level:SeatLevel) {
    setSeatLevel(level);clearSelection();
    const view = level === "outfield" ? (["left", "right"].includes(direction) ? direction : "right")
      : level === "all" ? direction : ["left", "right", "outfield"].includes(direction) ? "all" : direction;
    showMapView(view, level);
  }
  function chooseArea(area:SeatArea,source:"map" | "block" | "ticket" = "map") {
    const section=parseTokyoDomeSection(area.code);if(!section)return;
    const nextDirection = directionForArea(area);
    const changesSide = direction !== "all" && direction !== nextDirection;
    if (source === "map" && changesSide) {
      setError(""); setCandidates([]);
      setNotice(`${area.code}は${MAP_VIEWS[nextDirection].label}の区画です。`);
      setOffsideArea(area);
      return;
    }
    setOffsideArea(null);
    const shouldMove=source!=="map"||!selected||interactiveViewBox.width>360;
    setFocusedCode(area.code);setSeatLevel(levelForPrefix(section.prefix));setSelected(section);setSelectedRow(null);setSelectedSeat(null);setError("");setCandidates([]);
    setNotice(changesSide ? `${area.code}は${MAP_VIEWS[nextDirection].label}の区画です。${MAP_VIEWS[nextDirection].label}に切り替えました。` : "");
    if(shouldMove)showSelectedView(section,area.label);else{resetGestures();}
    if (source !== "ticket") setDirection(nextDirection);
  }

  function chooseCode(code: string, source: "map" | "block" = "block") {
    const area = AREA_BY_CODE.get(code);
    if (area) { chooseArea(area,source); return; }
    const special = SPECIAL_BY_CODE.get(code), section = parseTokyoDomeSection(code);
    if (!special || !section) return;
    setSeatLevel("all"); setSelected(section); setSelectedRow(null); setSelectedSeat(null); setNotice(""); setOffsideArea(null); setError("");
    showSelectedView(section, special.label);
  }

  function chooseTicketSeat(area: SeatArea, row: number, seat: number) {
    chooseArea(area,"ticket"); setSelectedRow(row); setSelectedSeat(seat);
    setNotice("列の線は位置の目安です。");
  }

  const seatView = { diagram: SEAT_PHOTO_DIAGRAM, request: photoRequest, section: selected?.code,
    row: selectedRow?.toString(), seat: selectedSeat?.toString() };
  const photoSection = seatView.section;

  const blockOnly = seatLevel === "balcony" || seatLevel === "outfield";
  const effectiveMode: FinderMode = blockOnly ? "block" : finderMode;
  function handleSubmit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();clearSelection();
    const input = effectiveMode === "block" ? parseTokyoDomeSeatInput("", blockInput) : parseTokyoDomeSeatInput(rowInput, seatInput);
    if(input.kind === "section"){
      const target=AREA_BY_CODE.get(input.section.code);
      if (!target && !SPECIAL_BY_CODE.has(input.section.code)) { trackVenueSeatSearch("empty"); setError("この区画は座席図で確認できません。"); return; }
      if(input.row !== null && !isTokyoDomeSectionRowSelectable(input.section.code,input.row,target?.rows)){trackVenueSeatSearch("unverified");setError("このブロックの列を確認してください。");return;}
      trackVenueSeatSearch("area",1);
      chooseCode(input.section.code);if(input.row !== null)setSelectedRow(input.row);
      if(input.numberUnverified)setNotice(note=>note+`${input.section.code}の区画を表示しています。この入力では席番号までは特定していません。`);
      return;
    }
    if(input.kind === "invalid"){
      trackVenueSeatSearch("invalid");
      const balconyGap = effectiveMode === "block" && /^C49(?:ブロック|区画)?$/i.test(blockInput.normalize("NFKC").replace(/[\s-]/g, ""));
      setError(balconyGap ? "東京ドームの固定席図では、バルコニーのC49区画は掲載されていません。券面の区画名をご確認ください。"
        : effectiveMode === "block" ? "券面の区画名を入力してください。" : "券面の列と座席番号を両方入力してください。");
      return;
    }
    const {row, seat}=input;
    if(["balcony","outfield"].includes(seatLevel)||["left","right","outfield"].includes(direction)){trackVenueSeatSearch("unverified");setError("この席種は地図、または区画名（例：F12）で探せます。列・番号検索は準備中です。");return;}
    const found=findTokyoDomeVerifiedSeats(row,seat,seatLevel,direction).flatMap(block=>{const area=AREA_BY_CODE.get(block.code);return area?[area]:[];});
    trackVenueSeatSearch(found.length===1?"matched":found.length>1?"multiple":"unverified",found.length);
    if(!found.length){
      setError("この列・番号は見つかりませんでした。");
      return;
    }
    if(found.length>1){setCandidates(found);return;}
    chooseTicketSeat(found[0],row,seat);
  }

  const searchInput = effectiveMode === "ticket" ? parseTokyoDomeSeatInput(rowInput, seatInput) : null;
  const browseAreas = error && searchInput?.kind === "seat"
    ? nearSeatNumbers(String(searchInput.seat), AREAS.filter(item => item.path && matchesLevel(item.code)
      && (direction === "all" || directionForArea(item) === direction)),
      item => getTokyoDomeVerifiedSeatBlock(item.code)?.rows.find(line => line.row === searchInput.row)?.intervals ?? [],
      item => item.code) : [];
  function resetFinderFeedback() { setError(""); setCandidates([]); }
  return <section className="bg-[#fffafb] pb-6 pt-2 sm:pb-10 sm:pt-4" aria-labelledby="tokyo-dome-map-title" inert={!controlsReady}>
    <div className="zr-container">
      <h2 id="tokyo-dome-map-title" className="sr-only">東京ドームの座席を探す</h2>
      <DomeSeatFrame className={`${controls.seatFrame} ${styles.seatFrame}`} levels={SEAT_LEVELS} level={seatLevel} compactMobileControls photoLegend="map"
        seatView={seatView}
        share={photoSection ? { venueId: "tokyo-dome", venueName: "東京ドーム", target: { mode: "fixed", section: photoSection } } : undefined}
        onLevel={id=>chooseLevel(id as SeatLevel)} directions={(["all","first","home","third","right","left"] as const).map(id=>({id,label:MAP_VIEWS[id].label}))}
        directionHint="ホーム側はバックネット裏・本塁側です。" direction={direction} onDirection={id=>chooseDirection(id as keyof typeof MAP_VIEWS)} onZoom={zoomMap} onWhole={showWhole} shortcuts={[]}
        customControls={<TokyoDomeTicketForm ready={controlsReady} level={seatLevel} onLevel={id => chooseLevel(id)}
          side={direction} onSide={id => chooseDirection(id)} byBlock={finderMode === "block"} blockOnly={blockOnly}
          onBlockMode={value => { setFinderMode(value ? "block" : "ticket"); clearSelection(); }}
          row={rowInput} number={seatInput} block={blockInput}
          onRow={value => { setRowInput(value); resetFinderFeedback(); }} onNumber={value => { setSeatInput(value); resetFinderFeedback(); }}
          onBlock={value => { setBlockInput(value); resetFinderFeedback(); }} onSubmit={handleSubmit} />}>
        {error && <SeatFinderMiss detail={error}
          advice={error.includes("C49") ? error : undefined}
          query={(effectiveMode === "block" ? !blockInput.trim() : searchInput?.kind !== "seat") ? undefined : {
            scope: [seatLevel !== "all" && SEAT_LEVELS.find(level => level.id === seatLevel)?.label, direction !== "all" && MAP_VIEWS[direction].label].filter(Boolean).join("・") || "会場全体",
            ...(effectiveMode === "block" ? { block: blockInput } : { row: rowInput, number: seatInput }) }}
          choices={browseAreas.map(item => ({ id: item.code, label: item.code }))} choose={chooseCode} />}
        {candidates.length>0&&<div className={controls.candidates}><p>確認できた区画から選んでください</p><div>{candidates.map(area=><button type="button" key={area.code} onClick={()=>{
          const input=parseTokyoDomeSeatInput(rowInput,seatInput);
          if(input.kind==="seat")chooseTicketSeat(area,input.row,input.seat);
        }}>{SEAT_LEVELS.find(level=>level.id===levelForPrefix(area.code[0]))?.label}・{area.code}</button>)}</div></div>}
        <div className={styles.selection} aria-live="polite" aria-label="選んだ座席">{selected ? <>
          <div className={styles.selectionName}><strong>{selected.code}</strong><span>{selectedZone??"記号の位置"}{selectedSide?`・${selectedSide}`:""}{selectedRow!==null&&<>・<b className={styles.selectedRow}>{selectedRow}列</b></>}{selectedSeat!==null&&<>・<b className={styles.selectedSeat} data-selected-seat-number>選択：{selectedSeat}番</b></>}</span></div>
          {selectedArea&&<span>{rowRangeLabel(selectedArea.rows)}</span>}
          <div className={styles.selectionActions}>
            {selectedLabel&&<button type="button" onClick={()=>showSelectedView(selected,selectedLabel)} aria-label="選んだ場所を表示"><LocateFixed size={19}/></button>}
            <button type="button" onClick={clearSelection} aria-label="座席の選択を解除"><X size={18}/></button>
          </div>
        </> : <div className={styles.overviewHeading}><strong>{seatLevel === "all" && direction === "all" ? "東京ドームの全体図" : `${SEAT_LEVELS.find(level => level.id === seatLevel)!.label}・${MAP_VIEWS[direction].label}`}</strong><span>区画をタップで拡大</span></div>}</div>
        <SeatPhotoMapSummary selection={seatView} count={PHOTO_SECTION_CODES.size} onOpen={() => setPhotoRequest(request => request + 1)}
          emptySlot={selectedArea && !PHOTO_SECTION_CODES.has(selectedArea.code) ? <div className={styles.emptyPhotoActions}>
            <SeatPhotoRequest venueId="tokyo-dome" section={selectedArea.code} />
            <SeatPhotoPostLink venueId="tokyo-dome" venueName="東京ドーム" section={selectedArea.code} row={selectedRow} placement="empty_block" />
          </div> : undefined} />
        {notice&&<p role="status" className={styles.hint}>{notice}</p>}
        {offsideArea && <button type="button" className="zr-focus min-h-11 rounded-full border border-[#d4adb9] px-4 text-sm font-bold" onClick={() => chooseCode(offsideArea.code)}>
          {MAP_VIEWS[directionForArea(offsideArea)].label}に切り替えて{offsideArea.code}を表示
        </button>}
        <div className={styles.mapFrame} data-tokyo-map-frame>
        <div ref={mapCanvasRef} className={styles.map} data-view={showDetail ? "detail" : "overview"} data-whole={!selected && direction === "all" && seatLevel === "all" ? "" : undefined} aria-label="東京ドームの座席図"
          style={{ touchAction: interactiveViewBox.width >= FULL_MAP_VIEW_BOX.width * .99 ? "pan-y" : "none" }}
          onPointerDown={handleMapPointerDown} onPointerMove={handleMapPointerMove} onPointerUp={handleMapPointerEnd} onPointerCancel={handleMapPointerEnd} onLostPointerCapture={handleMapPointerEnd}
          onPointerLeave={event => { if (!event.currentTarget.hasPointerCapture(event.pointerId)) handleMapPointerEnd(event); }}
          onClickCapture={event => { if (suppressMapClick.current && event.detail !== 0) { event.preventDefault(); event.stopPropagation(); } }}>
            <svg ref={mapSvgRef} viewBox={serializeMapViewBox(interactiveViewBox)}
              onClick={event => {
                // Pointer taps select on release, including when the canvas captured the pointer.
                // Assistive-technology activation produces a click with no preceding pointer.
                if (event.detail !== 0) return;
                const code = (event.target as Element).closest("[data-seat-code]")?.getAttribute("data-seat-code");
                if (code) chooseCode(code,"map");
              }}
              style={{ touchAction: "inherit" }} className="block h-full w-full select-none cursor-grab active:cursor-grabbing" role="group"
              aria-label={selected ? `${selected.code}を強調した東京ドームの座席区画図` : "区画名と列の目安を描いた東京ドーム座席図"}>
              <defs>
                <linearGradient id="tokyo-bowl-surface" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#fff"/><stop offset="1" stopColor="#e4eaf0"/></linearGradient>
                <linearGradient id="tokyo-floor-surface" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#88b3a2"/><stop offset="1" stopColor="#b3cfc0"/></linearGradient>
                {Object.entries(OVERVIEW_TONES).map(([tier, tones]) => <linearGradient key={tier} id={`tokyo-tier-${tier}`} x1="0" y1="0" x2="0.2" y2="1"><stop stopColor={tones[0]}/><stop offset="1" stopColor={tones[1]}/></linearGradient>)}
                <pattern id="tokyo-floor-stripes" patternUnits="userSpaceOnUse" width="44" height="44" patternTransform="rotate(-35)"><rect width="22" height="44" fill="#fff" opacity=".07"/></pattern>
                <filter id="tokyo-bowl-shadow" x="-15%" y="-15%" width="130%" height="140%"><feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#314a61" floodOpacity=".17"/></filter>
                {SHAPES.filter((area) => ROW_GUIDES.has(area.code)).map((area) => <clipPath key={area.code} id={`tokyo-rows-${area.code}`}><path d={area.path!} /></clipPath>)}
                
                {BALCONY_GROUP_PATHS.map((path, index) => <clipPath key={index} id={`tokyo-balcony-${index}`}><path d={path} /></clipPath>)}
              </defs>
              <rect x="0" y="0" width="1190.55" height="841.89" fill="#fff" />
              <g pointerEvents="none">
                <path d="M579 450 L365 235 Q579 97 793 235 Z" fill="#fff6fa" stroke="#f0dce5" strokeWidth="2" />
                <path d="M579 447 L455 324 M579 447 L703 324" fill="none" stroke="#edd3df" strokeWidth="1.5" strokeDasharray="4 7" />
              </g>
              {showDetail && <g data-detail-field="" pointerEvents="none" aria-hidden="true">
                <path d={OVERVIEW_SURFACES.floor} fill="#d6eadf" stroke="#9cc3b0" strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
                {fieldInView && !arenaMaps && <text x={FIELD_CENTER.x} y={FIELD_CENTER.y} textAnchor="middle" dominantBaseline="central"
                  fontSize={14 / screenScale} fontWeight="900" fill="#3f6f5c">アリーナ</text>}
              </g>}
              <g data-overview-art="structure" opacity={overviewOpacity} pointerEvents="none" aria-hidden="true">
                <path d={OVERVIEW_SURFACES.bowl} fill="url(#tokyo-bowl-surface)" stroke="#d8e1e8" strokeWidth="2" filter="url(#tokyo-bowl-shadow)"/>
                <path d={OVERVIEW_SURFACES.bowl} fill="none" stroke="#fff" strokeWidth="7"/>
                <path d={OVERVIEW_SURFACES.floor} fill="url(#tokyo-floor-surface)" stroke="#e8eee9" strokeWidth="12"/>
                <path d={OVERVIEW_SURFACES.floor} fill="url(#tokyo-floor-stripes)" stroke="#719886" strokeWidth="1.5"/>
                {/* Existing block footprints make the stepped bowl, including its aisle gaps. */}
                <g transform="translate(0 4)" fill="#596e82" opacity=".25">
                  {SHAPES.map(area => <path key={area.path} d={area.path!}/>)}
                  {BALCONY_GROUP_PATHS.map((path, index) => <path key={index} d={path}/>)}
                </g>
              </g>
              {SHAPES.map((area) => {
                const active = selected?.code === area.code && !area.shared;
                const rowGuides = ROW_GUIDES.get(area.code);
                const selectedMarker = active && selectedRow !== null ? rowGuides?.marker(selectedRow) : null;
                return <g key={area.path} opacity={matchesLevel(area.code) ? 1 : .16}>
                  <path d={area.path!} fill={active ? "#db3d7b" : ZONE_COLORS[area.code[0]]}
                    stroke={active ? "#71254a" : "#fff"} strokeWidth={active ? 2.2 : 1.6} vectorEffect="non-scaling-stroke"
                    className={area.shared ? undefined : "cursor-pointer"} data-seat-code={area.shared ? undefined : area.code}
                    onKeyDown={area.shared ? undefined : event => keyArea(event, area)} onFocus={() => setFocusedCode(area.code)}
                    tabIndex={area.shared ? undefined : area.code === activeFocus ? 0 : -1} role={area.shared ? undefined : "button"}
                    aria-label={area.shared ? undefined : `${area.code}・${rowRangeLabel(area.rows)}を拡大${PHOTO_SECTION_CODES.has(area.code) ? "（写真あり）" : ""}`} />
                  {!active && overviewOpacity > 0 && <path d={area.path!} fill={`url(#tokyo-tier-${area.code[0]})`} opacity={overviewOpacity} pointerEvents="none" aria-hidden="true"/>}
                  {!area.shared && PHOTO_SECTION_CODES.has(area.code) && <path d={area.path!}
                    data-seat-photo-outline={area.code} fill="none"
                    stroke={SEAT_PHOTO_MAP_COLOR} strokeWidth={1.5}
                    vectorEffect="non-scaling-stroke" pointerEvents="none" aria-hidden="true" />}
                  {rowGuides && overviewOpacity > 0 && <path d={rowGuides.lines} fill="none" stroke="#425c73" strokeWidth=".45" vectorEffect="non-scaling-stroke" opacity={overviewOpacity * .18} clipPath={`url(#tokyo-rows-${area.code})`} pointerEvents="none" aria-hidden="true"/>}
                  {detailStage && rowGuides && <g clipPath={`url(#tokyo-rows-${area.code})`} pointerEvents="none">
                    {<path d={rowGuides.lines} fill="none" stroke={active ? "#fff" : "#665f7a"} strokeWidth={showDetail ? "0.65" : "0.45"} vectorEffect="non-scaling-stroke" opacity={active ? "0.55" : showDetail ? "0.32" : "0.2"} />}
                  </g>}
                  {selectedMarker && <circle cx={selectedMarker[0]} cy={selectedMarker[1]} r="1.9" fill="#075985" stroke="#fff" strokeWidth="1.2" vectorEffect="non-scaling-stroke" pointerEvents="none" />}
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
              <g opacity={overviewOpacity * (matchesLevel("C") ? 1 : .16)} pointerEvents="none" aria-hidden="true">{BALCONY_GROUP_PATHS.map((path, index) => <path key={index} d={path} fill="url(#tokyo-tier-C)"/>)}</g>
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
              {detailStage && selectedArea && selectedRow !== null && ROW_GUIDES.get(selectedArea.code)?.band(selectedRow) && <path
                data-selected-row-band={selectedRow} d={ROW_GUIDES.get(selectedArea.code)!.band(selectedRow)!}
                clipPath={`url(#tokyo-rows-${selectedArea.code})`} fill="#b9e3fb" fillOpacity="0.96"
                stroke="#1673ad" strokeWidth="1.2" vectorEffect="non-scaling-stroke" pointerEvents="none" />}
              <g data-overview-art="floor-label" opacity={arenaMaps ? 0 : overviewOpacity} pointerEvents="none" aria-hidden="true" fill="#315b4c" textAnchor="middle" fontFamily="ui-sans-serif, sans-serif">
                <text x="579" y="253" fontSize={Math.min(17, Math.max(12, canvasSize.width / 26)) / screenScale}
                  fontWeight="800">アリーナ</text>
              </g>
              {mapLabels.filter(label => !(verifiedNumberGuide && label.code === selected?.code)).map(label => <text key={label.code} data-seat-label={label.code} x={label.x} y={label.y}
                transform={`rotate(${label.angle},${label.x},${label.y})`} textAnchor="middle" dominantBaseline="central"
                fontSize={label.fontSize} fontWeight="650" fontFamily="ui-sans-serif, sans-serif"
                data-photo-label={sideOverview && PHOTO_SECTION_CODES.has(label.code) ? "" : undefined}
                fill={selected?.code === label.code || (sideOverview && PHOTO_SECTION_CODES.has(label.code)) ? "#fff" : "#483340"}
                stroke={selected?.code === label.code || (sideOverview && PHOTO_SECTION_CODES.has(label.code)) ? "#a93164" : "#fff"}
                strokeWidth={selected?.code === label.code ? 3 : sideOverview && PHOTO_SECTION_CODES.has(label.code) ? 6 : 2.5} strokeLinejoin="round" vectorEffect="non-scaling-stroke" paintOrder="stroke" pointerEvents="all" data-seat-code={label.code} style={{cursor:"pointer"}}>{label.code}</text>)}
              <g pointerEvents="none" aria-label="席番号の目印と増える方向">{displayedNumberGuides.map(guide => {
                const active = guide.id === verifiedNumberGuide?.id;
                return <g key={guide.id} data-seat-number={guide.number} data-number-block={guide.id === verifiedNumberGuide?.id ? selected?.code : undefined}>
                  
                  <path data-number-badge="" data-number-arrow="" data-connected-number-arrow="" data-shaft-px="3" data-head-px="8" d={tokyoDomeNumberBadge(guide.direction)} transform={`translate(${guide.point[0]} ${guide.point[1]}) scale(${1/screenScale})`} fill="#fff" stroke={active?"#a93164":"#d5c5cd"} strokeWidth={active?2:1} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                  <path data-number-arrow-ink="" d={seatNumberArrowInk(guide.direction)} transform={`translate(${guide.point[0]} ${guide.point[1]}) scale(${1/screenScale})`} fill="none" stroke="#a93164" strokeWidth={active ? 2 : 1.6} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                  <text x={guide.point[0]} y={guide.point[1]} textAnchor="middle" dominantBaseline="central" fontSize={(active?14:12) / screenScale} fontWeight="800" fill="#783b59">{guide.number}番</text>
                </g>;
              })}</g>
              {detailStage && visibleEdgeMarkers.map(({ row, point, anchor }) => point && <g key={`edge-${row}`} pointerEvents="none">
                {anchor&&(anchor[0]!==point[0]||anchor[1]!==point[1])&&<path d={`M${anchor[0]},${anchor[1]}L${point[0]},${point[1]}`} stroke="#913455" strokeWidth=".6"/>}
                <rect data-row-badge="" x={point[0] - 28 / screenScale} y={point[1] - 14 / screenScale} width={56 / screenScale} height={28 / screenScale} rx={4 / screenScale} fill={row===selectedRow?"#155786":"#e8f3ff"} stroke="#23679a" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
                <text x={point[0]} y={point[1] + 4 / screenScale} textAnchor="middle" fontSize={12 / screenScale} fontWeight="900" fill={row===selectedRow?"#fff":"#155786"}>{row}列</text>
              </g>)}
              {TOKYO_DOME_GATE_ANCHORS.filter(gate => {
                // A whole-side view is for finding the block; gates return once a block is chosen.
                if (showDetail) return Boolean(selected) || interactiveViewBox.width <= 360;
                if (!["GATE 11", "GATE 25", "GATE 40", "GATE 41"].includes(gate.gate)) return false;
                return TOKYO_DOME_OVERVIEW_AREAS.every(area => Math.abs(area.point[0] - gate.label.x) * overviewScale >= 80
                  || Math.abs(area.point[1] - gate.label.y) * overviewScale >= 36);
              }).map((gate) => <g key={gate.gate} pointerEvents="none">
                <rect x={gate.label.x - 31 / screenScale} y={gate.label.y - 12 / screenScale}
                  width={62 / screenScale} height={24 / screenScale} rx={6 / screenScale} fill="#393148" stroke="#fff" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
                <text x={gate.label.x} y={gate.label.y + 4 / screenScale} textAnchor="middle"
                  fontSize={12 / screenScale} fontWeight="900" letterSpacing="0.3" fill="#fff">{gate.gate}</text>
              </g>)}
              {selectedSpecial && <g pointerEvents="none">
                <circle cx={selectedSpecial.label[0]} cy={selectedSpecial.label[1]} r="12" fill="none" stroke="#e62468" strokeWidth="2.4" vectorEffect="non-scaling-stroke" />
                <circle cx={selectedSpecial.label[0]} cy={selectedSpecial.label[1]} r="16" fill="none" stroke="#e62468" strokeWidth="1" strokeDasharray="3 2" vectorEffect="non-scaling-stroke" />
                <path d={`M${selectedSpecial.label[0]},${selectedSpecial.label[1] - 16} v-4`} fill="none" stroke="#a82458" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                <rect x={selectedSpecial.label[0] - 17} y={selectedSpecial.label[1] - 33} width="34" height="13" rx="6.5" fill="#a82458" stroke="#fff" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                <text x={selectedSpecial.label[0]} y={selectedSpecial.label[1] - 24} textAnchor="middle" fontSize="6.2" fontWeight="900" fill="#fff">{selectedSpecial.code}</text>
              </g>}
              {photoMarkers.map(({ area, x, y }) => <g key={area.code}>
                <g data-seat-code={area.code} data-seat-photo-marker={area.code} role="button" tabIndex={0}
                  data-photo-x={x} data-photo-y={y} data-photo-placement="inside-block"
                  aria-label={`写真がある${area.code}区画を選ぶ`} onKeyDown={event => keyArea(event, area)} className={styles.photoMarker}>
                  <circle cx={x} cy={y} r={13 / screenScale} fill="transparent" />
                  {(PHOTO_COUNTS.get(area.code) ?? 0) > 1
                    ? <g data-photo-count={PHOTO_COUNTS.get(area.code)} transform={`translate(${x} ${y}) scale(${1 / screenScale})`}>
                      <rect x="-19" y="-11" width="38" height="22" rx="11" fill="#a93164" stroke="#fff" strokeWidth="1.5" />
                      <g transform="translate(-14 -6) scale(.5)" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" />
                      </g>
                      <text x="8" y="0.5" textAnchor="middle" dominantBaseline="central" fontSize="12" fontWeight="900" fill="#fff">{PHOTO_COUNTS.get(area.code)}</text>
                    </g>
                    : <SeatPhotoMarker x={x} y={y} size={20 / screenScale} highlighted />}
                </g>
              </g>)}
            </svg>
          {!showDetail && <div className={styles.areaLabels} aria-label="大きな場所から探す">
            {TOKYO_DOME_OVERVIEW_AREAS.map(area => <button key={area.id} type="button" data-major-area={area.id}
              className={tapHint ? styles.areaPrompt : undefined} onAnimationEnd={() => setTapHint(false)}
              style={{left:(canvasSize.width-interactiveViewBox.width*screenScale)/2+(area.point[0]-interactiveViewBox.x)*screenScale,
                top:(canvasSize.height-interactiveViewBox.height*screenScale)/2+(area.point[1]-interactiveViewBox.y)*screenScale}}
              onClick={() => chooseDirection(area.id)}><span>{area.label.replace("外野", "")}</span>
                {Boolean(overviewPhotoCounts.get(area.id)) && <span className={styles.areaPhotoCount} data-photo-area-count={area.id}>
                  <Camera size={12} aria-hidden="true" />{overviewPhotoCounts.get(area.id)}<span className="sr-only">区画に写真あり</span>
                </span>}
              </button>)}
          </div>}
          {arenaMaps && arenaButtonInView && <button type="button" className={styles.arenaMaps} data-arena-maps-button=""
            style={{ left: arenaButton.left, top: arenaButton.top }} onPointerDown={event => event.stopPropagation()} onClick={arenaMaps.open}
            aria-label={`アリーナ図を見る（${arenaMaps.count}公演）`}>
            <MapIcon size={14} aria-hidden="true" />アリーナ図<b>{arenaMaps.count}</b>
          </button>}
          {showDetail && fieldPointer && <span className={styles.fieldPointer} data-field-pointer=""
            style={{ left: fieldPointer.left, top: fieldPointer.top }} aria-hidden="true">
            <ArrowUp size={14} style={{ transform: `rotate(${fieldPointer.angle}deg)` }} />アリーナ
          </span>}
          {showDetail && <button type="button" className={styles.miniMap} onPointerDown={event => event.stopPropagation()} onClick={showWhole} aria-label="全体図に戻る" data-mini-map="">
            <svg viewBox={MAP_VIEWS.all.box} aria-hidden="true">
              <path d={OVERVIEW_SURFACES.bowl} fill="#efe6ea" stroke="#d9c6cf" strokeWidth="8" />
              <path d={OVERVIEW_SURFACES.floor} fill="#bfdccc" />
              <rect x={miniFrame.x} y={miniFrame.y} width={miniFrame.width} height={miniFrame.height} rx="12"
                fill="#a9316433" stroke="#a93164" strokeWidth="14" />
            </svg>
            <span>全体</span>
          </button>}
        </div>
          {showDetail && visibleZones.length > 0 && <ul className={styles.zoneKey} aria-label="色の見方" data-zone-key="">
            {visibleZones.map(zone => <li key={zone.key}><i style={{ background: ZONE_COLORS[zone.key] }} />{zone.label}</li>)}
          </ul>}
        </div>
        {/* Keep conditional notes below the canvas and whole-view control so selection cannot move either. */}
        {selectedSpecial&&<p className={styles.hint}>図の記号の位置です。個別の席・列は表示していません。</p>}
        {selectedRowNote&&<p className={styles.hint}>{selectedRowNote}</p>}
        
        {detailStage && !verifiedNumberGuide && <p className={styles.hint}>この区画の番号方向は確認中です。</p>}
        {verifiedBlock?.rowCoverage === "representative" && numberReference && <p className={styles.hint}>番号は代表列のみ確認済みです。ほかの列は区画名で選べます。番号札は{numberReference.row}列の開始番号です。</p>}
        {selected && selectedRow && <SeatSearchOffer venueId="tokyo-dome" row={String(selectedRow)} number={seatInput} contextLabel={selected.code} />}
      </DomeSeatFrame>
    </div>
  </section>;
}
