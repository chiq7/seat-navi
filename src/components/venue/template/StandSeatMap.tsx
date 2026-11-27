"use client";

import SeatSearchOffer from "@/components/seat-campaign/SeatSearchOffer";
import { trackVenueSeatPhotoOpen, trackVenueSeatSearch, trackVenueSeatSectionSelect } from "@/lib/venueAnalytics";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, useId, useSyncExternalStore, type PointerEvent } from "react";
import { Camera, ChevronDown, ChevronRight, Crosshair, Info, ListOrdered, Map as MapIcon, Maximize2, Send, X } from "lucide-react";
import { DomeSeatFrame } from "./DomeSeatFrame";
import { useSeatMapTouch } from "./useSeatMapTouch";
import { SeatPhotoMapSummary } from "./SeatViewPosts";
import { glideDuration, startGlide, type Glide } from "./cameraGlide";
import { afterPaint } from "@/lib/seatMapInteraction";
import { SeatPhotoEmptySheet, SeatPhotoSheet, SeatPhotoSheetTab, type SheetNeighbor, type SheetRows } from "./SeatPhotoSheet";
import { seatViewInlinePhotoUrl } from "@/lib/seatViewPhotoAssets";
import { SeatShareSheet } from "./SeatShareSheet";
import { SEAT_SHARE_DIAGRAMS } from "@/lib/seatShare";
import { seatPhotoOffsets, useSeatPhotoHitTest } from "./useSeatPhotoHitTest";
import { seatViewMatchesForSelection, seatViewPosts, type SeatViewPlace } from "@/lib/seatViewPosts";
import { announceTokyoDomeMapScope, type TokyoDomeMapScope } from "@/lib/tokyoDomeVenueSelection";
import { useArenaMaps } from "@/components/venue/ArenaMapsSheet";
import { seatNumberBadge } from "@/lib/seatNumberBadge";
import { SeatFinderMiss, SeatTicketForm } from "./SeatFinderControls";
import { findSeat, seatFieldKeys, seatHintIsWide, seatPlaceField, seatRowHint, WHOLE_VENUE } from "./seatFinder";
import { directionName, nearSeatNumbers, seatLevelName, seatQueryDescription } from "./seatFinderLabels";
import { boundsOf, fitStandNumberGuide, clampCamera, standDetailCamera, standRowDetailTransition, isSeatTap, labelCoversOtherBlock, mapProjection, normalizeSeatInput, standContextLabel, standDisplayRows, standLabelOrder, standGroupReferenceLabels, standReferenceLabelKey, standRedundantContextLabel, standRedundantContextText, standLabelInsideCanvas, standSelectedNumberRun, standSelectedRow, zoomCamera, zoneLabelPositions, type MapBox, type Point, type StandBlock, type StandMapData, type StandPosition } from "./standMap";
import { ARENA_CAPTION, hasStandCanvasArea, overviewAreaLabelPosition, overviewAreaLabelWidth, resolveStandSeatSection, standPathRings, standRectCoverShare, standRectTouchesRings, standArenaPoint, standRingsBox, standZoneCamera } from "./standMap";
import styles from "./StandSeatMap.module.css";
import { trackSeatMapFullscreen } from "@/lib/uiAnalytics";
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
/** What the full-screen map frames once laid out: a block (by id), or a zone / position / level area (by box). */
type FrameRequest = { id: string; zoom: boolean; animate: boolean; box?: MapBox };
/** Full screen opens where five rows take about this many pixels, so every fifth row's tag can be read. */
const FIVE_ROWS_PX = 22;
/** The canvas before the browser has measured it: nothing that stands at a point of the drawing is shown yet. */
const UNMEASURED = { width: 900, height: 620 };
export type StandSeatMapHandle = { showRegion: (level: string, area: string) => void };
type Gesture = { points: Map<number, Point>; start: Point; last: Point; travel: number; multi: boolean; block: string | null; photo: string | null; distance: number };
const freshGesture = (): Gesture => ({ points: new Map(), start: [0, 0], last: [0, 0], travel: 0, multi: false, block: null, photo: null, distance: 0 });
const photoDiameter = 18;
const photoTarget = 32;
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
import { RowDigit, rowDigitSize, rulerPicks, RULER_INK, StartDisc, startDiscBox } from "./rowRuler";
import { PHOTO_DOT, PhotoDot, photoDotSpots } from "./photoSign";

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
  // Candidates listed by a row-and-number search open with the seat marked and the photo board folded.
  const [matchesFromSeat, setMatchesFromSeat] = useState(false);
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
  }), [size, setSize] = useState(UNMEASURED);
  const [pulse, setPulse] = useState(false);
  const arenaMaps = useArenaMaps();
  // Where the arena floor is on this drawing, when it has one: the arena-map button stands there.
  const arenaPoint = useMemo(() => standArenaPoint(data), [data]);
  // Full-screen map (phones): the page keeps a still preview; the photo board rises over the map.
  const narrow = useSyncExternalStore(subscribeImmersive, () => window.matchMedia(IMMERSIVE_QUERY).matches, () => false);
  const immersiveMode = immersive && narrow;
  const [fullscreen, setFullscreen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(true);
  const [sheetPhoto, setSheetPhoto] = useState(0);
  const [slotHeight, setSlotHeight] = useState<number>();
  const [frameTick, setFrameTick] = useState(0);
  const fullscreenRef = useRef(false), lockedRef = useRef(false), pushedHistory = useRef(false);
  const pageScroll = useRef(0), frameRequest = useRef<FrameRequest | null>(null);
  const frameElement = useRef<HTMLDivElement>(null), sheetElement = useRef<HTMLDivElement>(null), closeButton = useRef<HTMLButtonElement>(null), tabElement = useRef<HTMLButtonElement>(null);
  // The small venue map: tapping it pulls back to the whole venue; "選んだ席に戻る" returns to this camera.
  const [overviewReturn, setOverviewReturn] = useState<MapBox | null>(null);
  const [openCount, setOpenCount] = useState(0);
  const mapLocked = immersiveMode && !fullscreen;
  fullscreenRef.current = fullscreen; lockedRef.current = mapLocked;

  const stage = useRef<HTMLDivElement>(null), svg = useRef<SVGSVGElement>(null), glide = useRef<Glide | null>(null);
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
  // How many photos each block has, and a small picture of the first one (for the round photo on the map).
  const photoSigns = useMemo(() => {
    const signs = new Map<string, { count: number; thumb: string | null }>();
    for (const post of seatViewPosts(data.diagramId)) {
      // a block's photos under its own id; a zone's or a position's under "zone:id" / "position:id"
      const key = post.place.kind === "section" ? post.place.id : `${post.place.kind}:${post.place.id}`;
      const sign = signs.get(key) ?? { count: 0, thumb: null };
      sign.count += 1; sign.thumb ??= seatViewInlinePhotoUrl(post)?.replace("name=large", "name=120x120") ?? null;
      signs.set(key, sign);
    }
    return signs;
  }, [data]);
  const photoSectionIds = useMemo(() => new Set(photoAnchors.filter(item => item.place.kind === "section").map(item => item.place.id)), [photoAnchors]);
  // Levels, sides and zones that hold at least one photo: their name on the whole-venue map carries the camera.
  const photoPlaces = useMemo(() => {
    const levelIds = new Set<string>(), areaIds = new Set<string>(), zoneIds = new Set<string>();
    for (const item of photoAnchors) {
      levelIds.add(item.level);
      if (item.place.kind === "zone") zoneIds.add(item.place.id);
      if (item.place.kind !== "section") continue;
      const owner = data.blocks.find(candidate => candidate.id === item.place.id);
      if (!owner) continue;
      areaIds.add(owner.area);
      for (const z of data.zones ?? []) if (z.id === owner.zone || z.blockIds.includes(owner.id)) zoneIds.add(z.id);
    }
    return { levelIds, areaIds, zoneIds };
  }, [data, photoAnchors]);
  
  
  
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
  // How far apart two rows of a block are, in map units (0 where the block has fewer than two drawn rows).
  const rowGaps = useMemo(() => new Map(data.blocks.map(b => {
    const [first, second] = b.rows.filter(r => r.segments.length);
    if (!first || !second) return [b.id, 0] as const;
    const a = first.segments[0].a, e = first.segments[0].b, length = Math.hypot(e[0] - a[0], e[1] - a[1]);
    // rows known only by their place (segments without length) are not lines to count
    if (length < .5) return [b.id, 0] as const;
    const dx = (e[0] - a[0]) / length, dy = (e[1] - a[1]) / length;
    const vx = second.segments[0].a[0] - a[0], vy = second.segments[0].a[1] - a[1], on = vx * dx + vy * dy;
    return [b.id, Math.hypot(vx - on * dx, vy - on * dy)] as const;
  })), [data]);
  const blockShapes = useMemo(() => [...data.blocks.filter(b => b.id !== block?.id && !zoneMembers.has(b.id)), ...data.blocks.filter(b => zoneMembers.has(b.id)), ...(block ? [block] : [])].map(b => <path key={b.id} d={b.path} fillRule="evenodd" data-block-id={b.id} data-zone-member={zoneMembers.has(b.id) ? "" : undefined} className={`${styles.block} ${whole && pulse && data.wholeBlockLabels && !data.zones ? styles.blockPrompt : ""}`}
            fill={b.id === selected ? "#a93164" : zoneMembers.has(b.id) ? "#c4527f" : levels.find(l => l.id === b.level)!.color}
            opacity={level === "all" || b.level === level || selected || zoneMembers.has(b.id) ? 1 : .17} stroke={b.id === selected || zoneMembers.has(b.id) ? "#682840" : "#fff"} strokeWidth={b.id === selected ? 1.8 : zoneMembers.has(b.id) ? 1.2 : 1}>
            <title>{`${seatLevelName(b.level, levels.find(item => item.id === b.level)?.label)} ${b.balcony ? "バルコニー " : ""}${blockDisplayTitle(b, "")}・${rowSummary(b)}`}</title>
          </path>), [block, data.blocks, data.wholeBlockLabels, data.zones, level, levels, pulse, selected, whole, zoneMembers]);

  // A stopped glide or gesture keeps the camera where it is; labels are laid out again for it.
  function dropGlide() { glide.current?.stop(); glide.current = null; }
  function cancelGlide() { if (!glide.current) return; dropGlide(); paint(camera.current); }
  function stop() { cancelGlide(); if (!gesture.current.points.size) commit(); }
  function interaction() { initialCanvasPending.current = false; interacted.current = true; setPulse(false); stop(); }
  // Pans, pinches and wheel zooms paint the camera straight onto the SVG and commit to React once when they
  // end (Tokyo Dome's paintBox/commitBox): laying out every label on each frame made the map stutter on
  // phones. Screen-space labels follow with one transform until the commit. A glide draws the map once and
  // moves that picture (cameraGlide): `camera` is then the view on screen, `draw` the view the map is drawn for.
  const cameraMark = (box: MapBox) => stage.current?.setAttribute("data-camera", box.map(n => n.toFixed(2)).join(","));
  function paint(next: MapBox) { camera.current = next; draw(next); cameraMark(next); }
  function draw(next: MapBox) {
    const { width, height } = sizeRef.current;
    inner.current?.setAttribute("viewBox", next.join(" "));
    const from = mapProjection(renderedView.current, width, height), to = mapProjection(next, width, height);
    const ratio = to.scale / from.scale, origin = from.project([0, 0]), target = to.project([0, 0]);
    overlay.current?.setAttribute("transform", `translate(${target[0] - origin[0] * ratio} ${target[1] - origin[1] * ratio}) scale(${ratio})`);
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
    stop(); const target = fitCamera(next), layer = svg.current, from = [...camera.current] as MapBox;
    if (!animate || !layer || from.every((n, index) => Math.abs(n - target[index]) < .01) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { paint(target); commit(); return; }
    glide.current = startGlide(layer, { from, to: target, size: sizeRef.current, duration: glideDuration(from[2], target[2]),
      draw: box => draw(box as MapBox), track: box => { camera.current = box as MapBox; cameraMark(camera.current); },
      done: () => { glide.current = null; paint(target); commit(); } });
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
    // Labels were just laid out for this camera; a glide or gesture still in progress re-derives its offset.
    if (moving.current) draw(glide.current ? glide.current.drawn as MapBox : camera.current);
    else { camera.current = view; overlay.current?.removeAttribute("transform"); }
  }, [view, size]);
  useLayoutEffect(() => { for (const pressed of svg.current?.querySelectorAll("[data-pressed]") ?? []) pressed.removeAttribute("data-pressed"); }, [selected]);
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
    // A block picked on the map (not found by the search) is no longer the place typed in the form.
    if (source !== "search") setBlockInput("");
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
  const openedAt = useRef(0);
  function openFullscreen(request: FrameRequest | null, fold = false) {
    if (fullscreenRef.current) return;
    pageScroll.current = window.scrollY;
    setSlotHeight(frameElement.current?.parentElement?.getBoundingClientRect().height);
    frameRequest.current = request;
    setSheetOpen(!fold); setSheetPhoto(0);
    setFullscreen(true); fullscreenRef.current = true; setOpenCount(count => count + 1);
    openedAt.current = Date.now(); trackSeatMapFullscreen("open");
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
    trackSeatMapFullscreen("close", (Date.now() - openedAt.current) / 1000);
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
    dropGlide(); paint(fullscreen ? wallCamera(overviewBox) : overviewBox); commit();
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
    // Closing ends the choice (x and the phone's back alike): the page map is the whole venue again, with nothing
    // chosen and no search note, so the next tap on it opens the whole venue and not the place chosen before.
    clearResult(); setZone(null); setLevel("all"); setArea("all");
    // The browser's own back may also try to restore an older scroll position: hold ours for a few frames.
    const y = pageScroll.current;
    window.scrollTo(0, y);
    let frames = 0, id = 0;
    const hold = () => { if (Math.abs(window.scrollY - y) > 2) window.scrollTo(0, y); if (++frames < 6) id = requestAnimationFrame(hold); };
    id = requestAnimationFrame(hold);
    stage.current?.focus({ preventScroll: true });
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
  // Phones show no level or direction filter on the page, so a search there always covers the whole venue.
  const searchScope = immersiveMode ? WHOLE_VENUE : { level, area, zone };
  function search(event: React.FormEvent) {
    event.preventDefault(); interaction();
    resetFinderFeedback();
    // Put the phone keyboard away: it would cover the result on the map.
    const typing = document.activeElement;
    if (typing instanceof HTMLElement && typing.closest("[data-seat-finder-form]")) typing.blur();
    const input = { place: blockInput, row: blockOnlySearch ? "" : row, number: blockOnlySearch ? "" : number };
    const fields = [input.place.trim() && "place", (input.row.trim() || input.number.trim()) && "seat"].filter(Boolean).join("_") || "none";
    const result = findSeat(data, levels, input, searchScope);
    if (result.kind === "zone") { trackVenueSeatSearch("area", 1, fields); chooseZone(result.zone.id); setError(result.notice ?? ""); return; }
    if (result.kind === "position") { trackVenueSeatSearch("area", 1, fields); choosePosition(result.position); return; }
    if (result.kind === "level") { trackVenueSeatSearch("area", 1, fields); chooseRegion(result.level, "all"); return; }
    if (result.kind === "block") { trackVenueSeatSearch(result.seat ? "matched" : "area", 1, fields); select(result.block, true, result.seat); setError(result.notice ?? ""); return; }
    setPosition(null); setSelected(null);
    if (result.kind === "candidates") { trackVenueSeatSearch("multiple", result.blocks.length, fields); setMatchesFromSeat(result.seat);
      // In reading order: level by level, then by name (the data is in drawing order).
      const levelOrder = (id: string) => levels.findIndex(item => item.id === id);
      setMatches([...result.blocks].sort((a, b) => levelOrder(a.level) - levelOrder(b.level) || a.label.localeCompare(b.label, "ja", { numeric: true }))); return; }
    trackVenueSeatSearch(fields === "none" ? "invalid" : /確認中|未対応|区画名で|公式図に列名/.test(result.error) ? "unverified" : /入力/.test(result.error) ? "invalid" : "empty", 0, fields);
    setError(result.error); setSearchMiss(true);
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
    // The still map on a phone is a door, not a picker: wherever the finger lands, a tap opens the whole venue
    // full screen (on the chosen seat when one is already chosen). The names on it do not act either.
    if (mapLocked) { suppressMapClick.current = true; openFullscreen(selected ? { id: selected, zoom: true, animate: true } : null); return; }
    const photoAnchor = photoAnchors.find(item => item.key === photo);
    if (photoAnchor) { selectPhotoPlace(photoAnchor.place); return; }
    const target = id && data.blocks.find(b => b.id === id);
    // The block takes its colour the moment it is touched; the rest of the screen follows.
    if (target) { svg.current?.querySelector(`path[data-block-id="${target.id}"]`)?.setAttribute("data-pressed", ""); afterPaint(() => select(target)); }
  }
  useEffect(() => {
    const el = stage.current!;
    const resize = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      const canvas = { width, height };
      if (!hasStandCanvasArea(canvas)) return;
      sizeRef.current = canvas; setSize(canvas);
      // Phone bars appearing or the phone turning: the full-screen map keeps to its walls at the new size.
      if (fullscreenRef.current && !gesture.current.points.size && !glide.current) { paint(wallCamera(camera.current)); commit(); }
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

  // Whole venue: each level is named once on the map (its name carries the camera when it has photos).
  const levelTags = whole && !data.zones ? levels.filter(l => !data.wholeBlockLabels || data.blocks.filter(b => b.level === l.id).length === 1) : [];
  
  const gaishiOverview = data.diagramId.startsWith("gaishi-");
  const zoneTags = whole ? (data.zones ?? []).filter(z => !z.hideOnWhole || (gaishiOverview && ["A", "E", "I", "M"].includes(z.id))) : [];
  const areaTags = whole && !gaishiOverview ? data.overviewAreas ?? [] : [];
  const zonePositions = zoneLabelPositions(zoneTags, view, size.width, size.height);
  // A zone name under the corner arena-map button steps aside (left of it, else below it) when that spot is free.
  if (arenaMaps && !arenaPoint) for (const z of zoneTags) {
    const p = zonePositions.get(z.id)!, tagWidth = (tag: typeof z) => overviewAreaLabelWidth(tag.label) + (photoPlaces.zoneIds.has(tag.id) ? 16 : 0), w = tagWidth(z);
    if (!(p[1] < 52 && p[0] + w / 2 > size.width - 124)) continue;
    const free = (spot: Point) => spot[0] >= w / 2 + 4 && zoneTags.every(other => { const q = zonePositions.get(other.id)!; return other.id === z.id || Math.abs(q[0] - spot[0]) >= (tagWidth(other) + w) / 2 + 2 || Math.abs(q[1] - spot[1]) >= 30; });
    const spot = ([[size.width - 126 - w / 2, p[1]], [p[0], 54]] as Point[]).find(free);
    if (spot) { p[0] = spot[0]; p[1] = spot[1]; }
  }
  const areaPositions = new Map(areaTags.map(a => {
    return [a.id, overviewAreaLabelPosition(a.point, a.label, view, size.width, size.height)];
  }));
  // What a name tag inks on the screen (its tap target is wider than that).
  const inked = (label: string, camera: boolean) => Math.max(28, [...label].reduce((sum, char) => sum + (char.charCodeAt(0) < 128 ? 7.2 : 12), 0) + 14) + (camera ? 15 : 0);
  // A name tag at the left or right edge is pulled in just enough for the whole of it (its camera included) to show.
  const pullIn = (p: Point, ink: number) => { p[0] = Math.min(size.width - ink / 2 - 2, Math.max(ink / 2 + 2, p[0])); };
  for (const z of zoneTags) pullIn(zonePositions.get(z.id)!, inked(z.label, photoPlaces.zoneIds.has(z.id)));
  for (const a of areaTags) pullIn(areaPositions.get(a.id)!, inked(a.label, photoPlaces.areaIds.has(a.area)));
  const buttonBounds = [...levelTags.map(l => { const p = projection.project(l.point); return [p[0], p[1], Math.max(64, l.label.length * 14 + 28) + (photoPlaces.levelIds.has(l.id) ? 16 : 0), 44]; }),
    ...zoneTags.map(z => { const p = zonePositions.get(z.id)!; return [p[0], p[1], overviewAreaLabelWidth(z.label) + (photoPlaces.zoneIds.has(z.id) ? 16 : 0), 44]; }),
    ...areaTags.map(a => { const p = areaPositions.get(a.id)!; return [p[0], p[1], overviewAreaLabelWidth(a.label) + (photoPlaces.areaIds.has(a.area) ? 16 : 0), 44]; })];
  // The arena-map button stands on the arena floor of the drawing: a little above or below the middle when a name is
  // already there, without its picture (then without its count too) when the floor is narrow, and not at all while
  // the floor is off screen.
  // A drawing without a floor, or with no room on it, keeps the button in the corner.
  const arenaWidths = [107 + String(arenaMaps?.count ?? 0).length * 7, 86 + String(arenaMaps?.count ?? 0).length * 7, 80];
  const namesOnFloor = [...buttonBounds.slice(0, levelTags.length).map((r, index) => data.wholeBlockLabels ? [r[0], r[1], inked(levelTags[index].label, photoPlaces.levelIds.has(levelTags[index].id)) + 6, 26] : [r[0], r[1], r[2], 44]),
    ...zoneTags.map(z => [...zonePositions.get(z.id)!, inked(z.label, photoPlaces.zoneIds.has(z.id)), 28]),
    ...areaTags.map(a => [...areaPositions.get(a.id)!, inked(a.label, photoPlaces.areaIds.has(a.area)), 28])];
  const arenaPlace: { at: Point; form: number; width: number } | "corner" | null = !arenaMaps ? null : !arenaPoint ? "corner" : size === UNMEASURED ? null : (() => {
    const p = projection.project(arenaPoint);
    if (p[0] < arenaWidths[2] / 2 + 6 || p[0] > size.width - arenaWidths[2] / 2 - 6 || p[1] < 22 || p[1] > size.height - 22) return null;
    for (const [index, width] of arenaWidths.entries()) for (const step of [0, -14, 14, -28, 28, -42, 42]) {
      const y = p[1] + step, half = width / 2;
      if (y >= 22 && y <= size.height - 22 && p[0] >= half + 6 && p[0] <= size.width - half - 6
        && namesOnFloor.every(r => Math.abs(p[0] - r[0]) >= half + r[2] / 2 + 4 || Math.abs(y - r[1]) >= 15 + r[3] / 2 + 8)) return { at: [p[0], y], form: index, width };
    }
    return "corner" as const;
  })();
  const arenaSpot = arenaPlace && arenaPlace !== "corner" ? arenaPlace : null;
  // Passive names keep clear of the arena-map button, wherever it stands.
  // The photo pill and the reference-area note sit over the bottom of the map: names there would be hidden.
  const legendShown = block?.numberLookup === "unavailable";
  const cardShown = photoAnchors.length > 0 && !mapLocked;
  const bottomCover = fullscreen ? 8 : 8 + (cardShown ? 56 : 0) + (legendShown ? 34 : 0) + (cardShown && legendShown ? 6 : 0);
  const bottomBox = bottomCover > 8 ? [size.width / 2, size.height - bottomCover / 2, size.width, bottomCover] : null;
  const occupied = [...buttonBounds, ...(arenaPlace === "corner" ? [[size.width - 76, 30, 140, 44]] : arenaSpot ? [[arenaSpot.at[0], arenaSpot.at[1], arenaSpot.width + 6, 36]] : []), ...(bottomBox && !whole ? [bottomBox] : []),
    ...(fullscreen ? [[size.width - 50, 102, 100, 110]] : [])];
  const labels: { id: string; text: string; x: number; y: number; width: number; height: number; kind: "number" | "block"; selected: boolean; plain: boolean; photo: boolean; anchor?: Point }[] = [];
  const blockCenters = shown.flatMap(b => [b.center, ...(b.labelAvoidancePoints ?? [])].map(point => ({ id: b.id, point: projection.project(point) })));
  // Keep context captions off both ends of the interval chosen by the seat search.
  const labelRun = standSelectedNumberRun(data, block, row, number);
  if (block && labelRun) {
    const id = block.id;
    blockCenters.push(...[labelRun.segment.a, labelRun.segment.b].map(point => ({ id, point: projection.project(point) })));
  }
  // A name sits at its own place and never moves: where it does not fit, it is left out, so nothing jumps
  // while the map is zoomed. A place with photos carries a small camera inside its name (one mark per place).
  // Whole venue on a narrow screen: set when the one-letter block names would run into each other at their usual width.
  let tightNames = false;
  function addLabel(id: string, text: string, position: Point, important = false, width?: number) {
    const kind = text.includes("番") && !text.endsWith("番側") ? "number" : "block";
    const plainName = !whole && kind === "block" && !important;
    const photo = whole && !important && photoSectionIds.has(id);
    const fontSize = important ? 14 : 12;
    const textWidth = [...text].reduce((sum, char) => sum + fontSize * (char.charCodeAt(0) < 128 ? .6 : 1), 0);
    const full = (width ?? (plainName ? textWidth + 16 : Math.max(important || text.length > 2 ? 48 : 32, textWidth + 14))) + (photo ? 15 : 0);
    // A one-letter block name with its camera can be drawn a little narrower on the whole venue: all of them when they
    // would run into each other (tightNames), or this one alone rather than leaving it out.
    const slim = whole && kind === "block" && !important && photo && textWidth <= 8 ? full - 8 : full;
    const h = plainName || (wholeNumbers && kind === "number") ? 22 : kind === "block" ? 26 : 28;
    for (const w of tightNames ? [slim] : slim < full ? [full, slim] : [full]) {
      // A name at the edge of the map is pulled in just enough to show whole (at most 12px, so it stays on its block).
      const x = Math.min(size.width - w / 2 - 2, Math.max(w / 2 + 2, position[0])), y = Math.min(size.height - h / 2 - 2, Math.max(h / 2 + 2, position[1]));
      if (Math.hypot(x - position[0], y - position[1]) > 12 || !standLabelInsideCanvas([x, y], w, h, size)) continue;
      // Passive names (zoomed in) cannot redirect a tap to a different block.
      if (!important && !plainName && labelCoversOtherBlock(id, [x, y], w, h, blockCenters)) continue;
      if (!important && occupied.some(r => Math.abs(x - r[0]) < (w + r[2]) / 2 + 4 && Math.abs(y - r[1]) < (h + r[3]) / 2 + 3)) continue;
      // Another place's name or number never lies on the selected block.
      if (!important && standRectTouchesRings([x, y], w, h, selectedScreenRings, 1)) continue;
      // The same caption twice close together reads as one place labelled twice: keep the first.
      if (!important && !whole && labels.some(l => l.text === text && Math.hypot(l.x - x, l.y - y) < 160)) continue;
      occupied.push([x, y, w, h]); labels.push({ id, text, x, y, width: w, height: h, kind, selected: important, plain: plainName, photo });
      return;
    }
  }
  const displayRows = block ? standDisplayRows(block) : [];
  const [vx, vy, vw, vh] = view;
  const rowNeighbours = whole ? [] : shown.filter(b => b.id !== block?.id && b.box[0] < vx + vw && b.box[0] + b.box[2] > vx && b.box[1] < vy + vh && b.box[1] + b.box[3] > vy
    && (rowGaps.get(b.id) ?? 0) * projection.scale >= 3.6);
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
    labels.push({ id: "selected-block", text, x: point[0], y: point[1], width: w, height: h, kind: text.includes("番") && !text.endsWith("番側") ? "number" : "block", selected: true, plain: false, photo: false, anchor: near });
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
  // The chosen block's rows: a ruler down one side of the block (the first row, every fifth, the last), each tag
  // on its own row line just inside that end. A tag that would touch another one is left out.
  const ruler: { key: string; text: string; x: number; y: number; w: number; active: boolean }[] = [];
  const activeRow = labelRun ? normalizeSeatInput(String(labelRun.row)) : highlightedRow;
  if (block && block.rowNameLookup !== "unavailable" && displayRows.length) {
    const rowsOnScreen = displayRows.map(r => {
      const own = block.rows.find(item => item.label === r.label);
      // (a row known only by its place has segments without length: its drawn edge gives the two ends)
      return { label: r.label, points: [...(own?.segments.flatMap(segment => [segment.a, segment.b]) ?? []), r.a, r.b].map(point => projection.project(point)) };
    });
    // The numbers stand on the side the seat numbers run toward (the start mark has the other side). Without a known
    // start: the left end of rows that run across the screen, the top end of rows that run down it.
    const firstA = projection.project(displayRows[0].a), firstB = projection.project(displayRows[0].b);
    const run = block.numberReference && block.numberLookup !== "unavailable" ? (() => {
      const young = projection.project(block.numberReference.young), older = projection.project(block.numberReference.older), length = Math.hypot(older[0] - young[0], older[1] - young[1]);
      return length < 1 ? null : [(older[0] - young[0]) / length, (older[1] - young[1]) / length] as Point;
    })() : null;
    const toward: Point = run ?? (Math.abs(firstB[0] - firstA[0]) >= Math.abs(firstB[1] - firstA[1]) ? [-1, 0] : [0, -1]);
    const along = (point: Point) => point[0] * toward[0] + point[1] * toward[1];
    const names = rowsOnScreen.map(r => r.label), activeName = activeRow ? names.find(name => normalizeSeatInput(name) === activeRow) ?? null : null;
    // the searched row first, so a neighbour gives way to it
    for (const index of rulerPicks(names, activeName).sort((a, b) => Number(names[b] === activeName) - Number(names[a] === activeName))) {
      const r = rowsOnScreen[index];
      const far = r.points.reduce((a, b) => along(b) > along(a) ? b : a), near = r.points.reduce((a, b) => along(b) < along(a) ? b : a);
      const length = Math.hypot(far[0] - near[0], far[1] - near[1]) || 1;
      const ux = (far[0] - near[0]) / length, uy = (far[1] - near[1]) / length;
      // a row stops short of the block's edge: the number stands outside the block and clear of its thick outline
      let edge = 0;
      while (edge < 28) { const [mx, my] = projection.unproject([far[0] + ux * (edge + 1), far[1] + uy * (edge + 1)]); if (!photoHitTest([block.path], { x: mx, y: my })) break; edge += 1; }
      const active = r.label === activeName, mark = rowDigitSize(r.label, active), out = edge + (active ? mark.width / 2 + 6 : 11), w = mark.width;
      const x = far[0] + ux * out, y = far[1] + uy * out;
      // (whole on the map, and not under the photo board)
      if (x < w / 2 || x > size.width - w / 2 || y < 8 || y > size.height - (fullscreen ? boardHeight() : 0) - 8) continue;
      if (occupied.some(o => Math.abs(x - o[0]) < (w + o[2]) / 2 + 2 && Math.abs(y - o[1]) < (mark.height + o[3]) / 2 + 2)) continue;
      if (ruler.some(tag => Math.abs(tag.x - x) < (tag.w + w) / 2 + 1 && Math.abs(tag.y - y) < 13)) continue;
      ruler.push({ key: r.label, text: r.label, x, y, w, active }); occupied.push([x, y, w, mark.height]);
    }
  }
  // Where the chosen block's seat numbers begin and which way they run: one small tag at that end of its row.
  // (A searched seat shows the two ends of its own run instead; the still map on a phone is too small for it.)
  const startNumber = block?.numberReference && block.numberLookup !== "unavailable" && !labelRun && !mapLocked ? (() => {
    const young = projection.project(block.numberReference.young), older = projection.project(block.numberReference.older);
    const length = Math.hypot(older[0] - young[0], older[1] - young[1]);
    if (length < 1) return null;
    const ux = (older[0] - young[0]) / length, uy = (older[1] - young[1]) / length;
    // A round mark just outside that end of the row, its arrow the way the numbers count up; where that spot is
    // taken (the small venue map, a button, the map's edge) the mark stands just inside the block instead.
    const others = occupied.filter(o => !ruler.some(tag => tag.x === o[0] && tag.y === o[1]));
    for (const step of [-12, 12]) {
      const x = young[0] + ux * step, y = young[1] + uy * step, box = startDiscBox(x, y, ux, uy);
      if (box.x - box.width / 2 < 2 || box.x + box.width / 2 > size.width - 2 || box.y - box.height / 2 < 2 || box.y + box.height / 2 > size.height - (fullscreen ? boardHeight() : 0) - 2) continue;
      if (ruler.some(tag => Math.abs(tag.x - box.x) < (tag.w + box.width) / 2 + 1 && Math.abs(tag.y - box.y) < (14 + box.height) / 2 + 1)) continue;
      if (others.some(o => Math.abs(box.x - o[0]) < (box.width + o[2]) / 2 + 2 && Math.abs(box.y - o[1]) < (box.height + o[3]) / 2 + 2)) continue;
      occupied.push([box.x, box.y, box.width, box.height]);
      return { text: `${block.numberPrefix ?? ""}${block.numberReference.start}`, x, y, ux, uy };
    }
    return null;
  })() : null;
  const referenceLabels = new Set<string>();
  const contextCaptions = new Set<string>();
  if (block?.numberLookup === "unavailable" && labels.some(item => item.id === "selected-block")) {
    contextCaptions.add(JSON.stringify([block.level, block.area, block.zone ?? "", block.label]));
  }
  const selectedReferenceKey = block && standReferenceLabelKey(block, groupReferenceLabels);
  if (selectedReferenceKey && (displayRows.length || labels.some(l => l.id === "selected-block"))) referenceLabels.add(selectedReferenceKey);
  if (whole && data.wholeBlockLabels && !data.zones) {
    const letters = shown.filter(b => b.id !== selected && photoSectionIds.has(b.id) && data.blocks.filter(o => o.level === b.level).length !== 1)
      .map(b => { const context = standContextLabel(data, b, closestDetail || groupReferenceLabels, false); return { text: context.text === b.label ? blockDisplayTitle(b, "") : context.text, at: projection.project(context.point) }; })
      .filter(name => name.text.length === 1 && name.text.charCodeAt(0) < 128);
    tightNames = letters.some((a, i) => letters.some((b, j) => j > i && Math.abs(a.at[0] - b.at[0]) < 47 + 4 && Math.abs(a.at[1] - b.at[1]) < 26 + 3));
  }
  if ((!whole || data.wholeBlockLabels || wholeNumbers) && !(whole && data.zones)) for (const b of standLabelOrder(shown, block)) {
    if (b.id === selected) continue;
    if (whole && data.blocks.filter(o => o.level === b.level).length === 1) continue;
    if (wholeNumbers && b.label.includes("番") && b.numberReference) {
      // On a phone the whole venue shows its levels only: a handful of start numbers that happen to fit say little.
      if (whole && levelTags.length && size.width < 500) continue;
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
      addLabel(b.id, context.text === b.label ? blockDisplayTitle(b, "") : context.text, projection.project(context.point));
      if (referenceKey && labels.length > before) referenceLabels.add(referenceKey);
      if (captionKey && labels.length > before) contextCaptions.add(captionKey);
    }
  }
  
  
  // A searched seat: its own point and tag, and the first and last number of its run as small numbers just
  // inside the two ends. The still map on a phone shows the point only.
  const clearOfLabels = (x: number, y: number, w: number, h: number) => labels.every(l => Math.abs(x - l.x) >= (w + l.width) / 2 + 2 || Math.abs(y - l.y) >= (h + l.height) / 2 + 2)
    && ruler.every(tag => Math.abs(x - tag.x) >= (w + tag.w) / 2 + 2 || Math.abs(y - tag.y) >= (h + 18) / 2 + 2);
  const seatMark = block && labelRun ? (() => {
    const point = projection.project(seatOnSegment(labelRun.segment, Number(labelRun.seat)));
    const a = projection.project(labelRun.segment.a), b = projection.project(labelRun.segment.b);
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, ux = (b[0] - a[0]) / length, uy = (b[1] - a[1]) / length;
    const numbers: { key: string; text: string; x: number; y: number; w: number }[] = [];
    if (!mapLocked && labelRun.segment.end !== labelRun.segment.start) for (const [value, end, inward] of [[labelRun.segment.start, a, 1], [labelRun.segment.end, b, -1]] as const) {
      const text = `${block.numberPrefix ?? ""}${value}`, w = text.length * 6.5 + 8;
      // Just outside that end of the run (in the aisle), or just inside it; left out when neither spot is clear.
      const spot = [-(w / 2 + 5), w / 2 + 4].map(offset => [end[0] + ux * inward * offset, end[1] + uy * inward * offset]).find(([x, y]) =>
        x >= w / 2 && x <= size.width - w / 2 && y >= 8 && y <= size.height - 8 && Math.hypot(x - point[0], y - point[1]) >= w / 2 + 10
        && ruler.every(tag => Math.abs(tag.x - x) >= (tag.w + w) / 2 + 2 || Math.abs(tag.y - y) >= 17)
        && numbers.every(other => Math.hypot(other.x - x, other.y - y) >= (other.w + w) / 2 + 2)
        && labels.every(l => Math.abs(x - l.x) >= (w + l.width) / 2 + 2 || Math.abs(y - l.y) >= (16 + l.height) / 2 + 2));
      if (spot) numbers.push({ key: String(value), text, x: spot[0], y: spot[1], w });
    }
    const text = `${labelRun.row}列${labelRun.seat}番付近`, width = Math.max(96, [...text].reduce((sum, char) => sum + 13 * (char.charCodeAt(0) < 128 ? .62 : 1), 0) + 20);
    const tagX = Math.min(size.width - width / 2 - 4, Math.max(width / 2 + 4, point[0]));
    const tagY = [point[1] - 34, point[1] + 34, point[1] - 64].find(y => y > 16 && y < size.height - 16 && clearOfLabels(tagX, y, width, 28)) ?? point[1] - 34;
    return { point, text, width, tagX, tagY, numbers, pill: !mapLocked };
  })() : null;
  // Zoomed in, a block with photos shows its own photo, small and round: on the block itself, just behind its name
  // (away from the arena floor), else just in front of it. Where neither spot is on the block and free it is left
  // out, and comes back on zooming in. No name moves for it.
  const photoDots = whole ? [] : photoAnchors.filter(item => item.place.kind === "section" && item.place.id !== block?.id && (level === "all" || item.level === level)).flatMap(item => {
    const name = labels.find(l => l.id === item.place.id && !l.selected) ?? null;
    const at = name ? [name.x, name.y] as Point : projection.project(item.point);
    const away = projection.project(arenaPoint ?? [overviewBox[0] + overviewBox[2] / 2, overviewBox[1] + overviewBox[3] / 2]);
    const length = Math.hypot(at[0] - away[0], at[1] - away[1]) || 1, ux = (at[0] - away[0]) / length, uy = (at[1] - away[1]) / length;
    // (a name's box is kept wider than its ink: the photo stands by the ink)
    const half = PHOTO_DOT / 2;
    const bottom = size.height - (fullscreen ? boardHeight() : 0);
    for (const [dx, dy] of name ? photoDotSpots(Math.max(12, name.width - 12), 18, ux, uy) : [[0, 0]]) {
      const x = at[0] + dx, y = at[1] + dy;
      if (x < half + 2 || x > size.width - half - 2 || y < half + 2 || y > bottom - half - 2) continue;
      const [mx, my] = projection.unproject([x, y]);
      if (!photoHitTest(item.paths, { x: mx, y: my }, 6 / projection.scale)) continue;
      if (standRectTouchesRings([x, y], PHOTO_DOT, PHOTO_DOT, selectedScreenRings, 1)) continue;
      if (occupied.some(o => !(name && o[0] === name.x && o[1] === name.y) && Math.abs(x - o[0]) < (PHOTO_DOT + o[2]) / 2 + 1 && Math.abs(y - o[1]) < (PHOTO_DOT + o[3]) / 2 + 1)) continue;
      if (seatMark && (Math.hypot(x - seatMark.point[0], y - seatMark.point[1]) < half + 12
        || (seatMark.pill && Math.abs(x - seatMark.tagX) < (PHOTO_DOT + seatMark.width) / 2 + 2 && Math.abs(y - seatMark.tagY) < (PHOTO_DOT + 28) / 2 + 2))) continue;
      occupied.push([x, y, PHOTO_DOT, PHOTO_DOT]);
      return [{ id: item.place.id, x, y }];
    }
    return [];
  });
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
  const photoMarkers = photoAnchors.filter(item => item.place.kind !== "section").flatMap(item => {
    if (level !== "all" && item.level !== level) return [];
    // Seen from afar the names carry the cameras. A camera of its own shows only up close, for a place whose name is not on screen.
    if (view[2] >= data.viewBox[2] * .9) return [];
    if (item.place.kind === "section" && labels.some(l => l.photo && l.id === item.place.id)) return [];
    // A block too small on screen to hold its name holds no camera either: both come back on zooming in.
    const owner = item.place.kind === "section" ? data.blocks.find(candidate => candidate.id === item.place.id) : undefined;
    if (owner && Math.min(owner.box[2], owner.box[3]) * projection.scale < 28) return [];
    if (item.key === cardedPhotoKey) return [];
    const anchor = projection.project(item.point);
    if (anchor[0] < 24 || anchor[0] > size.width - 24 || anchor[1] < 24 || anchor[1] > size.height - 24) return [];
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
    const point = placed ?? (item.place.kind !== "section" && inside(anchor) && !onSelectedTag && offSelected(anchor) ? anchor : null);
    if (!point) return [];
    if (!placed) {
      if (item.place.kind === "section") coveredLabels.add(item.place.id);
      for (const l of labels) if (!l.selected && !fits(point, [[l.x, l.y, l.width, l.height]])) coveredLabels.add(l.id);
    }
    photoOccupied.push([...point, photoTarget, photoTarget]);
    return [{ ...item, anchor, point }];
  });
  const focusable = shown.filter(b => { const p = projection.project(b.center); return p[0] > 0 && p[0] < size.width && p[1] > 0 && p[1] < size.height; });
  const placeField = seatPlaceField(data), fieldKeys = seatFieldKeys(data), placeText = blockInput.trim();
  const formLayout = blockOnlySearch ? "place" : seatHintIsWide(placeField.hint) ? "wide" : "row";
  const fallbackBlocks = searchMiss && !placeText && !blockOnlySearch
    ? nearSeatNumbers(number, data.blocks.filter(item => (searchScope.level === "all" || item.level === searchScope.level) && (searchScope.area === "all" || item.area === searchScope.area)
        && (!searchScope.zone || item.zone === searchScope.zone || data.zones?.find(z => z.id === searchScope.zone)?.blockIds.includes(item.id))),
      item => item.rows.find(line => normalizeSeatInput(line.label) === normalizeSeatInput(row))?.segments.map(({ start, end }) => [start, end] as const) ?? [],
      item => item.label) : [];
  const missMessage = placeText ? `「${placeText}」は見つかりませんでした。地図から選べます。`
    : blockOnlySearch || !number.trim() ? error || `${placeField.label}${blockOnlySearch ? "" : "・列・番号"}を入力してください。`
    : `${seatQueryDescription({ scope: "", row, number })}は見つかりませんでした。${placeField.label}を入れるか、地図から選んでください。`;
  const inputAdvice = error === data.numberLookupNote ? undefined
    : /数字で入力|列欄に|列を空欄にして番号/.test(error) ? error : undefined;
  const finderFeedback = searchMiss || Boolean(error) || matches.length > 0;
  const arenaImage = arenaMaps?.posts.find(post => post.image)?.image;
  const arenaThumb = arenaImage ? arenaImage.src.replace(/([?&]name=)\w+/, "$1thumb") : null;
  const arenaLabel = arenaMaps ? `アリーナ図を見る（${arenaMaps.count}公演）` : "";
  // The newest show's own arena-map photo, so the button reads as "pictures of the arena layout" (left out on a narrow floor).
  const arenaPill = (form: number) => arenaMaps && <span className={styles.arenaPill}>
    {/* eslint-disable-next-line @next/next/no-img-element -- the post's own image on X, shown as posted */}
    {form > 0 ? null : arenaThumb ? <img className={styles.arenaThumb} src={arenaThumb} alt="" width={22} height={22} decoding="async" referrerPolicy="no-referrer" />
      : <MapIcon size={14} aria-hidden="true" />}アリーナ図{form < 2 && <b>{arenaMaps.count}</b>}
  </span>;
  // The still preview is as tall as the drawing plus a little air; a button that always sits in its corner, and the
  // flat unfolded drawing with its own tags, need more. (Decided by the drawing alone, so the map's size never depends on where the button went.)
  const previewRoom = (arenaMaps && !arenaPoint) || data.diagramId === "vantelin-prime-unfolded" ? 76 : 28;
  const selectionCopy = <div className={`${styles.selectionCopy} ${labelRun ? styles.ticketSelectionCopy : ""}`}>{block ? <>
        <span className={styles.selectionMeta}>{selectedLevelLabel}{block.balcony && !selectedLevelLabel.includes("バルコニー") ? "・バルコニー" : ""}<span>{selectedRows}</span></span>
        {/* A searched seat shows its own row and number beside the name, so a name built from another seat ("1列344番周辺") is left out. */}
        <strong>{labelRun ? selectedTitle.split("・").filter(part => !/^\d+列\d+番(周辺)?$/.test(part.trim())).join("・") || selectedTitle : selectedTitle}</strong>
        {labelRun && <span className={styles.ticketSelection}><b className={styles.selectedRow}>{labelRun.row}列</b><b className={styles.selectedSeat} data-selected-seat-number>選択：{normalizeSeatInput(number)}番</b></span>}
      </> : <><strong>{zone ? data.zones?.find(z => z.id === zone)?.label ?? zone : level === "all" ? (overviewArt ? "全体図から区画を選ぶ" : "座席の全体図") : levels.find(l => l.id === level)?.label ?? level}</strong></>}</div>;
  return <DomeSeatFrame className={data.levelViews ? styles.levelControls : undefined} levels={[{ id: "all", label: "すべて" }, ...levels]} level={level} onLevel={id => chooseRegion(id, "all")} photoLegend="map"
    directions={availableAreas} direction={area} onDirection={id => chooseRegion(level, id)} onZoom={zoom} onWhole={reset} shortcuts={[]} simpleMobile={immersive}
    seatView={seatView} seatViewIndex={sheetPhoto}
    directionExtra={<>
      <SeatTicketForm placeLabel={placeField.label} placeHint={placeField.hint} layout={formLayout}
        place={blockInput} row={row} number={number} rowHint={seatRowHint(data, formLayout === "row")} numberHint={data.numberSidePrefixes ? `例：${data.numberSidePrefixes[0]}5` : undefined}
        rowKeys={fieldKeys.row} numberKeys={fieldKeys.number} onPlace={value => { setBlockInput(value); resetFinderFeedback(); }}
        onRow={value => { setRow(value); resetFinderFeedback(); }} onNumber={value => { setNumber(value); resetFinderFeedback(); }} onSubmit={search} /></>}>
    
    <div className={`${styles.selection} ${immersive ? styles.selectionAbove : ""}`} aria-live="polite" aria-label="選んだ座席">
      {selectionCopy}
      {block && <><button type="button" aria-label="選んだ場所を表示" onClick={() => block && move(standDetailCamera(block, data, size))}><Crosshair size={19}/></button>
      <button type="button" aria-label="座席の選択を解除" onClick={clearResult}><X size={19}/></button></>}
    </div>
    <p id={instructionId} className={styles.srOnly}>矢印キーで画面内のブロックを選び、Enterで拡大します。地図をドラッグして移動できます。</p>
    {/* Everything that reacts to a search or a selection sits on the map, so nothing above it grows
        or shrinks and the map never jumps (Tokyo Dome's mapNotice / photoOverlay). */}
    <div className={styles.mapSlot} id={mapLocked ? "venue-seat-photos" : undefined} style={slotHeight ? { height: slotHeight } : undefined}>
    <div ref={frameElement} className={`${styles.mapFrame} ${fullscreen ? styles.immersive : ""}`} data-arena={arenaPlace === "corner" ? "" : undefined}
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
      <div className={`${styles.stage} ${overviewArt ? styles.venueOverview : ""} ${data.zones ? styles.zonedStage : ""} ${data.diagramId === "vantelin-prime-unfolded" ? styles.unfoldedStage : ""} ${immersive ? styles.previewCapable : ""}`} ref={stage} tabIndex={-1} data-testid="stand-seat-map" data-diagram-id={data.diagramId} data-camera={view.map(n => n.toFixed(2)).join(",")} data-selected={selected ?? ""} data-selected-zone={zone ?? ""} data-selected-position={position?.id ?? ""} style={{ touchAction: mapLocked ? "pan-y pinch-zoom" : allowPageScroll ? "pan-y" : "none",
          height: mapLocked ? Math.min(460, Math.round(size.width * overviewBox[3] / overviewBox[2]) + previewRoom) : undefined,
          "--map-ratio": overviewBox[3] / overviewBox[2], "--map-room": `${previewRoom}px` } as React.CSSProperties} data-map-preview={mapLocked ? "" : undefined}
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
            {/* The floor's own caption gives its place to the arena-map button. */}
            {data.contextLabels?.filter(l => !(arenaMaps && l.text === ARENA_CAPTION) && !standRedundantContextText(l.text, block, closestDetail)
              && !(block && standRectTouchesRings(projection.project(l.point).map((n, axis) => axis ? n - 5 : n), [...l.text].reduce((sum, char) => sum + 14 * (char.charCodeAt(0) < 128 ? .6 : 1), 0), 18, selectedScreenRings, 2))
              // A fixed caption that would be cut at the map's left or right edge is left out at this zoom.
              && !(!whole && (() => { const p = projection.project(l.point), w = [...l.text].reduce((sum, char) => sum + 14 * (char.charCodeAt(0) < 128 ? .6 : 1), 0); return p[0] - w / 2 < 2 || p[0] + w / 2 > size.width - 2; })())
              && !(!whole && (() => { const p = projection.project(l.point), w = [...l.text].reduce((sum, char) => sum + 14 * (char.charCodeAt(0) < 128 ? .6 : 1), 0);
                return labels.some(t => t.selected && Math.abs(p[0] - t.x) < (w + t.width) / 2 + 2 && Math.abs(p[1] - 5 - t.y) < (18 + t.height) / 2 + 2); })())
              && !(whole && size.width < 500 && data.diagramId === "vantelin-prime-unfolded")
              && !(whole && (() => { const p = projection.project(l.point), w = [...l.text].reduce((sum, char) => sum + 14 * (char.charCodeAt(0) < 128 ? .6 : 1), 0);
                return buttonBounds.some(r => Math.abs(p[0] - r[0]) < (w + r[2]) / 2 + 2 && Math.abs(p[1] - 5 - r[1]) < (18 + 28) / 2 + 2); })())).map((l, i) => <text key={`context-${i}`} data-context-label={l.text} x={l.point[0]} y={l.point[1]} textAnchor="middle" fill={artOpacity > 0 ? "#405563" : "#a38b98"} fontSize={14 / projection.scale} pointerEvents="none">{l.text}</text>)}
            {blockShapes}
            {overviewArt && <StandOverviewTexture blocks={data.blocks} opacity={selected ? 0 : artOpacity} selected={selected} unit={artUnit}/> }
            
            {rowNeighbours.map(b => <g key={`rows-${b.id}`} data-row-guides={b.id} pointerEvents="none" fill="none" stroke={RULER_INK} strokeOpacity=".3" strokeWidth=".8">
              {b.rows.flatMap((r, ri) => r.segments.map((s, i) => <polyline key={`${ri}-${i}`} points={(s.points ?? [s.a, s.b]).map(p => p.join(",")).join(" ")} vectorEffect="non-scaling-stroke"/>))}
            </g>)}
            {block?.rows.flatMap((r, ri) => r.segments.map((s, i) => <polyline key={`${ri}-${i}`} points={(s.points ?? [s.a, s.b]).map(p => p.join(",")).join(" ")} fill="none" stroke={highlightedRow && normalizeSeatInput(r.label) === highlightedRow ? "#1673ad" : "#fff"} vectorEffect="non-scaling-stroke" strokeOpacity={highlightedRow && normalizeSeatInput(r.label) === highlightedRow ? .95 : .92} strokeWidth={highlightedRow && normalizeSeatInput(r.label) === highlightedRow ? 2.2 : 1} pointerEvents="none"/>))}
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

          {labels.filter(l => l.anchor && !coveredLabels.has(l.id)).map(l => <line key={`label-stem-${l.id}`} x1={l.anchor![0]} y1={l.anchor![1]} x2={l.x} y2={l.y} stroke="#a93164" strokeWidth="1" pointerEvents="none"/>)}
          {labels.filter(l => !coveredLabels.has(l.id)).map(l => <g key={l.id} data-annotation={l.id} data-annotation-kind={l.kind} data-annotation-photo={l.photo ? "" : undefined} transform={`translate(${l.x},${l.y})`} data-block-id={l.selected ? undefined : l.id} className={l.selected ? undefined : `${styles.block} ${wholeNumbers && pulse ? styles.blockPrompt : ""}`} pointerEvents={l.selected || (!whole && l.kind === "block") ? "none" : "all"}>
            <title>{data.blocks.find(b => b.id === l.id)?.label ?? l.text}</title>
            {/* Zoomed in, another block's name is plain text on the map; a block with photos keeps its pill and camera. */}
            {!whole && !l.selected && !l.photo ? null : l.kind === "number" ? <path data-number-badge="" d={seatNumberBadge([0, 0], l.width, l.height, 0)} fill="#fff" stroke={l.selected ? "#81294d" : "#d5c5cd"} strokeWidth={l.selected ? 2 : 1}/>
              : <rect x={-l.width / 2} y={-l.height / 2} width={l.width} height={l.height} rx={l.height / 2} fill="#fff" fillOpacity={l.selected ? 1 : l.photo ? .96 : .94} stroke={l.selected ? "none" : l.photo ? "#d9b3c5" : "#e3cbd6"} strokeWidth={l.photo ? 1 : .8}/>}
            <text textAnchor="middle" x={l.photo ? -7.5 : 0} y={l.selected ? 5 : 4.5} fill={l.selected ? "#522e45" : "#4b2a3a"} fontSize={l.selected ? 14 : 12} fontWeight={l.selected ? 800 : 700}
              {...(!whole && !l.selected && !l.photo ? { stroke: "#fff", strokeWidth: 2.8, paintOrder: "stroke", strokeLinejoin: "round" as const } : {})}
              style={{ fontVariantNumeric: "tabular-nums" }}>{l.text}</text>
            {l.photo && <Camera x={l.width / 2 - 18} y={-6} size={12} color="#a93164" strokeWidth={2.4} aria-hidden="true"/>}
          </g>)}
          {photoDots.map(dot => <g key={`photo-dot-${dot.id}`} data-photo-dot={dot.id} transform={`translate(${dot.x},${dot.y})`} pointerEvents="none">
            <PhotoDot id={dot.id.replace(/[^A-Za-z0-9_-]/g, "_")} count={photoSigns.get(dot.id)?.count ?? 1} thumb={photoSigns.get(dot.id)?.thumb} />
          </g>)}
          {ruler.map(tag => <g key={`row-${tag.key}`} data-row-tag={tag.key}><RowDigit x={tag.x} y={tag.y} text={tag.text} active={tag.active} /></g>)}
          {startNumber && <g data-start-number=""><StartDisc x={startNumber.x} y={startNumber.y} text={startNumber.text} ux={startNumber.ux} uy={startNumber.uy} /></g>}
          {seatMark?.numbers.map(tag => <g key={`run-${tag.key}`} data-row-end={tag.key} transform={`translate(${tag.x},${tag.y})`} pointerEvents="none">
            <rect x={-tag.w / 2} y={-8} width={tag.w} height={16} rx={5} fill="#8a2450"/>
            <text textAnchor="middle" y="3.5" fill="#ffd9e6" fontSize="10" fontWeight="800" style={{ fontVariantNumeric: "tabular-nums" }}>{tag.text}</text>
          </g>)}
          {seatMark && <g data-seat-mark="" pointerEvents="none">
            <circle cx={seatMark.point[0]} cy={seatMark.point[1]} r={seatMark.pill ? 8 : 5} fill="#ef2d62" stroke="#fff" strokeWidth={seatMark.pill ? 3 : 2}/>
            {seatMark.pill && <>
              <line x1={seatMark.point[0]} y1={seatMark.point[1] + (seatMark.tagY < seatMark.point[1] ? -9 : 9)} x2={seatMark.tagX} y2={seatMark.tagY + (seatMark.tagY < seatMark.point[1] ? 14 : -14)} stroke="#ef2d62" strokeWidth="2"/>
              <g transform={`translate(${seatMark.tagX},${seatMark.tagY})`}>
                <rect x={-seatMark.width / 2} y={-14} width={seatMark.width} height={28} rx={14} fill="#ef2d62" stroke="#fff" strokeWidth="2"/>
                <text textAnchor="middle" y="5" fill="#fff" fontSize="13" fontWeight="800" style={{ fontVariantNumeric: "tabular-nums" }}>{seatMark.text}</text>
              </g>
            </>}
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
              <g transform={`translate(${x},${y})`}><PhotoDot id={key.replace(/[^A-Za-z0-9_-]/g, "_")} count={photoSigns.get(key)?.count ?? 1} thumb={photoSigns.get(key)?.thumb} /></g>
            </g>
          </g>)}
          </g>
        </svg>
        {position && <span className={styles.front}>{position.label}付近</span>}
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
        {zoneTags.map(z => { const p = zonePositions.get(z.id)!; return <button type="button" key={z.id} data-zone-id={z.id} aria-label={`${z.label}ブロックを拡大`} className={`${styles.zoneTag} ${pulse ? styles.zonePulse : ""}`} style={{ left: p[0], top: p[1] }} onClick={() => chooseZone(z.id)}><span>{z.label}{photoPlaces.zoneIds.has(z.id) && <Camera size={12} aria-hidden="true"/>}</span></button>; })}
        {areaTags.map(a => { const p = areaPositions.get(a.id)!; return <button type="button" key={a.id} data-area-id={a.id} aria-label={`${a.label}${a.label.endsWith("側") ? "" : "側"}を拡大`} className={`${styles.zoneTag} ${pulse ? styles.zonePulse : ""}`} style={{ left: p[0], top: p[1] }} onClick={() => chooseRegion("all", a.area)}><span>{a.label}{photoPlaces.areaIds.has(a.area) && <Camera size={12} aria-hidden="true"/>}</span></button>; })}
        {levelTags.map(l => { const p = projection.project(l.point), name = <>{l.label}{photoPlaces.levelIds.has(l.id) && <Camera size={12} aria-hidden="true"/>}</>;
          // A level that is a single block stands among the block names: its name is drawn like theirs (the tap area stays 44px).
          return data.wholeBlockLabels ? <button type="button" key={l.id} className={styles.nameTag} data-level-name={l.id} style={{ left: p[0], top: p[1] }} onClick={() => chooseRegion(l.id, "all")}><span>{name}</span></button>
            : <button type="button" key={l.id} className={`${styles.levelTag} ${pulse ? styles.pulse : ""}`} style={{ left: p[0], top: p[1] }} onClick={() => chooseRegion(l.id, "all")}>{name}</button>; })}
        {/* On the arena floor: it opens the shows' arena layouts, from the still map too (its press never reaches the map). */}
        {arenaMaps && arenaSpot && <button type="button" className={styles.arenaSpot} data-arena-maps-button="" style={{ left: arenaSpot.at[0], top: arenaSpot.at[1] }}
          onPointerDown={event => { event.stopPropagation(); suppressMapClick.current = false; }} onClick={() => arenaMaps.open()} aria-label={arenaLabel}>{arenaPill(arenaSpot.form)}</button>}
      </div>
      {finderFeedback && !fullscreen && <div className={styles.mapNotice} data-seat-map-notice="">
        <button type="button" className={styles.noticeClose} aria-label="検索の案内を閉じる" onClick={resetFinderFeedback}><X size={16} aria-hidden="true"/></button>
        {searchMiss && <SeatFinderMiss detail={error} message={missMessage} advice={inputAdvice}
          onReset={immersiveMode || (level === "all" && area === "all" && !zone) ? undefined : reset}
          choices={fallbackBlocks.map(item => ({ id: item.id, label: blockDisplayTitle(item, "") }))}
          choose={id => { const item = data.blocks.find(b => b.id === id); if (item) { setRow(""); setNumber(""); select(item, true); } }} />}
        {error && !searchMiss && <div className={styles.message} role="status">{error}<button type="button" onClick={reset}>条件を解除</button></div>}
        {matches.length > 0 && <section className={styles.searchResults} data-seat-search-results aria-label="座席の検索結果">
          <div className={styles.resultsHeading} role="status">
            <strong>{matches.length}件あります</strong>
            <p>{placeText ? "席に合うものを選んでください。" : `${placeField.label}を入れると1つに絞れます。`}</p>
          </div>
          <ul className={styles.candidateList} aria-label="座席の検索候補">
            {matches.map(b => {
              const levelLabel = seatLevelName(b.level, levels.find(l => l.id === b.level)?.label);
              return <li key={b.id}><button className={styles.candidateButton} type="button" data-seat-candidate={b.id} onClick={() => select(b, true, matchesFromSeat)}>
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
      {arenaMaps && arenaPlace === "corner" && <button type="button" className={styles.arenaMaps} data-arena-maps-button="" onClick={() => arenaMaps.open()} aria-label={arenaLabel}>{arenaPill(0)}</button>}
      {!fullscreen && <div className={`${styles.photoOverlay} ${immersive ? styles.previewCapable : ""}`}>
        {/* Said once a block whose numbers are unconfirmed is chosen, not as a standing note. */}
        {block?.numberLookup === "unavailable" && <p className={styles.coverageNote} data-seat-number-legend><Info size={14} aria-hidden="true" />
          <span role="status">{block.numberReference ? "番号は参考表示です（この区画は未確認）" : "この区画は座席番号が未確認の参考区画です"}</span></p>}
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
    </div>
    {/* Phones: the chosen place is named under the map, so nothing above the map changes height. */}
    {immersive && block && <div className={`${styles.selection} ${styles.selectionBelow}`} aria-label="選んだ座席">
      {selectionCopy}
      <button type="button" aria-label="座席の選択を解除" onClick={() => { reset(); setBlockInput(""); setRow(""); setNumber(""); }}><X size={19}/></button>
    </div>}
    <div className={`${styles.mapActions} ${immersive ? (data.diagramId === "vantelin-prime-unfolded" ? styles.phoneNoWhole : styles.phoneHidden) : ""}`}>{data.diagramId === "vantelin-prime-unfolded" && <span className={styles.primeOrientation}>ツイン：3塁側 L／1塁側 R<br/>ボックス：4F／レストラン：3F</span>}<button type="button" className={styles.whole} onClick={reset}>全体図へ</button></div>
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
