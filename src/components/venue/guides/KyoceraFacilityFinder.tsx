"use client";
import { trackVenueFacilityOpen } from "@/lib/venueAnalytics";

import { useEffect, useRef, type ReactNode } from "react";
import { useVenueFacilitySearchTarget } from "../template/useVenueFacilitySearchTarget";
import { isBabyFacilitySearch, matchesGuideBabyFacility } from "@/lib/venueFacilitySearch";
import { Accessibility, Baby, HeartPulse, Info, X } from "lucide-react";
import type { DedicatedVenueGuide, GuideFacility } from "@/data/venueGuides/types";
import { FoodSign, LockerSign, ToiletSign } from "../DomeFacilitySigns";
import { FacilityIcon } from "./VenueFacilityMap";
import KyoceraFacilityMap, { KyoceraPlanLegend } from "./KyoceraFacilityMap";
import { filterGuideFacilities, resolveGuideOrigin, type FinderAction, type FinderState } from "./guideState";
import { kyoceraAvailablePurposes, kyoceraFacilitiesForScope, kyoceraFacilityCamera, kyoceraFacilityLocation, pointInKyoceraCamera } from "./kyoceraFacilityState";
import styles from "../template/VenueFacilityFinder.module.css";
import mapStyles from "../template/VenueFacilityMapCanvas.module.css";
import guideStyles from "./guide.module.css";
import { FacilityAreaResultsHeading, useFacilityResultNavigation } from "../template/FacilityResultNavigation";
import VenueLandmarkSearch from "../template/VenueLandmarkSearch";
import { VENUE_ACCESS_EVENT, type VenueAccessDetail } from "@/lib/venueAccess";
import visitorContent from "@/data/venueGuides/kyocera-dome/visitor-content.json";

const purposes = [{ label: "トイレ", Icon: ToiletSign }, { label: "荷物", Icon: LockerSign },
  { label: "飲食", Icon: FoodSign }, { label: "赤ちゃん", Icon: Baby }, { label: "案内", Icon: Info }, { label: "AED", Icon: HeartPulse }];
type Props = { guide: DedicatedVenueGuide; state: FinderState; onAction: (action: FinderAction) => void;
  detail: (item: GuideFacility) => string; sources: (item: GuideFacility) => ReactNode };

export default function KyoceraFacilityFinder({ guide, state, onAction, detail, sources }: Props) {
  const finderRef = useRef<HTMLDivElement>(null);
  const mapPanel = useRef<HTMLDivElement>(null);
  const navigation = useFacilityResultNavigation(finderRef);
  // Focus to restore after a row opens or closes in place (the row and its detail swap elements).
  const pendingFocus = useRef<{ id: string; open: boolean } | null>(null);
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
  }, [state.selectedId]);
  useVenueFacilitySearchTarget(finderRef, target => {
    const purpose = target === "luggage" ? "荷物" : "赤ちゃん";
    const specific = isBabyFacilitySearch(target);
    const matches = guide.facilities.filter(f => specific ? matchesGuideBabyFacility(target, f) : f.purpose === purpose && f.kind !== "no-storage");
    const item = matches.find(f => f.scope === "場内") ?? matches[0];
    if (!item) return false;
    onAction({ type: "scope", scope: item.scope });
    if (item.scope === "場内") onAction({ type: "floor", floor: item.floor });
    onAction({ type: "purpose", purpose: specific ? item.purpose : purpose });
    onAction({ type: "query", query: "" });
    onAction({ type: "origin", origin: null });
    if (specific) onAction({ type: "select", id: item.id });
    return true;
  });
  useEffect(()=>{
    const open=()=>{onAction({type:"scope",scope:"場外"});onAction({type:"purpose",purpose:"荷物"});onAction({type:"query",query:""});};
    window.addEventListener("venue-open-luggage",open);return()=>window.removeEventListener("venue-open-luggage",open);
  },[onAction]);
  useEffect(() => {
    const open = (event:Event) => {
      const target=(event as CustomEvent<VenueAccessDetail>).detail;
      if (!target || target.venueId!==guide.venueId || !resolveGuideOrigin(guide,{diagramId:target.diagramId,landmarkId:target.targetId})) return;
      onAction({type:"scope",scope:"場外"});
      onAction({type:"origin",origin:{diagramId:target.diagramId,landmarkId:target.targetId}});
      requestAnimationFrame(()=>document.getElementById("venue-facilities")?.scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",block:"start"}));
    };
    window.addEventListener(VENUE_ACCESS_EVENT,open);
    return()=>window.removeEventListener(VENUE_ACCESS_EVENT,open);
  },[guide,onAction]);
  const diagram = guide.diagrams?.find(item => item.scope === state.scope && (state.scope === "場外" || item.floor === state.floor));
  const origin = resolveGuideOrigin(guide, state.origin);
  const currentOrigin = origin?.diagramId === diagram?.id ? origin : null;
  const box = diagram ? kyoceraFacilityCamera(diagram, currentOrigin) : null;
  const scopeFacilities = kyoceraFacilitiesForScope(guide.facilities, state.scope);
  const facilities = filterGuideFacilities(scopeFacilities, state);
  const visible = facilities.filter(item => !currentOrigin || !item.anchor || (item.anchor.diagramId === diagram?.id && box && pointInKyoceraCamera(item.anchor, box)))
    .sort((a, b) => kyoceraFacilityLocation(a, guide.diagrams ?? []).localeCompare(kyoceraFacilityLocation(b, guide.diagrams ?? []), "ja", { numeric: true }) || a.name.localeCompare(b.name, "ja"));
  const chosen = visible.find(item => item.id === state.selectedId);
  const group = state.groupIds ? visible.filter(item => state.groupIds!.includes(item.id)) : null;
  const rows = group ?? visible;
  const mapped = visible.filter(item => item.anchor);
  const unplaced = visible.filter(item => !item.anchor);
  const otherFloors = [...new Set(filterGuideFacilities(scopeFacilities, state, true).filter(item => item.floor !== state.floor).map(item => item.floor))].sort((a, b) => a.localeCompare(b, "ja", { numeric: true }));
  const outsideAvailable = state.scope === "場内" && filterGuideFacilities(kyoceraFacilitiesForScope(guide.facilities, "場外"), { ...state, scope: "場外", floor: "すべて" }).length > 0;
  const baggage = state.scope === "場内" && state.floor === "2F" && state.purpose === "荷物" && !facilities.length && !state.query ? visitorContent.preparation.find(item => item.id === "prep-baggage") : null;
  function address(item: GuideFacility) { const location = kyoceraFacilityLocation(item, guide.diagrams ?? []); return location.startsWith(item.floor) ? location : `${item.floor}・${location}`; }
  const floors = [...new Set(["2F", ...guide.facilities.filter(item => item.scope === "場内").map(item => item.floor)])].sort((a, b) => a.localeCompare(b, "ja", { numeric: true }));
  const availablePurposes = kyoceraAvailablePurposes(guide.facilities, state);
  const toiletChoices = [["women", "女性"], ["men", "男性"], ["accessible", "バリアフリー"]];
  function change(action: FinderAction) { onAction(action); }
  function showWhole() { change({ type: "select", id: null }); change({ type: "origin", origin: null }); }
  // Rows open in place: the detail replaces the row and the page does not move; the map above marks the place.
  function toggle(item: GuideFacility) {
    const open = state.selectedId !== item.id;
    if (open) trackVenueFacilityOpen(item.purpose, state.scope, guide.venueId);
    pendingFocus.current = { id: item.id, open };
    change({ type: "select", id: open ? item.id : null });
  }
  function resultRow(item: GuideFacility) {
    if (item.id === state.selectedId) return detailCard(item);
    return <button key={item.id} type="button" className={styles.resultRow} data-facility-id={item.id} data-facility-row={item.id} aria-expanded={false} onClick={() => toggle(item)}><FacilityIcon item={item} /><span><strong>{item.name}</strong><small>{address(item)}</small>{item.storageKind && <small>{item.storageKind === "staffed" ? "店で預ける・予約" : "コインロッカー"}</small>}</span><span aria-hidden="true">›</span></button>;
  }
  function detailCard(item: GuideFacility) {
    return <div key={item.id} className={styles.detail} data-facility-id={item.id} data-testid="map-destination-detail">
      <div><button type="button" className={styles.detailToggle} aria-expanded={true} data-facility-detail-heading onClick={() => toggle(item)}><FacilityIcon item={item} /><strong>{item.name}</strong></button><button type="button" aria-label="設備の詳細を閉じる" onClick={() => toggle(item)}><X size={18} aria-hidden="true" /></button></div>
      <p>{address(item)}</p><p>{item.storageKind ? item.detail : detail(item)}</p>{item.bookingUrl && <a className={styles.bookingLink} href={item.bookingUrl} target="_blank" rel="noopener noreferrer">{item.storageKind === "staffed" ? "料金・予約を見る" : "利用条件を見る"} ↗</a>}{sources(item)}
    </div>;
  }
  const placedRows = rows.filter(item => item.anchor);
  const chosenInRows = Boolean(chosen && (placedRows.includes(chosen) || (!group && unplaced.includes(chosen))));
  return <div className={`${styles.finder} ${mapStyles.finder}`} ref={finderRef} data-testid="kyocera-facility-finder" data-access-origin={state.origin?.landmarkId ?? ""}>
    <div className={styles.toolbar}>
      <div className={styles.controlRow}><strong className={styles.rowLabel}>場所</strong><div className={styles.topRow}>
        <div className={styles.buttons} role="group" aria-label="利用する場所">{(["場内", "場外"] as const).map(scope => <button key={scope} type="button" aria-pressed={state.scope === scope} onClick={() => change({ type: "scope", scope })}>{scope === "場外" ? "場外・入場前" : scope}</button>)}</div>
        <div className={styles.buttons} role="group" aria-label="フロアを選ぶ">{floors.map(floor => <button key={floor} type="button" disabled={state.scope !== "場内"} aria-pressed={state.scope === "場内" && state.floor === floor} onClick={() => change({ type: "floor", floor })}>{floor}{floor === "3F" ? " 下段" : floor === "5F" ? " 上段" : ""}</button>)}</div>
      </div></div>
      <div className={styles.controlRow}><strong className={styles.rowLabel}>設備</strong><div className={styles.mainRow}>
        <div className={styles.purposes} role="group" aria-label="探す目的">{purposes.map(({ label, Icon }) => <button key={label} type="button" disabled={!availablePurposes.includes(label)} aria-pressed={state.purpose === label} onClick={() => change({ type: "purpose", purpose: label })}><Icon size={20} aria-hidden="true" /><span>{label}</span></button>)}</div>
        {diagram?.id === "kyocera-f2" ? <div className={styles.buttons} role="group" aria-label="2Fの出入口付近を見る">{diagram.landmarks.filter(mark => mark.kind === "entrance").map(mark => <button key={mark.id} type="button" aria-pressed={state.origin?.landmarkId === mark.id} onClick={() => {
          change({ type: "select", id: null }); change({ type: "origin", origin: { diagramId: diagram.id, landmarkId: mark.id } });
        }}>{mark.label}付近</button>)}</div> : diagram?.id === "kyocera-f4" ? <div className={styles.buttons} role="group" aria-label="4Fの目印付近を見る"><button type="button" aria-pressed={state.origin?.facilityId === "f4-elevator-20-21"} onClick={() => {
          change({ type: "select", id: null }); change({ type: "origin", origin: { diagramId: diagram.id, facilityId: "f4-elevator-20-21" } });
        }}>20・21号EV付近</button></div> : <VenueLandmarkSearch key={`${diagram?.id ?? `${state.scope}-${state.floor}`}-${state.purpose}`} landmarks={(diagram?.landmarks??[]).filter(mark=>mark.kind==="passage"||mark.kind==="gate").map(mark=>({id:mark.id,kind:mark.kind as "passage"|"gate",label:mark.label,name:mark.name}))} onShow={id => {
          if (!diagram) return;
          change({ type: "select", id: null }); change({ type: "origin", origin: { diagramId: diagram.id, landmarkId: id } });
        }} />}
      </div></div>
      {state.purpose === "飲食" && <div className={styles.controlRow}><strong className={styles.rowLabel}>検索</strong><input className={styles.wordSearch} type="search" aria-label="名前・食べたいもの・場所" placeholder={state.purpose === "飲食" ? "店名・食べたいもの" : "駅名・施設名"} value={state.query} onChange={event => change({ type:"query", query:event.target.value })}/></div>}
      {state.purpose === "トイレ" && <div className={styles.controlRow}><strong className={styles.rowLabel}>種類</strong><div className={styles.buttons} role="group" aria-label="トイレの種類">{toiletChoices.map(([value, label]) => <button key={value} type="button" disabled={filterGuideFacilities(guide.facilities, { ...state, toiletType: value }).length === 0} aria-pressed={state.toiletType === value} onClick={() => change({ type: "toilet", toiletType: state.toiletType === value ? "すべて" : value })}>{value === "accessible" && <Accessibility size={16} aria-hidden="true" />}{label}</button>)}</div></div>}
    </div>
    <div className={styles.body}>
      <div ref={mapPanel} className={`${styles.mapPanel} ${mapStyles.stickyMap}`} data-facility-map-panel tabIndex={-1}>
        <div className={styles.panelHeading}><strong>{state.scope === "場外" ? "場外" : state.floor}・{state.purpose}{currentOrigin ? `／${currentOrigin.name}周辺` : ""}</strong>{diagram && state.scope === "場内" && <KyoceraPlanLegend diagram={diagram} />}{currentOrigin && <button type="button" onClick={showWhole}>全体図へ</button>}</div>
        {diagram ? <KyoceraFacilityMap guide={guide} diagram={diagram} items={facilities} origin={currentOrigin} purpose={state.purpose} floor={state.floor} scope={state.scope}
          selectedId={state.selectedId} groupIds={state.groupIds}
          onGroup={(ids, trigger) => { change({ type: "group", ids, open: true }); navigation.openList(trigger); }}
          onOrigin={value => { change({ type: "select", id: null }); change({ type: "origin", origin: value }); }} />
          : <p className={styles.noMap}>この階の設備は、場所の案内から確認できます。</p>}
      </div>
      <div className={styles.results} id="venue-facility-results">
        {group ? <FacilityAreaResultsHeading count={group.length}
          area={state.scope === "場外" ? "場外" : state.floor}
          onReturn={() => { change({ type: "clear-group" }); navigation.backToMap(); }} />
          : <div className={styles.panelHeading}><strong>{baggage ? "荷物の案内" : `${currentOrigin ? "周辺の設備" : state.purpose} ${currentOrigin ? mapped.length : visible.length}件`}</strong></div>}
        {chosen && !chosenInRows && detailCard(chosen)}
        <div className={`${styles.list} ${styles.pageList}`} data-result-cards>{placedRows.map(resultRow)}
        {!group && unplaced.length > 0 && <div className={styles.unplaced}><p>場所の案内</p>{unplaced.map(resultRow)}</div>}
        </div>
        {baggage && <div className={styles.baggage}><strong>2F コインロッカー</strong><p>サイズ・料金・利用時間は公式案内で、空きは当日確認してください。</p><a href={baggage.sources[0].url} target="_blank" rel="noopener noreferrer">サイズ・料金・利用時間を確認 ↗</a></div>}
        {rows.length === 0 && !baggage && <div className={styles.empty}><p>{state.query.trim() ? "検索条件に一致する設備はありません。" : currentOrigin ? `この周辺に掲載された${state.purpose}はありません。` : `この${state.scope === "場内" ? "階" : "エリア"}に掲載された${state.purpose}はありません。`}</p>{state.query.trim() && <button type="button" onClick={() => change({ type: "query", query: "" })}>検索を解除</button>}{currentOrigin ? <button type="button" onClick={showWhole}>この階全体で探す</button> : <>{state.scope === "場内" && otherFloors.map(floor => <button key={floor} type="button" onClick={() => change({ type: "floor", floor })}>{floor}の{state.purpose}を見る</button>)}{outsideAvailable && <button type="button" onClick={() => change({ type: "scope", scope: "場外" })}>場外の{state.purpose}を見る</button>}</>}</div>}
        {!group && mapped.length > 0 && unplaced.length > 0 && <p className={styles.listNote}>地図のない設備は、場所の案内で確認できます。</p>}
        {state.scope === "場外" && diagram && <p className={guideStyles.mapStatus}>場外の地図は、公式の案内図を基に位置関係を整理した略図です。駅出口・入口の指定と設備の営業は当日の公演案内を確認してください。</p>}
      </div>
    </div>
  </div>;
}
