"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Accessibility, Baby, HeartPulse, Info, X } from "lucide-react";
import type { DedicatedVenueGuide, GuideFacility } from "@/data/venueGuides/types";
import { FoodSign, LockerSign, ToiletSign } from "../DomeFacilitySigns";
import VenueFacilityMap, { FacilityIcon } from "./VenueFacilityMap";
import { filterGuideFacilities, resolveGuideOrigin, type FinderAction, type FinderState } from "./guideState";
import { kyoceraAvailablePurposes, kyoceraFacilitiesForScope, kyoceraFacilityCamera, kyoceraFacilityLocation, pointInKyoceraCamera } from "./kyoceraFacilityState";
import styles from "../template/VenueFacilityFinder.module.css";
import VenueLandmarkSearch from "../template/VenueLandmarkSearch";
import { VENUE_ACCESS_EVENT, type VenueAccessDetail } from "@/lib/venueAccess";
import visitorContent from "@/data/venueGuides/kyocera-dome/visitor-content.json";

const purposes = [{ label: "トイレ", Icon: ToiletSign }, { label: "荷物", Icon: LockerSign },
  { label: "飲食", Icon: FoodSign }, { label: "赤ちゃん", Icon: Baby }, { label: "案内", Icon: Info }, { label: "AED", Icon: HeartPulse }];
type Props = { guide: DedicatedVenueGuide; state: FinderState; onAction: (action: FinderAction) => void;
  detail: (item: GuideFacility) => string; sources: (item: GuideFacility) => ReactNode };

export default function KyoceraFacilityFinder({ guide, state, onAction, detail, sources }: Props) {
  const trigger = useRef<HTMLButtonElement | null>(null);
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
  function choose(item: GuideFacility, button: HTMLButtonElement) {
    trigger.current = button;
    change({ type: "select", id: item.id });
  }
  function close() {
    change({ type: "select", id: null });
    if (trigger.current?.isConnected) trigger.current.focus({ preventScroll: true });
  }
  return <div className={styles.finder} data-testid="kyocera-facility-finder" data-access-origin={state.origin?.landmarkId ?? ""}>
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
      <div className={styles.mapPanel}>
        <div className={styles.panelHeading}><strong>{state.scope === "場外" ? "場外" : state.floor}・{state.purpose}{currentOrigin ? `／${currentOrigin.name}周辺` : ""}</strong>{currentOrigin && <button type="button" onClick={showWhole}>全体図へ</button>}</div>
        {diagram ? <VenueFacilityMap guide={guide} items={facilities.filter(item => item.anchor)} state={state} embedded compactFinder
          onFloor={floor => change({ type: "floor", floor })} onSelect={id => { trigger.current = document.activeElement instanceof HTMLButtonElement ? document.activeElement : null; change({ type: "toggle-facility", id }); }}
          onGroup={ids => change({ type: "group", ids })} onOrigin={value => { change({ type: "select", id: null }); change({ type: "origin", origin: value }); }}
          onGate={gate => { change({ type: "gate", gate }); }} onClearSelection={() => change({ type: "select", id: null })} />
          : <p className={styles.noMap}>この階の設備は、場所の案内から確認できます。</p>}
      </div>
      <div className={styles.results} id="venue-facility-results">
        {chosen && <section className={styles.detail} data-testid="map-destination-detail" aria-label="選んだ設備の詳細" aria-live="polite">
          <div><strong><FacilityIcon item={chosen} />{chosen.name}</strong><button type="button" aria-label="設備の詳細を閉じる" onClick={close}><X size={18} aria-hidden="true" /></button></div>
          <p>{address(chosen)}</p><p>{chosen.storageKind ? chosen.detail : detail(chosen)}</p>{chosen.bookingUrl && <a className={styles.bookingLink} href={chosen.bookingUrl} target="_blank" rel="noopener noreferrer">{chosen.storageKind === "staffed" ? "料金・予約を見る" : "利用条件を見る"} ↗</a>}{sources(chosen)}
        </section>}
        <div className={styles.panelHeading}><strong>{baggage ? "荷物の案内" : `${group ? "選んだ範囲" : currentOrigin ? "周辺の設備" : state.purpose} ${group ? group.length : currentOrigin ? mapped.length : visible.length}件`}</strong>{group && <button type="button" onClick={() => change({ type: "group", ids: state.groupIds! })}>一覧へ戻る</button>}</div>
        <div className={styles.list} data-result-cards>{rows.filter(item => item.anchor).map(item => <button key={item.id} type="button" className={styles.resultRow} data-facility-id={item.id} aria-pressed={chosen?.id === item.id} onClick={event => choose(item, event.currentTarget)}><FacilityIcon item={item} /><span><strong>{item.name}</strong><small>{address(item)}</small>{item.storageKind && <small>{item.storageKind === "staffed" ? "店で預ける・予約" : "コインロッカー"}</small>}</span><span aria-hidden="true">›</span></button>)}
        {!group && unplaced.length > 0 && <div className={styles.unplaced}><p>場所の案内</p>{unplaced.map(item => <button key={item.id} type="button" className={styles.resultRow} data-facility-id={item.id} aria-pressed={chosen?.id === item.id} onClick={event => choose(item, event.currentTarget)}><FacilityIcon item={item} /><span><strong>{item.name}</strong><small>{address(item)}</small>{item.storageKind && <small>{item.storageKind === "staffed" ? "店で預ける・予約" : "コインロッカー"}</small>}</span><span aria-hidden="true">›</span></button>)}</div>}
        </div>
        {baggage && <div className={styles.baggage}><strong>2F コインロッカー</strong><p>サイズ・料金・利用時間は公式案内で、空きは当日確認してください。</p><a href={baggage.sources[0].url} target="_blank" rel="noopener noreferrer">サイズ・料金・利用時間を確認 ↗</a></div>}
        {rows.length === 0 && !baggage && <div className={styles.empty}><p>{state.query.trim() ? "検索条件に一致する設備はありません。" : currentOrigin ? `この周辺に掲載された${state.purpose}はありません。` : `この${state.scope === "場内" ? "階" : "エリア"}に掲載された${state.purpose}はありません。`}</p>{state.query.trim() && <button type="button" onClick={() => change({ type: "query", query: "" })}>検索を解除</button>}{currentOrigin ? <button type="button" onClick={showWhole}>この階全体で探す</button> : <>{state.scope === "場内" && otherFloors.map(floor => <button key={floor} type="button" onClick={() => change({ type: "floor", floor })}>{floor}の{state.purpose}を見る</button>)}{outsideAvailable && <button type="button" onClick={() => change({ type: "scope", scope: "場外" })}>場外の{state.purpose}を見る</button>}</>}</div>}
        {!group && mapped.length > 0 && unplaced.length > 0 && <p className={styles.listNote}>地図のない設備は、場所の案内で確認できます。</p>}
      </div>
    </div>
  </div>;
}
