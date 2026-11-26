"use client";

import { VenueProgramAnchor } from "@/components/venue/VenueProgramLinks";
import SeatSearchOffer from "@/components/seat-campaign/SeatSearchOffer";
import { trackVenueSeatPhotoOpen, trackVenueSeatSearch, trackVenueSeatSectionSelect } from "@/lib/venueAnalytics";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, useId, useSyncExternalStore, type PointerEvent } from "react";
import { Camera, ChevronDown, ChevronRight, Crosshair, Info, ListOrdered, Map as MapIcon, Maximize2, Send, X } from "lucide-react";
import { DomeSeatFrame } from "./DomeSeatFrame";
import { useSeatMapTouch } from "./useSeatMapTouch";
import { SEAT_PHOTO_MAP_COLOR, SeatPhotoMapSummary, SeatPhotoMarker } from "./SeatViewPosts";
import { SeatPhotoEmptySheet, SeatPhotoSheet, SeatPhotoSheetTab, type SheetNeighbor, type SheetRows } from "./SeatPhotoSheet";
import { seatViewInlinePhotoUrl } from "@/lib/seatViewPhotoAssets";
import { SeatShareSheet } from "./SeatShareSheet";
import { SEAT_SHARE_DIAGRAMS } from "@/lib/seatShare";
import { seatPhotoOffsets, useSeatPhotoHitTest } from "./useSeatPhotoHitTest";
import { seatViewMatchesForSelection, seatViewPosts, type SeatViewPlace } from "@/lib/seatViewPosts";
import { announceTokyoDomeMapScope, type TokyoDomeMapScope } from "@/lib/tokyoDomeVenueSelection";
import { useArenaMaps } from "@/components/venue/ArenaMapsSheet";
import { seatNumberBadge, seatNumberBadgeBounds, seatNumberArrowInk, seatNumberBadgeTipDistance } from "@/lib/seatNumberBadge";
import { SeatFinderControls, SeatFinderMiss, type FinderMode } from "./SeatFinderControls";
import { directionName, nearSeatNumbers, seatLevelName } from "./seatFinderLabels";
import { boundsOf, fitStandArrowToCanvas, edgeNumberGuide, fitStandNumberGuide, clampCamera, standDetailCamera, standRowDetailTransition, isSeatTap, labelCoversOtherBlock, mapProjection, normalizeSeatInput, placeVisibleRowLabel, searchStandSeats, standContextLabel, standDisplayRows, standVisibleRowHints, standLabelOrder, standGroupReferenceLabels, standReferenceLabelKey, standRedundantContextLabel, standRedundantContextText, standLabelInsideCanvas, standSelectedNumberRun, standSelectedRow, youngEdgeMidpoint, zoomCamera, zoneLabelPositions, type MapBox, type Point, type StandBlock, type StandMapData, type StandPosition } from "./standMap";
import { hasStandCanvasArea, overviewAreaLabelPosition, overviewAreaLabelWidth, resolveStandSeatSection, standPathRings, standRectCoverShare, standRectTouchesRings, standRingsBox, standZoneCamera } from "./standMap";
import styles from "./StandSeatMap.module.css";
import { blockDisplayTitle, blockLongName, blockRowGap, blockShortName, fanName, frontRow, rowSummary, seatOnSegment } from "./seatLabels";
import { VenueOverviewArt, StandOverviewTexture, overviewArtworkOpacity, VENUE_OVERVIEW_PROFILES } from "./VenueOverviewArt";

type Choice = { id: string; label: string; color: string; point: Point };
type Props = { data: StandMapData; levels: Choice[]; areas: { id: string; label: string }[]; initialSection?: string | null; onEquipment: (floor: string | null) => void; venueId?: string;
  /** Phones: the page shows a still preview; a tap opens the full-screen map with the photo board. */
  immersive?: boolean; venueName?: string;
  /** From a "この席を送る" link: the ticket's row / number, and opening the full-screen map at once. */
  initialRow?: string; initialNumber?: string; initialOpen?: boolean };
/** Phone widths get the full-screen map; wider screens keep the map inside the page. */
const IMMERSIVE_QUERY = "(max-width: 767px)";
function subscribeImmersive(callback: () => void) {
  const query = window.matchMedia(IMMERSIVE_QUERY);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}
const HINT_KEY = "tixrepo:seat-map-photo-hint";
/** What the full-screen map frames once laid out: a block (by id), or a zone / position / level area (by box). */
type FrameRequest = { id: string; zoom: boolean; animate: boolean; box?: MapBox };
/** Full screen opens where five rows take about this many pixels, so every fifth row's tag can be read. */
const FIVE_ROWS_PX = 22;
export type StandSeatMapHandle = { showRegion: (level: string, area: string) => void };
type Gesture = { points: Map<number, Point>; start: Point; last: Point; travel: number; multi: boolean; block: string | null; photo: string | null; distance: number };
const freshGesture = (): Gesture => ({ points: new Map(), start: [0, 0], last: [0, 0], travel: 0, multi: false, block: null, photo: null, distance: 0 });
const photoDiameter = 18;
const photoTarget = 28;
/** The block under a point near (x, y): rings of 5, 10 and 15px around a tap that missed every block. */
function nearestBlockId(x: number, y: number): string | null {
  for (const radius of [5, 10, 15]) for (let step = 0; step < 8; step += 1) {
    const angle = step * Math.PI / 4;
    const hit = document.elementFromPoint(x + radius * Math.cos(angle), y + radius * Math.sin(angle));
    const id = hit instanceof SVGElement ? hit.closest("[data-block-id]")?.getAttribute("data-block-id") : null;
    if (id) return id;
  }
  return null;
}
/** Template scope for the page's photo row: ids are seat sections (blocks/zones), matched against photo links. */
export type StandMapScope = TokyoDomeMapScope & { match: "section"; labels: string[] };
/** Tokyo Dome's glide: zoom changes evenly in scale, eased in and out, longer the further it goes. */
function glideDuration(fromWidth: number, toWidth: number) {
  return Math.round(Math.min(900, 420 + 170 * Math.abs(Math.log(toWidth / fromWidth))));
}
function glideFrame(from: MapBox, to: MapBox, progress: number): MapBox {
  const eased = progress < .5 ? 4 * progress ** 3 : 1 - Math.pow(-2 * progress + 2, 3) / 2;
  const width = from[2] * Math.pow(to[2] / from[2], eased), height = from[3] * Math.pow(to[3] / from[3], eased);
  const cx = from[0] + from[2] / 2 + (to[0] + to[2] / 2 - from[0] - from[2] / 2) * eased;
  const cy = from[1] + from[3] / 2 + (to[1] + to[3] / 2 - from[1] - from[3] / 2) * eased;
  return [cx - width / 2, cy - height / 2, width, height];
}
const StandSeatMap = forwardRef<StandSeatMapHandle, Props>(function StandSeatMap({ data, levels, areas, initialSection, onEquipment, venueId, immersive = false, venueName, initialRow, initialNumber, initialOpen }, ref) {
  
  // The three stacked floor plans need room for their outer rim and heading.
  // This pads the overview and outer pan bounds; seat geometry and floor/detail target definitions stay intact.
  const overviewBox: MapBox = useMemo(() => data.diagramId === "pia-arena-mm-seat-plans"
    ? [data.viewBox[0] - 180, data.viewBox[1] - 180, data.viewBox[2] + 360, data.viewBox[3] + 360]
    : data.viewBox as MapBox, [data.diagramId, data.viewBox]);
  // One zoom rule for every venue: the closest anyone can zoom is where the selected block's
  // row lines and labels are read (the template's "closest detail"); pinch, wheel, buttons and
  // camera moves all clamp to it.
  const minSpan = data.detailSpan * .45;
  const [initial] = useState(() => initialSection ? resolveStandSeatSection(data, initialSection) : null);
  const initialBlock = initial?.block, initialZone = initial?.zone;
  const [level, setLevel] = useState(initialBlock?.level ?? initialZone?.level ?? "all"), [area, setArea] = useState(initialBlock?.area ?? initialZone?.area ?? "all");
  const [row, setRow] = useState(initialBlock && initialRow ? initialRow : ""), [number, setNumber] = useState(initialBlock && initialNumber ? initialNumber : "");
  const [finderMode, setFinderMode] = useState<FinderMode>("ticket");
  const [blockInput, setBlockInput] = useState("");
  const [searchMiss, setSearchMiss] = useState(false);
  const [selected, setSelected] = useState<string | null>(initialBlock?.id ?? null), [focused, setFocused] = useState(initialBlock?.id ?? initialZone?.blockIds[0] ?? data.blocks[0].id);
  const [zone, setZone] = useState<string | null>(initialBlock?.zone ?? initialZone?.id ?? null);
  const [matches, setMatches] = useState<StandBlock[]>([]), [error, setError] = useState("");
  const [position, setPosition] = useState<StandPosition | null>(null);
  const [photoRequest, setPhotoRequest] = useState(0);
  const [photoFromTicket, setPhotoFromTicket] = useState(Boolean(initialBlock && initialRow));
  const [shareOpen, setShareOpen] = useState(false);
  // Only the seat map a venue opens with can be sent (the share link opens that map).
  const canShare = Boolean(venueId && SEAT_SHARE_DIAGRAMS[venueId] === data.diagramId);
  const [view, setView] = useState<MapBox>(() => {
    const target = initialBlock ? standDetailCamera(initialBlock, data) : initialZone ? standZoneCamera(data, initialZone) : overviewBox;
    return initial ? clampCamera(target, overviewBox, minSpan) : overviewBox;
  }), [size, setSize] = useState({ width: 900, height: 620 });
  const [pulse, setPulse] = useState(false);
  const arenaMaps = useArenaMaps();
  // Full-screen map (phones): the page keeps a still preview; the photo board rises over the map.
  const narrow = useSyncExternalStore(subscribeImmersive, () => window.matchMedia(IMMERSIVE_QUERY).matches, () => false);
  const immersiveMode = immersive && narrow;
  const [fullscreen, setFullscreen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(true);
  const [sheetPhoto, setSheetPhoto] = useState(0);
  const [slotHeight, setSlotHeight] = useState<number>();
  const [frameTick, setFrameTick] = useState(0);
  const [hintSeen, setHintSeen] = useState(true);
  const fullscreenRef = useRef(false), lockedRef = useRef(false), pushedHistory = useRef(false);
  const pageScroll = useRef(0), frameRequest = useRef<FrameRequest | null>(null);
  const frameElement = useRef<HTMLDivElement>(null), sheetElement = useRef<HTMLDivElement>(null), closeButton = useRef<HTMLButtonElement>(null), openButton = useRef<HTMLButtonElement>(null), tabElement = useRef<HTMLButtonElement>(null);
  // The small venue map: tapping it pulls back to the whole venue; "選んだ席に戻る" returns to this camera.
  const [overviewReturn, setOverviewReturn] = useState<MapBox | null>(null);
  const [openCount, setOpenCount] = useState(0);
  const mapLocked = immersiveMode && !fullscreen;
  fullscreenRef.current = fullscreen; lockedRef.current = mapLocked;

  const stage = useRef<HTMLDivElement>(null), svg = useRef<SVGSVGElement>(null), frame = useRef<number | null>(null);
  // Live camera (camera) vs. the camera the labels were last laid out for (renderedView): see paint().
  const inner = useRef<SVGSVGElement>(null), overlay = useRef<SVGGElement>(null), sizeRef = useRef(size);
  const renderedView = useRef(view), moving = useRef(false), wheelCommit = useRef<number | null>(null);
  const announcedScope = useRef("");
  const camera = useRef(view), gesture = useRef(freshGesture()), interacted = useRef(Boolean(initial));
  const suppressMapClick = useSeatMapTouch(stage, lockedRef);
  // The still preview always lets the page scroll; the full-screen map never does.
  const allowPageScroll = mapLocked || (!fullscreen && view[2] >= overviewBox[2] * .99);
  // Full screen, the venue drawing has walls: its edges stop at the screen edges (the bottom edge at the
  // photo board's top), it never zooms out smaller than the whole venue, and never into blank space.
  // The walls stand at the seats' own outline (with a small margin), not at the drawing's blank border.
  const wallBox = useMemo<MapBox>(() => { const [x, y, w, h] = boundsOf(data.blocks, 0); const pad = Math.max(w, h) * .03; return [x - pad, y - pad, w + pad * 2, h + pad * 2]; }, [data.blocks]);
  /** How much of the map the photo board (or its folded title) covers, measured from the map's bottom. */
  function boardHeight() {
    const sheet = (sheetElement.current ?? tabElement.current)?.getBoundingClientRect(), map = stage.current?.getBoundingClientRect();
    return sheet && map ? Math.max(0, Math.min(map.height * .7, map.bottom - sheet.top)) : 0;
  }
  function wallCamera(box: MapBox): MapBox {
    const { width, height } = sizeRef.current;
    const board = boardHeight();
    const usable = Math.max(120, height - board);
    const [ox, oy, ow, oh] = wallBox;
    const widest = Math.min(width / (ow * 1.04), usable / (oh * 1.04));
    const closest = Math.min(width, usable) / minSpan;
    const scale = Math.max(widest, Math.min(closest, mapProjection(box, width, height).scale));
    const viewWidth = width / scale, usableHeight = usable / scale;
    let cx = box[0] + box[2] / 2;
    cx = viewWidth >= ow ? ox + ow / 2 : Math.max(ox + viewWidth / 2, Math.min(ox + ow - viewWidth / 2, cx));
    // The camera box covers the whole stage; the part above the board is what must stay on the drawing.
    let top = box[1] + box[3] / 2 - height / scale / 2;
    top = usableHeight >= oh ? oy - (usableHeight - oh) / 2 : Math.max(oy, Math.min(oy + oh - usableHeight, top));
    return [cx - viewWidth / 2, top, viewWidth, height / scale];
  }
  const fitCamera = (box: MapBox) => fullscreenRef.current ? wallCamera(box) : clampCamera(box, overviewBox, minSpan);
  const initialCanvasPending = useRef(Boolean(initialBlock));
  const previousSize = useRef(size);
  const uid = useId().replace(/:/g, ""), instructionId = `${uid}-keys`;
  const block = data.blocks.find(b => b.id === selected);
  const selectedLevelLabel = block ? seatLevelName(block.level, levels.find(l => l.id === block.level)?.label) : "";
  const selectedRows = block ? rowSummary(block) : "";
  // Remove only exact repeated display fragments; retain the source block name and seat data.
  const selectedTitle = block ? blockDisplayTitle(block, selectedLevelLabel) : "";
  const highlightedRow = standSelectedRow(data, block, row);
  const projection = mapProjection(view, size.width, size.height);
  // The selected block's outline on screen: labels for other places keep off it, and its own
  // name moves beside it when the name would hide the block.
  const selectedRings = useMemo(() => block ? standPathRings(block.path) : [], [block]);
  const selectedScreenRings = selectedRings.map(ring => ring.map(point => projection.project(point)));
  const selectedScreenBox = standRingsBox(selectedScreenRings);
  const photoHitTest = useSeatPhotoHitTest();
  const photoAnchors = useMemo(() => {
    const entries = new Map(seatViewPosts(data.diagramId).map(post => [`${post.place.kind}:${post.place.id}`, post]));
    return [...entries].flatMap(([key, { place, area: label }]) => {
      if (place.kind === "section") {
        const section = data.blocks.find(item => item.id === place.id);
        return section ? [{ key, place, label, level: section.level, point: section.center, paths: [section.path], centers: [section.center] }] : [];
      }
      const target = (place.kind === "zone" ? data.zones : data.positionTargets)?.find(item => item.id === place.id);
      const blockIds = place.kind === "zone" ? data.zones?.find(item => item.id === place.id)?.blockIds : undefined;
      const members = data.blocks.filter(block => blockIds?.includes(block.id)
        || (!blockIds && block.level === target?.level));
      return target ? [{ key, place, label, level: target.level, point: target.point,
        paths: members.map(block => block.path), centers: members.map(block => block.center) }] : [];
    });
  }, [data]);
  const photoSectionIds = useMemo(() => new Set(photoAnchors.filter(item => item.place.kind === "section").map(item => item.place.id)), [photoAnchors]);
  
  
  
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
  // A chosen zone (a side, a stand, a lettered area) is tinted as a whole, like a chosen block.
  const zoneMembers = useMemo(() => new Set(!selected && zone ? data.zones?.find(z => z.id === zone)?.blockIds ?? [] : []), [data.zones, selected, zone]);
  // The chosen block (and a chosen zone) is always painted last, so no neighbouring or
  // overlapping shape can hide it.
  const blockShapes = useMemo(() => [...data.blocks.filter(b => b.id !== block?.id && !zoneMembers.has(b.id)), ...data.blocks.filter(b => zoneMembers.has(b.id)), ...(block ? [block] : [])].map(b => <path key={b.id} d={b.path} fillRule="evenodd" data-block-id={b.id} data-zone-member={zoneMembers.has(b.id) ? "" : undefined} className={`${styles.block} ${whole && pulse && data.wholeBlockLabels && !data.zones ? styles.blockPrompt : ""}`}
            fill={b.id === selected ? "#a93164" : zoneMembers.has(b.id) ? "#c4527f" : levels.find(l => l.id === b.level)!.color}
            opacity={level === "all" || b.level === level || selected || zoneMembers.has(b.id) ? 1 : .17} stroke={b.id === selected || zoneMembers.has(b.id) ? "#682840" : "#fff"} strokeWidth={b.id === selected ? 1.8 : zoneMembers.has(b.id) ? 1.2 : 1}>
            <title>{`${seatLevelName(b.level, levels.find(item => item.id === b.level)?.label)} ${b.balcony ? "バルコニー " : ""}${blockDisplayTitle(b, "")}・${rowSummary(b)}`}</title>
          </path>), [block, data.blocks, data.wholeBlockLabels, data.zones, level, levels, pulse, selected, whole, zoneMembers]);

  // A stopped glide or gesture keeps the camera where it is; labels are laid out again for it.
  function cancelGlide() { if (frame.current !== null) cancelAnimationFrame(frame.current); frame.current = null; }
  function stop() { cancelGlide(); if (!gesture.current.points.size) commit(); }
  function interaction() { initialCanvasPending.current = false; interacted.current = true; setPulse(false); stop(); }
  // Glides, pans, pinches and wheel zooms paint the camera straight onto the SVG and commit to React
  // once when they end (Tokyo Dome's paintBox/commitBox): laying out every label on each frame made
  // the map stutter on phones. Screen-space labels follow with one transform until the commit.
  function paint(next: MapBox) {
    camera.current = next;
    const { width, height } = sizeRef.current;
    inner.current?.setAttribute("viewBox", next.join(" "));
    const from = mapProjection(renderedView.current, width, height), to = mapProjection(next, width, height);
    const ratio = to.scale / from.scale, origin = from.project([0, 0]), target = to.project([0, 0]);
    overlay.current?.setAttribute("transform", `translate(${target[0] - origin[0] * ratio} ${target[1] - origin[1] * ratio}) scale(${ratio})`);
    stage.current?.setAttribute("data-camera", next.map(n => n.toFixed(2)).join(","));
    if (!moving.current) { moving.current = true; stage.current?.setAttribute("data-moving", ""); }
  }
  function commit() {
    if (wheelCommit.current !== null) { clearTimeout(wheelCommit.current); wheelCommit.current = null; }
    if (!moving.current) return;
    moving.current = false;
    stage.current?.removeAttribute("data-moving");
    setView([...camera.current] as MapBox);
  }
  function follow(next: MapBox) { paint(fitCamera(next)); }
  function move(next: MapBox, animate = true) {
    stop(); const target = fitCamera(next);
    if (!animate || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { paint(target); commit(); return; }
    const from = [...camera.current] as MapBox, duration = glideDuration(from[2], target[2]);
    let start: number | null = null;
    function tick(now: number) {
      start ??= now;
      const progress = Math.min(1, (now - start) / duration);
      paint(progress < 1 ? glideFrame(from, target, progress) : target);
      if (progress < 1) frame.current = requestAnimationFrame(tick); else { frame.current = null; commit(); }
    }
    frame.current = requestAnimationFrame(tick);
  }
  // A side, level or zone is never framed closer than a tapped block (Tokyo Dome's sideFitView
  // floor), so choosing a block from it never zooms out.
  function notCloserThanBlock(box: MapBox): MapBox {
    const { width, height } = sizeRef.current;
    const blockScale = mapProjection([0, 0, data.detailSpan, data.detailSpan], width, height).scale;
    const grow = mapProjection(box, width, height).scale / blockScale;
    if (!(grow > 1)) return box;
    return [box[0] - box[2] * (grow - 1) / 2, box[1] - box[3] * (grow - 1) / 2, box[2] * grow, box[3] * grow];
  }
  useLayoutEffect(() => {
    renderedView.current = view;
    // Labels were just laid out for this camera; a gesture still in progress re-derives its offset.
    if (moving.current) paint(camera.current);
    else { camera.current = view; overlay.current?.removeAttribute("transform"); }
  }, [view, size]);
  function clearResult() { setSelected(null); resetFinderFeedback(); setPosition(null); }
  function resetFinderFeedback() { setMatches([]); setError(""); setSearchMiss(false); }
  function reset() { interaction(); clearResult(); setZone(null); setLevel("all"); setArea("all"); move(overviewBox as MapBox); }
  function chooseRegion(nextLevel: string, nextArea: string) {
    interaction(); clearResult(); setZone(null); setLevel(nextLevel); setArea(nextArea);
    const targets = data.blocks.filter(b => (nextLevel === "all" || b.level === nextLevel) && (nextArea === "all" || b.area === nextArea));
    if (!targets.length) { setError("この席種にはその区画がありません。席種を「すべて」に戻して探せます。"); return; }
    const next = data.regionViews?.[`${nextLevel}:${nextArea}`] as MapBox | undefined ?? (nextLevel === "all" && nextArea === "all" ? overviewBox
      : nextLevel === "all" && data.areaViews?.[nextArea] ? data.areaViews[nextArea] as MapBox
      : nextArea === "all" && data.levelViews?.[nextLevel] ? data.levelViews[nextLevel] as MapBox : boundsOf(targets));
    const box = nextLevel === "all" && nextArea === "all" ? next : notCloserThanBlock(next);
    if (!showArea(box)) move(box);
    const center: Point = [next[0] + next[2] / 2, next[1] + next[3] / 2];
    setFocused([...targets].sort((a, b) => Math.hypot(a.center[0] - center[0], a.center[1] - center[1]) - Math.hypot(b.center[0] - center[0], b.center[1] - center[1]))[0].id);
  }
  useImperativeHandle(ref, () => ({ showRegion: chooseRegion }));
  function chooseZone(id: string) {
    const target = data.zones?.find(z => z.id === id); if (!target) return;
    setPhotoFromTicket(false);
    interaction(); clearResult(); setZone(id); setLevel(target.level); setArea(target.area);
    const members = data.blocks.filter(b => target.blockIds.includes(b.id));
    const box = notCloserThanBlock(standZoneCamera(data, target));
    if (!showArea(box)) move(box);
    setFocused(members[0].id);
  }
  /** Phones: an area chosen on the still preview opens the full-screen map framed on it (with its photo board);
   * in full screen the area is framed above the board. Returns false on the page-sized map. */
  function showArea(box: MapBox) {
    if (!immersiveMode) return false;
    const request: FrameRequest = { id: "", zoom: true, animate: true, box };
    if (!fullscreenRef.current) { openFullscreen(request); return true; }
    setSheetOpen(true); setSheetPhoto(0); setOverviewReturn(null);
    frameRequest.current = request; setFrameTick(tick => tick + 1);
    return true;
  }
  function select(b: StandBlock, recenter = false, fromTicket = false, source: "map" | "search" | "step" = recenter || fromTicket ? "search" : "map") {
    setPhotoFromTicket(fromTicket);
    interaction(); setSelected(b.id); setZone(b.zone ?? null); setFocused(b.id); setLevel(b.level); setArea(b.area); resetFinderFeedback(); setPosition(null);
    trackVenueSeatSectionSelect(source, photoSectionIds.has(b.id), immersiveMode ? "sheet" : "card");
    // Phones: a block chosen on the still preview (or found by the seat search) opens the
    // full-screen map on it, with its photo board.
    // A searched seat opens with the photo board folded to its title, so the map shows the seat, its rows and aisles.
    const fold = fromTicket && photoSectionIds.has(b.id);
    if (immersiveMode && !fullscreenRef.current) { openFullscreen({ id: b.id, zoom: true, animate: true }, fold); return; }
    if (fullscreenRef.current) {
      setSheetOpen(!fold); setSheetPhoto(0); setOverviewReturn(null);
      frameRequest.current = { id: b.id, zoom: recenter, animate: true }; setFrameTick(tick => tick + 1);
      return;
    }
    // Same rule for every selection (Tokyo Dome): go to the block view unless the map is already
    // at block zoom or closer, where a neighbouring block is picked without moving the camera.
    const target = standDetailCamera(b, data, size);
    if (!selected || recenter || camera.current[2] > clampCamera(target, overviewBox, minSpan)[2] * 1.02) move(target);
  }
  function choosePosition(target: StandPosition) {
    setPhotoFromTicket(false);
    interaction(); clearResult(); setPosition(target); setLevel(target.level); setArea("all"); setZone(null);
    const [x, y] = target.point, span = target.span, box: MapBox = [x - span / 2, y - span / 2, span, span];
    if (!showArea(box)) move(box);
  }
  function selectPhotoPlace(place: SeatViewPlace) {
    if (place.kind === "zone") {
      chooseZone(place.id);
      return;
    }
    if (place.kind === "position") {
      const target = data.positionTargets?.find(item => item.id === place.id);
      if (target) {
        choosePosition(target);
      }
      return;
    }
    const section = data.blocks.find(item => item.id === place.id);
    if (section) {
      select(section);
    }
  }
  // ── Full-screen map (phones) ──
  // The same map element is lifted out of the page (position: fixed), so the search, selection and
  // photo board all share one state. A placeholder keeps the page's height; the page scroll is
  // remembered and given back on close (× or the phone's back).
  function openFullscreen(request: FrameRequest | null, fold = false) {
    if (fullscreenRef.current) return;
    pageScroll.current = window.scrollY;
    setSlotHeight(frameElement.current?.parentElement?.getBoundingClientRect().height);
    frameRequest.current = request;
    setSheetOpen(!fold); setSheetPhoto(0);
    setFullscreen(true); fullscreenRef.current = true; setOpenCount(count => count + 1);
    if (!hintSeen) { setHintSeen(true); try { localStorage.setItem(HINT_KEY, "1"); } catch { /* private mode */ } }
    try { window.history.pushState({ tixrepoSeatMap: "open" }, ""); pushedHistory.current = true; } catch { pushedHistory.current = false; }
  }
  // × and Escape go back one history step, so the phone's back button and × behave the same.
  function requestClose() {
    if (!fullscreenRef.current) return;
    if (pushedHistory.current) { pushedHistory.current = false; window.history.back(); return; }
    closeFullscreen();
  }
  const closeFullscreen = useCallback(() => {
    if (!fullscreenRef.current) return;
    fullscreenRef.current = false;
    setFullscreen(false);
  }, []);
  useEffect(() => {
    if (!fullscreen) return;
    const onPop = () => { pushedHistory.current = false; closeFullscreen(); };
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape" && !document.querySelector("dialog[open]")) { event.preventDefault(); requestClose(); } };
    window.addEventListener("popstate", onPop);
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("popstate", onPop); window.removeEventListener("keydown", onKey); };
    // requestClose only reads refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullscreen, closeFullscreen]);
  // Turning the phone wide leaves full screen (the page map takes over again).
  useEffect(() => { if (!immersiveMode && fullscreenRef.current) requestClose(); });
  useEffect(() => { try { setHintSeen(localStorage.getItem(HINT_KEY) === "1"); } catch { setHintSeen(false); } }, []);
  // A "この席を送る" link opens straight into the full-screen map on that block (phones only).
  const autoOpened = useRef(false);
  useEffect(() => {
    if (autoOpened.current || !initialOpen || !immersiveMode || !initialBlock) return;
    autoOpened.current = true;
    openFullscreen({ id: initialBlock.id, zoom: true, animate: false }, Boolean(initialRow && initialNumber && photoSectionIds.has(initialBlock.id)));
    // Runs once when the phone layout is known.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [immersiveMode]);
  // Entering or leaving full screen: measure the new canvas at once, show the whole venue, and on
  // leaving give the page back where it was.
  const wasFullscreen = useRef(false);
  useLayoutEffect(() => {
    if (wasFullscreen.current === fullscreen) return;
    wasFullscreen.current = fullscreen;
    const root = document.documentElement;
    const element = stage.current;
    if (element) {
      const rect = element.getBoundingClientRect();
      const canvas = { width: rect.width, height: rect.height };
      if (hasStandCanvasArea(canvas)) { sizeRef.current = canvas; previousSize.current = canvas; setSize(canvas); }
    }
    cancelGlide(); paint(fullscreen ? wallCamera(overviewBox) : overviewBox); commit();
    if (fullscreen) {
      const overflow = root.style.overflow;
      root.style.overflow = "hidden";
      // A tap's own focus lands on the map after this; give it to × once the tap is over.
      const focusClose = () => closeButton.current?.focus({ preventScroll: true });
      focusClose();
      const timer = window.setTimeout(focusClose, 80);
      return () => { root.style.overflow = overflow; window.clearTimeout(timer); };
    }
    setSlotHeight(undefined);
    // The browser's own back may also try to restore an older scroll position: hold ours for a few frames.
    const y = pageScroll.current;
    window.scrollTo(0, y);
    let frames = 0, id = 0;
    const hold = () => { if (Math.abs(window.scrollY - y) > 2) window.scrollTo(0, y); if (++frames < 6) id = requestAnimationFrame(hold); };
    id = requestAnimationFrame(hold);
    openButton.current?.focus({ preventScroll: true });
    return () => cancelAnimationFrame(id);
    // Only the switch itself re-frames; the camera helpers read refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullscreen]);
  // A block chosen in full screen: zoom to it from far out; closer in, keep the zoom and move the map
  // only as far as needed to show the block above the photo board.
  useLayoutEffect(() => {
    const request = frameRequest.current;
    if (!fullscreen || !request) return;
    frameRequest.current = null;
    if (request.box) {
      const { width, height } = sizeRef.current, visible = Math.max(140, height - boardHeight() - 8), area = request.box;
      const fitScale = Math.min(width / area[2], visible / area[3]), cx = area[0] + area[2] / 2, cy = area[1] + area[3] / 2;
      move([cx - width / 2 / fitScale, cy - visible / 2 / fitScale, width / fitScale, height / fitScale], request.animate);
      return;
    }
    const target = data.blocks.find(b => b.id === request.id);
    if (!target) return;
    const { width, height } = sizeRef.current;
    const visible = Math.max(140, height - boardHeight() - 8);
    // Close enough that every fifth row's tag can be read, never so close that the block overflows the
    // visible map (the small venue map in the corner keeps the wider picture). A searched seat is centred.
    const run = standSelectedNumberRun(data, target, row, number);
    const seatPoint = run ? seatOnSegment(run.segment, Number(run.seat)) : null;
    const gap = blockRowGap(target), [, , bw, bh] = target.box;
    // The block takes at most about half the visible height, so the level in front of / behind it peeks in.
    const fit = Math.min(width * .86 / bw, visible * .52 / bh);
    const scale = Math.max(width / (bw * 3.4), Math.min(gap > 0 ? FIVE_ROWS_PX / (5 * gap) : fit, fit));
    const [cx, cy] = seatPoint ?? target.center;
    const framed: MapBox = [cx - width / 2 / scale, cy - visible / 2 / scale, width / scale, height / scale];
    // From far out (or a search) zoom to the block's own view; otherwise keep the current zoom.
    const zoomIn = request.zoom || mapProjection(camera.current, width, height).scale < scale / 1.02;
    const base = zoomIn ? framed : camera.current;
    // Then move only as far as needed for the whole block to show above the board.
    const projection = mapProjection(base, width, height);
    const seatOnScreen = seatPoint && projection.project(seatPoint);
    const box = seatOnScreen ? [seatOnScreen[0] - 60, seatOnScreen[1] - 40, seatOnScreen[0] + 60, seatOnScreen[1] + 40]
      : standRingsBox(standPathRings(target.path).map(ring => ring.map(point => projection.project(point))));
    const margin = 18;
    const shift = (low: number, high: number, start: number, end: number) => high - low > end - start - margin * 2 ? (start + end) / 2 - (low + high) / 2
      : low < start + margin ? start + margin - low : high > end - margin ? end - margin - high : 0;
    const dx = box ? shift(box[0], box[2], 0, width) : 0, dy = box ? shift(box[1], box[3], 0, visible) : 0;
    if (!zoomIn && !dx && !dy) return;
    move([base[0] - dx / projection.scale, base[1] - dy / projection.scale, base[2], base[3]], request.animate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullscreen, frameTick, sheetOpen]);
  function search(event: React.FormEvent) {
    event.preventDefault(); interaction();
    resetFinderFeedback();
    if (finderMode === "block" || blockOnlySearch) {
      const query = normalizeSeatInput(blockInput);
      const named = (item: {label: string; aliases: string[]}) => query !== "" && [item.label, ...item.aliases].some(name => normalizeSeatInput(name) === query);
      const zoneTarget = data.zones?.find(item => named(item) && (level === "all" || level === item.level) && (area === "all" || area === item.area));
      if (zoneTarget) { trackVenueSeatSearch("area", 1); chooseZone(zoneTarget.id); return; }
      const point = data.positionTargets?.find(item => named(item) && (level === "all" || level === item.level));
      if (point) { trackVenueSeatSearch("area", 1); choosePosition(point); return; }
      const blocks = shown.filter(item => (area === "all" || area === item.area) && (named(item) || normalizeSeatInput(item.id) === query));
      trackVenueSeatSearch(blocks.length > 1 ? "multiple" : blocks.length ? "area" : query ? "empty" : "invalid", blocks.length);
      if (blocks.length === 1) { select(blocks[0], true); return; }
      clearResult(); setMatches(blocks);
      if (!blocks.length) { setSearchMiss(true); setError(query ? "" : "券面の区画名を入力してください。"); }
      return;
    }
    const result = searchStandSeats(data, level, area, row, number, zone);
    trackVenueSeatSearch(result.zone || result.position || result.notice ? "area" : result.matches.length > 1 ? "multiple" : result.matches.length === 1 ? "matched" : /確認中|未対応|区画名で|公式図に列名/.test(result.error) ? "unverified" : /入力/.test(result.error) ? "invalid" : "empty", result.matches.length);
    if (result.zone) { chooseZone(result.zone.id); setError(result.notice ?? ""); return; }
    if (result.position) { choosePosition(result.position); return; }
    setPosition(null);
    setError(result.error); setMatches(result.matches.length > 1 ? result.matches : []);
    if (result.matches.length === 1) { select(result.matches[0], true, true); setError(result.notice ?? ""); }
    else { setSelected(null); setSearchMiss(!result.matches.length); }
  }
  function zoom(factor: number) {
    interaction(); const c = camera.current;
    let next = clampCamera(zoomCamera(c, factor, [c[0] + c[2] / 2, c[1] + c[3] / 2]), overviewBox, minSpan);
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
  function down(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const control = (event.target as Element).closest("button");
    // The still preview never takes the pointer: the page scrolls and a tap opens the full-screen map.
    if (!control && !mapLocked && (event.pointerType !== "touch" || !allowPageScroll)) event.preventDefault();
    interaction();
    const g = gesture.current, p = point(event);
    g.points.set(event.pointerId, p);
    if (!control && !mapLocked) event.currentTarget.setPointerCapture(event.pointerId);
    if (g.points.size === 1) suppressMapClick.current = false;
    if (g.points.size === 1) {
      const target = event.target as Element;
      g.start = p; g.last = p; g.travel = 0;
      g.photo = target.closest("[data-seat-photo-marker]")?.getAttribute("data-seat-photo-marker") ?? null;
      // Zoomed out, blocks are thin and a finger often lands in the gap between them: that tap goes
      // to the nearest block (Tokyo Dome's nearestSeatCode). At block zoom, gaps stay gaps.
      g.block = target.closest("[data-block-id]")?.getAttribute("data-block-id")
        ?? (!control && !g.photo && camera.current[2] > data.detailSpan * 1.05 ? nearestBlockId(event.clientX, event.clientY) : null);
    }
    if (g.points.size > 1) { suppressMapClick.current = true; g.multi = true; const [a, b] = [...g.points.values()]; g.distance = Math.hypot(a[0] - b[0], a[1] - b[1]); g.last = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; }
  }
  function drag(event: PointerEvent<HTMLDivElement>) {
    const g = gesture.current; if (!g.points.has(event.pointerId)) return;
    const p = point(event); g.points.set(event.pointerId, p);
    g.travel = Math.max(g.travel, Math.hypot(p[0] - g.start[0], p[1] - g.start[1]));
    if (mapLocked) { if (g.points.size > 1) g.multi = true; return; }
    const c = camera.current, currentProjection = mapProjection(c, size.width, size.height);
    if (g.points.size > 1) {
      const [a, b] = [...g.points.values()], middle = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      const distance = Math.max(1, Math.hypot(a[0] - b[0], a[1] - b[1]));
      const next = zoomCamera(c, g.distance / distance, currentProjection.unproject(g.last));
      const scale = mapProjection(next, size.width, size.height).scale;
      follow([next[0] - (middle[0] - g.last[0]) / scale, next[1] - (middle[1] - g.last[1]) / scale, next[2], next[3]]);
      g.distance = distance; g.last = middle;
    } else if (g.travel > 6 && !(event.pointerType === "touch" && allowPageScroll)) {
      suppressMapClick.current = true;
      follow([c[0] - (p[0] - g.last[0]) / currentProjection.scale, c[1] - (p[1] - g.last[1]) / currentProjection.scale, c[2], c[3]]); g.last = p;
    }
  }
  function up(event: PointerEvent<HTMLDivElement>) {
    const g = gesture.current; if (!g.points.has(event.pointerId)) return;
    const p = point(event); g.travel = Math.max(g.travel, Math.hypot(p[0] - g.start[0], p[1] - g.start[1]));
    g.points.delete(event.pointerId);
    if (g.points.size) { g.last = [...g.points.values()][0]; return; }
    const { block: id, photo } = g, tap = isSeatTap(g.travel, g.multi); gesture.current = freshGesture();
    commit();
    suppressMapClick.current ||= !tap;
    if (!tap) return;
    const photoAnchor = photoAnchors.find(item => item.key === photo);
    if (photoAnchor) { selectPhotoPlace(photoAnchor.place); return; }
    const target = id && data.blocks.find(b => b.id === id);
    if (target) select(target);
    else if (mapLocked) openFullscreen(selected ? { id: selected, zoom: true, animate: true } : null);
  }
  useEffect(() => {
    const el = stage.current!;
    const resize = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      const canvas = { width, height };
      if (!hasStandCanvasArea(canvas)) return;
      sizeRef.current = canvas; setSize(canvas);
      // Phone bars appearing or the phone turning: the full-screen map keeps to its walls at the new size.
      if (fullscreenRef.current && !gesture.current.points.size && frame.current === null) { paint(wallCamera(camera.current)); commit(); }
      if (initialBlock && initialCanvasPending.current) {
        initialCanvasPending.current = false;
        const next = clampCamera(standDetailCamera(initialBlock, data, canvas), overviewBox, data.detailSpan * .45);
        camera.current = next;
        setView(next);
      }
    });
    resize.observe(el);
    const observer = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) { if (!interacted.current) setPulse(true); observer.disconnect(); } }, { threshold: .2 });
    observer.observe(el);
    const cancel = () => { gesture.current = freshGesture(); commit(); };
    window.addEventListener("blur", cancel); document.addEventListener("visibilitychange", cancel);
    return () => { resize.disconnect(); observer.disconnect(); stop(); window.removeEventListener("blur", cancel); document.removeEventListener("visibilitychange", cancel); };
  }, [data, initialBlock, overviewBox]);
  useEffect(() => {
    const el = svg.current!;
    const wheel = (event: WheelEvent) => {
      if ((!event.ctrlKey && !event.metaKey && !fullscreenRef.current) || lockedRef.current) return;
      // Wheel zoom follows the hand and commits once it pauses (not on every wheel event).
      event.preventDefault(); initialCanvasPending.current = false; interacted.current = true; setPulse(false); cancelGlide();
      const c = camera.current;
      follow(zoomCamera(c, Math.exp(Math.max(-100, Math.min(100, event.deltaY)) * .004), mapProjection(c, size.width, size.height).unproject(point(event))));
      if (wheelCommit.current !== null) clearTimeout(wheelCommit.current);
      wheelCommit.current = window.setTimeout(() => { wheelCommit.current = null; commit(); }, 160);
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
    // Camera is read from the ref so wheel never uses an animation's stale frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.width, size.height, data]);

  useEffect(() => {
    const before = previousSize.current; previousSize.current = size;
    // Phones switch between the preview and full screen on purpose; the full-screen framing decides there.
    if (immersiveMode) return;
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

  // Tell the page's photo row which part of the venue is on the map (Tokyo Dome's map scope):
  // the blocks around a chosen block, a chosen zone/position, or the chosen level and side.
  useEffect(() => {
    const zonesOf = (ids: string[]) => [...new Set(ids.flatMap(id => {
      const item = data.blocks.find(b => b.id === id);
      return [id, ...(data.zones ?? []).filter(z => z.id === item?.zone || z.blockIds.includes(id)).map(z => z.id)];
    }))];
    const photoLabels = (kind: string, id: string) => seatViewPosts(data.diagramId).filter(post => post.place.kind === kind && post.place.id === id).map(post => post.area);
    const levelLabel = (id: string) => levels.find(l => l.id === id)?.label ?? id;
    const send = (label: string | null, codes: string[], labels: string[] = [], section?: string) => {
      const scope: StandMapScope = { label, codes, section, labels, match: "section" };
      // The photo row scrolls back to its start on every new scope; repeat announcements are skipped.
      const key = JSON.stringify(scope);
      if (key === announcedScope.current) return;
      announcedScope.current = key;
      announceTokyoDomeMapScope(scope);
    };
    const chosen = data.blocks.find(b => b.id === selected);
    if (chosen) {
      const near = [...data.blocks].sort((a, b) => Math.hypot(a.center[0] - chosen.center[0], a.center[1] - chosen.center[1])
        - Math.hypot(b.center[0] - chosen.center[0], b.center[1] - chosen.center[1])).slice(0, 16).map(b => b.id);
      send(`${blockDisplayTitle(chosen, "")}の近く`, zonesOf(near), [], chosen.id);
    } else if (position) {
      send(`${position.label}付近`, [], photoLabels("position", position.id));
    } else if (zone) {
      const target = data.zones?.find(z => z.id === zone);
      send(target?.label ?? zone, [zone, ...(target?.blockIds ?? [])], photoLabels("zone", zone));
    } else if (level === "all" && area === "all") {
      send(null, []);
    } else {
      const ids = data.blocks.filter(b => (level === "all" || b.level === level) && (area === "all" || b.area === area)).map(b => b.id);
      send([level !== "all" && seatLevelName(level, levelLabel(level)), area !== "all" && directionName(areas.find(a => a.id === area)?.label ?? area)].filter(Boolean).join("・"), zonesOf(ids));
    }
  }, [data, levels, areas, selected, position, zone, level, area]);
  useEffect(() => () => { announcedScope.current = ""; announceTokyoDomeMapScope({ label: null, codes: [] }); }, []);

  // Floor buttons above the map remain available; whole-map numbers take priority over duplicate floor tags.
  const levelTags = whole && !wholeNumbers && !data.zones ? levels.filter(l => !data.wholeBlockLabels || data.blocks.filter(b => b.level === l.id).length === 1) : [];
  
  const gaishiOverview = data.diagramId.startsWith("gaishi-");
  const zoneTags = whole ? (data.zones ?? []).filter(z => !z.hideOnWhole || (gaishiOverview && ["A", "E", "I", "M"].includes(z.id))) : [];
  const areaTags = whole && !gaishiOverview ? data.overviewAreas ?? [] : [];
  const zonePositions = zoneLabelPositions(zoneTags, view, size.width, size.height);
  const areaPositions = new Map(areaTags.map(a => {
    return [a.id, overviewAreaLabelPosition(a.point, a.label, view, size.width, size.height)];
  }));
  const buttonBounds = [...levelTags.map(l => { const p = projection.project(l.point); return [p[0], p[1], Math.max(64, l.label.length * 14 + 28), 44]; }),
    ...zoneTags.map(z => { const p = zonePositions.get(z.id)!; return [p[0], p[1], overviewAreaLabelWidth(z.label), 44]; }),
    ...areaTags.map(a => { const p = areaPositions.get(a.id)!; return [p[0], p[1], overviewAreaLabelWidth(a.label), 44]; })];
  // Passive names keep clear of the corner arena-map button (approximate pill footprint).
  // The photo pill and the reference-area note sit over the bottom of the map: names there would be hidden.
  const legendShown = data.blocks.some(item => item.numberLookup === "unavailable") && (!block || block.numberLookup === "unavailable");
  const cardShown = photoAnchors.length > 0 && !mapLocked;
  const bottomCover = fullscreen ? 8 : 8 + (cardShown ? 56 : 0) + (legendShown ? 34 : 0) + (cardShown && legendShown ? 6 : 0);
  const bottomBox = bottomCover > 8 ? [size.width / 2, size.height - bottomCover / 2, size.width, bottomCover] : null;
  const occupied = [...buttonBounds, ...(arenaMaps ? [[size.width - 76, 30, 140, 44]] : []), ...(bottomBox && !whole ? [bottomBox] : []),
    ...(fullscreen ? [[72, 22, 140, 32], [size.width - 50, 102, 100, 110]] : [])];
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
      // Another place's name or number never lies on the selected block.
      if (!important && standRectTouchesRings([x, y], w, h, selectedScreenRings, 1)) continue;
      // The same caption twice close together reads as one place labelled twice: keep the first.
      if (!important && !whole && labels.some(l => l.text === text && Math.hypot(l.x - x, l.y - y) < 160)) continue;
      occupied.push([x, y, w, h]); labels.push({ id, text, x, y, width: w, height: h, kind, selected: important, plain: plainName, anchor: dx || dy ? position : undefined }); return;
    }
  }
  let arrow: { start: Point; end: Point } | null = null;
  const rowStems: { a: Point; b: Point }[] = [];
  const displayRows = block ? standDisplayRows(block) : [];
  // The selected block's own name: on the block when it leaves most of the block visible,
  // otherwise just beside it with a short stem, so the pink block itself stays in view.
  function addSelectedBlockName(text: string, position: Point) {
    const textWidth = [...text].reduce((sum, char) => sum + 14 * (char.charCodeAt(0) < 128 ? .6 : 1), 0);
    const w = Math.max(48, textWidth + 14), h = 26;
    const box = selectedScreenBox;
    const clearOf = (point: Point) => standLabelInsideCanvas(point, w, h, size)
      && !occupied.some(r => Math.abs(point[0] - r[0]) < (w + r[2]) / 2 + 4 && Math.abs(point[1] - r[1]) < (h + r[3]) / 2 + 3);
    if (!box || (standRectCoverShare(position, w, h, selectedScreenRings) <= .3 && clearOf(position))) { addLabel("selected-block", text, position, true); return; }
    const cx = (box[0] + box[2]) / 2, cy = (box[1] + box[3]) / 2;
    const candidates: Point[] = [[cx, box[1] - h / 2 - 12], [cx, box[3] + h / 2 + 12], [box[2] + w / 2 + 12, cy], [box[0] - w / 2 - 12, cy],
      [cx, box[1] - h / 2 - 44], [cx, box[3] + h / 2 + 44]];
    const point = candidates.find(p => clearOf(p) && !standRectTouchesRings(p, w, h, selectedScreenRings, 3));
    if (!point) { addLabel("selected-block", text, position, true); return; }
    // The stem meets the block at its outline point nearest the name.
    const near = selectedScreenRings.flat().reduce((best, p) => Math.hypot(p[0] - point[0], p[1] - point[1]) < Math.hypot(best[0] - point[0], best[1] - point[1]) ? p : best, [cx, cy]);
    occupied.push([point[0], point[1], w, h]);
    labels.push({ id: "selected-block", text, x: point[0], y: point[1], width: w, height: h, kind: text.includes("番") && !text.endsWith("番側") ? "number" : "block", selected: true, plain: false, anchor: near });
  }
  const chosenZone = !block && zone ? data.zones?.find(z => z.id === zone) : undefined;
  if (chosenZone && !whole) {
    // The zone's name sits just above the tinted blocks (below them when there is no room),
    // so the blocks' own start numbers inside the zone stay visible.
    const memberBlocks = data.blocks.filter(b => zoneMembers.has(b.id));
    const [bx, by, bw, bh] = memberBlocks.length ? boundsOf(memberBlocks, 0) : [chosenZone.point[0], chosenZone.point[1], 0, 0];
    const top = projection.project([bx + bw / 2, by]), bottom = projection.project([bx + bw / 2, by + bh]);
    const above: Point = [top[0], top[1] - 20], below: Point = [bottom[0], bottom[1] + 20];
    const fitsAt = (p: Point) => standLabelInsideCanvas(p, 60, 26, size) && !(bottomBox && Math.abs(p[1] - bottomBox[1]) < (26 + bottomBox[3]) / 2 + 3);
    addLabel("selected-zone", chosenZone.label, memberBlocks.length ? fitsAt(above) ? above : fitsAt(below) ? below : projection.project([bx + bw / 2, by + bh / 2]) : projection.project(chosenZone.point), true);
  }
  if (block && !displayRows.length) addSelectedBlockName(blockDisplayTitle(block, ""), projection.project(block.numberLookup === "unavailable" ? standContextLabel(data, block, closestDetail).point : block.center));
  if (block && displayRows.length) {
    const first = displayRows[0], lastRow = displayRows.at(-1)!;
    const last = block.referenceRows?.some(row => row.label === lastRow.label)
      ? lastRow : block.rows.length ? block.rowEdges?.last ?? block.rows.at(-1)!.segments.at(-1)! : lastRow;
    const a = projection.project(first.a), b = projection.project(first.b), la = projection.project(last.a), lb = projection.project(last.b);
    const fm = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], lm = [(la[0] + lb[0]) / 2, (la[1] + lb[1]) / 2];
    const depth = Math.hypot(lm[0] - fm[0], lm[1] - fm[1]);
    const tangent = Math.max(1, Math.hypot(b[0] - a[0], b[1] - a[1]));
    let dx = depth > 1 ? (lm[0] - fm[0]) / depth : -(b[1] - a[1]) / tangent;
    let dy = depth > 1 ? (lm[1] - fm[1]) / depth : (b[0] - a[0]) / tangent;
    // A single known row lies on the block's edge: its tag goes outward, away from the block's middle.
    if (depth <= 1) {
      const middle = projection.project(block.center);
      if ((fm[0] - middle[0]) * -dx + (fm[1] - middle[1]) * -dy < 0) { dx = -dx; dy = -dy; }
    }
    const rowObstacles: number[][] = [];
    // A seat search that hit shows the searched row's start number at once, not only after zooming in.
    const selectedRun = labelRun;
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
      // Any block the start badge would mostly hide: the badge steps back behind the
      // young edge and its arrow tip stays on that edge (the Yoyogi / K Arena rule, for every venue).
      if (numberAnchor === anchor && length > .001 && anchor[0] >= 9 && anchor[0] <= size.width - 9 && anchor[1] >= 9 && anchor[1] <= size.height - 9
        && standRectCoverShare(anchor, labelWidth, 28, selectedScreenRings) > .4) {
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
  if (block?.numberLookup === "unavailable" && labels.some(item => item.id === "selected-block")) {
    contextCaptions.add(JSON.stringify([block.level, block.area, block.zone ?? "", block.label]));
  }
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
      const captionKey = !whole && !context.fixed && (/^\d+付近$/.test(context.text) || /(?:・|の)参考区画$/.test(context.text) || (data.diagramId === "zozo-seats" && /・前方(?:\d+〜\d+列|（列確認中）)$/.test(context.text)))
        ? JSON.stringify([b.level, b.area, b.zone ?? "", context.text]) : null;
      if (captionKey && contextCaptions.has(captionKey)) continue;
      const referenceKey = standReferenceLabelKey(b, groupReferenceLabels);
      if (referenceKey && referenceLabels.has(referenceKey)) continue;
      const before = labels.length;
      addLabel(b.id, context.text === b.label ? blockDisplayTitle(b, "") : context.text, projection.project(context.point), false, undefined, context.fixed);
      if (referenceKey && labels.length > before) referenceLabels.add(referenceKey);
      if (captionKey && labels.length > before) contextCaptions.add(captionKey);
    }
  }
  
  
  // Full screen: a searched seat's own point and tag, the other end number of its row (the start number
  // already has its badge), and a tag on every fifth row of the chosen block once five rows are ~20px apart.
  const clearOfLabels = (x: number, y: number, w: number, h: number) => labels.every(l => Math.abs(x - l.x) >= (w + l.width) / 2 + 2 || Math.abs(y - l.y) >= (h + l.height) / 2 + 2);
  const seatMark = fullscreen && block && labelRun ? (() => {
    const point = projection.project(seatOnSegment(labelRun.segment, Number(labelRun.seat)));
    const a = projection.project(labelRun.segment.a), b = projection.project(labelRun.segment.b);
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, ux = (b[0] - a[0]) / length, uy = (b[1] - a[1]) / length;
    const endText = `${block.numberPrefix ?? ""}${labelRun.segment.end}番`, endWidth = Math.max(44, endText.length * 8 + 16);
    const end: Point = [b[0] + ux * (endWidth / 2 + 8), b[1] + uy * (endWidth / 2 + 8)];
    const text = `${labelRun.row}列${labelRun.seat}番付近`, width = Math.max(96, [...text].reduce((sum, char) => sum + 13 * (char.charCodeAt(0) < 128 ? .62 : 1), 0) + 20);
    const tagX = Math.min(size.width - width / 2 - 4, Math.max(width / 2 + 4, point[0]));
    const tagY = [point[1] - 34, point[1] + 34, point[1] - 64].find(y => y > 16 && y < size.height - 16 && clearOfLabels(tagX, y, width, 28)) ?? point[1] - 34;
    return { point, text, width, tagX, tagY, end, endText, endWidth, showEnd: labelRun.segment.end !== labelRun.segment.start && clearOfLabels(end[0], end[1], endWidth, 24) };
  })() : null;
  const fifthRows = fullscreen && block && block.rowNameLookup !== "unavailable" ? (() => {
    const gap = blockRowGap(block) * projection.scale;
    if (gap * 5 < 20) return [];
    const taken = new Set(labels.filter(l => l.kind === "row").map(l => normalizeSeatInput(l.text.replace(/列$/, ""))));
    return block.rows.flatMap(r => {
      const value = Number.parseInt(r.label, 10), segment = r.segments[0];
      const active = !labelRun && Boolean(highlightedRow) && normalizeSeatInput(r.label) === highlightedRow;
      if (!segment || taken.has(normalizeSeatInput(r.label)) || !(active || (Number.isFinite(value) && value % 5 === 0))) return [];
      const a = projection.project(segment.a), b = projection.project(segment.b);
      const length = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      const text = `${r.label}列`, w = text.length * 7 + 12;
      // Just inside the row's first-seat end, on the row line itself.
      const x = a[0] + (b[0] - a[0]) / length * (w / 2 + 3), y = a[1] + (b[1] - a[1]) / length * (w / 2 + 3);
      if (x < w / 2 || x > size.width - w / 2 || y < 10 || y > size.height - 10 || (!active && !clearOfLabels(x, y, w, 18))
        || (seatMark && Math.abs(x - seatMark.point[0]) < (w + seatMark.width) / 2 && Math.abs(y - seatMark.point[1] + 24) < 26)) return [];
      return [{ key: r.label, text, x, y, w, active }];
    });
  })() : [];
  // The small venue map (full screen, zoomed in): venue outline, stage side, the chosen block and the part on screen.
  const miniMap = fullscreen && !overviewReturn && (() => {
    const shownBottom = size.height - (fullscreen ? boardHeight() : 0);
    const [x0, y0] = projection.unproject([0, 0]), [x1, y1] = projection.unproject([size.width, shownBottom]);
    if (x1 - x0 > wallBox[2] * .8 && y1 - y0 > wallBox[3] * .8) return null;
    const view: MapBox = [Math.max(wallBox[0], x0), Math.max(wallBox[1], y0), 0, 0];
    view[2] = Math.min(wallBox[0] + wallBox[2], x1) - view[0]; view[3] = Math.min(wallBox[1] + wallBox[3], y1) - view[1];
    return { view, stage: !data.frontLabel && !data.zones, height: Math.min(100, Math.round(84 * wallBox[3] / wallBox[2])) };
  })();
  // Full screen: when the level in front of or behind the chosen block is off the visible map, say so at that edge.
  const levelHints = fullscreen && block && !overviewReturn ? (() => {
    const shownBottom = size.height - boardHeight();
    const [x0, y0] = projection.unproject([0, 0]), [x1, y1] = projection.unproject([size.width, shownBottom]);
    const order = levels.map(l => { const own = data.blocks.filter(b => b.level === l.id); return { l, own, y: own.reduce((sum, b) => sum + b.center[1], 0) / Math.max(1, own.length) }; })
      .filter(item => item.own.length).sort((a, b) => a.y - b.y);
    const at = order.findIndex(item => item.l.id === block.level);
    const seen = (own: StandBlock[]) => own.some(b => b.box[0] < x1 && b.box[0] + b.box[2] > x0 && b.box[1] < y1 && b.box[1] + b.box[3] > y0);
    const name = (item: (typeof order)[number]) => seatLevelName(item.l.id, item.l.label);
    return { up: at > 0 && !seen(order[at - 1].own) ? name(order[at - 1]) : null,
      down: at >= 0 && at < order.length - 1 && !seen(order[at + 1].own) ? name(order[at + 1]) : null, bottom: shownBottom };
  })() : null;
  const seatViewRow = labelRun ? String(labelRun.row) : highlightedRow;
  const seatView = { diagram: data.diagramId, request: photoRequest, section: block?.id, zone, position: position?.id,
    row: photoFromTicket ? seatViewRow : null, seat: photoFromTicket ? labelRun?.seat : null };
  // Full screen: the chosen block's photos on the board, and the blocks with photos on the same
  // level in seat-number order for 前の区画 / 次の区画.
  const shortName = (item: StandBlock) => blockShortName(item, data.blocks);
  const blockName = (item: StandBlock) => blockLongName(item, data.blocks, levels);
  const chosenZoneForSheet = !block && zone ? data.zones?.find(z => z.id === zone) : undefined;
  const sheetPlace = !fullscreen ? null : block ? { key: block.id, title: fanName(`${selectedLevelLabel}・${blockDisplayTitle(block, "")}`), long: blockName(block) }
    : position ? { key: `position:${position.id}`, title: `${position.label}付近`, long: `${position.label}付近` }
    : chosenZoneForSheet ? (() => { const levelName = seatLevelName(chosenZoneForSheet.level, levels.find(l => l.id === chosenZoneForSheet.level)?.label);
      // A zone named like its level ("2F" on the 2F plan) is not repeated.
      return { key: `zone:${chosenZoneForSheet.id}`, title: fanName(levelName === chosenZoneForSheet.label ? levelName : `${levelName}・${chosenZoneForSheet.label}`), long: fanName(chosenZoneForSheet.label) }; })() : null;
  const sheetMatches = sheetPlace ? seatViewMatchesForSelection(seatViewPosts(data.diagramId), seatView) : [];
  const photoBlocksOnLevel = fullscreen && block ? data.blocks.filter(b => b.level === block.level && photoSectionIds.has(b.id))
    .sort((a, b) => (a.numberReference?.start ?? 1e9) - (b.numberReference?.start ?? 1e9) || frontRow(a) - frontRow(b) || a.id.localeCompare(b.id, "ja", { numeric: true })) : [];
  const sheetAt = block ? photoBlocksOnLevel.findIndex(b => b.id === block.id) : -1;
  const neighbor = (item: StandBlock | undefined, source: "step" | "map"): SheetNeighbor => item ? { label: shortName(item), go: () => select(item, false, false, source) } : null;
  const nearbyPhotoBlock = block && fullscreen && !sheetMatches.length ? [...photoBlocksOnLevel]
    .sort((a, b) => Math.hypot(a.center[0] - block.center[0], a.center[1] - block.center[1]) - Math.hypot(b.center[0] - block.center[0], b.center[1] - block.center[1]))[0] : undefined;
  const sheetRows: SheetRows = fullscreen && block && block.rowNameLookup !== "unavailable" && block.numberLookup !== "unavailable" && block.rows.length ? {
    rows: block.rows.map(r => ({ label: r.label, numbers: r.segments.map(segment => `${block.numberPrefix ?? ""}${segment.start}${segment.end !== segment.start ? `〜${segment.end}` : ""}番`).join("・") })),
    active: block.rows.find(r => highlightedRow && normalizeSeatInput(r.label) === highlightedRow)?.label ?? null,
    choose: label => { setRow(label); setNumber(""); setPhotoFromTicket(false); frameRequest.current = { id: block.id, zoom: false, animate: true }; setFrameTick(tick => tick + 1); },
  } : null;
  const sheetShown = sheetOpen && sheetPlace && sheetMatches.length ? sheetPlace.key : "";
  useEffect(() => { if (sheetShown) trackVenueSeatPhotoOpen("sheet", sheetMatches.length); }, [sheetShown]); // eslint-disable-line react-hooks/exhaustive-deps
  // The chosen place's own camera mark gives way while its photo card is shown on the map.
  const photoCardShown = photoAnchors.length > 0 && (block || zone || position)
    && seatViewMatchesForSelection(seatViewPosts(data.diagramId), seatView).length > 0;
  const cardedPhotoKey = !photoCardShown ? null : block ? `section:${block.id}` : position ? `position:${position.id}` : `zone:${zone}`;
  const photoOccupied: number[][] = [];
  const coveredLabels = new Set<string>();
  const photoMarkers = photoAnchors.flatMap(item => {
    if (level !== "all" && item.level !== level) return [];
    if (item.key === cardedPhotoKey) return [];
    const anchor = projection.project(item.point);
    if (anchor[0] < 0 || anchor[0] > size.width || anchor[1] < 0 || anchor[1] > size.height) return [];
    const fits = (point: Point, boxes: number[][]) => boxes.every(([x, y, w, h]) =>
      Math.abs(x - point[0]) >= (w + photoTarget) / 2 + 2 || Math.abs(y - point[1]) >= (h + photoTarget) / 2 + 2);
    const candidate = ([dx, dy]: number[]): Point => [anchor[0] + dx, anchor[1] + dy];
    const inside = (point: Point) => standLabelInsideCanvas(point, photoTarget, photoTarget, size);
    const candidates = [...seatPhotoOffsets.map(candidate), ...item.centers.map(projection.project)]
      .filter(inside).sort((a, b) => Math.hypot(a[0] - anchor[0], a[1] - anchor[1]) - Math.hypot(b[0] - anchor[0], b[1] - anchor[1]));
    // Prefer a clear spot on the block; if none fits, the mark still shows at the block centre and
    // the block's own (passive) name gives way to it (Tokyo Dome). Row/number guides are never covered.
    const obstacles = [...occupied, ...photoOccupied];
    const ownBlock = item.place.kind === "section" && item.place.id === block?.id;
    const offSelected = (point: Point) => ownBlock || !standRectTouchesRings(point, photoTarget - 6, photoTarget - 6, selectedScreenRings, 0);
    const clear = candidates.filter(point => fits(point, obstacles) && offSelected(point));
    const onBlock = (point: Point, radius: number) => photoHitTest(item.paths, {
        x: item.point[0] + (point[0] - anchor[0]) / projection.scale,
        y: item.point[1] + (point[1] - anchor[1]) / projection.scale,
      }, radius / projection.scale);
    // At overview scale, a zone can contain many very thin seat strips.
    // Its badge may straddle an aisle, but its centre must remain on its own seats.
    const centered = item.place.kind === "section" && inside(anchor) && fits(anchor, obstacles) && onBlock(anchor, 0) && offSelected(anchor);
    const placed = centered ? anchor : clear.find(point => onBlock(point, photoDiameter / 2))
      ?? clear.find(point => onBlock(point, 0));
    // The centre fallback never covers the chosen place's own name, row or number tags.
    const onSelectedTag = labels.some(l => l.selected && !fits(anchor, [[l.x, l.y, l.width, l.height]]));
    const point = placed ?? (inside(anchor) && !onSelectedTag && offSelected(anchor) ? anchor : null);
    if (!point) return [];
    if (!placed) {
      if (item.place.kind === "section") coveredLabels.add(item.place.id);
      for (const l of labels) if (!l.selected && !fits(point, [[l.x, l.y, l.width, l.height]])) coveredLabels.add(l.id);
    }
    photoOccupied.push([...point, photoTarget, photoTarget]);
    return [{ ...item, anchor, point }];
  });
  const focusable = shown.filter(b => { const p = projection.project(b.center); return p[0] > 0 && p[0] < size.width && p[1] > 0 && p[1] < size.height; });
  const sectionExample = data.zones?.[0]?.label || data.blocks[0].aliases.find(alias => alias.length <= 12) || data.blocks[0].label;
  const fallbackBlocks = searchMiss && finderMode === "ticket" && !blockOnlySearch
    ? nearSeatNumbers(number, shown.filter(item => (area === "all" || item.area === area) && (!zone || item.zone === zone || data.zones?.find(z => z.id === zone)?.blockIds.includes(item.id))),
      item => item.rows.find(line => normalizeSeatInput(line.label) === normalizeSeatInput(row))?.segments.map(({ start, end }) => [start, end] as const) ?? [],
      item => item.label) : [];
  const missingInput = finderMode === "block" || blockOnlySearch ? !blockInput.trim() : !number.trim();
  const inputAdvice = error === data.numberLookupNote ? undefined
    : /数字で入力|列欄に|列を空欄にして番号/.test(error) ? error : undefined;
  const finderFeedback = searchMiss || Boolean(error) || matches.length > 0;
  const arenaImage = arenaMaps?.posts.find(post => post.image)?.image;
  const arenaThumb = arenaImage ? arenaImage.src.replace(/([?&]name=)\w+/, "$1thumb") : null;
  // Bottom-centred venue notes on small whole views stay above the photo/legend overlay.
  const footerLift = (cardShown ? 44 : 0) + (legendShown ? 30 : 0);
  return <DomeSeatFrame className={data.levelViews ? styles.levelControls : undefined} levels={[{ id: "all", label: "すべて" }, ...levels]} level={level} onLevel={id => chooseRegion(id, "all")} photoLegend="map"
    directions={availableAreas} direction={area} onDirection={id => chooseRegion(level, id)} onZoom={zoom} onWhole={reset} shortcuts={[]}
    seatView={seatView} seatViewIndex={sheetPhoto}
    directionExtra={<>
      {blockOnlySearch && <p className={styles.eventSeatingNote}>{data.numberLookupNote ?? "この図は区画名で探せます。列・番号は公演の案内をご確認ください。"}
        {venueId && <VenueProgramAnchor fallbackHref={`/venues/${venueId}#upcoming-events-title`}>この会場の公演を見る →</VenueProgramAnchor>}
      </p>}
      <SeatFinderControls mode={finderMode} blockOnly={blockOnlySearch} onMode={mode => { setFinderMode(mode); setRow(""); setNumber(""); clearResult(); }}
        row={row} number={number} block={blockInput} rowHint={data.rowSearchPlaceholder} numberHint={data.numberSidePrefixes ? `例：${data.numberSidePrefixes[0]}55` : undefined}
        blockHint={`例：${sectionExample}`} onRow={value => { setRow(value); resetFinderFeedback(); }}
        onNumber={value => { setNumber(value); resetFinderFeedback(); }} onBlock={value => { setBlockInput(value); resetFinderFeedback(); }} onSubmit={search} /></>}>
    
    <div className={styles.selection} aria-live="polite" aria-label="選んだ座席">
      <div className={`${styles.selectionCopy} ${labelRun ? styles.ticketSelectionCopy : ""}`}>{block ? <>
        <span className={styles.selectionMeta}>{selectedLevelLabel}{block.balcony && !selectedLevelLabel.includes("バルコニー") ? "・バルコニー" : ""}<span>{selectedRows}</span></span>
        {/* A searched seat shows its own row and number beside the name, so a name built from another seat ("1列344番周辺") is left out. */}
        <strong>{labelRun ? selectedTitle.split("・").filter(part => !/^\d+列\d+番(周辺)?$/.test(part.trim())).join("・") || selectedTitle : selectedTitle}</strong>
        {labelRun && <span className={styles.ticketSelection}><b className={styles.selectedRow}>{labelRun.row}列</b><b className={styles.selectedSeat} data-selected-seat-number>選択：{normalizeSeatInput(number)}番</b></span>}
      </> : <><strong>{zone ? data.zones?.find(z => z.id === zone)?.label ?? zone : level === "all" ? (overviewArt ? "全体図から区画を選ぶ" : "座席の全体図") : levels.find(l => l.id === level)?.label ?? level}</strong><span className={styles.selectionHint}>{blockOnlySearch ? "会場内の区画をタップして確認" : "区画をタップすると、列・番号の詳細へ"}</span></>}</div>
      {block && <><button type="button" aria-label="選んだ場所を表示" onClick={() => block && move(standDetailCamera(block, data, size))}><Crosshair size={19}/></button>
      <button type="button" aria-label="座席の選択を解除" onClick={clearResult}><X size={19}/></button></>}
    </div>
    <p id={instructionId} className={styles.srOnly}>矢印キーで画面内のブロックを選び、Enterで拡大します。地図をドラッグして移動できます。</p>
    {/* Everything that reacts to a search or a selection sits on the map, so nothing above it grows
        or shrinks and the map never jumps (Tokyo Dome's mapNotice / photoOverlay). */}
    <div className={styles.mapSlot} style={slotHeight ? { height: slotHeight } : undefined}>
    <div ref={frameElement} className={`${styles.mapFrame} ${fullscreen ? styles.immersive : ""}`} data-arena={arenaMaps ? "" : undefined}
      data-seat-map-fullscreen={fullscreen ? "" : undefined} role={fullscreen ? "dialog" : undefined} aria-modal={fullscreen || undefined}
      aria-label={fullscreen ? `${venueName ?? ""}の座席表` : undefined}>
      {fullscreen && <div className={styles.immersiveBar}>
        <button ref={closeButton} type="button" className={styles.immersiveClose} aria-label="座席表を閉じる" onClick={requestClose}><X size={22} aria-hidden="true"/></button>
        <div className={styles.immersiveTitle} aria-live="polite">
          {venueName && <span>{venueName}</span>}
          <strong>{sheetPlace?.long ?? "区画をタップすると写真が見られます"}</strong>
        </div>
        {canShare && block && <button type="button" className={styles.immersiveShare} onClick={() => setShareOpen(true)} data-seat-share-open="">
          <Send size={17} aria-hidden="true"/>この席を送る</button>}
      </div>}
      {shareOpen && block && venueId && <SeatShareSheet venueName={venueName ?? ""} blockName={blockName(block)} onClose={() => setShareOpen(false)}
        share={{ venue: venueId, section: block.id, ...(labelRun ? { row: String(labelRun.row), number: normalizeSeatInput(number) } : {}) }} />}
      <div className={`${styles.stage} ${overviewArt ? styles.venueOverview : ""} ${data.zones ? styles.zonedStage : ""} ${data.diagramId === "vantelin-prime-unfolded" ? styles.unfoldedStage : ""} ${immersive ? styles.previewCapable : ""}`} ref={stage} data-testid="stand-seat-map" data-diagram-id={data.diagramId} data-camera={view.map(n => n.toFixed(2)).join(",")} data-selected={selected ?? ""} data-selected-zone={zone ?? ""} data-selected-position={position?.id ?? ""} style={{ touchAction: mapLocked ? "pan-y pinch-zoom" : allowPageScroll ? "pan-y" : "none",
          // The still preview is as tall as the venue drawing at this width, plus room for the top tags.
          height: mapLocked ? Math.min(460, Math.round(size.width * overviewBox[3] / overviewBox[2]) + 76) : undefined,
          "--map-ratio": overviewBox[3] / overviewBox[2] } as React.CSSProperties} data-map-preview={mapLocked ? "" : undefined}
        onPointerDown={down} onPointerMove={drag} onPointerUp={up}
        onPointerCancel={() => { gesture.current = freshGesture(); suppressMapClick.current = true; commit(); }}
        onLostPointerCapture={e => { if (gesture.current.points.has(e.pointerId)) { gesture.current = freshGesture(); commit(); } }}
        onPointerLeave={e => { if (!e.currentTarget.hasPointerCapture(e.pointerId) && gesture.current.points.has(e.pointerId)) { gesture.current = freshGesture(); commit(); } }}
        onClickCapture={event => { if (suppressMapClick.current && event.detail !== 0) { event.preventDefault(); event.stopPropagation(); } }}>
        <svg ref={svg} viewBox={`0 0 ${size.width} ${size.height}`} role="group" aria-label="座席の全体図" aria-describedby={instructionId} tabIndex={0}
          onKeyDown={e => {
            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); const b = focusable.find(b => b.id === focused) ?? focusable[0]; if (b) select(b); }
            if (e.key.startsWith("Arrow")) { e.preventDefault(); interaction(); const current = focusable.find(b => b.id === focused) ?? focusable[0]; if (!current) return;
              const axis = e.key === "ArrowLeft" || e.key === "ArrowRight" ? 0 : 1, sign = e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 1;
              const next = focusable.filter(b => (b.center[axis] - current.center[axis]) * sign > 0).sort((a, b) => Math.hypot(a.center[0] - current.center[0], a.center[1] - current.center[1]) - Math.hypot(b.center[0] - current.center[0], b.center[1] - current.center[1]))[0];
              if (next) setFocused(next.id);
            }
          }}>
          <svg ref={inner} width={size.width} height={size.height} viewBox={view.join(" ")}>
            {overviewArt && <VenueOverviewArt diagramId={data.diagramId} blocks={data.blocks} opacity={artOpacity} unit={artUnit}/> }
            {data.contextLabels?.filter(l => !standRedundantContextText(l.text, block, closestDetail)
              && !(block && standRectTouchesRings(projection.project(l.point).map((n, axis) => axis ? n - 5 : n), [...l.text].reduce((sum, char) => sum + 14 * (char.charCodeAt(0) < 128 ? .6 : 1), 0), 18, selectedScreenRings, 2))
              // A fixed caption that would be cut at the map's left or right edge is left out at this zoom.
              && !(!whole && (() => { const p = projection.project(l.point), w = [...l.text].reduce((sum, char) => sum + 14 * (char.charCodeAt(0) < 128 ? .6 : 1), 0); return p[0] - w / 2 < 2 || p[0] + w / 2 > size.width - 2; })())
              && !(!whole && (() => { const p = projection.project(l.point), w = [...l.text].reduce((sum, char) => sum + 14 * (char.charCodeAt(0) < 128 ? .6 : 1), 0);
                return labels.some(t => t.selected && Math.abs(p[0] - t.x) < (w + t.width) / 2 + 2 && Math.abs(p[1] - 5 - t.y) < (18 + t.height) / 2 + 2); })())
              && !(whole && size.width < 500 && data.diagramId === "vantelin-prime-unfolded")).map((l, i) => {
                const footer = whole && size.width < 500 && ["belluna-seats", "paypay-stand-reference", "mufg-seats", "koshien-seats", "vantelin-seat-reference", "makuhari-seats", "sapporo-baseball", "sapporo-soccer"].includes(data.diagramId) && l.text.includes("公演");
                const lines = footer && l.text.length * 12 > size.width - 24 && l.text.includes("・") ? [l.text.slice(0, l.text.indexOf("・") + 1), l.text.slice(l.text.indexOf("・") + 1)] : [l.text];
                const point = footer ? projection.unproject([size.width / 2, size.height - 14 - footerLift - (lines.length - 1) * 16]) : l.point;
                return <text key={`context-${i}`} data-context-label={l.text} x={point[0]} y={point[1]} textAnchor="middle" fill={artOpacity > 0 ? "#405563" : "#a38b98"} fontSize={(footer ? 12 : 14) / projection.scale} pointerEvents="none">{lines.map((line, index) => <tspan key={index} x={point[0]} dy={index ? 16 / projection.scale : 0}>{line}</tspan>)}</text>;
              })}
            {blockShapes}
            {overviewArt && <StandOverviewTexture blocks={data.blocks} opacity={selected ? 0 : artOpacity} selected={selected} unit={artUnit}/> }
            {data.blocks.filter(b => photoSectionIds.has(b.id) && (level === "all" || b.level === level)).map(b =>
              <path key={`photo-outline-${b.id}`} data-seat-photo-outline={b.id} d={b.path} fill="none"
                stroke={SEAT_PHOTO_MAP_COLOR} strokeWidth={1.5}
                vectorEffect="non-scaling-stroke" pointerEvents="none" />)}
            
            {block?.rows.flatMap((r, ri) => r.segments.map((s, i) => <polyline key={`${ri}-${i}`} points={(s.points ?? [s.a, s.b]).map(p => p.join(",")).join(" ")} fill="none" stroke={highlightedRow && normalizeSeatInput(r.label) === highlightedRow ? "#1673ad" : "#fff"} vectorEffect="non-scaling-stroke" strokeOpacity={highlightedRow && normalizeSeatInput(r.label) === highlightedRow ? .95 : .35} strokeWidth={highlightedRow && normalizeSeatInput(r.label) === highlightedRow ? 2.2 : .45} pointerEvents="none"/>))}
            {block && !block.rows.length && block.referenceRows?.map(r => <line key={`reference-${r.label}`} x1={r.a[0]} y1={r.a[1]} x2={r.b[0]} y2={r.b[1]} stroke="#fff" vectorEffect="non-scaling-stroke" strokeOpacity=".5" strokeWidth=".6" pointerEvents="none"/>)}
            {data.blocks.filter(b => b.id === focused).map(b => <path key={b.id} d={b.path} fill="none" stroke="#512e47" strokeWidth={3 / projection.scale} className={styles.keyboardFocus} pointerEvents="none"/>)}
          </svg>
          {/* Screen-space layer: follows a moving camera with one transform until the commit (see paint). */}
          <g ref={overlay}>
          {zoneTags.map(z => { const p = zonePositions.get(z.id)!, anchor = projection.project(z.point); return Math.hypot(p[0] - anchor[0], p[1] - anchor[1]) > 8
            ? <line key={`zone-stem-${z.id}`} x1={anchor[0]} y1={anchor[1]} x2={p[0]} y2={p[1]} stroke="#d5a0ba" strokeWidth="1.2" pointerEvents="none"/> : null; })}
          {selectedScreenBox && Math.max(selectedScreenBox[2] - selectedScreenBox[0], selectedScreenBox[3] - selectedScreenBox[1]) >= 18
            && Math.min(selectedScreenBox[2] - selectedScreenBox[0], selectedScreenBox[3] - selectedScreenBox[1]) < 8 && <g data-selected-thin="" pointerEvents="none">
            {selectedScreenRings.map((ring, i) => <polygon key={`halo-${i}`} points={ring.map(p => p.join(",")).join(" ")} fill="none" stroke="#fff" strokeWidth="8" strokeLinejoin="round"/>)}
            {selectedScreenRings.map((ring, i) => <polygon key={`thin-${i}`} points={ring.map(p => p.join(",")).join(" ")} fill="#a93164" stroke="#a93164" strokeWidth="5" strokeLinejoin="round"/>)}
          </g>}
          {selectedScreenBox && Math.max(selectedScreenBox[2] - selectedScreenBox[0], selectedScreenBox[3] - selectedScreenBox[1]) < 18 && <g data-selected-ring="" pointerEvents="none">
            <circle cx={(selectedScreenBox[0] + selectedScreenBox[2]) / 2} cy={(selectedScreenBox[1] + selectedScreenBox[3]) / 2} r={15} fill="none" stroke="#fff" strokeWidth="5"/>
            <circle cx={(selectedScreenBox[0] + selectedScreenBox[2]) / 2} cy={(selectedScreenBox[1] + selectedScreenBox[3]) / 2} r={15} fill="none" stroke="#a93164" strokeWidth="2.5"/>
          </g>}
          {rowStems.map((stem, i) => <line key={`row-stem-${i}`} x1={stem.a[0]} y1={stem.a[1]} x2={stem.b[0]} y2={stem.b[1]} stroke="#a93164" strokeWidth="1.2" pointerEvents="none"/>)}

          {labels.filter(l => l.anchor && !coveredLabels.has(l.id)).map(l => <line key={`label-stem-${l.id}`} x1={l.anchor![0]} y1={l.anchor![1]} x2={l.x} y2={l.y} stroke="#a93164" strokeWidth="1" pointerEvents="none"/>)}
          {labels.filter(l => !coveredLabels.has(l.id)).map(l => <g key={l.id} data-annotation={l.id} data-annotation-kind={l.kind} transform={`translate(${l.x},${l.y})`} data-block-id={l.selected ? undefined : l.id} className={l.selected ? undefined : `${styles.block} ${wholeNumbers && pulse ? styles.blockPrompt : ""}`} pointerEvents={l.selected || (!whole && l.kind === "block") ? "none" : "all"}>
            <title>{data.blocks.find(b => b.id === l.id)?.label ?? l.text}</title>
            {l.kind === "number" ? <><path data-number-badge="" data-connected-number-arrow={l.id === "start-number" && arrow ? "" : undefined} d={seatNumberBadge(l.id === "start-number" && arrow ? [arrow.end[0] - arrow.start[0], arrow.end[1] - arrow.start[1]] : [0, 0], l.width, l.height, l.id === "start-number" && arrow ? Math.hypot(arrow.end[0] - arrow.start[0], arrow.end[1] - arrow.start[1]) : 0)} fill="#fff" stroke={l.selected ? "#81294d" : "#d5c5cd"} strokeWidth={l.selected ? 2 : 1}/>
              {l.id === "start-number" && arrow && <path data-number-arrow-ink="" d={seatNumberArrowInk([arrow.end[0] - arrow.start[0], arrow.end[1] - arrow.start[1]], l.width, l.height, Math.hypot(arrow.end[0] - arrow.start[0], arrow.end[1] - arrow.start[1]))} fill="none" stroke="#a93164" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>}</>
              : !l.plain && (l.selected || whole || l.kind === "row") && <rect x={-l.width / 2} y={-l.height / 2} width={l.width} height={l.height} rx={l.kind === "row" ? 4 : 12} fill={l.kind === "row" ? selectedRowLabel(l) ? "#155786" : "#e8f3ff" : "#fff"} fillOpacity={l.selected ? 1 : .87} stroke={l.kind === "row" ? "#23679a" : "none"} strokeWidth="1.3"/>}
            <text textAnchor="middle" y="5" fill={l.kind === "row" ? selectedRowLabel(l) ? "#fff" : "#155786" : l.selected ? "#522e45" : "#5b4652"} fontSize={l.selected && !l.plain ? 14 : 12} fontWeight={l.selected && !l.plain ? 800 : 600}
              stroke={l.plain ? "#fff" : undefined} strokeWidth="3" strokeLinejoin="round" paintOrder="stroke"
              style={{ fontVariantNumeric: "tabular-nums" }}>{l.text}</text>
          </g>)}
          {fifthRows.map(tag => <g key={`fifth-${tag.key}`} data-row-tag={tag.key} transform={`translate(${tag.x},${tag.y})`} pointerEvents="none">
            <rect x={-tag.w / 2} y={-9} width={tag.w} height={18} rx={4} fill={tag.active ? "#155786" : "#e8f3ff"} fillOpacity={tag.active ? 1 : .92} stroke="#23679a" strokeWidth=".8"/>
            <text textAnchor="middle" y="4" fill={tag.active ? "#fff" : "#155786"} fontSize="11" fontWeight="700" style={{ fontVariantNumeric: "tabular-nums" }}>{tag.text}</text>
          </g>)}
          {seatMark?.showEnd && <g data-row-end="" transform={`translate(${seatMark.end[0]},${seatMark.end[1]})`} pointerEvents="none">
            <rect x={-seatMark.endWidth / 2} y={-12} width={seatMark.endWidth} height={24} rx={12} fill="#fff" stroke="#81294d" strokeWidth="1.4"/>
            <text textAnchor="middle" y="5" fill="#522e45" fontSize="12" fontWeight="800" style={{ fontVariantNumeric: "tabular-nums" }}>{seatMark.endText}</text>
          </g>}
          {seatMark && <g data-seat-mark="" pointerEvents="none">
            <circle cx={seatMark.point[0]} cy={seatMark.point[1]} r={8} fill="#ef2d62" stroke="#fff" strokeWidth="3"/>
            <line x1={seatMark.point[0]} y1={seatMark.point[1] + (seatMark.tagY < seatMark.point[1] ? -9 : 9)} x2={seatMark.tagX} y2={seatMark.tagY + (seatMark.tagY < seatMark.point[1] ? 14 : -14)} stroke="#ef2d62" strokeWidth="2"/>
            <g transform={`translate(${seatMark.tagX},${seatMark.tagY})`}>
              <rect x={-seatMark.width / 2} y={-14} width={seatMark.width} height={28} rx={14} fill="#ef2d62" stroke="#fff" strokeWidth="2"/>
              <text textAnchor="middle" y="5" fill="#fff" fontSize="13" fontWeight="800" style={{ fontVariantNumeric: "tabular-nums" }}>{seatMark.text}</text>
            </g>
          </g>}
          {photoMarkers.map(({ key, place, label, point: [x, y] }) => <g key={key}>
            <g data-seat-photo-marker={key} className={styles.photoMarker} role="button" tabIndex={0}
              data-photo-x={x} data-photo-y={y} data-photo-placement="inside-block"
              aria-label={`写真がある${label}を選ぶ`}
              onClick={event => { if (event.detail === 0) selectPhotoPlace(place); }}
              onKeyDown={event => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault(); event.stopPropagation(); selectPhotoPlace(place);
              }}>
              <circle className={styles.photoTarget} cx={x} cy={y} r={photoTarget / 2} fill="transparent" />
              <SeatPhotoMarker x={x} y={y} size={photoDiameter} highlighted />
            </g>
          </g>)}
          </g>
        </svg>
        {position && <span className={styles.front}>{position.label}付近</span>}
        {/* Zoomed in full screen, the stage side stays readable. */}
        {fullscreen && !whole && !position && <span className={styles.frontChip}>{data.frontLabel || "↑ ステージ方向"}</span>}
        {levelHints?.up && <span className={`${styles.levelHint} ${styles.levelHintUp}`} data-level-hint="up">↑ {levelHints.up}</span>}
        {levelHints?.down && <span className={styles.levelHint} data-level-hint="down" style={{ top: levelHints.bottom - 40 }}>↓ {levelHints.down}</span>}
        {miniMap && <button type="button" key={`mini-${openCount}`} className={styles.miniMap} data-mini-map="" aria-label="全体図：押すと会場全体を表示" onClick={() => {
          setOverviewReturn([...camera.current] as MapBox); move(wallCamera(overviewBox)); }} style={{ height: miniMap.height + 18 }}>
          <svg viewBox={wallBox.join(" ")} width="100%" height={miniMap.height - 8} aria-hidden="true">
            {miniMap.stage && <rect x={wallBox[0] + wallBox[2] * .3} y={wallBox[1] + wallBox[3] * .01} width={wallBox[2] * .4} height={wallBox[3] * .07} rx={wallBox[3] * .02} fill="#8a8fa8"/>}
            {data.blocks.map(b => <path key={b.id} d={b.path} fill={b.id === selected ? "#ef2d62" : "#e5d3dc"} stroke={b.id === selected ? "#ef2d62" : "none"} strokeWidth={wallBox[2] * .012}/>)}
            <rect x={miniMap.view[0]} y={miniMap.view[1]} width={miniMap.view[2]} height={miniMap.view[3]} fill="#1673ad1f" stroke="#1673ad" strokeWidth={2} vectorEffect="non-scaling-stroke"/>
          </svg>
          <span className={styles.miniMapCaption}><Maximize2 size={10} aria-hidden="true"/>全体図</span>
        </button>}
        {fullscreen && overviewReturn && <button type="button" className={styles.backToSeat} data-back-to-seat="" onClick={() => { move(overviewReturn); setOverviewReturn(null); }}>
          <Crosshair size={16} aria-hidden="true"/>選んだ席に戻る</button>}
        {whole && !data.overviewAreas && <span className={styles.front}>{data.frontLabel ?? "↑ ステージ方向"}</span>}
        {zoneTags.map(z => { const p = zonePositions.get(z.id)!; return <button type="button" key={z.id} data-zone-id={z.id} aria-label={`${z.label}ブロックを拡大`} className={`${styles.zoneTag} ${pulse ? styles.zonePulse : ""}`} style={{ left: p[0], top: p[1] }} onClick={() => chooseZone(z.id)}><span>{z.label}</span></button>; })}
        {areaTags.map(a => { const p = areaPositions.get(a.id)!; return <button type="button" key={a.id} data-area-id={a.id} aria-label={`${a.label}${a.label.endsWith("側") ? "" : "側"}を拡大`} className={`${styles.zoneTag} ${pulse ? styles.zonePulse : ""}`} style={{ left: p[0], top: p[1] }} onClick={() => chooseRegion("all", a.area)}><span>{a.label}</span></button>; })}
        {levelTags.map(l => { const p = projection.project(l.point); return <button type="button" key={l.id} className={`${styles.levelTag} ${pulse ? styles.pulse : ""}`} style={{ left: p[0], top: p[1] }} onClick={() => chooseRegion(l.id, "all")}>{l.label}</button>; })}
      </div>
      {finderFeedback && !fullscreen && <div className={styles.mapNotice} data-seat-map-notice="">
        <button type="button" className={styles.noticeClose} aria-label="検索の案内を閉じる" onClick={resetFinderFeedback}><X size={16} aria-hidden="true"/></button>
        {searchMiss && <SeatFinderMiss detail={error}
          advice={inputAdvice} query={missingInput ? undefined : { scope: [levels.find(l => l.id === level)?.label, area !== "all" && directionName(areas.find(item => item.id === area)?.label ?? area)].filter(Boolean).join("・") || "会場全体",
            row: finderMode === "ticket" && !blockOnlySearch ? row : undefined, number: finderMode === "ticket" && !blockOnlySearch ? number : undefined,
            block: finderMode === "block" || blockOnlySearch ? blockInput : undefined }}
          onReset={level === "all" && area === "all" && !zone ? undefined : reset}
          choices={fallbackBlocks.map(item => ({ id: item.id, label: blockDisplayTitle(item, "") }))}
          choose={id => { const item = data.blocks.find(b => b.id === id); if (item) { setRow(""); setNumber(""); select(item, true); } }} />}
        {error && !searchMiss && <div className={styles.message} role="status">{error}<button type="button" onClick={reset}>条件を解除</button></div>}
        {matches.length > 0 && <section className={styles.searchResults} data-seat-search-results aria-label="座席の検索結果">
          <div className={styles.resultsHeading} role="status">
            <strong>{matches.length}区画が見つかりました</strong>
            <p>席種・列で絞るか、区画を選んでください。</p>
          </div>
          <ul className={styles.candidateList} aria-label="座席の検索候補">
            {matches.map(b => {
              const levelLabel = seatLevelName(b.level, levels.find(l => l.id === b.level)?.label);
              return <li key={b.id}><button className={styles.candidateButton} type="button" data-seat-candidate={b.id} onClick={() => select(b, true, finderMode === "ticket" && !blockOnlySearch)}>
                <span className={styles.candidateCopy}>
                  <strong>{blockDisplayTitle(b, levelLabel)}</strong>
                  <span className={styles.candidateMeta}><span>{levelLabel}{b.balcony && !levelLabel.includes("バルコニー") ? "・バルコニー" : ""}</span><span>{rowSummary(b)}</span></span>
                </span>
                <ChevronRight size={18} aria-hidden="true" />
              </button></li>;
            })}
          </ul>
        </section>}
      </div>}
      {arenaMaps && <button type="button" className={styles.arenaMaps} data-arena-maps-button="" onClick={() => arenaMaps.open()}
        aria-label={`アリーナ図を見る（${arenaMaps.count}公演）`}>
        <span className={styles.arenaPill}>
          {/* The newest show's own arena-map photo, so the button reads as "pictures of the arena layout". */}
          {/* eslint-disable-next-line @next/next/no-img-element -- the post's own image on X, shown as posted */}
          {arenaThumb ? <img className={styles.arenaThumb} src={arenaThumb} alt="" width={22} height={22} decoding="async" referrerPolicy="no-referrer" />
            : <MapIcon size={14} aria-hidden="true" />}アリーナ図<b>{arenaMaps.count}</b>
        </span>
      </button>}
      {!fullscreen && <div className={`${styles.photoOverlay} ${immersive ? styles.previewCapable : ""}`}>
        {data.blocks.some(item => item.numberLookup === "unavailable") && (!block || block.numberLookup === "unavailable") && <p className={styles.coverageNote} data-seat-number-legend><Info size={14} aria-hidden="true" />
          <span role={block?.numberLookup === "unavailable" ? "status" : undefined}>{block?.numberLookup === "unavailable" ? block.numberReference ? "番号は参考表示です（この区画は未確認）" : "この区画は座席番号が未確認の参考区画です" : "参考区画（座席番号は未確認）"}</span></p>}
        {mapLocked ? null
        : <SeatPhotoMapSummary selection={seatView} count={photoAnchors.length} onOpen={() => {
          trackVenueSeatPhotoOpen("card", seatViewMatchesForSelection(seatViewPosts(data.diagramId), seatView).length);
          setPhotoRequest(request => request + 1);
        }} />}
      </div>}
      {sheetPlace && (sheetMatches.length
        ? sheetOpen ? <SeatPhotoSheet key={`${sheetPlace.key}|${seatView.row ?? ""}|${seatView.seat ?? ""}`} sheetRef={sheetElement} title={sheetPlace.title} matches={sheetMatches}
            previous={block ? neighbor(photoBlocksOnLevel[sheetAt - 1], "step") : null} next={block && sheetAt >= 0 ? neighbor(photoBlocksOnLevel[sheetAt + 1], "step") : null}
            onFold={() => setSheetOpen(false)} onEnlarge={index => { setSheetPhoto(index); setPhotoRequest(request => request + 1); }} />
          : <SeatPhotoSheetTab tabRef={tabElement} count={sheetMatches.length} image={seatViewInlinePhotoUrl(sheetMatches[0].post)?.replace("name=large", "name=thumb")}
              onOpen={() => { if (block) frameRequest.current = { id: block.id, zoom: false, animate: true }; setSheetOpen(true); }} />
        : sheetOpen && <SeatPhotoEmptySheet key={sheetPlace.key} sheetRef={sheetElement} title={sheetPlace.long} nearby={block ? neighbor(nearbyPhotoBlock, "step") : null} onFold={() => setSheetOpen(false)} rows={block ? sheetRows : null} />)}
    </div>
      {/* Rendered for phones before hydration too (CSS hides it on wide screens), so the page does not jump. */}
      {immersive && !fullscreen && <div className={styles.previewOpen} id={mapLocked ? "venue-seat-photos" : undefined}>
        {!hintSeen && photoAnchors.length > 0 && <p className={styles.previewHint}><Camera size={14} aria-hidden="true"/>カメラ印の区画をタップすると、席からの見え方が見られます</p>}
        <button ref={openButton} type="button" onClick={() => openFullscreen(selected ? { id: selected, zoom: true, animate: true } : null)}>
          <Camera size={18} aria-hidden="true"/><span>座席表を開いて写真を見る</span>
        </button>
      </div>}
    </div>
    <div className={styles.mapActions}>{data.diagramId === "vantelin-prime-unfolded" && <span className={styles.primeOrientation}>ツイン：3塁側 L／1塁側 R<br/>ボックス：4F／レストラン：3F</span>}<button type="button" className={styles.whole} onClick={reset}>全体図へ</button></div>
    {block && labelRun && <SeatSearchOffer row={String(labelRun.row)} number={normalizeSeatInput(number)} contextLabel={selectedTitle} />}
    {block && <div className={styles.footer} key={block.id} aria-label="選択した区画の詳細">
      {block.numberLookup === "partial" && <p className={styles.coverageNote}><Info size={16} aria-hidden="true"/><span>この区画は、資料で確認できた列・番号だけを掲載しています。</span></p>}
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
