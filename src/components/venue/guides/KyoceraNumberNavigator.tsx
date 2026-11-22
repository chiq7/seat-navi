"use client";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type KeyboardEvent } from "react";
import type { DedicatedVenueGuide } from "@/data/venueGuides/types";
import { projectMapPoint, type Box } from "./mapGeometry";
import { pathBounds, simplifiedRows, type DrawingBlock } from "./kyoceraMapDrawing";
import { arrowOverlapsRect, clearNumberArrow, compactNeighbourNumber, prioritizeSelectedNumberArrow, numberAnchorVisible, placeNumberLabel, rectanglesOverlap, type LabelRect, type NumberLabel } from "./kyoceraNumberLabels";
import { SEAT_DRAG_THRESHOLD, seatTapAllowed, spatialSeatTarget } from "@/lib/seatMapInteraction";
import { seatNumberBadge, seatNumberBadgeBounds, seatNumberArrowInk } from "@/lib/seatNumberBadge";
import { seatViewPosts } from "@/lib/seatViewPosts";
import gates from "@/data/venueGuides/kyocera-dome/seat-gates.json";
import styles from "./KyoceraNumberNavigator.module.css";
import { VenueOverviewArt, overviewArtworkOpacity } from "../template/VenueOverviewArt";
import { useSeatMapTouch } from "../template/useSeatMapTouch";
import { SEAT_PHOTO_MAP_COLOR, SeatPhotoMarker } from "../template/SeatViewPosts";
import { seatPhotoOffsets, useSeatPhotoHitTest } from "../template/useSeatPhotoHitTest";


type Props = { guide: DedicatedVenueGuide; blocks: DrawingBlock[]; level: string; selectedCode?: string; rowLabel: string | null;
  box: Box; onView: (box: Box) => void; onBlock: (block: DrawingBlock) => void; onArea: (areaId: string) => void;
  onDirection: (direction: string) => void;
  /** The block whose photo card is shown on the map: its own camera mark gives way to the card. */
  cardedCode?: string };
type Contact = { x: number; y: number; startX: number; startY: number; code: string | null };
const photoPosts = new Map(seatViewPosts("kyocera-dome-fixed").filter(post => post.place.kind === "section").map(post => [post.place.id, post]));
const photoTarget = 28;
// Wider than a block view (kyoceraBlockCamera's 230): blocks are thin and a tap may land between them.
const NEAR_MISS_WIDTH = 250;
const outfieldAreas = [{ id: "outfield-right", label: "ライト", x: .65, y: .25 }, { id: "outfield-left", label: "レフト", x: .35, y: .25 }];
const infieldAreas = [{ id: "1塁側-下段", x: .67, y: .53 }, { id: "3塁側-下段", x: .33, y: .53 },
  { id: "1塁側-上段", x: .83, y: .57 }, { id: "3塁側-上段", x: .17, y: .57 }, { id: "中央C-下段", x: .5, y: .76 }];
/** Tokyo Dome's glide (as StandSeatMap): zoom changes evenly in scale, eased in and out, longer the further it goes. */
function glideDuration(fromWidth: number, toWidth: number) {
  return Math.round(Math.min(900, 420 + 170 * Math.abs(Math.log(toWidth / fromWidth))));
}
function glideFrame(from: Box, to: Box, progress: number): Box {
  const eased = progress < .5 ? 4 * progress ** 3 : 1 - Math.pow(-2 * progress + 2, 3) / 2;
  const width = from[2] * Math.pow(to[2] / from[2], eased), height = from[3] * Math.pow(to[3] / from[3], eased);
  const cx = from[0] + from[2] / 2 + (to[0] + to[2] / 2 - from[0] - from[2] / 2) * eased;
  const cy = from[1] + from[3] / 2 + (to[1] + to[3] / 2 - from[1] - from[3] / 2) * eased;
  return [cx - width / 2, cy - height / 2, width, height];
}
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

export default function KyoceraNumberNavigator({ guide, blocks, level, selectedCode, rowLabel, box, onView, onBlock, onArea, onDirection, cardedCode }: Props) {
  const frame = useRef<HTMLDivElement>(null);
  const photoHitTest = useSeatPhotoHitTest();
  const suppressMapClick = useSeatMapTouch(frame);
  const svg = useRef<SVGSVGElement>(null);
  const inner = useRef<SVGSVGElement>(null), overlay = useRef<SVGGElement>(null);
  const [focusedCode, setFocusedCode] = useState(blocks[0]?.code);
  const [size, setSize] = useState({ width: 640, height: 560 });
  const sizeRef = useRef(size);
  // `view` is the camera the labels are laid out for; `camera` is the live one. Glides, pans, pinches and
  // wheel zooms paint the camera straight onto the SVG and commit once when they end (Tokyo Dome's
  // paintBox/commitBox, as StandSeatMap): laying out every label on each frame made the map stutter.
  const [view, setView] = useState<Box>(box);
  const camera = useRef<Box>(box), renderedView = useRef<Box>(box);
  const moving = useRef(false), glide = useRef<number | null>(null), wheelCommit = useRef<number | null>(null);
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
  function paint(next: Box) {
    camera.current = next;
    const { width, height } = sizeRef.current;
    inner.current?.setAttribute("viewBox", next.join(" "));
    // Screen-space labels follow the moving camera with one transform until the commit.
    const from = projectMapPoint(0, 0, renderedView.current, width, height), to = projectMapPoint(0, 0, next, width, height);
    const ratio = to.scale / from.scale;
    overlay.current?.setAttribute("transform", `translate(${to.x - from.x * ratio} ${to.y - from.y * ratio}) scale(${ratio})`);
    frame.current?.setAttribute("data-camera", next.map(n => n.toFixed(2)).join(" "));
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
  function cancelGlide() { if (glide.current !== null) cancelAnimationFrame(glide.current); glide.current = null; }
  // A new camera from the seat map (block, side, level, zoom buttons) glides there; reduced motion jumps.
  useEffect(() => {
    if (sameBox(box, camera.current)) { if (!moving.current) setView(current => sameBox(current, box) ? current : box); return; }
    cancelGlide();
    const target = [...box] as Box;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { paint(target); commit(false); return; }
    const from = [...camera.current] as Box, duration = glideDuration(from[2], target[2]);
    let started: number | null = null;
    function tick(now: number) {
      started ??= now;
      const progress = Math.min(1, (now - started) / duration);
      paint(progress < 1 ? glideFrame(from, target, progress) : target);
      if (progress < 1) glide.current = requestAnimationFrame(tick); else { glide.current = null; commit(false); }
    }
    glide.current = requestAnimationFrame(tick);
    return cancelGlide;
    // paint/commit only touch refs and stable setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [box]);
  useLayoutEffect(() => {
    renderedView.current = view;
    // Labels were just laid out for this camera; a glide or gesture still in progress re-derives its offset.
    if (moving.current) paint(camera.current);
    else { camera.current = view; overlay.current?.removeAttribute("transform"); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, size]);
  const project = (x: number, y: number) => projectMapPoint(x, y, view, size.width, size.height);
  const origin = project(0, 0), scale = origin.scale;

  const overview = Math.max(view[2], view[3]) > 950;
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
    if (!control && (event.pointerType !== "touch" || camera.current[2] < 1584)) event.preventDefault();
    cancelGlide(); // Freeze an in-progress glide at the touched position; it is committed when the touch ends.
    const rect = event.currentTarget.getBoundingClientRect();
    const target = (event.target as Element).closest("[data-seat-block], [data-block-start], [data-seat-photo-marker]");
    const marker = target?.getAttribute("data-seat-photo-marker");
    // Zoomed out, a finger often lands in the gap between thin blocks: that tap goes to the nearest block.
    const code = marker?.slice("section:".length)
      ?? target?.getAttribute("data-seat-block") ?? target?.getAttribute("data-block-start")
      ?? (!control && camera.current[2] > NEAR_MISS_WIDTH ? nearestBlockCode(event.clientX, event.clientY) : null);
    contacts.current.set(event.pointerId, { x: event.clientX - rect.left, y: event.clientY - rect.top, startX: event.clientX - rect.left, startY: event.clientY - rect.top, code });
    if (!control) event.currentTarget.setPointerCapture(event.pointerId);
    suppressMapClick.current = contacts.current.size > 1;
    const c = centre(); gesture.current = { box: camera.current, ...c }; moved.current = contacts.current.size !== 1;
  }
  function move(event: ReactPointerEvent<HTMLDivElement>) {
    if (!contacts.current.has(event.pointerId) || !gesture.current) return;
    const rect = event.currentTarget.getBoundingClientRect(), previous = contacts.current.get(event.pointerId)!;
    contacts.current.set(event.pointerId, { ...previous, x: event.clientX - rect.left, y: event.clientY - rect.top });
    const c = centre(), initial = gesture.current;
    if (Math.hypot(event.clientX - rect.left - previous.startX, event.clientY - rect.top - previous.startY) > SEAT_DRAG_THRESHOLD || contacts.current.size > 1) moved.current = true;
    if (!moved.current || (event.pointerType === "touch" && contacts.current.size === 1 && initial.box[2] >= 1584)) return;
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
    if (tap && contact.code) { const block = blocks.find(b => b.code === contact.code); if (block) { setFocusedCode(block.code); onBlock(block); } }
  }
  useEffect(() => {
    const el = svg.current!;
    const wheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
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
  const focusBlock = detail && !selectedBlock ? visible.filter(block => {
    const b = geometry.get(block.code)!.bounds, a = project(b.left, b.top), z = project(b.right, b.bottom);
    return block.rowLabelIsPrinted && (level === "すべて" || block.tier === level) && a.x >= 0 && a.y >= 0 && z.x <= size.width && z.y <= size.height && Math.min(z.x - a.x, z.y - a.y) >= 24;
  }).sort((a, b) => {
    const p = project(a.x, a.y), q = project(b.x, b.y);
    return Math.hypot(p.x - size.width / 2, p.y - size.height / 2) - Math.hypot(q.x - size.width / 2, q.y - size.height / 2);
  })[0] : undefined;
  const closestView = view[2] <= 90;
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
  if (detail && selectedBlock?.rowLabelIsPrinted && selectedDrawing) {
    const selectedRow = selectedDrawing.rows.find(row => row.selected);
    if (selectedRow && !rowEnds.some(row => row.row === selectedRow.row)) {
      const anchor = project(selectedRow.from.x, selectedRow.from.y);
      if (anchor.x >= 0 && anchor.x <= size.width && anchor.y >= 0 && anchor.y <= size.height) {
        const rect = { x: anchor.x, y: anchor.y - 38, width: 56, height: 28 };
        rowEnds.unshift({ rect, anchor, row: selectedRow.row, end: "selected" }); annotations.push({ rect });
      }
    }
  }
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
  const placedRows: typeof rowEnds = [];
  for (const row of rowEnds) {
    const anchor = { ...row.rect };
    const obstacles = [...placedLabels.map(label => {
      const { rect, from, to } = label.sign;
      const bounds = seatNumberBadgeBounds([to.x - from.x, to.y - from.y], rect.width, rect.height, Math.hypot(to.x - from.x, to.y - from.y), label.compact ? 3 : 5);
      return { ...bounds, x: rect.x + bounds.x, y: rect.y + bounds.y };
    }), ...placedRows.map(row => row.rect)];
    const shifts = [[0, 0], [0, -34], [0, 34], [-60, 0], [60, 0], [-60, -34], [60, 34]];
    const chosen = shifts.map(([dx, dy]) => ({ ...anchor, x: anchor.x + dx, y: anchor.y + dy }))
      .find(rect => rect.x >= 30 && rect.x <= size.width - 30 && rect.y >= 16 && rect.y <= size.height - 16
        && obstacles.every(other => !rectanglesOverlap(rect, other, 3)));
    if (chosen && Math.hypot(chosen.x - row.anchor.x, chosen.y - row.anchor.y) <= 64) { Object.assign(row.rect, chosen); placedRows.push(row); }
  }
  rowEnds.splice(0, rowEnds.length, ...placedRows);
  const numberPriority = prioritizeSelectedNumberArrow(placedLabels, selectedCode ?? null, reserved);
  const priorityLabels: typeof placedLabels = [];
  const labelPriorityOrigin = selectedBlock ? project(selectedBlock.x, selectedBlock.y) : { x: size.width / 2, y: size.height / 2 };
  for (const label of [...numberPriority].sort((a, b) => Number(b.block.code === selectedCode) - Number(a.block.code === selectedCode)
    || Math.hypot(a.sign.rect.x - labelPriorityOrigin.x, a.sign.rect.y - labelPriorityOrigin.y) - Math.hypot(b.sign.rect.x - labelPriorityOrigin.x, b.sign.rect.y - labelPriorityOrigin.y))) {
    // Compact neighbouring badges can still collide. Preserve the selected
    // marker and actual row ends; omit only the overlapping passive badge.
    if (label.block.code !== selectedCode && [...rowEnds.map(row => row.rect), ...priorityLabels.map(other => other.sign.rect)]
      .some(rect => rectanglesOverlap(rect, label.sign.rect, 4))) continue;
    priorityLabels.push(label);
  }
  // Number anchors have priority. Add a quiet row range underneath wherever
  // it fits, rather than displacing a neighbouring block's young number.
  for (const label of priorityLabels) {
    if (!label.rangeReadable) continue;
    const rect = { x: label.sign.rect.x, y: label.sign.rect.y + 32, width: label.rowRange.length * 7 + 12, height: 24 };
    if (rect.x - rect.width / 2 < 4 || rect.x + rect.width / 2 > size.width - 4 || rect.y + rect.height / 2 > size.height - 4) continue;
    const others = reserved.filter(rect => !centralLabels.some(c => c.code === label.block.code && c.rect === rect));
    // A supplementary neighbour range must not suppress the selected number's direction.
    if (priorityLabels.some(other => other.block.code === selectedCode && arrowOverlapsRect(other.sign.from, other.sign.to, rect, 3))
      || [...others, ...priorityLabels.map(other => other.sign.rect), ...priorityLabels.flatMap(other => other.rangeRect ? [other.rangeRect] : [])].some(other => rectanglesOverlap(rect, other, 3))) continue;
    label.rangeRect = rect; label.showRange = true; annotations.push({ rect });
  }
  const numberLabels = priorityLabels.map(label => {
    const candidate = clearNumberArrow(label.sign, [...reserved, ...priorityLabels.map(other => other.sign.rect), ...priorityLabels.flatMap(other => other.rangeRect ? [other.rangeRect] : [])]);
    if (!candidate) return { ...label, arrow: null, badgePath: null, badgeInk: undefined };
    const dx = candidate.to.x - candidate.from.x, dy = candidate.to.y - candidate.from.y, length = Math.hypot(dx, dy);
    // Keep the whole joined outline inside the viewport; shorten only along the sourced direction.
    for (let remaining = length; remaining >= 8; remaining -= 1) {
      const bounds = seatNumberBadgeBounds([dx, dy], label.sign.rect.width, label.sign.rect.height, remaining, label.compact ? 3 : 5);
      const x = label.sign.rect.x + bounds.x, y = label.sign.rect.y + bounds.y;
      if (x - bounds.width / 2 >= 1 && x + bounds.width / 2 <= size.width - 1 && y - bounds.height / 2 >= 1 && y + bounds.height / 2 <= size.height - 1) {
        return { ...label, badgeInk: seatNumberArrowInk([dx, dy], label.sign.rect.width, label.sign.rect.height, remaining, label.compact ? 3 : 5), badgePath: seatNumberBadge([dx, dy], label.sign.rect.width, label.sign.rect.height, remaining, label.compact ? 3 : 5), arrow: { from: candidate.from, to: { x: candidate.from.x + dx * remaining / length, y: candidate.from.y + dy * remaining / length } } };
      }
    }
    return { ...label, arrow: null, badgePath: null, badgeInk: undefined };
  });
  const gateLabels = gates.gates.filter(g => !overview || [1, 5, 9, 12].includes(g.number)).flatMap(gate => {
    const point = project(gate.x, gate.y);
    return available(point.x, point.y, 64, 24) ? [{ gate, point }] : [];
  });
  const visibleInfield = infieldAreas.filter(area => level === "すべて" || area.id.endsWith(level));
  const overviewObstacles = overview ? [...outfieldAreas, ...visibleInfield].map(area =>
    ({ ...project(area.x * 1600, area.y * 1600), width: 64, height: 44 })) : [];
  const markerObstacles = [
    ...annotations.map(annotation => annotation.rect),
    ...numberLabels.map(label => label.sign.rect),
    ...rowEnds.map(row => row.rect),
    ...overviewObstacles,
  ];
  const placedPhotos: LabelRect[] = [];
  // Blocks whose own label gives way to their camera mark (no clear spot fitted, so the mark sits at the centre).
  const coveredCodes = new Set<string>();
  const photoMarkers = visible.flatMap(block => {
    const post = photoPosts.get(block.code);
    if (!post || (level !== "すべて" && block.tier !== level && block.code !== selectedCode)) return [];
    // The selected block's mark gives way while its photo card is shown on the map.
    if (block.code === cardedCode) return [];
    const anchor = project(block.x, block.y);
    if (anchor.x < 0 || anchor.x > size.width || anchor.y < 0 || anchor.y > size.height) return [];
    const padding = photoTarget / 2 + 2;
    const candidates = seatPhotoOffsets.map(([dx, dy]) => ({ x: anchor.x + dx, y: anchor.y + dy, width: photoTarget, height: photoTarget }))
      .filter(({ x, y }) => x >= padding && x <= size.width - padding && y >= padding && y <= size.height - padding);
    const fitsPhotos = (point: LabelRect) => placedPhotos.every(other => !rectanglesOverlap(point, other, 2));
    const clear = candidates.filter(point => fitsPhotos(point)
      && markerObstacles.every(other => !rectanglesOverlap(point, other, 2))
      && numberLabels.every(label => !label.arrow || !arrowOverlapsRect(label.arrow.from, label.arrow.to, point, 3)));
    const onBlock = (point: LabelRect, radius: number) => photoHitTest([block.path],
      { x: (point.x - origin.x) / scale, y: (point.y - origin.y) / scale }, radius / scale);
    const centered = clear[0]?.x === anchor.x && clear[0]?.y === anchor.y && onBlock(clear[0], 0);
    const placed = centered ? clear[0] : clear.find(point => onBlock(point, 10)) ?? clear.find(point => onBlock(point, 0));
    // Every block with photos keeps its mark (Tokyo Dome): with no clear spot it sits at the block centre.
    const fallback = { x: anchor.x, y: anchor.y, width: photoTarget, height: photoTarget };
    const point = placed ?? (anchor.x >= padding && anchor.x <= size.width - padding && anchor.y >= padding && anchor.y <= size.height - padding ? fallback : null);
    if (!point) return [];
    if (!placed) coveredCodes.add(block.code);
    placedPhotos.push(point);
    return [{ block, post, point }];
  });
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
    style={{ touchAction: view[2] >= 1584 ? "pan-y" : "none" }}
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
          aria-label={`${block.label}・${block.tier} ${block.rowLabelIsPrinted ? `${block.rowLabel}列` : "列の印字なし（公式検索：0列）"} ${block.firstSeat}〜${block.lastSeat}番`} aria-pressed={block.code === selectedCode}
          onKeyDown={event => keyBlock(event, block)}>
          <path d={block.path} fill={block.code === selectedCode ? "#ac2e66" : block.special ? "#eadac1" : block.tier === "上段" ? "#c1b4da" : "#ebbad0"}
            opacity={level !== "すべて" && block.tier !== level && block.code !== selectedCode ? .2 : 1} stroke={block.code === selectedCode ? "#5d263f" : photoPosts.has(block.code) ? SEAT_PHOTO_MAP_COLOR : "white"}
            strokeWidth={block.code === selectedCode ? 2.5 : photoPosts.has(block.code) ? 2.2 : .6} vectorEffect="non-scaling-stroke" />
          <title>{`${block.label}・${block.tier} ／ ${block.rowLabelIsPrinted ? `${block.rowLabel}列` : "列の印字なし（検索：0列）"} ／ ${block.firstSeat}〜${block.lastSeat}番`}</title>
        </g>)}
        
        {detail && visible.filter(b => (level === "すべて" || b.tier === level || b.code === selectedCode) && (b.code === selectedCode || Math.max(...[geometry.get(b.code)!.bounds].map(r => Math.max(r.right - r.left, r.bottom - r.top))) * scale >= 65)).map(block => <g key={`rows:${block.code}`} clipPath={`url(#seat-clip-${block.code})`} pointerEvents="none" data-row-guides={block.code}>
          {(block.code === selectedCode ? selectedDrawing! : geometry.get(block.code)!.drawing).rows.map(row => <line key={row.row} data-row-line={row.row} x1={row.from.x} y1={row.from.y} x2={row.to.x} y2={row.to.y}
            stroke={row.selected ? "#1673ad" : block.code === selectedCode ? "#ffe6f0" : "#ab7593"} strokeWidth={row.selected ? 2 : .6} vectorEffect="non-scaling-stroke" opacity={row.selected ? 1 : .65} />)}
        </g>)}
      </g>
      </svg>
      {/* Screen-space layer: follows a moving camera with one transform until the commit (see paint). */}
      <g ref={overlay}>
      <g pointerEvents="none" className={styles.numbers}>
        {blockLabels.filter(({ block }) => !coveredCodes.has(block.code)).map(({ block, drawing, p, text, fontSize }) => <text key={block.code} data-block-start={block.code} data-start-number={drawing.seatStart} x={p.x} y={p.y} dominantBaseline="central" textAnchor="middle" fontSize={fontSize} fill="#672442" pointerEvents="all" style={{ cursor: "pointer" }} aria-hidden="true">{text}</text>)}
        {numberLabels.filter(({ block }) => block.code === selectedCode || !coveredCodes.has(block.code)).map(({ block, drawing, sign: { rect }, arrow, badgePath, badgeInk, rowRange, rangeRect, compact }) => <g key={block.code} data-number-guide={block.code} data-reference-row={drawing.referenceRow} data-start-number={drawing.seatStart} data-compact-number={compact || undefined}>
          <title>{block.rowLabelIsPrinted ? `${drawing.referenceRow}列の番号目安。列によって端の番号が変わります。` : "FBの印字された開始番号と番号が増える向き。検索の列は0です。"}</title>

          <path data-number-badge="" data-connected-number-arrow={arrow ? "" : undefined} transform={`translate(${rect.x} ${rect.y})`} d={badgePath ?? seatNumberBadge([0, 0], rect.width, rect.height, 0, compact ? 3 : 5)} fill="#fff" stroke={block.code === selectedCode ? "#ac2e66" : "#d5c5cd"} strokeWidth={block.code === selectedCode ? 2 : 1} />
          {badgeInk && <path data-number-arrow-ink="" transform={`translate(${rect.x} ${rect.y})`} d={badgeInk} fill="none" stroke="#a93164" strokeWidth={block.code === selectedCode ? 2 : 1.6} strokeLinejoin="round" strokeLinecap="round"/>}
          <text data-number-text="" x={rect.x} y={rect.y + (compact ? 4 : 5)} textAnchor="middle" fontSize={block.code === selectedCode ? 14 : 12} fill="#672442">{drawing.seatStart}{!compact && <tspan fontSize="12">番</tspan>}</text>
          {rangeRect && <g><text stroke="#fff" strokeWidth="3" paintOrder="stroke" strokeLinejoin="round" data-row-range={block.code} x={rangeRect.x} y={rangeRect.y + 4} textAnchor="middle" fontSize="12" fontWeight="600" fill="#76576a">{rowRange}</text></g>}
        </g>)}
        {centralLabels.filter(c => !placedLabels.some(l => l.block.code === c.code && l.showRange)).map(({ code, rect, letter }) => <text key={code} x={rect.x} y={rect.y + 4} textAnchor="middle" fontSize="12">{letter}</text>)}
        {focusRows && <g><text stroke="#fff" strokeWidth="3" paintOrder="stroke" strokeLinejoin="round" data-row-range={focusRows.code} x={focusRows.rect.x} y={focusRows.rect.y + 4} textAnchor="middle" fontSize="12" fontWeight="600" fill="#76576a">{focusRows.text}</text></g>}
        {rowEnds.map(({ rect: p, anchor, row, end }) => <g key={end} data-row-end={end}>{(p.x !== anchor.x || p.y !== anchor.y) && <path d={`M${anchor.x},${anchor.y}L${p.x},${p.y}`} stroke="#a93164" strokeWidth="1"/>}<rect x={p.x - 28} y={p.y - 14} width="56" height="28" rx="4" fill={rowLabel === row ? "#155786" : "#e8f3ff"} stroke="#23679a" /><text x={p.x} y={p.y + 4} textAnchor="middle" fontSize="12" fill={rowLabel === row ? "#fff" : "#155786"}>{row}列</text></g>)}
        {gateLabels.map(({ gate, point: p }) => <g key={gate.id} data-seat-gate={gate.number}><rect x={p.x - 32} y={p.y - 12} width="64" height="24" rx="12" fill="#514452" /><text x={p.x} y={p.y + 4} fill="white" textAnchor="middle" fontSize="12">GATE {gate.number}</text></g>)}
      </g>
      {photoMarkers.map(({ block, post, point: { x, y } }) => <g key={block.code}>
        <g data-seat-photo-marker={`section:${block.code}`} className={styles.photoMarker} role="button" tabIndex={0}
          data-photo-x={x} data-photo-y={y} data-photo-placement="inside-block"
          aria-label={`写真がある${post.area}を選ぶ`}
          onClick={event => { if (event.detail === 0) onBlock(block); }}
          onKeyDown={event => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault(); setFocusedCode(block.code); onBlock(block);
          }}>
          <circle className={styles.photoTarget} cx={x} cy={y} r={photoTarget / 2} fill="transparent" />
          <SeatPhotoMarker x={x} y={y} size={20} highlighted />
        </g>
      </g>)}
      </g>
    </svg>
    {overview && <div className={styles.areaLabels} aria-label="座席エリアから拡大する" data-tap-hint={tapHint} onAnimationEnd={() => setTapHint("done")}>
      {outfieldAreas.map(area => {
        const p = project(area.x * 1600, area.y * 1600);
        return p.x >= 36 && p.x <= size.width - 36 && p.y >= 24 && p.y <= size.height - 24 ? <button key={area.id} type="button" className={styles.outfieldLabel} data-map-direction={area.id} aria-label={`外野${area.label}`} style={{ left: p.x, top: p.y }} onClick={() => onDirection(area.id)}>外野<small>{area.label}</small></button> : null;
      })}
      {visibleInfield.map(area => { const p = project(area.x * 1600, area.y * 1600); const seat = guide.seats.find(a => a.id === area.id)!;
          return p.x >= 30 && p.x <= size.width - 30 && p.y >= 24 && p.y <= size.height - 24 ? <button key={area.id} type="button" style={{ left: p.x, top: p.y }} onClick={() => onArea(area.id)}>{seat.label.startsWith("中央") ? "中央" : seat.label}<small>{seat.type}</small></button> : null; })}
    </div>}
    </div>
  </>;
}
