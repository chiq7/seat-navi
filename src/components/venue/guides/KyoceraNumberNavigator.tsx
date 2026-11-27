"use client";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type KeyboardEvent } from "react";
import { Camera, Map as MapIcon } from "lucide-react";
import type { DedicatedVenueGuide } from "@/data/venueGuides/types";
import { projectMapPoint, type Box } from "./mapGeometry";
import { kyoceraMatchesArea, pathBounds, simplifiedRows, type DrawingBlock } from "./kyoceraMapDrawing";
import { arrowOverlapsRect, rectanglesOverlap, type LabelRect, type NumberLabel } from "./kyoceraNumberLabels";
import { afterPaint, SEAT_DRAG_THRESHOLD, seatTapAllowed, spatialSeatTarget } from "@/lib/seatMapInteraction";
import { seatViewPosts } from "@/lib/seatViewPosts";
import { seatViewInlinePhotoUrl } from "@/lib/seatViewPhotoAssets";
import { PHOTO_DOT, PhotoDot, photoDotSpots } from "../template/photoSign";
import gates from "@/data/venueGuides/kyocera-dome/seat-gates.json";
import styles from "./KyoceraNumberNavigator.module.css";
import stand from "../template/StandSeatMap.module.css";
import { useArenaMaps } from "../ArenaMapsSheet";
import { VenueOverviewArt, overviewArtworkOpacity } from "../template/VenueOverviewArt";
import { useSeatMapTouch } from "../template/useSeatMapTouch";
import { useSeatPhotoHitTest } from "../template/useSeatPhotoHitTest";
import { RowDigit, rowDigitSize, rulerPicks, RULER_INK, StartDisc, startDiscBox } from "../template/rowRuler";
import { glideDuration, startGlide, type Glide } from "../template/cameraGlide";


type Props = { guide: DedicatedVenueGuide; blocks: DrawingBlock[]; level: string; selectedCode?: string; rowLabel: string | null;
  box: Box; onView: (box: Box) => void; onBlock: (block: DrawingBlock) => void; onArea: (areaId: string) => void;
  onDirection: (direction: string) => void;
  /** Phones: the still preview in the page. The page scrolls through it and a tap opens the full-screen map. */
  locked?: boolean; onLockedTap?: () => void };
type Contact = { x: number; y: number; startX: number; startY: number; code: string | null };
const photoPosts = new Map(seatViewPosts("kyocera-dome-fixed").filter(post => post.place.kind === "section").map(post => [post.place.id, post]));
/** How many photos each block has, and a small picture of the first one. */
const photoSigns = (() => {
  const signs = new Map<string, { count: number; thumb: string | null }>();
  for (const post of seatViewPosts("kyocera-dome-fixed")) {
    if (post.place.kind !== "section") continue;
    const sign = signs.get(post.place.id) ?? { count: 0, thumb: null };
    sign.count += 1; sign.thumb ??= seatViewInlinePhotoUrl(post)?.replace("name=large", "name=120x120") ?? null;
    signs.set(post.place.id, sign);
  }
  return signs;
})();
/** The canvas before the browser has measured it. */
const UNMEASURED = { width: 640, height: 560 };
/** The middle of the field, clear of the outfield and base-side names: where the arena floor is laid for a show. */
const ARENA_FLOOR = { x: 800, y: 624 };
// Wider than a block view (kyoceraBlockCamera's 230): blocks are thin and a tap may land between them.
const NEAR_MISS_WIDTH = 250;
const outfieldAreas = [{ id: "outfield-right", label: "ライト", x: .65, y: .25 }, { id: "outfield-left", label: "レフト", x: .35, y: .25 }];
const infieldAreas = [{ id: "1塁側-下段", x: .67, y: .53 }, { id: "3塁側-下段", x: .33, y: .53 },
  { id: "1塁側-上段", x: .83, y: .57 }, { id: "3塁側-上段", x: .17, y: .57 }, { id: "中央C-下段", x: .5, y: .76 }];
const sameBox = (a: readonly number[], b: readonly number[]) => a.every((n, i) => Math.abs(n - b[i]) < .01);
/** The block under a point near (x, y): rings of 5, 10 and 15px around a tap that missed every block. */
function nearestBlockCode(x: number, y: number): string | null {
  for (const radius of [5, 10, 15]) for (let step = 0; step < 8; step += 1) {
    const angle = step * Math.PI / 4;
    const hit = document.elementFromPoint(x + radius * Math.cos(angle), y + radius * Math.sin(angle));
    const code = hit instanceof SVGElement ? hit.closest("[data-seat-block]")?.getAttribute("data-seat-block") : null;
    if (code) return code;
  }
  return null;
}

export default function KyoceraNumberNavigator({ guide, blocks, level, selectedCode, rowLabel, box, onView, onBlock, onArea, onDirection, locked = false, onLockedTap }: Props) {
  const frame = useRef<HTMLDivElement>(null);
  const photoHitTest = useSeatPhotoHitTest();
  const lockedRef = useRef(locked);
  useLayoutEffect(() => { lockedRef.current = locked; }, [locked]);
  const suppressMapClick = useSeatMapTouch(frame, lockedRef);
  const arenaMaps = useArenaMaps();
  const svg = useRef<SVGSVGElement>(null);
  const inner = useRef<SVGSVGElement>(null), overlay = useRef<SVGGElement>(null);
  const [focusedCode, setFocusedCode] = useState(blocks[0]?.code);
  const [size, setSize] = useState(UNMEASURED);
  const sizeRef = useRef(size);
  // `view` is the camera the labels are laid out for; `camera` is the live one. Glides, pans, pinches and
  // wheel zooms paint the camera straight onto the SVG and commit once when they end (Tokyo Dome's
  // paintBox/commitBox, as StandSeatMap): laying out every label on each frame made the map stutter.
  const [view, setView] = useState<Box>(box);
  const camera = useRef<Box>(box), renderedView = useRef<Box>(box);
  const moving = useRef(false), glide = useRef<Glide | null>(null), wheelCommit = useRef<number | null>(null);
  const footprints = useMemo(() => blocks.map(b => ({ id: b.code, path: b.path, level: b.tier })), [blocks]);
  // Source outlines and unselected row geometry are constant while the camera moves.
  const geometry = useMemo(() => new Map(blocks.map(b => [b.code, {
    bounds: pathBounds([b.path])!, drawing: simplifiedRows(b),
  }])), [blocks]);
  const selectedDrawing = useMemo(() => {
    const selected = blocks.find(b => b.code === selectedCode);
    return selected ? simplifiedRows(selected, rowLabel) : null;
  }, [blocks, selectedCode, rowLabel]);
  const artOpacity = overviewArtworkOpacity(view[2], 1600, 550);
  const contacts = useRef(new Map<number, Contact>());
  const gesture = useRef<{ box: Box; x: number; y: number; distance: number } | null>(null);
  const moved = useRef(false);
  const [tapHint, setTapHint] = useState<"pending" | "active" | "done">("pending");
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      const next = { width: entry.contentRect.width, height: entry.contentRect.height };
      if (next.width > 0 && next.height > 0) { sizeRef.current = next; setSize(next); }
    });
    if (svg.current) observer.observe(svg.current); return () => observer.disconnect();
  }, []);
  // A glide draws the map once and moves that picture (cameraGlide): `camera` is then the view on screen,
  // `draw` the view the map is drawn for. Pans, pinches and wheel zooms paint each view they pass.
  const cameraMark = (next: Box) => frame.current?.setAttribute("data-camera", next.map(n => n.toFixed(2)).join(" "));
  function paint(next: Box) { camera.current = next; draw(next); cameraMark(next); }
  function draw(next: Box) {
    const { width, height } = sizeRef.current;
    inner.current?.setAttribute("viewBox", next.join(" "));
    // Screen-space labels follow the moving camera with one transform until the commit.
    const from = projectMapPoint(0, 0, renderedView.current, width, height), to = projectMapPoint(0, 0, next, width, height);
    const ratio = to.scale / from.scale;
    overlay.current?.setAttribute("transform", `translate(${to.x - from.x * ratio} ${to.y - from.y * ratio}) scale(${ratio})`);
    if (!moving.current) { moving.current = true; frame.current?.setAttribute("data-moving", ""); }
  }
  /** Lays the labels out for the live camera. A camera the user moved is also handed to the seat map. */
  function commit(fromUser: boolean) {
    if (wheelCommit.current !== null) { clearTimeout(wheelCommit.current); wheelCommit.current = null; }
    if (!moving.current) return;
    moving.current = false;
    frame.current?.removeAttribute("data-moving");
    const next = [...camera.current] as Box;
    setView(next);
    if (fromUser) onView(next);
  }
  /** Ends a glide where it is: the view it had reached is painted. */
  function cancelGlide() { if (!glide.current) return; glide.current.stop(); glide.current = null; paint(camera.current); }
  // A new camera from the seat map (block, side, level, zoom buttons) glides there; reduced motion jumps.
  useEffect(() => {
    if (sameBox(box, camera.current)) { if (!moving.current) setView(current => sameBox(current, box) ? current : box); return; }
    cancelGlide();
    const target = [...box] as Box, layer = svg.current;
    if (!layer || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { paint(target); commit(false); return; }
    const from = [...camera.current] as Box;
    glide.current = startGlide(layer, { from, to: target, size: sizeRef.current, duration: glideDuration(from[2], target[2]),
      draw: next => draw(next as Box), track: next => { camera.current = next as Box; cameraMark(camera.current); },
      done: () => { glide.current = null; paint(target); commit(false); } });
    return cancelGlide;
    // paint/commit only touch refs and stable setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [box]);
  useLayoutEffect(() => {
    renderedView.current = view;
    // Labels were just laid out for this camera; a glide or gesture still in progress re-derives its offset.
    if (moving.current) draw(glide.current ? glide.current.drawn as Box : camera.current);
    else { camera.current = view; overlay.current?.removeAttribute("transform"); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, size]);
  useLayoutEffect(() => { for (const pressed of frame.current?.querySelectorAll("[data-pressed]") ?? []) pressed.removeAttribute("data-pressed"); }, [selectedCode]);
  const project = (x: number, y: number) => projectMapPoint(x, y, view, size.width, size.height);
  /** How far apart two rows of a block are drawn, in map units (0 for a block drawn with one row). */
  const rowGap = (block: DrawingBlock) => { const rows = geometry.get(block.code)!.drawing.rows; return rows.length < 2 ? 0 : Math.hypot(rows[1].from.x - rows[0].from.x, rows[1].from.y - rows[0].from.y); };
  const origin = project(0, 0), scale = origin.scale;

  const overview = Math.max(view[2], view[3]) > 950;
  // The arena-map button stands on the field while that spot is on screen (as on the stand maps).
  const arenaAt = project(ARENA_FLOOR.x, ARENA_FLOOR.y), arenaWidth = 107 + String(arenaMaps?.count ?? 0).length * 7;
  const arenaShown = Boolean(arenaMaps) && size !== UNMEASURED && arenaAt.x >= arenaWidth / 2 + 6 && arenaAt.x <= size.width - arenaWidth / 2 - 6 && arenaAt.y >= 22 && arenaAt.y <= size.height - 22;
  const arenaImage = arenaMaps?.posts.find(post => post.image)?.image;
  const areaScale = Math.max(view[2], view[3]) > 550;
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
  function start(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const control = (event.target as Element).closest("button");
    if (!control && !lockedRef.current && (event.pointerType !== "touch" || camera.current[2] < 1584)) event.preventDefault();
    cancelGlide(); // Freeze an in-progress glide at the touched position; it is committed when the touch ends.
    const rect = event.currentTarget.getBoundingClientRect();
    const target = (event.target as Element).closest("[data-seat-block], [data-block-start], [data-seat-photo-marker]");
    const marker = target?.getAttribute("data-seat-photo-marker");
    // Zoomed out, a finger often lands in the gap between thin blocks: that tap goes to the nearest block.
    const code = marker?.slice("section:".length)
      ?? target?.getAttribute("data-seat-block") ?? target?.getAttribute("data-block-start")
      ?? (!control && camera.current[2] > NEAR_MISS_WIDTH ? nearestBlockCode(event.clientX, event.clientY) : null);
    contacts.current.set(event.pointerId, { x: event.clientX - rect.left, y: event.clientY - rect.top, startX: event.clientX - rect.left, startY: event.clientY - rect.top, code });
    if (!control && !lockedRef.current) event.currentTarget.setPointerCapture(event.pointerId);
    suppressMapClick.current = contacts.current.size > 1;
    const c = centre(); gesture.current = { box: camera.current, ...c }; moved.current = contacts.current.size !== 1;
  }
  function move(event: ReactPointerEvent<HTMLDivElement>) {
    if (!contacts.current.has(event.pointerId) || !gesture.current) return;
    const rect = event.currentTarget.getBoundingClientRect(), previous = contacts.current.get(event.pointerId)!;
    contacts.current.set(event.pointerId, { ...previous, x: event.clientX - rect.left, y: event.clientY - rect.top });
    const c = centre(), initial = gesture.current;
    if (Math.hypot(event.clientX - rect.left - previous.startX, event.clientY - rect.top - previous.startY) > SEAT_DRAG_THRESHOLD || contacts.current.size > 1) moved.current = true;
    if (!moved.current || lockedRef.current || (event.pointerType === "touch" && contacts.current.size === 1 && initial.box[2] >= 1584)) return;
    suppressMapClick.current = true;
    const ratio = contacts.current.size > 1 && initial.distance ? initial.distance / Math.max(c.distance, 1) : 1;
    const width = Math.max(60, Math.min(1600, initial.box[2] * ratio)), height = width * initial.box[3] / initial.box[2];
    const p = projectMapPoint(0, 0, initial.box, size.width, size.height);
    const sourceX = (initial.x - p.x) / p.scale, sourceY = (initial.y - p.y) / p.scale;
    const nextScale = Math.min(size.width / width, size.height / height);
    const left = sourceX - (c.x - (size.width - width * nextScale) / 2) / nextScale;
    const top = sourceY - (c.y - (size.height - height * nextScale) / 2) / nextScale;
    paint([Math.max(-width / 2, Math.min(1600 - width / 2, left)), Math.max(-height / 2, Math.min(1600 - height / 2, top)), width, height]);
  }
  function cancel() {
    const ids = [...contacts.current.keys()];
    contacts.current.clear(); gesture.current = null; moved.current = true;
    suppressMapClick.current = true;
    for (const id of ids) if (frame.current?.hasPointerCapture(id)) frame.current.releasePointerCapture(id);
    commit(true);
  }
  function end(event: ReactPointerEvent<HTMLDivElement>) {
    const contact = contacts.current.get(event.pointerId);
    if (!contact) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const travel = Math.hypot(event.clientX - rect.left - contact.startX, event.clientY - rect.top - contact.startY);
    const tap = contacts.current.size === 1 && seatTapAllowed(travel, moved.current);
    suppressMapClick.current ||= !tap;
    contacts.current.delete(event.pointerId);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (contacts.current.size) { gesture.current = { box: camera.current, ...centre() }; moved.current = true; return; }
    gesture.current = null;
    commit(true);
    // The still map on a phone is a door, not a picker: a tap opens the whole map, wherever the finger landed.
    if (tap && lockedRef.current) { suppressMapClick.current = true; onLockedTap?.(); return; }
    const block = tap && contact.code ? blocks.find(b => b.code === contact.code) : undefined;
    // The block takes its colour the moment it is touched; the rest of the screen follows.
    if (block) { frame.current?.querySelector(`[data-seat-block="${block.code}"] path`)?.setAttribute("data-pressed", ""); afterPaint(() => { setFocusedCode(block.code); onBlock(block); }); }
  }
  useEffect(() => {
    const el = svg.current!;
    const wheel = (event: WheelEvent) => {
      if ((!event.ctrlKey && !event.metaKey) || lockedRef.current) return;
      // Wheel zoom follows the hand and commits once it pauses (not on every wheel event).
      event.preventDefault(); setTapHint("done"); cancelGlide();
      const current = camera.current, rect = el.getBoundingClientRect(), { width: w, height: h } = sizeRef.current;
      const p = projectMapPoint(0, 0, current, w, h);
      const x = event.clientX - rect.left, y = event.clientY - rect.top;
      const width = Math.max(60, Math.min(1600, current[2] * Math.exp(Math.max(-100, Math.min(100, event.deltaY)) * .004)));
      const height = current[3] * width / current[2], nextScale = Math.min(w / width, h / height);
      paint([(x - p.x) / p.scale - (x - (w - width * nextScale) / 2) / nextScale,
        (y - p.y) / p.scale - (y - (h - height * nextScale) / 2) / nextScale, width, height]);
      if (wheelCommit.current !== null) clearTimeout(wheelCommit.current);
      wheelCommit.current = window.setTimeout(() => { wheelCommit.current = null; commit(true); }, 160);
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
    // Camera and size are read from refs so wheel never uses a stale frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const reset = () => { contacts.current.clear(); gesture.current = null; moved.current = true; commit(true); };
    window.addEventListener("blur", reset); document.addEventListener("visibilitychange", reset);
    return () => { window.removeEventListener("blur", reset); document.removeEventListener("visibilitychange", reset); cancelGlide(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const annotations: { rect: LabelRect; from?: NumberLabel["from"]; to?: NumberLabel["to"] }[] = [];
  const visible = blocks.filter(block => { const b = geometry.get(block.code)!.bounds; const a = project(b.left, b.top), z = project(b.right, b.bottom); return z.x >= 0 && a.x <= size.width && z.y >= 0 && a.y <= size.height; });
  const selectedBlock = visible.find(b => b.code === selectedCode);
  function available(x: number, y: number, width: number, height: number) {
    const rect = { x, y, width, height };
    if (x < width / 2 + 4 || x > size.width - width / 2 - 4 || y < height / 2 + 4 || y > size.height - height / 2 - 4 || annotations.some(p => rectanglesOverlap(p.rect, rect, 4) || (p.from && p.to && arrowOverlapsRect(p.from, p.to, rect, 4)))) return false;
    annotations.push({ rect }); return true;
  }
  // The chosen block: one round mark where its numbers start (just outside that edge, its arrow the way they count up)
  // and row numbers beside the block like the marks of a ruler, on the side the numbers run toward. No boxes, no
  // leader lines. Every other block keeps its plain name (its start number); its rows are lines to count.
  const onCanvas = (rect: LabelRect) => rect.x - rect.width / 2 >= 2 && rect.x + rect.width / 2 <= size.width - 2 && rect.y - rect.height / 2 >= 2 && rect.y + rect.height / 2 <= size.height - 2;
  const liesOnBlock = (block: DrawingBlock, x: number, y: number) => photoHitTest([block.path], { x: (x - origin.x) / scale, y: (y - origin.y) / scale });
  const marks = detail && selectedBlock && selectedDrawing ? (() => {
    const low = project(selectedDrawing.low.x, selectedDrawing.low.y), high = project(selectedDrawing.high.x, selectedDrawing.high.y);
    const length = Math.hypot(high.x - low.x, high.y - low.y), ux = length ? (high.x - low.x) / length : 1, uy = length ? (high.y - low.y) / length : 0;
    const at = { x: low.x - ux * 12, y: low.y - uy * 12 }, discBox = startDiscBox(at.x, at.y, ux, uy);
    const disc = onCanvas(discBox) ? { ...at, ux, uy, text: String(selectedDrawing.seatStart) } : null;
    if (disc) annotations.push({ rect: discBox });
    const digits: { row: string; x: number; y: number; active: boolean }[] = [];
    if (selectedBlock.rowLabelIsPrinted) {
      const rows = selectedDrawing.rows, picks = rulerPicks(rows.map(row => row.row), rowLabel).map(index => rows[index])
        .sort((a, b) => Number(b.selected) - Number(a.selected));
      for (const row of picks) {
        const a = project(row.from.x, row.from.y), b = project(row.to.x, row.to.y);
        const [near, far] = (b.x - a.x) * ux + (b.y - a.y) * uy >= 0 ? [a, b] : [b, a];
        const span = Math.hypot(far.x - near.x, far.y - near.y) || 1, bx = (near.x - far.x) / span, by = (near.y - far.y) / span;
        // the row is drawn past the block: step back to where it really leaves the block
        let back = 0;
        while (back < span && !liesOnBlock(selectedBlock, far.x + bx * back, far.y + by * back)) back += 1.5;
        if (back >= span) continue;
        const size = rowDigitSize(row.row, row.selected), out = (row.selected ? size.width / 2 + 4 : 9) - back;
        const rect = { x: far.x - bx * out, y: far.y - by * out, width: size.width, height: size.height };
        if (!onCanvas(rect) || annotations.some(other => rectanglesOverlap(rect, other.rect, 1))) continue;
        annotations.push({ rect }); digits.push({ row: row.row, x: rect.x, y: rect.y, active: row.selected });
      }
    }
    return { disc, digits };
  })() : null;
  const blockLabels = overview ? [] : [...visible].sort((a, b) => {
    const p = geometry.get(a.code)!.bounds, q = geometry.get(b.code)!.bounds;
    return (q.right - q.left) * (q.bottom - q.top) - (p.right - p.left) * (p.bottom - p.top);
  }).flatMap(block => {
    if (level !== "すべて" && block.tier !== level && block.code !== selectedCode) return [];
    if (marks && block.code === selectedCode) return [];
    const bounds = geometry.get(block.code)!.bounds, a = project(bounds.left, bounds.top), z = project(bounds.right, bounds.bottom);
    const p = project(block.x, block.y), drawing = geometry.get(block.code)!.drawing;
    const text = `${block.label.startsWith("中央") ? `${block.label.replace("中央", "")} ` : ""}${drawing.seatStart}番〜`;
    const units = [...text].reduce((sum, char) => sum + (/\d|[A-Z]/.test(char) ? .7 : char === " " ? .35 : 1), 0);
    const fontSize = 12;
    if (z.y - a.y < 18 || z.x - a.x < 18) return [];
    const rect = { x: p.x, y: p.y, width: units * fontSize, height: fontSize * 1.4 };
    if (!onCanvas(rect) || annotations.some(label => rectanglesOverlap(rect, label.rect, 2))) return [];
    annotations.push({ rect });
    return [{ block, drawing, p, text, fontSize, rect }];
  });
  // A block with photos shows its own photo, small and round: on the block itself, just behind the name (away from
  // the arena), else just in front of it. Where neither spot is on the block and free it is left out, and comes
  // back on zooming in. The name never moves for it.
  const photoDots = overview ? [] : visible.filter(block => photoPosts.has(block.code) && block.code !== selectedCode && (level === "すべて" || block.tier === level)).flatMap(block => {
    const p = project(block.x, block.y), floor = project(ARENA_FLOOR.x, ARENA_FLOOR.y);
    const length = Math.hypot(p.x - floor.x, p.y - floor.y) || 1, ux = (p.x - floor.x) / length, uy = (p.y - floor.y) / length;
    const name = blockLabels.find(label => label.block.code === block.code)?.rect ?? null;
    for (const [dx, dy] of name ? photoDotSpots(name.width, name.height, ux, uy) : [[0, 0]]) {
      const rect = { x: p.x + dx, y: p.y + dy, width: PHOTO_DOT, height: PHOTO_DOT };
      if (!onCanvas(rect) || !liesOnBlock(block, rect.x, rect.y)) continue;
      if (annotations.some(other => other.rect !== name && rectanglesOverlap(rect, other.rect, 1))) continue;
      annotations.push({ rect });
      return [{ block, x: rect.x, y: rect.y }];
    }
    return [];
  });
  // Rows are lines once they stand far enough apart on the screen to be counted (the chosen block's always, close in).
  const rowBlocks = overview ? [] : visible.filter(block => {
    if (block.code === selectedCode) return detail || rowGap(block) * scale >= 3.6;
    return (level === "すべて" || block.tier === level) && rowGap(block) * scale >= 3.6;
  });
  const gateLabels = gates.gates.filter(g => !overview || [1, 5, 9, 12].includes(g.number)).flatMap(gate => {
    const point = project(gate.x, gate.y);
    return available(point.x, point.y, 64, 24) ? [{ gate, point }] : [];
  });
  const visibleInfield = infieldAreas.filter(area => level === "すべて" || area.id.endsWith(level));
  // The area names of the whole venue: which of them hold at least one photo (in the level being shown).
  const whole = guide.seatMap!.viewBox;
  const areaPhotos = (direction: string, tier = level) => blocks.some(block => photoPosts.has(block.code) && kyoceraMatchesArea(block, whole, direction, tier));
  const focusCode = visible.some(b => b.code === focusedCode) ? focusedCode : selectedBlock?.code ?? visible[0]?.code;
  function keyBlock(event: KeyboardEvent<SVGGElement>, block: DrawingBlock) {
    if (["Enter", " "].includes(event.key)) { event.preventDefault(); onBlock(block); return; }
    const target = spatialSeatTarget(visible.map(b => ({ id: b.code, ...project(b.x, b.y) })), block.code, event.key);
    if (!target) return;
    event.preventDefault(); setFocusedCode(target.id);
    frame.current?.querySelector<SVGGElement>(`[data-seat-block="${target.id}"]`)?.focus({ preventScroll: true });
  }
  return <>
    <div ref={frame} className={styles.canvas} data-testid="kyocera-seat-map" data-selected={selectedCode ?? ""} data-camera={view.join(" ")} data-map-mode="unified" data-number-badge-version="connected-v2" data-map-stage={overview ? "overview" : detail ? "detail" : "blocks"}
    style={{ touchAction: locked ? "pan-y pinch-zoom" : view[2] >= 1584 ? "pan-y" : "none" }} data-map-preview={locked ? "" : undefined}
    onPointerDownCapture={() => setTapHint("done")} onKeyDownCapture={() => setTapHint("done")}
    onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={cancel}
    onLostPointerCapture={event => { if (contacts.current.has(event.pointerId)) cancel(); }}
    onPointerLeave={event => { if (contacts.current.has(event.pointerId) && !event.currentTarget.hasPointerCapture(event.pointerId)) cancel(); }}
    onClickCapture={event => { if (suppressMapClick.current && event.detail !== 0) { event.preventDefault(); event.stopPropagation(); } }}>
    <svg ref={svg} viewBox={`0 0 ${size.width} ${size.height}`} role="group" aria-label={`${guide.name}の座席表`}>
      {/* Source-space layer: a moving camera repaints only this viewBox (same fit as projectMapPoint). */}
      <svg ref={inner} width={size.width} height={size.height} viewBox={view.join(" ")}>
      <defs>
        {visible.map(b => <clipPath id={`seat-clip-${b.code}`} key={b.code}><path d={b.path} /></clipPath>)}
      </defs>
      <g>
        <VenueOverviewArt diagramId="kyocera-seat-original" blocks={footprints} opacity={artOpacity} unit={16}/>
        {blocks.map(block => <g key={block.code} data-seat-block={block.code} data-source-block={block.sourceCode} data-area-id={block.areaId} role="button" tabIndex={block.code === focusCode ? 0 : -1} onFocus={() => setFocusedCode(block.code)}
          aria-label={`${block.label}・${block.tier} ${block.rowLabelIsPrinted ? `${block.rowLabel}列` : "列の印字なし（公式検索：0列）"} ${block.firstSeat}〜${block.lastSeat}番${photoPosts.has(block.code) ? "・写真あり" : ""}`} aria-pressed={block.code === selectedCode}
          onKeyDown={event => keyBlock(event, block)}>
          <path d={block.path} fill={block.code === selectedCode ? "#ac2e66" : block.special ? "#eadac1" : block.tier === "上段" ? "#c1b4da" : "#ebbad0"}
            opacity={level !== "すべて" && block.tier !== level && block.code !== selectedCode ? .2 : 1} stroke={block.code === selectedCode ? "#5d263f" : "white"}
            strokeWidth={block.code === selectedCode ? 2.5 : .6} vectorEffect="non-scaling-stroke" />
          <title>{`${block.label}・${block.tier} ／ ${block.rowLabelIsPrinted ? `${block.rowLabel}列` : "列の印字なし（検索：0列）"} ／ ${block.firstSeat}〜${block.lastSeat}番`}</title>
        </g>)}
        
        {rowBlocks.map(block => { const own = block.code === selectedCode; return <g key={`rows:${block.code}`} clipPath={`url(#seat-clip-${block.code})`} pointerEvents="none" data-row-guides={block.code}>
          {(own && selectedDrawing ? selectedDrawing : geometry.get(block.code)!.drawing).rows.map(row => <line key={row.row} data-row-line={row.row} x1={row.from.x} y1={row.from.y} x2={row.to.x} y2={row.to.y}
            stroke={row.selected ? "#1673ad" : own ? "#fff" : RULER_INK} strokeWidth={row.selected ? 2 : own ? 1 : .8} vectorEffect="non-scaling-stroke" opacity={row.selected ? 1 : own ? .92 : .3} />)}
        </g>; })}
      </g>
      </svg>
      {/* Screen-space layer: follows a moving camera with one transform until the commit (see paint). */}
      <g ref={overlay}>
      <g pointerEvents="none" className={styles.numbers}>
        {blockLabels.map(({ block, drawing, p, text, fontSize }) => <text key={block.code} data-block-start={block.code} data-start-number={drawing.seatStart} x={p.x} y={p.y} dominantBaseline="central" textAnchor="middle" fontSize={fontSize}
          fill={block.code === selectedCode ? "#fff" : "#672442"} stroke={block.code === selectedCode ? "#ac2e66" : "#fff"} strokeWidth="2.5" paintOrder="stroke" strokeLinejoin="round" pointerEvents="all" style={{ cursor: "pointer" }} aria-hidden="true">{text}</text>)}
        {photoDots.map(({ block, x, y }) => <g key={`photo:${block.code}`} data-photo-dot={block.code} transform={`translate(${x} ${y})`} pointerEvents="all" style={{ cursor: "pointer" }} aria-hidden="true">
          <PhotoDot id={block.code} count={photoSigns.get(block.code)?.count ?? 1} thumb={photoSigns.get(block.code)?.thumb} />
        </g>)}
        {marks?.disc && selectedDrawing && <g data-number-guide={selectedCode} data-reference-row={selectedDrawing.referenceRow} data-start-number={selectedDrawing.seatStart}>
          <StartDisc x={marks.disc.x} y={marks.disc.y} text={marks.disc.text} ux={marks.disc.ux} uy={marks.disc.uy} />
        </g>}
        {marks?.digits.map(digit => <RowDigit key={digit.row} x={digit.x} y={digit.y} text={digit.row} active={digit.active} />)}
        {gateLabels.map(({ gate, point: p }) => <g key={gate.id} data-seat-gate={gate.number}><rect x={p.x - 32} y={p.y - 12} width="64" height="24" rx="12" fill="#514452" /><text x={p.x} y={p.y + 4} fill="white" textAnchor="middle" fontSize="12">GATE {gate.number}</text></g>)}
      </g>
      </g>
    </svg>
    {overview && <div className={styles.areaLabels} aria-label="座席エリアから拡大する" data-tap-hint={tapHint} onAnimationEnd={() => setTapHint("done")}>
      {outfieldAreas.map(area => {
        const p = project(area.x * 1600, area.y * 1600);
        return p.x >= 36 && p.x <= size.width - 36 && p.y >= 24 && p.y <= size.height - 24 ? <button key={area.id} type="button" className={styles.outfieldLabel} data-map-direction={area.id} aria-label={`外野${area.label}`} style={{ left: p.x, top: p.y }} onClick={() => onDirection(area.id)}>外野<small>{area.label}{areaPhotos(area.id) && <Camera size={12} aria-hidden="true" />}</small></button> : null;
      })}
      {visibleInfield.map(area => { const p = project(area.x * 1600, area.y * 1600); const seat = guide.seats.find(a => a.id === area.id)!;
          return p.x >= 30 && p.x <= size.width - 30 && p.y >= 24 && p.y <= size.height - 24 ? <button key={area.id} type="button" style={{ left: p.x, top: p.y }} onClick={() => onArea(area.id)}>{seat.label.startsWith("中央") ? "中央" : seat.label}<small>{seat.type}{areaPhotos(seat.label === "1塁側" ? "first" : seat.label === "3塁側" ? "third" : "home", seat.type) && <Camera size={12} aria-hidden="true" />}</small></button> : null; })}
    </div>}
    {/* On the field: it opens the shows' arena layouts, from the still map too (its press never reaches the map). */}
    {arenaMaps && arenaShown && <button type="button" className={styles.arenaSpot} data-arena-maps-button="" style={{ left: arenaAt.x, top: arenaAt.y }}
      onPointerDown={event => { event.stopPropagation(); suppressMapClick.current = false; }} onClick={() => arenaMaps.open()} aria-label={`アリーナ図を見る（${arenaMaps.count}公演）`}>
      <span className={stand.arenaPill}>
        {/* eslint-disable-next-line @next/next/no-img-element -- the post's own image on X, shown as posted */}
        {arenaImage ? <img className={stand.arenaThumb} src={arenaImage.src.replace(/([?&]name=)\w+/, "$1thumb")} alt="" width={22} height={22} decoding="async" referrerPolicy="no-referrer" />
          : <MapIcon size={14} aria-hidden="true" />}アリーナ図<b>{arenaMaps.count}</b>
      </span>
    </button>}
    </div>
  </>;
}
