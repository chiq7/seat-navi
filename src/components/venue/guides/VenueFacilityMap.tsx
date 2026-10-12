"use client";

import VenueGateLabel from "../template/VenueGateLabel";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Baby, HeartPulse, Info, Phone, Plug, Ticket, MoveVertical, Cigarette } from "lucide-react";
import type { DedicatedVenueGuide, GuideFacility } from "@/data/venueGuides/types";
import { ToiletSign, WomenSign, MenSign, AccessibleSign, LockerSign, FoodSign, StairsSign, ElevatorSign } from "../DomeFacilitySigns";
import { groupMapFacilities } from "@/lib/facilityMapGroups";
import { placeMapLabels } from "@/lib/facilityMapLabels";
import { landmarkDisplayName, resolveGuideOrigin, resolveGuideGate, type FinderState, type GuideOrigin, type GuideGate } from "./guideState";
import { projectMapPoint } from "./mapGeometry";
import styles from "./guide.module.css";
import kyoceraFloorStyles from "./KyoceraFloorLabels.module.css";
import { kyoceraFloorMarks, kyoceraEquipmentLabels } from "./kyoceraFloorLabels";
import { kyoceraFacilityCamera, pointInKyoceraCamera } from "./kyoceraFacilityState";
import { groupKyoceraFacilityAreas } from "./kyoceraFacilityAreas";

const facilityIcons = { women: WomenSign, men: MenSign, accessible: AccessibleSign, mixed: ToiletSign,
  locker: LockerSign, baby: Baby, aed: HeartPulse, food: FoodSign, elevator: ElevatorSign,
  escalator: MoveVertical, ticket: Ticket, phone: Phone, battery: Plug, smoking: Cigarette, information: Info };
function facilityIconKind(item: Pick<GuideFacility, "purpose" | "toiletType" | "kind">): keyof typeof facilityIcons {
  if (item.purpose === "トイレ") return item.toiletType === "women" ? "women" : item.toiletType === "men" ? "men" : item.toiletType === "accessible" ? "accessible" : "mixed";
  if (item.purpose === "荷物") return "locker";
  if (item.purpose === "赤ちゃん") return "baby";
  if (item.purpose === "AED") return "aed";
  if (item.purpose === "飲食") return "food";
  if (item.kind?.startsWith("elevator")) return "elevator";
  return item.kind === "escalator" ? "escalator" : item.kind === "ticket-sell" ? "ticket" : item.kind === "phone" ? "phone" : item.kind === "mbr" ? "battery" : item.kind === "smokingarea" ? "smoking" : "information";
}
export function FacilityIcon({ item, size = 20 }: { item: Pick<GuideFacility, "purpose" | "toiletType" | "kind">; size?: number }) {
  const Icon = facilityIcons[facilityIconKind(item)];
  return <Icon size={size} aria-hidden="true" />;
}

type Props = { guide: DedicatedVenueGuide; items: GuideFacility[]; state: FinderState;
  onFloor: (floor: string) => void; onSelect: (id: string) => void; onGroup: (ids: string[]) => void;
  onOrigin: (origin: GuideOrigin | null) => void; onGate: (gate: GuideGate | null) => void;
  onClearSelection: () => void; embedded?: boolean; landmarksOnly?: boolean; selectionSummary?: ReactNode; compactFinder?: boolean };

export default function VenueFacilityMap({ guide, items, state, onFloor, onSelect, onGroup, onOrigin, onGate, onClearSelection, embedded = false, landmarksOnly = false, selectionSummary, compactFinder = false }: Props) {
  const diagram = guide.diagrams?.find(item => item.scope === state.scope && (state.scope === "場外" || item.floor === state.floor));
  const kyoceraFloor = guide.venueId === "kyocera-dome" && state.scope === "場内" && ["3F", "5F"].includes(state.floor);
  const resolvedOrigin = useMemo(() => resolveGuideOrigin(guide, state.origin), [guide, state.origin]);
  const origin = resolvedOrigin?.diagramId === diagram?.id ? resolvedOrigin : null;
  const camera = useMemo(() => diagram ? compactFinder ? kyoceraFacilityCamera(diagram, origin) : diagram.viewBox : [0, 0, 1, 1], [diagram, compactFinder, origin]);
  const displayDiagram = useMemo(() => {
    if (!diagram || !compactFinder) return diagram;
    const gates = diagram.landmarks.filter(mark => mark.kind === "gate").sort((a, b) => a.label.localeCompare(b.label, "ja", { numeric: true }));
    const representatives = new Set([0, .25, .5, .75].map(position => gates[Math.floor(gates.length * position)]?.id));
    return { ...diagram, viewBox: camera, landmarks: diagram.landmarks.filter(mark => pointInKyoceraCamera(mark, camera)
      && (diagram.scope !== "場外" || origin || mark.kind !== "gate" || representatives.has(mark.id) || state.selectedId === mark.id)) };
  }, [diagram, compactFinder, camera, origin, state.selectedId]);
  const resolvedGate = resolveGuideGate(guide, state.outsideGate);
  const gate = resolvedGate?.anchor?.diagramId === diagram?.id ? resolvedGate : null;
  const gateChoices = (diagram?.landmarks ?? []).flatMap(mark => {
    const facility = resolveGuideGate(guide, { diagramId: diagram!.id, landmarkId: mark.id });
    return facility ? [{ mark, facility }] : [];
  });
  const frame = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 640, height: 600 });
  const [nearbyGates,setNearbyGates]=useState<{diagramId:string;ids:string[]}|null>(null);
  const [layer, setLayer] = useState<"equipment" | "food">("equipment");
  const rememberLayerFrame = useRef<number | null>(null);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    if (frame.current) observer.observe(frame.current);
    return () => observer.disconnect();
  }, [diagram?.id]);
  const diagramItems = items.filter(item => item.anchor?.diagramId === diagram?.id && (!compactFinder || pointInKyoceraCamera(item.anchor!, camera)));
  // Resolve the destination before filtering the display layer. A card can
  // select equipment while the overview currently shows food (and vice versa).
  const selected = diagramItems.find(item => item.id === state.selectedId);
  const selectedLayer = selected ? selected.purpose === "飲食" ? "food" : "equipment" : undefined;
  const hasFood = diagramItems.some(item => item.purpose === "飲食");
  const hasEquipment = diagramItems.some(item => item.purpose !== "飲食");
  const activeLayer = selectedLayer ?? (state.purpose === "飲食" ? "food" : state.purpose !== "すべて" ? "equipment"
    : hasFood && !hasEquipment ? "food" : hasEquipment && !hasFood ? "equipment" : layer);
  useEffect(() => {
    if (!selectedLayer) return;
    // Match Tokyo Dome: closing a destination keeps its last selected layer.
    const request = requestAnimationFrame(() => { rememberLayerFrame.current = null; setLayer(selectedLayer); });
    rememberLayerFrame.current = request;
    return () => { cancelAnimationFrame(request); if (rememberLayerFrame.current === request) rememberLayerFrame.current = null; };
  }, [state.selectedId, selectedLayer]);
  function changeLayer(next: "equipment" | "food") {
    // Explicit user intent supersedes automatic destination framing. Cancel a
    // pending remembered layer so a fast click cannot restore the old choice.
    if (rememberLayerFrame.current !== null) cancelAnimationFrame(rememberLayerFrame.current);
    rememberLayerFrame.current = null;
    onClearSelection();
    setLayer(next);
  }
  const mapped = diagramItems.filter(item => activeLayer === "food" ? item.purpose === "飲食" : item.purpose !== "飲食");
  const displayKind = (item: GuideFacility) => compactFinder ? facilityIconKind(item) : item.toiletType ?? (item.kind?.startsWith("elevator") ? "elevator" : item.kind ?? item.purpose);
  // Outside gates have one direct sign shared with their facility entry.
  // Keep them in mapped counts, but do not create a second equipment sign.
  const projected = mapped.filter(item => !gateChoices.some(choice => choice.facility.id === item.id))
    .map(item => ({ id: item.id, ...projectMapPoint(item.anchor!.x, item.anchor!.y, camera, size.width, size.height), kind: displayKind(item) }));
  const iconCell=compactFinder?26:kyoceraFloor?20:24;
  const narrowIconCell=compactFinder?22:18;
  const compact = (sourceGroup: ReturnType<typeof groupMapFacilities>[number]) => {
    // One pictogram per visual kind; mixed already contains both gender symbols.
    let kinds = sourceGroup.kinds;
    if (compactFinder) {
      if (kinds.includes("mixed") || (kinds.includes("women") && kinds.includes("men"))) kinds = ["mixed", ...kinds.filter(kind => !["women", "men", "mixed"].includes(kind))];
      kinds = ["women", "men", "mixed", ...Object.keys(facilityIcons).filter(kind => !["women", "men", "mixed", "accessible"].includes(kind)), "accessible"].filter(kind => kinds.includes(kind));
    }
    const group = { ...sourceGroup, kinds };
    const pairedToilets = compactFinder && kinds.includes("women") && kinds.includes("men");
    const accessibleBelow = compactFinder && kinds.includes("accessible") && kinds.some(kind => ["women", "men", "mixed"].includes(kind));
    const minimumColumns = pairedToilets ? 2 : 1;
    const fixedColumns = accessibleBelow ? minimumColumns : undefined;
    if(kyoceraFloor && size.width<500 && group.points.length>1){
      const sizes=Array.from({length:Math.min(3,group.kinds.length)},(_,i)=>({columns:i+1,width:Math.max(44,(i+1)*narrowIconCell+8),height:Math.max(44,Math.ceil(group.kinds.length/(i+1))*narrowIconCell+20)})).filter(item=>item.columns>=minimumColumns && (!fixedColumns || item.columns===fixedColumns))
        .sort((a,b)=>Number(Math.max(a.width/a.height,a.height/a.width)>1.6)-Number(Math.max(b.width/b.height,b.height/b.width)>1.6)||a.width*a.height-b.width*b.height||Math.abs(a.width-a.height)-Math.abs(b.width-b.height));
      return {...group,...sizes[0],accessibleBelow};
    }
    // Icons stay 20px, while the entire sign remains a >=44px target.
    // Match the actual 24px icon cells, rather than reserving unused 32px rows.
    const candidates = Array.from({ length: Math.min(size.width < 500 ? 4 : 5, group.kinds.length) }, (_, index) => {
      const columns = index + 1, rows = Math.ceil(group.kinds.length / columns);
      return { columns, width: Math.max(44, columns * iconCell + 8), height: Math.max(44, rows * iconCell + 8) };
    }).filter(item=>item.columns>=minimumColumns && (!fixedColumns || item.columns===fixedColumns)).sort((a, b) => a.width * a.height - b.width * b.height || Math.abs(a.width - a.height) - Math.abs(b.width - b.height));
    return { ...group, ...candidates[0],accessibleBelow };
  };
  // The full circular concourse is denser than Tokyo's cropped floor strips.
  // On narrow screens group points within a 92px overview area; keep each
  // individual source anchor unchanged and show that area's extent explicitly.
  const groupingScale = kyoceraFloor ? (size.width < 500 ? .4 : .75) : size.width < 500 ? .5 : 1;
  // Walk the ring before grouping, rather than letting source file ordering
  // leave isolated signs between already crowded groups. Coordinates stay exact.
  if (kyoceraFloor && size.width < 500) projected.sort((a,b) =>
    Math.atan2(a.y-size.height/2,a.x-size.width/2)-Math.atan2(b.y-size.height/2,b.x-size.width/2));
  const rawGroups = groupMapFacilities(projected.map(point => ({ ...point, x: point.x * groupingScale, y: point.y * groupingScale })), size.width)
    .map(group => ({ ...group, x: group.x / groupingScale, y: group.y / groupingScale,
      points: group.points.map(point => ({ ...point, x: point.x / groupingScale, y: point.y / groupingScale })) }));
  const foodAreas = compactFinder && kyoceraFloor && activeLayer === "food";
  const areaFinder = compactFinder && guide.venueId === "kyocera-dome";
  const referencePoints = areaFinder ? guide.facilities.filter(item => item.anchor?.diagramId === diagram?.id)
    .map(item => ({ id: item.id, ...projectMapPoint(item.anchor!.x, item.anchor!.y, camera, size.width, size.height), kind: displayKind(item) })) : projected;
  const groups = areaFinder ? groupKyoceraFacilityAreas(projected, state.floor, state.purpose, state.scope, referencePoints).map(group => {
    if (foodAreas) return { ...group, width: size.width < 500 ? 52 : 58, height: size.width < 500 ? 52 : 60, accessibleBelow: false };
    const fitted = compact(group);
    return { ...fitted, width: Math.max(state.purpose === "赤ちゃん" ? 68 : size.width < 500 ? 52 : 58, fitted.width), height: Math.max(52, fitted.height + (kyoceraFloor && size.width < 500 && group.points.length > 1 ? 0 : 14)) };
  }) : rawGroups.map(compact);
  const markLabels = (displayDiagram?.landmarks ?? []).map(mark => {
    const point = projectMapPoint(mark.x, mark.y, camera, size.width, size.height);
    const width = Math.max(14, [...mark.label].reduce((sum, char) => sum + (/[^\x00-\x7f]/.test(char) ? 10 : 6), 0) + 4);
    // All measured landmarks must remain visible. The shared helper may thin
    // passage-kind labels, so use its non-dropping annotation mode here.
    const chosen = origin?.kind === "landmark" && origin.id === mark.id;
    const direct = mark.kind === "gate" || (diagram?.scope === "場外" && ["station", "exit"].includes(mark.kind));
    return { id: `landmark:${mark.id}`, kind: "facility" as const, x: point.x, y: point.y,
      width:chosen ? 112 : gate?.id === mark.id ? 64 : direct ? Math.max(44, width) : mark.kind === "stairs" ? 22 : width,
      height:chosen || direct ? 44 : mark.kind === "stairs" ? 22 : 16 };
  });
  const pinnedLandmarkId = origin?.kind === "landmark" ? origin.id : undefined;
  const selectedShopId = foodAreas && selected ? diagram?.landmarks.find(mark => mark.kind === "shop" && mark.id === `landmark-${selected.id}`)?.id : undefined;
  const fixedKyoceraMarks = useMemo(()=>kyoceraFloor && displayDiagram ? kyoceraFloorMarks(displayDiagram, size.width, size.height,
    { food: !compactFinder && activeLayer === "food", pinnedIds: [pinnedLandmarkId, selectedShopId].filter((id): id is string => Boolean(id)), detail: compactFinder && Boolean(origin) }) : [],[kyoceraFloor,displayDiagram,size.width,size.height,activeLayer,pinnedLandmarkId,selectedShopId,compactFinder,origin]);
  const equipmentLabels = groups.map(group=>({id:group.id,kind:"facility" as const,x:group.x,y:group.y,width:group.width,height:group.height}));
  const placed = kyoceraFloor ? kyoceraEquipmentLabels(equipmentLabels,fixedKyoceraMarks,size.width,size.height,
    areaFinder ? { maxShift: 80, centre: projectMapPoint(359,341,camera,size.width,size.height), maxTurn: Math.PI / 8 } : undefined)
    : placeMapLabels([...equipmentLabels,...markLabels],size.width,size.height,{facilitiesFirst:true});
  const labels = placed.filter(label => !label.id.startsWith("landmark:"));
  const placedMarks = kyoceraFloor ? fixedKyoceraMarks : placed.filter(label => label.id.startsWith("landmark:"));
  const originFacilities = guide.facilities.filter(item => item.anchor?.diagramId === diagram?.id);
  const scale = diagram ? projectMapPoint(0, 0, camera, size.width, size.height).scale : 1;
  // A dense, full-concourse diagram needs more label space on phones. Add
  // vertical room instead of shrinking targets, hiding landmarks or zooming.
  const needsLabelRoom = size.width < 500 && (diagram?.landmarks.length ?? 0) >= 70
    && (diagram?.landmarks.filter(mark => mark.kind === "gate").length ?? 0) >= 12;
  if (state.scope === "場外" && !diagram) return <div className={styles.empty} data-testid="outside-pending"><strong>場外図は確認中です</strong><p>駅出口・入口・入場前設備の位置を照合しています。確認済みの公式道順はアクセス案内から確認できます。</p><a href="#venue-access">アクセス案内へ ↓</a></div>;
  if (!diagram) return <div className={styles.floorOverview} aria-label="全フロアの図">
    {guide.diagrams?.filter(item => item.scope === "場内").map(item => <button key={item.id} onClick={() => onFloor(item.floor)} aria-label={`${item.floor}の図を見る`}>
      <svg viewBox={item.viewBox.join(" ")} aria-hidden="true"><g fill="#ead8e1">{item.contextPaths.map((path, i) => <path d={path} key={i} />)}</g><g fill="#faf0f4">{item.concoursePaths.map((path, i) => <path d={path} key={i} />)}</g>{guide.facilities.filter(facility => facility.anchor?.diagramId === item.id).map(facility => <circle key={facility.id} cx={facility.anchor!.x} cy={facility.anchor!.y} r="7" fill="#a93164" />)}</svg>
      <strong>{item.floor}</strong><span>図上{guide.facilities.filter(facility => facility.anchor?.diagramId === item.id).length}件</span>
    </button>)}
    {state.floor !== "すべて" && <p>この階の図上位置は確認中です。</p>}
  </div>;
  return <div className={embedded ? styles.embeddedFacilityMap : styles.facilityMapShell} data-testid="facility-map-shell" data-embedded={embedded || undefined}>
    {!embedded && <div className={styles.mapHeading}><strong>{state.scope === "場外" ? "場外・入場前" : `${state.floor}・${activeLayer === "food" ? "売店・飲食" : "設備"}`}案内</strong><span>図上{mapped.length}件</span>{state.scope === "場内" && <button onClick={() => onFloor("すべて")}>フロア一覧へ</button>}</div>}
    {!compactFinder && <div className={styles.landmarkPicker}><label>{kyoceraFloor ? "地図の目印（設備検索とは別）" : "近くの目印"}<select aria-label="近くの目印を選ぶ"
      value={origin ? `${origin.kind}:${origin.id}` : ""} onChange={event => {
        const [kind, ...parts] = event.target.value.split(":"), id = parts.join(":");
        if (kind === "landmark" && diagram.landmarks.some(item => item.id === id)) onOrigin({ diagramId:diagram.id, landmarkId:id });
        else if (kind === "facility" && originFacilities.some(item => item.id === id)) onOrigin({ diagramId:diagram.id, facilityId:id });
        else onOrigin(null);
      }}><option value="">近くの目印を選ぶ</option>
      {landmarksOnly && origin && (origin.kind === "facility" || diagram.landmarks.find(mark => mark.id === origin.id)?.kind === "stairs" || diagram.landmarks.find(mark => mark.id === origin.id)?.kind === "shop") && <option value={`${origin.kind}:${origin.id}`}>選択中：{origin.name}（図・一覧から選択）</option>}
      {[["gate","ゲート"],["passage","通路"],["pillar","柱"],["station","駅"],["exit","駅出口"],["entrance","出入口"],["stairs","階段"],["plaza","広場"],["shop","売店"]].map(([kind,name]) => {
        const marks = diagram.landmarks.filter(item => item.kind === kind && (!landmarksOnly || !["shop", "stairs"].includes(item.kind)));
        return marks.length ? <optgroup key={kind} label={name}>{marks.map(mark => <option key={mark.id} value={`landmark:${mark.id}`}>{landmarkDisplayName(diagram,mark)}</option>)}</optgroup> : null;
      })}
      {!landmarksOnly && originFacilities.length > 0 && <optgroup label="設備">{originFacilities.map(item => <option key={item.id} value={`facility:${item.id}`}>{item.name}・{item.location}</option>)}</optgroup>}
      </select></label></div>}
    {!compactFinder && gateChoices.length > 0 && <div className={styles.landmarkPicker}><label>入場ゲート<select aria-label="入場ゲートを選ぶ"
      value={gate?.id ?? ""} onChange={event => {
        const choice = gateChoices.find(item => item.facility.id === event.target.value);
        onGate(choice ? { diagramId: diagram.id, landmarkId: choice.mark.id } : null);
      }}><option value="">チケットのゲートを選ぶ</option>{gateChoices.map(({mark,facility}) =>
        <option key={mark.id} value={facility.id}>{facility.name}・{facility.location}</option>)}</select></label></div>}
    {state.scope === "場外" && (origin || gate) && <div className={styles.outsideSelection} aria-live="polite">
      <span>{origin ? `${origin.name}付近` : "駅・出口・目印"}{gate ? `／選択ゲート：${gate.name}` : ""}</span>
      {gate && <button type="button" onClick={() => onGate(null)}>入場ゲートを解除</button>}
      {origin && gate && <button type="button" onClick={() => { onOrigin(null); onGate(null); }}>目印とゲートを解除</button>}
    </div>}
    {!compactFinder && state.purpose === "すべて" && hasFood && hasEquipment && <div className={styles.mapLayer} role="group" aria-label="図に表示する情報"><button aria-pressed={activeLayer === "equipment"} onClick={() => changeLayer("equipment")}>設備</button><button aria-pressed={activeLayer === "food"} onClick={() => changeLayer("food")}>売店・飲食</button></div>}
    {kyoceraFloor && !compactFinder && <><div className={kyoceraFloorStyles.legend} data-testid="kyocera-floor-legend"><span data-kind="gate">ゲート</span><span data-kind="passage">通＝座席への通路</span>{activeLayer === "food" && <span data-kind="shop">店＝売店の番号</span>}</div><p className={kyoceraFloorStyles.note} data-testid="kyocera-map-search-boundary">番号は代表的な目印です。設備アイコンをタップすると詳細を確認できます。</p></>}
    {kyoceraFloor && selectionSummary}
    <div ref={frame} className={styles.facilityCanvas} data-testid="facility-map" data-diagram-id={diagram.id} data-camera={camera.join(" ")} style={kyoceraFloor && size.width < 500 ? {height:440} : needsLabelRoom ? {height:520} : undefined}>
        <svg viewBox={camera.join(" ")} className={styles.facilityBase} aria-label={`${guide.name} ${state.floor}の設備図`}>
          <defs><clipPath id={`guide-extent-${diagram.id}`}><rect x={diagram.viewBox[0]} y={diagram.viewBox[1]} width={diagram.viewBox[2]} height={diagram.viewBox[3]} /></clipPath></defs>
          <g clipPath={`url(#guide-extent-${diagram.id})`}>
          <g fill="#ead8e1" stroke="#d4b9c6" strokeWidth="1">{diagram.contextPaths.map((path, i) => <path key={i} d={path} />)}</g>
        <g fill="#fff5f8" stroke="#d4b9c6" strokeWidth="1">{diagram.concoursePaths.map((path, i) => <path key={i} d={path} />)}</g>
          </g>
        {mapped.filter(item => !areaFinder || state.groupIds?.includes(item.id) || selected?.id === item.id).map(item => <circle key={item.id} cx={item.anchor!.x} cy={item.anchor!.y} r="3" fill="#b793a5" />)}
        {origin && <g data-origin={origin.id} data-origin-kind={origin.kind}><circle cx={origin.x} cy={origin.y} r={10 / scale} fill="#dce9ff" stroke="#365ba8" strokeWidth={3 / scale} /></g>}
        {selected?.anchor && selected.id !== gate?.id && <g data-destination={selected.id}><circle cx={selected.anchor.x} cy={selected.anchor.y} r={6 / scale} fill="#a93164" stroke="white" strokeWidth={1 / scale} /></g>}
        {gate?.anchor && <g data-destination={gate.id} data-gate-destination={gate.id}><circle cx={gate.anchor.x} cy={gate.anchor.y} r={6 / scale} fill="#a93164" stroke="white" strokeWidth={1 / scale} /></g>}
      </svg>
      <svg viewBox={`0 0 ${size.width} ${size.height}`} className={styles.leaders} aria-hidden="true">
        {groups.filter(group => group.points.length > 1 && (!areaFinder || group.points.some(point => state.groupIds?.includes(point.id) || selected?.id === point.id))).map(group => {
          const left = Math.min(...group.points.map(point => point.x)) - 5, top = Math.min(...group.points.map(point => point.y)) - 5;
          return <rect key={group.id} data-area-coverage={group.id} x={left} y={top}
            width={Math.max(...group.points.map(point => point.x)) - left + 5} height={Math.max(...group.points.map(point => point.y)) - top + 5}
            rx="6" fill={areaFinder ? "#cf428724" : "#cf428712"} stroke={areaFinder ? "#b6387670" : "#c763973d"} strokeWidth="1" strokeDasharray="3 3" />;
        })}
        {labels.map(label => <line key={label.id} x1={label.x} y1={label.y} x2={label.left} y2={label.top} stroke="#b595a6" />)}
        {kyoceraFloor && fixedKyoceraMarks.flatMap(label=>label.memberPoints.map(point=><g key={point.id} data-official-landmark-anchor={point.id}>{Math.hypot(label.left-point.x,label.top-point.y)>12 && <line x1={point.x} y1={point.y} x2={label.left} y2={label.top} stroke="#aa8295" strokeWidth=".7"/>}<circle cx={point.x} cy={point.y} r="1.5" fill="#705461"/></g>))}
        {(!kyoceraFloor ? placedMarks : []).filter(label => Math.hypot(label.left-label.x,label.top-label.y) > 8).map(label => <g key={label.id}>
          <line x1={label.x} y1={label.y} x2={label.left} y2={label.top} stroke="#b7a8b1" strokeWidth=".7" />
          <circle cx={label.x} cy={label.y} r="1.5" fill="#89717f" />
        </g>)}
      </svg>
      {placedMarks.map(label => { const mark = diagram.landmarks.find(item => `landmark:${item.id}` === label.id)!;
        const chosen = origin?.kind === "landmark" && origin.id === mark.id;
        if (kyoceraFloor) {
          const compact=fixedKyoceraMarks.find(item=>item.id===label.id)!;const selectedMark=origin?.kind==="landmark"&&compact.memberIds.includes(origin.id);const attrs={"data-landmark-id":mark.id,"data-landmark-kind":mark.kind,"data-landmark-ids":compact.memberIds.join(" "),"data-kind":mark.kind,"data-selected":selectedMark,"data-source-x":label.x,"data-source-y":label.y,"data-label-shift":Number(Math.hypot(label.left-label.x,label.top-label.y).toFixed(3)),className:kyoceraFloorStyles.mark,title:landmarkDisplayName(diagram,mark),style:{left:Number(label.left.toFixed(3)),top:Number(label.top.toFixed(3)),width:label.width,height:label.height}};
          const quietPassage=compactFinder && mark.kind==="passage";
          const content=quietPassage?<strong>{compact.value}通路</strong>:mark.kind==="stairs"?<small>階段</small>:mark.kind==="plaza"?<strong>{compact.value.replace(/プラザ/g,"")}</strong>:<><small>{mark.kind==="passage"?"通":mark.kind==="shop"?"店":compact.type}</small><strong>{compact.value}</strong></>;
          return mark.kind==="gate" ? <button key={mark.id} {...attrs} type="button" data-direct-landmark={mark.kind} aria-pressed={selectedMark} aria-label={`${compact.memberIds.length>1?`ゲート${compact.value}付近`:landmarkDisplayName(diagram,mark)}${compactFinder ? "の周辺を見る" : "を目印に選ぶ"}`} onClick={()=>{if(compact.memberIds.length>1)setNearbyGates({diagramId:diagram.id,ids:compact.memberIds});else {setNearbyGates(null);onOrigin({diagramId:diagram.id,landmarkId:mark.id});}}}>{content}</button> : <span key={mark.id} {...attrs} data-quiet={quietPassage}>{content}</span>;
        }
        const destination = compactFinder ? undefined : gateChoices.find(choice => choice.mark.id === mark.id);
        const selectedGate = compactFinder && gateChoices.some(choice => choice.mark.id === mark.id && choice.facility.id === selected?.id);
        const gateSelected = Boolean(destination && gate?.id === destination.facility.id);
        const direct = mark.kind === "gate" || (diagram.scope === "場外" && ["station", "exit"].includes(mark.kind));
        if (direct) return <button key={mark.id} type="button" data-landmark-id={mark.id}
          data-direct-landmark={mark.kind} data-selected={chosen || selectedGate} data-selected-landmark={chosen ? mark.id : undefined}
          data-gate-option={destination?.facility.id} data-spot-ids={destination && mapped.some(item=>item.id === destination.facility.id) ? destination.facility.id : undefined}
          className={`${chosen ? styles.originLandmark : styles.directLandmark} ${gateSelected || selectedGate ? styles.gateDestination : ""}`}
          aria-pressed={destination ? gateSelected : chosen || selectedGate}
          aria-label={destination ? `${destination.facility.name}を入場先に選ぶ` : `${landmarkDisplayName(diagram,mark)}を目印に選ぶ`}
          title={landmarkDisplayName(diagram,mark)} style={{left:label.left,top:label.top,width:label.width,height:label.height}}
          onClick={()=>destination ? onGate({diagramId:diagram.id,landmarkId:mark.id}) : onOrigin({diagramId:diagram.id,landmarkId:mark.id})}>
          {chosen && <small>選んだ場所</small>}{gateSelected && !chosen && <small>入場先</small>}<span><VenueGateLabel label={mark.label}/>{chosen && gateSelected && <small>・入場先</small>}</span></button>;
        if (origin?.kind === "landmark" && origin.id === mark.id) return <button key={mark.id} type="button"
          data-landmark-id={mark.id} data-selected="true" data-selected-landmark={mark.id}
          className={styles.originLandmark} aria-pressed="true" aria-label={`選んだ場所：${landmarkDisplayName(diagram,mark)}`}
          title={landmarkDisplayName(diagram,mark)} style={{left:label.left,top:label.top,width:label.width,height:label.height}}
          onClick={()=>onOrigin({diagramId:diagram.id,landmarkId:mark.id})}><small>選んだ場所</small>
          <span>{mark.kind === "stairs" ? <StairsSign size={18} /> : ["pillar","passage"].includes(mark.kind) ? mark.name ?? mark.label : mark.label}</span></button>;
        return <span key={mark.id} data-landmark-id={mark.id} data-landmark-kind={mark.kind} className={styles.landmarkLabel}
          data-selected={origin?.kind === "landmark" && origin.id === mark.id}
          title={mark.name ?? mark.label} style={{ left:label.left, top:label.top, width:label.width, height:label.height }}>{mark.kind === "stairs" ? <StairsSign size={18} /> : mark.label}</span>;
      })}
      {labels.map(label => {
        const group = groups.find(item => item.id === label.id)!;
        const members = group.points.map(point => mapped.find(item => item.id === point.id)!);
        const pictograms = group.kinds.map(kind => {
          const member = members.find(item => displayKind(item) === kind) ?? (kind === "mixed" ? members.find(item => ["women", "men"].includes(displayKind(item))) : undefined) ?? members[0];
          // One combined drawing also represents a group of separate men's and women's toilets.
          const icon = compactFinder && kind === "mixed" ? { ...member, toiletType: "mixed" as const } : member;
          const title = compactFinder && kind === "mixed" ? "男女トイレ" : member.name;
          return { kind, title, icon };
        });
        return <button key={label.id} className={styles.facilitySign} style={{ left: label.left, top: label.top, width: label.width, height: label.height }}
          data-facility-group={label.id} data-spot-ids={members.map(item => item.id).join(" ")} data-kind-count={group.kinds.length} data-enhanced={compactFinder} data-accessible-below={group.accessibleBelow}
          aria-label={`${members.map(item => item.name).filter((value, i, all) => all.indexOf(value) === i).join("・")}を選ぶ`}
          aria-pressed={members.some(item => item.id === state.selectedId) || state.groupIds?.some(id => members.some(item => item.id === id)) || false}
          aria-expanded={areaFinder || members.length > 1 ? Boolean(state.groupIds?.length === members.length && members.every(item => state.groupIds!.includes(item.id))) : undefined}
          onClick={() => { setLayer(activeLayer); if (!areaFinder && members.length === 1) onSelect(members[0].id); else onGroup(members.map(item => item.id)); }}>
          {foodAreas ? <span className={styles.foodAreaSign}><FoodSign size={26} aria-hidden="true" /><small>飲食 {members.length}件</small></span> : kyoceraFloor && size.width<500 && members.length>1 ? <span className={kyoceraFloorStyles.countSign}>
            <span style={{display:"grid",gridTemplateColumns:`repeat(${group.columns},${narrowIconCell}px)`}}>{pictograms.map(({kind,title,icon})=>{
              return <span key={kind} data-facility-kind={kind} title={title} style={{width:narrowIconCell,height:narrowIconCell}}><FacilityIcon item={icon} size={narrowIconCell}/></span>;
            })}</span><small>{areaFinder ? state.purpose : activeLayer==="food"?"飲食":"設備"} {members.length}件</small></span> : <span className={styles.areaSign}>
            <span className={styles.signKinds} style={{display:"grid",gridTemplateColumns:`repeat(${group.columns},${iconCell}px)`}}>{pictograms.map(({kind,title,icon}) => {
            return <span key={kind} data-facility-kind={kind} title={title} style={kyoceraFloor || compactFinder?{width:iconCell,height:iconCell}:undefined}><FacilityIcon item={icon} size={compactFinder?26:20} /></span>;
          })}</span>{areaFinder && <small>{state.purpose} {members.length}件</small>}</span>}
        </button>;
      })}
    </div>
    {kyoceraFloor && nearbyGates?.diagramId===diagram.id && <div className={kyoceraFloorStyles.originInfo} data-testid="kyocera-nearby-gates"><strong>近接するゲートの目印を選ぶ（設備検索とは別）</strong><div>{nearbyGates.ids.map(id=>{const mark=diagram.landmarks.find(m=>m.id===id)!;return <button key={id} type="button" onClick={()=>{onOrigin({diagramId:diagram.id,landmarkId:id});setNearbyGates(null);requestAnimationFrame(()=>{const button=[...frame.current!.querySelectorAll<HTMLButtonElement>("button[data-landmark-ids]")].find(b=>b.dataset.landmarkIds?.split(" ").includes(id));button?.focus({preventScroll:true});});}}>{landmarkDisplayName(diagram,mark)}</button>;})}<button onClick={()=>setNearbyGates(null)}>閉じる</button></div></div>}
    {(selected || origin || gate) && <div className={styles.mapKey}>{origin && <span>青：目印 {origin.name}</span>}{gate && <span>ピンク：入場先 {gate.name}</span>}{selected && selected.id !== gate?.id && <span>ピンク：目的地 {selected.name}</span>}</div>}
    {kyoceraFloor && origin && <p className={kyoceraFloorStyles.originInfo} data-testid="kyocera-landmark-detail">目印：{origin.name}</p>}
    {!compactFinder && <details className={styles.landmarkKey}><summary>{kyoceraFloor ? "ゲート・通路・売店の目印" : "図の目印"}（{diagram.landmarks.length}件）</summary><p>{kyoceraFloor ? "目印を選ぶと、地図で場所を確認できます。入場ゲートはチケットと公演案内で確認してください。" : <>{guide.venueId === "k-arena" ? "番号はこの階の座席アクセスGATEです。対応する席範囲・場外入場先は未確認です。階段ピクトは図示位置、中央階段は領域の代表位置です。背景は公式図で可視のフロア領域で、室入口や通行可能な経路を保証しません。" : "G：入場ゲート／S：売店番号／階段ピクト：階段。数字は階別図の通路・柱番号です。"}「付近」は同じ図の目印との位置関係で、個々の入口・最短経路を保証しません。</>}</p><ul>{diagram.landmarks.map(mark => <li key={mark.id}>
      <button type="button" data-landmark-option={mark.id} aria-label={`${landmarkDisplayName(diagram,mark)}を目印に選ぶ`}
        aria-pressed={origin?.kind === "landmark" && origin.id === mark.id} onClick={() => onOrigin({ diagramId:diagram.id, landmarkId:mark.id })}>{landmarkDisplayName(diagram,mark)}</button>
      {gateChoices.some(choice=>choice.mark.id === mark.id) && <button type="button" data-gate-list-option={mark.id}
        aria-pressed={gate?.id === mark.id} onClick={()=>onGate({diagramId:diagram.id,landmarkId:mark.id})}>{mark.name ?? mark.label}を入場先に選ぶ</button>}
    </li>)}</ul></details>}
    {state.scope === "場外" && <p className={styles.mapStatus}>公式の案内図を基に位置関係を整理しています。{guide.venueId === "osaka-jo-hall" && "駅は代表位置です。改札・大阪ビジネスパーク駅4番出口の位置は確認中です。"}駅出口・入口の指定と設備の営業は当日の公演案内を確認してください。</p>}
  </div>;
}
