"use client";
import { trackVenueSeatSearch } from "@/lib/venueAnalytics";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ChevronRight, Crosshair, LocateFixed, Map as MapIcon, Maximize2, X } from "lucide-react";
import type { DedicatedVenueGuide, SeatArea } from "@/data/venueGuides/types";
import { DomeSeatFrame } from "../template/DomeSeatFrame";
import { SeatPhotoMapSummary } from "../template/SeatViewPosts";
import { nearSeatNumbers } from "../template/seatFinderLabels";
import { SeatFinderControls, SeatFinderMiss, type FinderMode } from "../template/SeatFinderControls";
import styles from "./KyoceraSeatMap.module.css";
import stand from "../template/StandSeatMap.module.css";
import type { StandMapScope } from "../template/StandSeatMap";
import { announceTokyoDomeMapScope } from "@/lib/tokyoDomeVenueSelection";
import { useArenaMaps } from "@/components/venue/ArenaMapsSheet";
import type { Box } from "./mapGeometry";
import KyoceraNumberNavigator from "./KyoceraNumberNavigator";
import { kyoceraBlockCamera, kyoceraDrawingBlocks, kyoceraAreaCamera, kyoceraMatchesArea, kyoceraSelectedDirection, kyoceraBlockName, kyoceraBlockShortName, type DrawingBlock } from "./kyoceraMapDrawing";
import { findKyoceraSeats, normalizeKyoceraTicket, type KyoceraSeatCandidate } from "./kyoceraSeatSearch";
import SeatSearchOffer from "@/components/seat-campaign/SeatSearchOffer";
import { useVenueSeatTarget } from "../VenueSeatTarget";
import { seatViewMatchesForSelection, seatViewPosts } from "@/lib/seatViewPosts";
import { fitAboveBoard, ImmersiveBar, ImmersiveFrame, ImmersiveOpenButton, useImmersiveMap } from "../template/immersiveMap";
import { SeatPhotoEmptySheet, SeatPhotoSheet, SeatPhotoSheetTab, type SheetNeighbor } from "../template/SeatPhotoSheet";
import { SeatShareSheet } from "../template/SeatShareSheet";
import { seatViewInlinePhotoUrl } from "@/lib/seatViewPhotoAssets";

const photoPlaceCount = new Set(seatViewPosts("kyocera-dome-fixed").map(post => post.place.kind + ":" + post.place.id)).size;
const PHOTO_CODES = new Set(seatViewPosts("kyocera-dome-fixed").filter(post => post.place.kind === "section").map(post => post.place.id));
// kyoceraBlockCamera never frames a regular block closer than this; sides and levels are never framed closer.
const BLOCK_VIEW = 230;
/** A side or level is never framed closer than a block view, so choosing a block from it never zooms out. */
function notCloserThanBlock(box: Box): Box {
  const span = Math.max(box[2], box[3]);
  if (span >= BLOCK_VIEW) return box;
  const grow = BLOCK_VIEW / span;
  return [box[0] - box[2] * (grow - 1) / 2, box[1] - box[3] * (grow - 1) / 2, box[2] * grow, box[3] * grow];
}

type Props = { guide: DedicatedVenueGuide; selectedId: string | null; rowLabel: string | null; seatNumber: string;
  onSelect: (area: SeatArea) => void; onClear: () => void; onRow: (row: string | null) => void;
  onTicket: (area: SeatArea, row: string, number: string) => void };
const levels = [{ id: "すべて", label: "すべて", color: "#a93164" }, { id: "下段", label: "下段", color: "#db78a7" },
  { id: "上段", label: "上段", color: "#a696c8" }];
const directions = [{ id: "all", label: "全体" }, { id: "first", label: "1塁側" }, { id: "home", label: "中央" }, { id: "third", label: "3塁側" }, { id: "outfield-right", label: "外野ライト" }, { id: "outfield-left", label: "外野レフト" }];

export default function KyoceraSeatMap({ guide, selectedId, rowLabel, seatNumber, onSelect, onClear, onRow, onTicket }: Props) {
  const whole = guide.seatMap!.viewBox;
  const blocks = useMemo(() => kyoceraDrawingBlocks(guide), [guide]);
  const target = useVenueSeatTarget();
  const [initial] = useState(() => target?.mode === "fixed" ? blocks.find(block => block.code === target.section) : undefined);
  const [box, setBox] = useState<Box>(() => initial ? kyoceraBlockCamera(initial, whole) : [...whole] as Box);
  const [level, setLevel] = useState(initial && !initial.special ? initial.tier : "すべて");
  const [direction, setDirection] = useState(() => initial ? kyoceraSelectedDirection(initial, whole, "all") : "all");
  const [selectedCode, setSelectedCode] = useState<string | null>(initial?.code ?? null);
  const [photoRequest, setPhotoRequest] = useState(0);
  const [photoFromTicket, setPhotoFromTicket] = useState(false);
  const [specialRow, setSpecialRow] = useState<string | null>(null);
  const [specialNumber, setSpecialNumber] = useState("");
  const [searchRow, setSearchRow] = useState("");
  const [number, setNumber] = useState("");
  const [finderMode, setFinderMode] = useState<FinderMode>("ticket");
  const [blockInput, setBlockInput] = useState("");
  const [blockMatches, setBlockMatches] = useState<DrawingBlock[]>([]);
  const [error, setError] = useState("");
  const [candidates, setCandidates] = useState<KyoceraSeatCandidate[]>([]);
  const [dismissedScope, setDismissedScope] = useState("");
  const arenaMaps = useArenaMaps();
  const announcedScope = useRef("");
  // ── Phones: still preview in the page; a tap opens the full-screen map with the photo board ──
  const [sheetOpen, setSheetOpen] = useState(true);
  const [sheetPhoto, setSheetPhoto] = useState(0);
  const [shareOpen, setShareOpen] = useState(false);
  const pendingView = useRef<(() => void) | null>(null);
  const [viewTick, setViewTick] = useState(0);
  // The camera the mini-map's "全体図" left, for "選んだ席に戻る".
  const [overviewReturn, setOverviewReturn] = useState<Box | null>(null);
  const miniView = useRef<SVGRectElement>(null);
  const shell = useImmersiveMap({ enabled: true, onOpened: () => { const run = pendingView.current; pendingView.current = null; run?.(); } });
  const frameRef = shell.frameRef, mapRef = shell.mapRef, boardHeight = shell.boardHeight;
  const canvas = useCallback(() => frameRef.current?.querySelector<HTMLElement>("[data-testid='kyocera-seat-map']") ?? null, [frameRef]);
  const inFullscreen = useCallback(() => Boolean(frameRef.current?.hasAttribute("data-seat-map-fullscreen")), [frameRef]);
  /** Full screen: `target` fitted into the part of the map above the photo board. */
  const aboveBoard = useCallback((target: Box): Box => {
    const map = canvas(), rect = map?.getBoundingClientRect();
    if (!map || !rect || !inFullscreen()) return target;
    mapRef.current = map;
    return fitAboveBoard(target, rect.width, rect.height, boardHeight());
  }, [canvas, inFullscreen, mapRef, boardHeight]);
  const sheetRef = shell.sheetRef;
  const setBoard = useCallback((node: HTMLElement | null) => { sheetRef.current = node; }, [sheetRef]);
  /** Full screen: a camera step that waits until the board for the new choice is on screen. */
  function afterRender(step: () => void) { pendingView.current = step; setViewTick(tick => tick + 1); }
  useLayoutEffect(() => {
    if (!viewTick || !inFullscreen()) return;
    const run = pendingView.current; pendingView.current = null; run?.();
  }, [viewTick, inFullscreen]);
  // Closing goes back to the whole map, as the still preview shows it.
  const wasFullscreen = useRef(false);
  useLayoutEffect(() => {
    if (wasFullscreen.current && !shell.fullscreen) { setBox([...whole] as Box); setOverviewReturn(null); }
    wasFullscreen.current = shell.fullscreen;
  }, [shell.fullscreen, whole]);
  useLayoutEffect(() => {
    const rect = canvas()?.getBoundingClientRect(), mark = miniView.current;
    if (!rect || !mark || !rect.width) return;
    mapRef.current = canvas();
    const scale = Math.min(rect.width / box[2], rect.height / box[3]);
    const left = box[0] + box[2] / 2 - rect.width / 2 / scale, top = box[1] + box[3] / 2 - rect.height / 2 / scale;
    const shown = [Math.max(whole[0], left), Math.max(whole[1], top),
      Math.min(whole[0] + whole[2], left + rect.width / scale), Math.min(whole[1] + whole[3], top + (rect.height - boardHeight()) / scale)];
    mark.setAttribute("x", String(shown[0])); mark.setAttribute("y", String(shown[1]));
    mark.setAttribute("width", String(Math.max(0, shown[2] - shown[0]))); mark.setAttribute("height", String(Math.max(0, shown[3] - shown[1])));
  });
  /** A chosen block: from the preview it opens the full-screen map; on it, it is framed above the board. */
  /** Full screen: the block with its neighbours around it, as wide as the rows and numbers are still drawn
   * (the map draws them while the whole camera, board included, stays under 550 wide and tall). */
  function blockView(block: DrawingBlock): Box {
    const target = kyoceraBlockCamera(block, whole), rect = canvas()?.getBoundingClientRect();
    if (!rect || !inFullscreen()) return target;
    const width = Math.max(Math.min(target[2], target[3]), Math.min(300, rect.width * 540 / rect.height));
    const cx = target[0] + target[2] / 2, cy = target[1] + target[3] / 2;
    return aboveBoard([cx - width / 2, cy - 40, width, 80]);
  }
  function frameBlock(block: DrawingBlock) {
    setOverviewReturn(null);
    const camera = () => setBox(blockView(block));
    if (shell.immersive && !inFullscreen()) { pendingView.current = camera; shell.open(); }
    else if (inFullscreen()) afterRender(camera);
    else setBox(kyoceraBlockCamera(block, whole));
  }
  const selected = blocks.find(b => b.code === selectedCode && (b.special || b.areaId === selectedId));
  const currentRow = selected?.special ? specialRow : rowLabel;
  const currentNumber = selected?.special ? specialNumber : seatNumber;
  const emptyScope = !blocks.some(block => kyoceraMatchesArea(block, whole, direction, level));
  const feedback = error || (emptyScope ? "この組合せに表示できる席がありません。" : "");
  function resetFeedback() { setError(""); setCandidates([]); setBlockMatches([]); }
  function clear() { onClear(); setSelectedCode(null); setSpecialRow(null); setSpecialNumber(""); resetFeedback(); }
  function showWhole() { clear(); setBox([...whole] as Box); setDirection("all"); setLevel("すべて"); }
  function showDirection(id: string, tier = level) {
    if (id === "all") { showWhole(); return; }
    clear(); setDirection(id); setLevel(tier);
    setBox(notCloserThanBlock(kyoceraAreaCamera(blocks, whole, id, tier)));
  }
  function chooseBlock(block: DrawingBlock) {
    setPhotoFromTicket(false);
    if (block.special) { onClear(); setSpecialRow(null); setSpecialNumber(""); }
    else { const area = guide.seats.find(a => a.id === block.areaId)!; onSelect(area); if (selectedId === area.id) onRow(null); }
    setSelectedCode(block.code); setDirection(kyoceraSelectedDirection(block, whole, direction)); setLevel(block.special ? "すべて" : block.tier); resetFeedback();
    setSheetOpen(true); setSheetPhoto(0);
    if (shell.immersive) { frameBlock(block); return; }
    // Same rule as Tokyo Dome: go to the block view unless the map is already at block zoom or closer,
    // where a neighbouring block is picked without moving the camera.
    const target = kyoceraBlockCamera(block, whole);
    if (Math.max(box[2], box[3]) > Math.max(target[2], target[3]) * 1.02) setBox(target);
  }
  function zoom(factor: number) { setBox(current => {
    const width = Math.max(60, Math.min(whole[2], current[2] * factor));
    const height = Math.max(60, Math.min(whole[3], current[3] * factor));
    return [current[0] + (current[2] - width) / 2, current[1] + (current[3] - height) / 2, width, height];
  }); }
  function selectCandidate(candidate: KyoceraSeatCandidate, preferred = direction) {
    setPhotoFromTicket(true);
    const { block, row, number: seat } = candidate;
    if (block.special) { onClear(); setSpecialRow(row); setSpecialNumber(seat); }
    else { onTicket(guide.seats.find(area => area.id === block.areaId)!, row, seat); setSpecialRow(null); setSpecialNumber(""); }
    setSelectedCode(block.code); setDirection(kyoceraSelectedDirection(block, whole, preferred)); setLevel(block.special ? "すべて" : block.tier);
    setSheetOpen(!PHOTO_CODES.has(block.code)); setSheetPhoto(0);
    frameBlock(block); resetFeedback();
  }
  function search(scope = direction, tier = level) {
    clear();
    if (finderMode === "block") {
      const normalize = (name: string) => name.normalize("NFKC").toUpperCase().replace(/\s+/g, "").replace(/(?:ブロック|区画)$/, "");
      const name = normalize(blockInput);
      const found = name ? blocks.filter(block => kyoceraMatchesArea(block, whole, scope, tier)
        && ([block.label, block.code, ...block.passages.map(passage => `${passage}通路`)].some(alias => normalize(alias) === name))) : [];
      trackVenueSeatSearch(found.length > 1 ? "multiple" : found.length ? "area" : name ? "empty" : "invalid", found.length);
      if (found.length === 1) { chooseBlock(found[0]); frameBlock(found[0]); return; }
      if (found.length > 1) { setBlockMatches(found); return; }
      setError(name ? "券面の通路・区画名を確認してください。" : "券面の通路・区画名を入力してください。");
      return;
    }
    const input = normalizeKyoceraTicket(searchRow, number);
    if (!input) { trackVenueSeatSearch("invalid"); setError("列（数字または英字）と座席番号を両方入力してください。"); return; }
    const hits = findKyoceraSeats(blocks, whole, input, scope, tier);
    if (hits.length === 1) { trackVenueSeatSearch("matched",1); selectCandidate(hits[0], scope); return; }
    if (hits.length > 1) { trackVenueSeatSearch("multiple",hits.length); setCandidates(hits); return; }
    const conflict = blocks.find(block => block.code === "X_BM_57");
    trackVenueSeatSearch(input.row === "27" && input.number === "46" && conflict && kyoceraMatchesArea(conflict, whole, scope, tier) ? "unverified" : "empty");
    setError(input.row === "27" && input.number === "46" && conflict && kyoceraMatchesArea(conflict, whole, scope, tier)
      ? "この列・番号は公式資料の表記が一致しないため、位置を表示できません。主催者の案内で確認してください。"
      : "この条件で席が見つかりません。列・番号や上のボタンを確認してください。");
  }
  function submit(event: FormEvent) { event.preventDefault(); search(); }
  function searchWhole() { setDirection("all"); setLevel("すべて"); setBox([...whole] as Box); search("all", "すべて"); }
  function showLevel(value: string) {
    clear(); setLevel(value);
    setBox(notCloserThanBlock(kyoceraAreaCamera(blocks, whole, direction, value)));
  }
  const seatView = { diagram: "kyocera-dome-fixed", request: photoRequest, section: selected?.code,
    row: photoFromTicket ? currentRow : null, seat: photoFromTicket ? currentNumber : null };
  const input = finderMode === "ticket" ? normalizeKyoceraTicket(searchRow, number) : null;
  const browseBlocks = error && input ? nearSeatNumbers(input.number, blocks.filter(item => kyoceraMatchesArea(item, whole, direction, level)),
    item => item.rows.find(line => line.row === input.row)?.ranges.map(({ start, end }) => [start, end] as const) ?? [],
    item => item.label) : [];
  function browseBlock(block: DrawingBlock) {
    chooseBlock(block); frameBlock(block);
  }
  // The board: this block's photos, or a nearby block that has some.
  const sheetMatches = shell.fullscreen && selected ? seatViewMatchesForSelection(seatViewPosts("kyocera-dome-fixed"), seatView) : [];
  const placeTitle = selected ? kyoceraBlockShortName(selected) : null;
  const middle = useMemo(() => ({ x: blocks.reduce((sum, b) => sum + b.x, 0) / blocks.length, y: blocks.reduce((sum, b) => sum + b.y, 0) / blocks.length }), [blocks]);
  // 前の区画 / 次の区画: the blocks with photos on the same level, in order around the stands.
  const photoNeighbours = selected ? blocks.filter(b => PHOTO_CODES.has(b.code) && b.tier === selected.tier)
    .sort((a, b) => Math.atan2(a.y - middle.y, a.x - middle.x) - Math.atan2(b.y - middle.y, b.x - middle.x)) : [];
  const sheetAt = selected ? photoNeighbours.findIndex(b => b.code === selected.code) : -1;
  const goTo = (block: DrawingBlock | undefined): SheetNeighbor => block ? { label: kyoceraBlockShortName(block), go: () => chooseBlock(block) } : null;
  const nearbyPhoto = selected && !sheetMatches.length ? blocks.filter(b => PHOTO_CODES.has(b.code))
    .sort((a, b) => Math.hypot(a.x - selected.x, a.y - selected.y) - Math.hypot(b.x - selected.x, b.y - selected.y))[0] : undefined;
  // A "この席を送る" link opens straight into the full-screen map on that block (phones only).
  const autoOpened = useRef(false);
  useEffect(() => {
    if (autoOpened.current || !target?.open || !initial || !shell.immersive) return;
    autoOpened.current = true;
    if (target.row && target.number) {
      setPhotoFromTicket(true);
      if (initial.special) { setSpecialRow(target.row); setSpecialNumber(target.number); }
      else { const area = guide.seats.find(a => a.id === initial.areaId); if (area) onTicket(area, target.row, target.number); }
      setSheetOpen(!PHOTO_CODES.has(initial.code));
    }
    frameBlock(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shell.immersive]);
  // Tell the page's photo row which part of the venue is on the map (as StandSeatMap): the blocks around a
  // chosen block, or the chosen level and side. Photo links carry the block code as seatSection.
  useEffect(() => {
    const send = (label: string | null, codes: string[], section?: string) => {
      const scope: StandMapScope = { label, codes, section, labels: [], match: "section" };
      const key = JSON.stringify(scope);
      if (key === announcedScope.current) return;
      announcedScope.current = key;
      announceTokyoDomeMapScope(scope);
    };
    const chosen = blocks.find(b => b.code === selectedCode);
    if (chosen) {
      const near = [...blocks].sort((a, b) => Math.hypot(a.x - chosen.x, a.y - chosen.y) - Math.hypot(b.x - chosen.x, b.y - chosen.y)).slice(0, 16).map(b => b.code);
      send(`${chosen.label}・${chosen.tier}の近く`, near, chosen.code);
    } else if (direction === "all" && level === "すべて") send(null, []);
    else send([level !== "すべて" && level, direction !== "all" && directions.find(item => item.id === direction)?.label].filter(Boolean).join("・"),
      blocks.filter(b => kyoceraMatchesArea(b, whole, direction, level)).map(b => b.code));
  }, [blocks, whole, selectedCode, direction, level]);
  useEffect(() => () => { announcedScope.current = ""; announceTokyoDomeMapScope({ label: null, codes: [] }); }, []);
  const scopeKey = `${direction}:${level}`;
  const scopeNotice = emptyScope && !error && dismissedScope !== scopeKey;
  const noticeShown = Boolean(error) || scopeNotice || blockMatches.length > 1 || candidates.length > 1;
  // The chosen block's own camera mark gives way while its photo card is shown on the map.
  const cardShown = Boolean(selected) && seatViewMatchesForSelection(seatViewPosts("kyocera-dome-fixed"), seatView).length > 0;
  const arenaImage = arenaMaps?.posts.find(post => post.image)?.image;
  const arenaThumb = arenaImage ? arenaImage.src.replace(/([?&]name=)\w+/, "$1thumb") : null;
  return <DomeSeatFrame className={styles.seatFrame} levels={levels} level={level} onLevel={showLevel} photoLegend="map"
    seatView={seatView} seatViewIndex={sheetPhoto}
    directions={directions} direction={direction} onDirection={showDirection} onZoom={zoom} onWhole={showWhole} zoomLabel="座席図" shortcuts={[]}
    directionExtra={<SeatFinderControls mode={finderMode} onMode={mode => { setFinderMode(mode); clear(); }}
      row={searchRow} number={number} block={blockInput} blockHint="例：63通路" rowHint="例：8、A" numberHint="例：41" testId="kyocera-ticket-search"
      onRow={value => { setSearchRow(value); resetFeedback(); }} onNumber={value => { setNumber(value); resetFeedback(); }}
      onBlock={value => { setBlockInput(value); resetFeedback(); }} onSubmit={submit} />}>
    <div className={styles.selectionBand} data-testid="map-selection-summary" aria-live="polite">{selected ? <>
      <div><strong>{selected.label}・{selected.tier}</strong><span>{selected.passages.length > 0 && <>{selected.passages.join("・")}通路・</>}{selected.rowLabelIsPrinted ? `${selected.rowLabel}列（${selected.rows.length}列）` : "公式検索：0列"}・{selected.firstSeat}〜{selected.lastSeat}番{currentRow && selected.rowLabelIsPrinted && <> ／ <b className={styles.selectedRow}>{currentRow}列</b></>}{currentNumber && <> ・ <b className={styles.selectedSeat} data-selected-seat-number>選択：{currentNumber}番</b></>}</span></div>
      <button type="button" disabled={!selected} aria-label="選んだ場所を表示" onClick={() => selected && frameBlock(selected)}><LocateFixed size={19} /></button>
      <button type="button" disabled={!selected} aria-label="座席の選択を解除" onClick={clear}><X size={18} /></button>
    </> : <span>{direction === "all" ? "座席の全体図" : `${directions.find(item => item.id === direction)?.label ?? "座席"}の範囲`}</span>}</div>
    {/* Everything that reacts to a search or a selection sits on the map, so nothing above it grows or
        shrinks and the map never moves (Tokyo Dome's mapNotice / photoOverlay, as StandSeatMap). */}
    <ImmersiveFrame frameRef={shell.frameRef} slotHeight={shell.slotHeight} fullscreen={shell.fullscreen} className={stand.mapFrame} label={`${guide.name}の座席表`} data-arena={arenaMaps ? "" : undefined}>
    {shell.fullscreen && <ImmersiveBar closeRef={shell.closeRef} onClose={shell.requestClose} venueName={guide.name} title={placeTitle} onShare={selected ? () => setShareOpen(true) : undefined} />}
    {shareOpen && selected && placeTitle && <SeatShareSheet venueName={guide.name} blockName={kyoceraBlockName(selected, blocks)} onClose={() => setShareOpen(false)}
      share={{ venue: "kyocera-dome", section: selected.code, ...(currentRow && currentNumber ? { row: currentRow, number: currentNumber } : {}) }} />}
    <KyoceraNumberNavigator guide={guide} blocks={blocks} level={level} selectedCode={selected?.code} rowLabel={currentRow} cardedCode={cardShown && !shell.immersive ? selected?.code : undefined}
      box={box} onView={setBox} onBlock={chooseBlock} locked={shell.locked} onLockedTap={shell.open}
      onDirection={id => { showDirection(id); if (shell.locked) shell.open(); }} onArea={areaId => {
        const area = guide.seats.find(a => a.id === areaId); if (!area) return;
        setLevel(area.type); showDirection(area.label === "1塁側" ? "first" : area.label === "3塁側" ? "third" : "home", area.type);
        if (shell.locked) shell.open();
      }} />
    {noticeShown && <div className={stand.mapNotice} data-seat-map-notice="">
      <button type="button" className={stand.noticeClose} aria-label="検索の案内を閉じる" onClick={() => { resetFeedback(); if (scopeNotice) setDismissedScope(scopeKey); }}><X size={16} aria-hidden="true"/></button>
      {error && <SeatFinderMiss detail={error} advice={error.includes("公式資料") ? error : undefined} query={(finderMode === "ticket" ? !input : !blockInput.trim()) ? undefined : { scope: [level !== "すべて" && level, direction !== "all" && directions.find(item => item.id === direction)?.label].filter(Boolean).join("・") || "会場全体",
        ...(finderMode === "ticket" ? { row: searchRow, number } : { block: blockInput }) }} choices={browseBlocks.map(item => ({ id: item.code, label: `${item.label}・${item.tier}` }))} choose={id => { const item = blocks.find(b => b.code === id); if (item) browseBlock(item); }} />}
      {scopeNotice && <div className={stand.message} role="status">{feedback}</div>}
      {error && (direction !== "all" || level !== "すべて") && <div className={stand.message}><button type="button" onClick={searchWhole}>全体から探す</button></div>}
      {blockMatches.length > 1 && <section className={stand.searchResults} aria-label="区画の検索結果">
        <div className={stand.resultsHeading} role="status"><strong>{blockMatches.length}区画が見つかりました</strong><p>券面に合う場所を選んでください。</p></div>
        <ul className={stand.candidateList} aria-label="区画の検索候補">{blockMatches.map(item => <li key={item.code}><button className={stand.candidateButton} type="button" onClick={() => browseBlock(item)}>
          <span className={stand.candidateCopy}><strong>{item.label}・{item.tier}</strong><span className={stand.candidateMeta}><span>{item.passages.join("・")}通路</span><span>{item.rowLabel}列・{item.firstSeat}〜{item.lastSeat}番</span></span></span>
          <ChevronRight size={18} aria-hidden="true" /></button></li>)}</ul>
      </section>}
      {candidates.length > 1 && <section className={stand.searchResults} data-testid="kyocera-seat-candidates" aria-label="座席の検索結果">
        <div className={stand.resultsHeading} role="status"><strong>{candidates[0].row}列{candidates[0].number}番の場所を選んでください</strong></div>
        <ul className={stand.candidateList} aria-label="座席の検索候補">{candidates.map(candidate => <li key={`${candidate.block.areaId}:${candidate.block.code}`}><button className={stand.candidateButton} type="button" data-candidate-code={candidate.block.code} onClick={() => selectCandidate(candidate)}>
          <span className={stand.candidateCopy}><strong>{candidate.block.label}・{candidate.block.tier === "公式の別区分" ? "別区分" : candidate.block.tier}</strong>
            {candidates.filter(other => other.block.label === candidate.block.label && other.block.tier === candidate.block.tier).length > 1 && <span className={stand.candidateMeta}><span>{candidate.range.start}〜{candidate.range.end}番のブロック</span></span>}</span>
          <ChevronRight size={18} aria-hidden="true" /></button></li>)}</ul>
      </section>}
    </div>}
    {arenaMaps && <button type="button" className={stand.arenaMaps} data-arena-maps-button="" onClick={() => arenaMaps.open()}
      aria-label={`アリーナ図を見る（${arenaMaps.count}公演）`}>
      <span className={stand.arenaPill}>
        {/* eslint-disable-next-line @next/next/no-img-element -- the post's own image on X, shown as posted */}
        {arenaThumb ? <img className={stand.arenaThumb} src={arenaThumb} alt="" width={22} height={22} decoding="async" referrerPolicy="no-referrer" />
          : <MapIcon size={14} aria-hidden="true" />}アリーナ図<b>{arenaMaps.count}</b>
      </span>
    </button>}
    {shell.fullscreen && !overviewReturn && box[2] < whole[2] * .8 && <button type="button" key={`mini-${shell.openCount}`} className={`${stand.miniMap} ${styles.miniMap}`} data-mini-map=""
      aria-label="全体図：押すと会場全体を表示" onClick={() => { setOverviewReturn([...box] as Box); setBox(aboveBoard([...whole] as Box)); }}>
      <svg viewBox={whole.join(" ")} width="100%" height={70} aria-hidden="true">
        {blocks.map(b => <path key={b.code} d={b.path} fill={b.code === selected?.code ? "#ef2d62" : "#e5d3dc"} stroke={b.code === selected?.code ? "#ef2d62" : "none"} strokeWidth={whole[2] * .012} />)}
        <rect ref={miniView} fill="#1673ad1f" stroke="#1673ad" strokeWidth={2} vectorEffect="non-scaling-stroke" />
      </svg>
      <span className={stand.miniMapCaption}><Maximize2 size={10} aria-hidden="true" />全体図</span>
    </button>}
    {shell.fullscreen && overviewReturn && selected && <button type="button" className={`${stand.backToSeat} ${styles.backToSeat}`} data-back-to-seat=""
      onClick={() => { setBox(overviewReturn); setOverviewReturn(null); }}><Crosshair size={16} aria-hidden="true" />選んだ席に戻る</button>}
    {!shell.immersive && <div className={stand.photoOverlay}>
      <SeatPhotoMapSummary selection={seatView} count={photoPlaceCount} onOpen={() => setPhotoRequest(request => request + 1)} />
    </div>}
    {shell.fullscreen && selected && placeTitle && (sheetMatches.length
      ? sheetOpen ? <SeatPhotoSheet key={`${selected.code}|${currentRow ?? ""}|${currentNumber}`} sheetRef={setBoard} title={placeTitle} matches={sheetMatches}
          previous={sheetAt >= 0 ? goTo(photoNeighbours[sheetAt - 1]) : null} next={sheetAt >= 0 ? goTo(photoNeighbours[sheetAt + 1]) : null}
          onFold={() => setSheetOpen(false)} onEnlarge={index => { setSheetPhoto(index); setPhotoRequest(request => request + 1); }} />
        : <SeatPhotoSheetTab tabRef={setBoard} count={sheetMatches.length} image={seatViewInlinePhotoUrl(sheetMatches[0].post)?.replace("name=large", "name=thumb")}
            onOpen={() => { setSheetOpen(true); afterRender(() => setBox(blockView(selected))); }} />
      : sheetOpen && <SeatPhotoEmptySheet key={selected.code} sheetRef={setBoard} title={placeTitle} nearby={goTo(nearbyPhoto)} onFold={() => setSheetOpen(false)} />)}
    </ImmersiveFrame>
    {shell.locked ? <ImmersiveOpenButton openRef={shell.openRef} hint={!shell.hintSeen} onOpen={() => { if (selected) frameBlock(selected); else shell.open(); }} />
      : !shell.immersive && <div className={stand.mapActions}><button type="button" className={stand.whole} onClick={showWhole}>全体図へ</button></div>}
    {selected && currentRow && currentNumber && <SeatSearchOffer venueId="kyocera-dome" localOnly={process.env.NODE_ENV === "development"} key={`${selected.code}:${currentRow}:${currentNumber}`} row={currentRow} number={currentNumber} contextLabel={`${selected.label}・${selected.tier}`} />}
    {selected && <p className={styles.note}>{selected.rowLabelIsPrinted ? "列線は等間隔の目安。矢印は番号が増える向きです。端の番号は列によって変わります。" : "FBは列の印字がない席です。検索では0列を入力してください。矢印は番号が増える向きです。"}</p>}
    {selected && <details className={styles.rowDetails} key={selected.code} data-testid="selected-block-numbers" data-block-code={selected.code}>
      <summary>このブロックの列別の番号・通路</summary><div className={styles.rowBody}>
        <table><caption>{selected.label}・{selected.tier} ／ 掲載{selected.seatCount}席</caption><thead><tr><th scope="col">列</th><th scope="col">席番号</th><th scope="col">通路</th></tr></thead><tbody>
          {selected.rows.map(row => <tr key={row.row} data-block-row={row.row} aria-current={row.row === currentRow ? "true" : undefined}><th scope="row">{selected.rowLabelIsPrinted ? `${row.row}列` : "列の印字なし（検索：0列）"}</th><td>{row.ranges.map(r => `${r.start}〜${r.end}番`).join("・")}{row.row === currentRow && currentNumber && <strong>選択中：{currentNumber}番</strong>}</td><td>{[...new Set(row.ranges.map(r => r.passage))].filter(Boolean).join("・") || "—"}</td></tr>)}
        </tbody></table>
        <p>地図はブロックの範囲を示します。個々の椅子の位置は表示していません。公演別アリーナ・ビスタの配置は主催者の案内で確認してください。</p>
        <a href="https://www.kyoceradome-osaka.jp/seat/pdf/kyoceradome_seat.pdf" target="_blank" rel="noopener noreferrer">公式座席図 ↗</a>
      </div>
    </details>}
  </DomeSeatFrame>;
}
