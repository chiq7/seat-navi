"use client";
import { trackVenueFacilityOpen } from "@/lib/venueAnalytics";
import { useEffect, useRef, useState, useImperativeHandle, useId, type Ref } from "react";
import { HeartPulse, Info, Milk, X, Cigarette } from "lucide-react";
import { AccessibleSign, ChangingSign, ElevatorSign, FoodSign, LockerSign, MenSign, StairsSign, StrollerSign, ToiletSign, WomenSign } from "../DomeFacilitySigns";
import type { DedicatedVenueGuide, GuideFacility } from "@/data/venueGuides/types";
import { availablePurposes, changeFacilityOutsideView, changeFacilityPlace, facilitiesAroundLandmark, facilitiesForOutsideView, filterFacilities, groupsAroundLandmark, hasUsableLuggage, initialFacilityState, linkFacilitySeatFloor, purposes, resolveLandmarks, selectedFacilityGroup, visibleGroups, type FacilityConfig, type Purpose } from "./facilityFinderState";
import { mapProjection, type MapBox } from "./standMap";
import styles from "./VenueFacilityFinder.module.css";
import VenueGateLabel from "./VenueGateLabel";
import { VENUE_ACCESS_EVENT, type VenueAccessDetail } from "@/lib/venueAccess";
import mapStyles from "./VenueFacilityMapCanvas.module.css";

const purposeIcons = { トイレ: ToiletSign, 荷物: LockerSign, 飲食: FoodSign, 赤ちゃん: Milk, 案内: Info, AED: HeartPulse };
function FixtureIcon({ item, size = 23 }: { item: GuideFacility; size?: number }) {
  const Icon = item.kind === "no-storage" ? Info : item.kind === "stroller" ? StrollerSign : item.kind === "diaper" ? ChangingSign : item.kind === "stairs" || item.kind === "escalator" ? StairsSign : item.kind === "elevator" ? ElevatorSign : item.kind === "accessible-parking" ? AccessibleSign : item.kind === "smokingarea" ? Cigarette : item.toiletType === "women" ? WomenSign : item.toiletType === "men" ? MenSign : item.toiletType === "accessible" ? AccessibleSign : purposeIcons[item.purpose];
  return <Icon size={size} aria-hidden="true"/>;
}
function GroupIcon({ items }: { items: GuideFacility[] }) {
  const toilet = items[0].purpose === "トイレ";
  if (items[0].purpose === "案内" && new Set(items.map(f => f.kind)).size > 1) return <Info size={28} aria-hidden="true"/>;
  if (!toilet) return <FixtureIcon item={items[0]} size={28}/>;
  const types = new Set(items.map(f => f.toiletType));
  return <span className={mapStyles.toiletIcon}><span>{types.has("mixed") || types.has("women") && types.has("men") ? <ToiletSign size={27}/> : types.has("women") ? <WomenSign size={26}/> : types.has("men") ? <MenSign size={26}/> : types.has("accessible") ? null : <ToiletSign size={27}/>}</span>{types.has("accessible") && <AccessibleSign size={23}/>}</span>;
}
export type FacilityFinderHandle = { linkSeatFloor: (floor: string | null) => void; showLuggage: () => void };
type Props = { guide: DedicatedVenueGuide; config: FacilityConfig; ref?: Ref<FacilityFinderHandle> };
export default function VenueFacilityFinder({ guide, config, ref }: Props) {
  const [state, setState] = useState(() => initialFacilityState(guide.facilities, config));
  const [outsideViewId, setOutsideViewId] = useState(() => config.outsideViews?.find(v => v.diagramId === config.outsideDiagramId)?.id ?? config.outsideDiagramId);
  const [landmarkText, setLandmarkText] = useState(""), [landmarkError, setLandmarkError] = useState("");
  const [landmarkCandidates, setLandmarkCandidates] = useState<string[]>([]);
  const [size, setSize] = useState({ width: 650, height: 430 });
  const canvas = useRef<HTMLDivElement>(null);
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
  const baseRadius = diagram.viewBox[2] * .27;
  const radius = origin && config.landmarkGroupIds?.[origin.id] !== undefined ? Math.max(baseRadius, ...nearby.map(g => Math.max(Math.abs(g.x - origin.x), Math.abs(g.y - origin.y) / .7) + diagram.viewBox[2] * .06)) : baseRadius;
  const activeGroup = selectedFacilityGroup(state.group, nearby, config.groups, diagram.id);
  const mappedIds = new Set(nearby.flatMap(g => g.memberIds));
  const placed = filtered.filter(f => mappedIds.has(f.id) && (!activeGroup || activeGroup.memberIds.includes(f.id)));
  const allMappedIds = new Set(config.groups.filter(g => g.diagramId === diagram.id).flatMap(g => g.memberIds));
  const unplaced = activeGroup ? [] : filtered.filter(f => !allMappedIds.has(f.id) && (!origin || config.landmarkFacilityIds?.[origin.id] !== undefined || origin.kind !== "station" || config.meta[f.id]?.area === origin.label)).sort((a, b) => `${config.meta[a.id]?.area} ${a.name}`.localeCompare(`${config.meta[b.id]?.area} ${b.name}`, "ja"));
  const item = [...placed, ...unplaced].find(f => f.id === state.selected);
  const camera: MapBox = origin && origin.kind !== "station" ? [origin.x - radius, origin.y - radius * .7, radius * 2, radius * 1.4] : diagram.viewBox as MapBox;
  const projection = mapProjection(camera, size.width, size.height);
  const primary = new Set(config.primaryLandmarks[diagram.id] ?? []);
  const primaryIds = config.primaryLandmarks[diagram.id] ?? [];
  const mapMarks = diagram.landmarks.filter(m => (primary.has(m.id) || m.id === state.origin) && (!origin || m.id === origin.id)).sort((a, b) => primaryIds.indexOf(a.id) - primaryIds.indexOf(b.id));
  const venueLabel = outsideView ? outsideView.venueLabel : config.venueLabel;
  const venuePoint = state.scope === "場外" && !origin && venueLabel ? projection.project(venueLabel.point) : null;
  const venueWidth = venueLabel ? Math.min(Math.max(80, venueLabel.name.length * 13), Math.max(1, size.width - 16)) : 0;
  const venueHeight = venueLabel ? Math.ceil(venueLabel.name.length * 13 / venueWidth) * 18 : 0;
  const venueBox = venuePoint ? {
    x: Math.max(venueWidth / 2 + 8, Math.min(size.width - venueWidth / 2 - 8, venuePoint[0])),
    y: Math.max(venueHeight / 2 + 8, Math.min(size.height - venueHeight / 2 - 8, venuePoint[1])),
    width: venueWidth,
  } : null;
  const occupied: number[][] = [];
  const positions = nearby.filter(g => !mapMarks.some(m => g.memberIds.length === 1 && g.memberIds[0] === m.id)).map(g => {
    const p = projection.project([g.x, g.y]);
    let x = Math.max(27, Math.min(size.width - 27, p[0])), y = Math.max(32, Math.min(size.height - 32, p[1]));
    const offsets = [[0, 0], [-24, 0], [24, 0], [-52, 0], [52, 0], [0, -64], [0, 64], [-52, -64], [52, -64], [-52, 64], [52, 64]];
    for (const [dx, dy] of offsets) {
      const cx = x + dx, cy = y + dy;
      if (cx < 27 || cx > size.width - 27 || cy < 32 || cy > size.height - 32) continue;
      if (venueBox && Math.abs(cx - venueBox.x) < venueBox.width / 2 + 25 && Math.abs(cy - venueBox.y) < 38) continue;
      if (!occupied.some(o => Math.abs(cx - o[0]) < 48 && Math.abs(cy - o[1]) < 58)) { x = cx; y = cy; break; }
    }
    occupied.push([x, y]); return { g, x, y, point: p };
  });
  const markBoxes: { x: number; y: number; width: number }[] = venueBox ? [venueBox] : [];
  const markPositions = mapMarks.flatMap(m => {
    const point = projection.project([m.x, m.y]);
    const labelPoint = projection.project(config.landmarkLabelPoints?.[m.id] ?? [m.x, m.y]);
    const label = config.landmarkLabels?.[m.id] ?? (m.kind === "gate" && /^\d+$/.test(m.label) ? `GATE ${m.label}` : m.label);
    const width = Math.max(72, [...label].reduce((n, c) => n + (/[\x00-\x7f]/.test(c) ? 7 : 12), 18));
    const offsets = [[0, 0], [0, -44], [0, 44], [-44, 0], [44, 0], [-36, -36], [36, -36], [-36, 36], [36, 36], [0, -72], [0, 72]];
    for (const [dx, dy] of offsets) {
      const x = Math.max(width / 2 + 4, Math.min(size.width - width / 2 - 4, labelPoint[0])) + dx, y = labelPoint[1] + dy;
      if (x < width / 2 + 4 || x > size.width - width / 2 - 4 || y < 24 || y > size.height - 24) continue;
      if (occupied.some(p => Math.abs(p[0] - x) < width / 2 + 28 && Math.abs(p[1] - y) < 55)) continue;
      if (markBoxes.some(p => Math.abs(p.x - x) < (width + p.width) / 2 + 4 && Math.abs(p.y - y) < 48)) continue;
      markBoxes.push({ x, y, width });
      return [{ m, x, y, point, label }];
    }
    if (m.id === state.origin) {
      const x = Math.max(width / 2 + 4, Math.min(size.width - width / 2 - 4, point[0]));
      const y = Math.max(24, Math.min(size.height - 24, point[1]));
      markBoxes.push({ x, y, width });
      return [{ m, x, y, point, label }];
    }
    return [];
  });
  function clearLandmarkInput() { setLandmarkText(""); setLandmarkError(""); setLandmarkCandidates([]); }
  function place(patch: Parameters<typeof changeFacilityPlace>[1]) { setState(s => changeFacilityPlace(s, patch, patch.scope === "場外" ? facilitiesForOutsideView(guide.facilities, outsideView, config) : guide.facilities, config)); clearLandmarkInput(); }
  function outsideArea(id: string) { setOutsideViewId(id); setState(changeFacilityOutsideView); clearLandmarkInput(); }
  function purpose(p: Purpose) { setState(s => ({ ...s, purpose: p, query: "", toilet: "", group: null, selected: null })); }
  function selectOrigin(id: string) { setState(s => ({ ...s, origin: id, group: null, selected: null })); setLandmarkCandidates([]); setLandmarkError(""); }
  function whole() { setState(s => ({ ...s, origin: null, group: null, selected: null })); clearLandmarkInput(); }
  useEffect(() => {
    if (!canvas.current) return;
    const observer = new ResizeObserver(entries => { const { width, height } = entries[0].contentRect; setSize({ width, height }); });
    observer.observe(canvas.current);
    return () => observer.disconnect();
  }, [diagram.id, hasMap]);
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
      requestAnimationFrame(() => canvas.current?.scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",block:"start"}));
    };
    window.addEventListener(VENUE_ACCESS_EVENT, open);
    return () => window.removeEventListener(VENUE_ACCESS_EVENT, open);
  }, [guide, config]);
  function resultRow(f: GuideFacility) {
    const publicMeta = config.meta[f.id];
    const name = publicMeta?.name ?? f.name, location = publicMeta?.location ?? f.location;
    return <button type="button" key={f.id} className={styles.resultRow} aria-pressed={state.selected === f.id} onClick={() => { if(state.selected!==f.id)trackVenueFacilityOpen(f.purpose,state.scope,guide.venueId);setState(s => ({ ...s, selected: f.id })); }}>
      <FixtureIcon item={f}/><span><strong>{name}</strong><small>{f.floor}{location !== name ? `・${location}` : ""}</small></span><span aria-hidden="true">›</span>
    </button>;
  }
  return <div className={`${styles.finder} ${mapStyles.finder}`} data-testid="venue-facility-finder">
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
      <div className={styles.mapPanel}>
        <div className={styles.panelHeading}><strong>{state.scope === "場内" ? state.floor : outsideView?.floorLabel ?? outsideView?.label ?? "会場・主要駅の位置関係"}{origin ? `・${config.landmarkLabels?.[origin.id] ?? origin.label}周辺` : ""}</strong><button type="button" onClick={whole}>全体図へ</button></div>
        {hasMap ? <div ref={canvas} className={mapStyles.canvas} data-testid="facility-map" data-diagram={diagram.id} data-access-origin={state.origin ?? ""}>
          <svg viewBox={camera.join(" ")} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
            {diagram.contextPaths.map((d, i) => <path key={`context-${i}`} d={d} fill="#fbf1f6" stroke="#d4b8c6" strokeWidth={1 / projection.scale}/>)}
            {diagram.concoursePaths.map((d, i) => <path key={`concourse-${i}`} d={d} fill="none" stroke="#ece4eb" strokeWidth={14}/>)}
          </svg>
          <svg viewBox={`0 0 ${size.width} ${size.height}`} aria-hidden="true">{venueBox && venuePoint && Math.hypot(venueBox.x - venuePoint[0], venueBox.y - venuePoint[1]) > 8 && <line x1={venuePoint[0]} y1={venuePoint[1]} x2={venueBox.x} y2={venueBox.y} stroke="#c390a8"/>}{positions.filter(p => Math.hypot(p.x - p.point[0], p.y - p.point[1]) > 8).map(p => <line key={p.g.id} x1={p.point[0]} y1={p.point[1]} x2={p.x} y2={p.y} stroke="#c390a8"/>)}{markPositions.filter(p => Math.hypot(p.x - p.point[0], p.y - p.point[1]) > 8).map(p => <line key={p.m.id} x1={p.point[0]} y1={p.point[1]} x2={p.x} y2={p.y} stroke="#c7b395"/>)}</svg>
          {positions.map(({ g, x, y }) => <button type="button" key={g.id} className={mapStyles.marker} style={{ left: x, top: y }} aria-pressed={state.group === g.id} aria-label={`${g.label}・${g.purpose} ${g.memberIds.length}件`} onClick={() => setState(s => ({ ...s, group: s.group === g.id ? null : g.id, selected: null }))}>
            <GroupIcon items={g.memberIds.map(id => guide.facilities.find(f => f.id === id)!)}/>{g.memberIds.length > 1 && <small>{g.memberIds.length}</small>}
          </button>)}
          {markPositions.map(({ m, x, y, label }) => <button type="button" className={mapStyles.landmark} key={m.id} style={{ left: x, top: y }} aria-pressed={state.origin === m.id} onClick={() => selectOrigin(m.id)}>{m.kind === "gate" ? <VenueGateLabel label={label}/> : label}</button>)}
          {state.scope === "場外" && <>{(!outsideView || outsideView.northUp || outsideView.northDirection) && <span className={mapStyles.north}>北 {outsideView?.northDirection ?? "↑"}</span>}<span className={mapStyles.schematic}>位置関係の略図</span>{venueLabel && venueBox && <span className={mapStyles.venueName} style={{ left: venueBox.x, top: venueBox.y, width: venueBox.width }}>{venueLabel.name}</span>}</>}
        </div> : <p className={styles.noMap}>場所の案内から設備を選んでください。</p>}
      </div>
      <div className={styles.results}>
        <div className={styles.panelHeading}><strong>{activeGroup?.label ?? state.purpose}　地図 {placed.length}件{unplaced.length > 0 ? `・場所の案内 ${unplaced.length}件` : ""}</strong>{(state.group || state.query || state.toilet) && <button type="button" onClick={() => setState(s => ({ ...s, group: null, query: "", toilet: "", selected: null }))}>絞込み解除</button>}</div>
        {item && <div className={styles.detail}><div><strong><FixtureIcon item={item}/>{config.meta[item.id]?.name ?? item.name}</strong><button type="button" aria-label="設備の詳細を閉じる" onClick={() => setState(s => ({ ...s, selected: null }))}><X size={18}/></button></div>
          <p>{item.floor}・{config.meta[item.id]?.location ?? item.location}</p><p>{config.meta[item.id]?.detail ?? item.detail}</p>
          {item.purpose === "荷物" && item.kind !== "no-storage" && <p>{item.kind === "baggage-port" ? "バゲッジポート" : item.storageKind === "staffed" ? "店舗での預かり" : "コインロッカー"}・{config.meta[item.id]?.accessCondition}</p>}
          {(item.purpose !== "荷物" || item.kind === "no-storage") && config.meta[item.id]?.accessCondition && <p>{config.meta[item.id].accessCondition}</p>}
          {(config.meta[item.id]?.url || item.bookingUrl) && <a href={item.bookingUrl ?? config.meta[item.id]?.url} target="_blank" rel="noopener noreferrer">{item.bookingUrl ? "予約・利用条件" : (item.purpose === "荷物" && item.kind !== "no-storage") || item.purpose === "飲食" ? "料金・利用案内" : "利用案内"} ↗</a>}
        </div>}
        <div className={styles.list}>
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
