"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import { Accessibility, Baby, HeartPulse, Info, Search } from "lucide-react";
import type { DedicatedVenueGuide, GuideFacility, SeatArea } from "@/data/venueGuides/types";
import { ToiletSign, LockerSign, FoodSign } from "../DomeFacilitySigns";
import VenueSeatMap from "./VenueSeatMap";
import VenueFacilityMap, { FacilityIcon } from "./VenueFacilityMap";
import { filterGuideFacilities, finderReducer, initialFinderState, resolveGuideOrigin, resolveGuideGate, type FinderState, type FinderAction } from "./guideState";
import styles from "./guide.module.css";
import { DomeGuideHeader, DomeFinderLayout } from "../template/DomeGuideLayout";
import { DomeFloorPicker } from "../template/DomeFloorPicker";
import tokyoStyles from "../TokyoDomeVisitorGuide.module.css";
import domeStyles from "../template/DomeGuideLayout.module.css";
import tokyoSeatStyles from "../TokyoDomeSeatLocator.module.css";
import KyoceraVisitorContent from "./KyoceraVisitorContent";
import kyoceraQuality from "./KyoceraSeatMap.module.css";
import KyoceraFacilityFinder from "./KyoceraFacilityFinder";
import { initialKyoceraFinderState, kyoceraFinderReducer } from "./kyoceraFacilityState";

function Sources({ guide, ids }: { guide: DedicatedVenueGuide; ids: string[] }) {
  return <span className={styles.sources}>{ids.map(id => {
    const source = guide.sources.find(item => item.id === id);
    return source ? <a key={id} href={source.url} target="_blank" rel="noopener noreferrer">{source.title} ↗</a> : null;
  })}</span>;
}

function KyoceraFacilityLinks({ guide, item }: { guide: DedicatedVenueGuide; item: GuideFacility }) {
  // The map already explains the location. Link only to a useful follow-up action.
  const sourceId = item.purpose === "飲食" ? item.sourceIds.find(id => id === "store-murano-detail" || id === "store-tamaran-detail") ?? "store-gourmet"
    : item.purpose === "赤ちゃん" || item.id === "north-info" ? "support" : null;
  const source = guide.sources.find(value => value.id === sourceId);
  return source ? <span className={styles.sources}><a href={source.url} target="_blank" rel="noopener noreferrer">{item.purpose === "飲食" ? "メニュー・店舗情報を確認" : item.purpose === "赤ちゃん" ? "設備の利用案内を確認" : "貸出・受付案内を確認"} ↗</a></span> : null;
}

const purposes = [{ label: "すべて", Icon: Search }, { label: "トイレ", Icon: ToiletSign }, { label: "荷物", Icon: LockerSign },
  { label: "飲食", Icon: FoodSign }, { label: "赤ちゃん", Icon: Baby }, { label: "案内", Icon: Info }, { label: "AED", Icon: HeartPulse }];

// Keep source reconciliation in the guide data; show visitors useful directions.
function kyoceraFacilityDetail(item: GuideFacility) {
  return item.detail;
}

export default function VerifiedVenueGuide({ guide, embedded=false }: { guide: DedicatedVenueGuide; embedded?: boolean }) {
  const kyocera = guide.venueId === "kyocera-dome";
  const guideRoot = useRef<HTMLDivElement>(null);
  const focusFrame = useRef<number | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rowLabel, setRowLabel] = useState<string | null>(null);
  const [seatNumber, setSeatNumber] = useState("");
  const [state, dispatchState] = useReducer((current: FinderState, action: FinderAction) => kyocera ? kyoceraFinderReducer(current, action, guide.facilities) : finderReducer(current, action), kyocera ? initialKyoceraFinderState : initialFinderState);
  const [listReturn, setListReturn] = useState<{ id: string; filters: Pick<FinderState,"floor"|"scope"|"query"|"purpose"|"toiletType">; targetFloor: string; showAll: boolean; scrollY: number; trigger: HTMLButtonElement } | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [routeId, setRouteId] = useState(guide.routes[0]?.id ?? "");
  const selected = guide.seats.find(area => area.id === selectedId);
  const row = selected?.rows.find(item => item.label === rowLabel);
  const passage = row?.ranges?.find(range => Number(seatNumber) >= range.start && Number(seatNumber) <= range.end)?.passage;
  const seatNumbers = row?.ranges?.flatMap(range => Array.from({ length: range.end - range.start + 1 }, (_, i) => String(range.start + i))) ?? [];
  // Tokyo's six purposes include medical information under information;
  // retain the original AED data purpose and offer a separate exact shortcut.
  const purposeState = kyocera && state.purpose === "案内" ? { ...state, purpose: "すべて" } : state;
  const filterPurpose = (items: GuideFacility[]) => kyocera && state.purpose === "案内"
    ? items.filter(item => item.purpose === "案内" || item.purpose === "AED") : items;
  const facilities = filterPurpose(filterGuideFacilities(guide.facilities, purposeState));
  const allFloor = filterPurpose(filterGuideFacilities(guide.facilities, purposeState, true));
  const mapped = facilities.filter(item => item.anchor);
  const unlocated = facilities.filter(item => !item.anchor);
  const groupItems = state.groupIds ? mapped.filter(item => state.groupIds!.includes(item.id)) : null;
  const outsideGate = state.scope === "場外" ? resolveGuideGate(guide, state.outsideGate) : null;
  const chosen = facilities.find(item => item.id === state.selectedId)
    ?? (outsideGate?.id === state.selectedId ? outsideGate : undefined);
  const list = groupItems ?? (showAll || state.query || state.purpose !== "すべて" ? mapped : mapped.slice(0, 6));
  const route = guide.routes.find(item => item.id === routeId);
  const origin = resolveGuideOrigin(guide, state.origin);

  function cancelFocusReturn() {
    if (focusFrame.current !== null) cancelAnimationFrame(focusFrame.current);
    focusFrame.current = null;
  }
  useEffect(() => () => {
    if (focusFrame.current !== null) cancelAnimationFrame(focusFrame.current);
  }, []);
  function dispatch(action: FinderAction) {
    // Any newer finder operation supersedes the old card's return destination.
    if (kyocera) setListReturn(null);
    dispatchState(action);
  }

  function selectArea(area: SeatArea) {
    if (selectedId !== area.id) { setRowLabel(null); setSeatNumber(""); }
    setSelectedId(area.id); dispatch({ type: "seat", floor: area.floor }); setShowAll(false);
  }
  function clearSeat() {
    setSelectedId(null); setRowLabel(null); setSeatNumber(""); dispatch({ type: "clear-seat" });
  }
  function chooseRow(label: string | null) {
    setRowLabel(label); setSeatNumber(""); if (selected) dispatch({ type: "seat", floor: selected.floor });
  }
  function chooseTicket(area: SeatArea, label: string, number: string) {
    setSelectedId(area.id); setRowLabel(label); setSeatNumber(number);
    dispatch({ type: "seat", floor: area.floor }); setShowAll(false);
  }
  function locate(item: GuideFacility, trigger: HTMLButtonElement) {
    cancelFocusReturn();
    const saved = kyocera && item.scope === "場内" ? {id:item.id,
      filters:{floor:state.floor,scope:state.scope,query:state.query,purpose:state.purpose,toiletType:state.toiletType},
      targetFloor:item.floor,showAll,scrollY:window.scrollY,trigger} : null;
    if (state.scope !== item.scope) dispatch({ type: "scope", scope: item.scope });
    if (item.scope === "場内") dispatch({ type: "floor", floor: item.floor });
    selectFacility(item.id);
    setListReturn(saved);
    if (kyocera && item.scope === "場内") focusFrame.current = requestAnimationFrame(() => {
      focusFrame.current = null;
      const root = guideRoot.current;
      root?.querySelector<HTMLElement>('[data-testid="dome-floor-picker"]')?.scrollIntoView({block:"start"});
      root?.querySelector<HTMLElement>('[data-testid="map-destination-summary"]')?.focus({preventScroll:true});
      // The source dot can fit while its displaced, grouped equipment button
      // remains below the viewport. Measure both after the map's layout update.
      focusFrame.current = requestAnimationFrame(() => {
        focusFrame.current = null;
        const map = root?.querySelector<HTMLElement>('[data-testid="facility-map"]');
        const pin = [...(map?.querySelectorAll<HTMLButtonElement>('button[data-spot-ids]') ?? [])]
          .find(button => button.dataset.spotIds?.split(" ").includes(item.id));
        const anchor = [...(map?.querySelectorAll<SVGElement>('[data-destination]') ?? [])]
          .find(element => element.dataset.destination === item.id);
        const summary = root?.querySelector<HTMLElement>('[data-testid="map-destination-summary"]');
        if (!pin || !summary) return;
        const boxes = [summary, pin, ...(anchor ? [anchor] : [])].map(element => element.getBoundingClientRect());
        const lower = Math.max(...boxes.map(box => box.bottom)) - (window.innerHeight - 12);
        const upper = Math.min(...boxes.map(box => box.top)) - 12;
        // Keep the destination name and actual operation pin together whenever
        // their span fits; move only as far as necessary from the floor panel.
        const delta = lower <= upper ? Math.min(Math.max(0, lower), upper)
          : pin.getBoundingClientRect().top + pin.getBoundingClientRect().height / 2 - window.innerHeight / 2;
        if (delta) window.scrollBy({top:delta, behavior:"instant"});
      });
    });
  }
  function selectFacility(id: string) {
    const item = guide.facilities.find(facility => facility.id === id);
    const gate = item?.anchor ? { diagramId: item.anchor.diagramId, landmarkId: item.id } : null;
    if (resolveGuideGate(guide, gate)) dispatch({ type: "gate", gate });
    else dispatch({ type: "select", id });
  }
  function clearDestination() {
    const saved = listReturn;
    if (kyocera && saved && chosen?.id === saved.id && state.floor === saved.targetFloor
      && state.scope === saved.filters.scope && state.query === saved.filters.query
      && state.purpose === saved.filters.purpose && state.toiletType === saved.filters.toiletType) {
      cancelFocusReturn(); setListReturn(null);
      dispatch({type:"floor",floor:saved.filters.floor}); dispatch({type:"select",id:null}); setShowAll(saved.showAll);
      focusFrame.current = requestAnimationFrame(() => {
        focusFrame.current = null;
        const card = [...(guideRoot.current?.querySelectorAll<HTMLDetailsElement>('details[data-facility-id]') ?? [])].find(element=>element.dataset.facilityId===saved.id);
        if (!card) return;
        card.open = true;
        const trigger = saved.trigger.isConnected ? saved.trigger : [...card.querySelectorAll<HTMLButtonElement>('button')].find(button=>button.textContent==='図で確認');
        window.scrollTo({top:saved.scrollY}); trigger?.focus({preventScroll:true});
      });
      return;
    }
    setListReturn(null);
    const ids = chosen ? [chosen.id] : state.groupIds ?? [];
    const diagramId = chosen?.anchor?.diagramId ?? groupItems?.[0]?.anchor?.diagramId;
    const trigger = document.activeElement;
    cancelFocusReturn();
    if (chosen && outsideGate?.id === chosen.id) dispatch({ type: "gate", gate: null });
    else dispatch({ type: "select", id: null });
    // Tokyo Dome returns to the current source sign after its detail closes.
    // Do not return to a removed/hidden sign or override a newer user focus.
    focusFrame.current = requestAnimationFrame(() => {
      focusFrame.current = null;
      const root = guideRoot.current;
      if (!root || (document.activeElement !== document.body && document.activeElement !== trigger)) return;
      const visible = (element: HTMLElement) => !element.matches(":disabled")
        && !element.closest("[hidden], [inert], [aria-hidden='true']")
        && element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
      const map = root.querySelector<HTMLElement>('[data-testid="facility-map"]');
      const sign = map && map.dataset.diagramId === diagramId
        ? [...map.querySelectorAll<HTMLButtonElement>("button[data-spot-ids], button[data-gate-option]")]
          .find(button => ids.some(id => button.dataset.spotIds?.split(" ").includes(id) || button.dataset.gateOption === id) && visible(button))
        : undefined;
      const fallback = ['[aria-label="フロアを選ぶ"] button[aria-pressed="true"]', '[aria-label="設備の階"]', '[aria-label="利用する場所"] button[aria-pressed="true"]', '[aria-label="名前・場所・通路"]']
        .map(selector => root.querySelector<HTMLElement>(selector)).find(element => element && visible(element));
      (sign ?? fallback)?.focus();
    });
  }
  function facilityCard(item: GuideFacility) {
    const isSelected = state.selectedId === item.id;
    return <details key={item.id} className={styles.facility} open={isSelected || undefined} data-facility-id={item.id}>
      <summary><span className={styles.tag}>{item.floor}・{item.scope}</span><strong><FacilityIcon item={item} size={22} />{item.name}</strong><span>{item.location}</span><span className={styles.expand}>詳細・公式案内 ＋</span></summary>
      <div className={styles.facilityBody}><p>{kyocera ? kyoceraFacilityDetail(item) : item.detail}</p>{item.anchor && <div className={styles.controls}><button onClick={event => locate(item,event.currentTarget)}>図で確認</button><button onClick={() => dispatch({ type: "origin", origin: { diagramId: item.anchor!.diagramId, facilityId: item.id } })}>この設備を目印にする</button></div>}<Sources guide={guide} ids={item.sourceIds} /></div>
    </details>;
  }

  const destinationSummary = kyocera && state.scope === "場内" && chosen ? <div className={kyoceraQuality.facilitySelection} data-testid="map-destination-summary" tabIndex={-1}>
    <strong>{chosen.floor}・目的地：{chosen.name}</strong>
    {listReturn?.id===chosen.id && <button type="button" onClick={clearDestination}>検索結果へ戻る</button>}
    <button type="button" aria-label="目的地の選択を解除" onClick={clearDestination}>解除</button>
  </div> : null;
  const facilityMap = <VenueFacilityMap guide={guide} items={mapped} state={state} embedded={kyocera && state.scope === "場内"} selectionSummary={destinationSummary}
    landmarksOnly={kyocera} onFloor={floor => dispatch({ type: "floor", floor })} onSelect={id => dispatch({ type: "toggle-facility", id })}
    onGroup={ids => dispatch({ type: "group", ids })} onOrigin={value => dispatch({ type: "origin", origin:value })}
    onGate={gate => dispatch({ type: "gate", gate })} onClearSelection={() => dispatch({ type: "select", id: null })} />;
  const mapPanel = <>
      {kyocera && state.scope === "場内" ? <DomeFloorPicker diagrams={(guide.diagrams ?? []).filter(item => item.scope === "場内")}
        items={allFloor} floor={state.floor} onFloor={floor => { dispatch({ type: "floor", floor }); setShowAll(false); }}>
        {selected && <p className={kyoceraQuality.floorContext} data-testid="floor-seat-context">選択席は{selected.floor}側／表示中：{state.floor}{selected.floor!==state.floor ? "（別の階）" : ""}</p>}
        {facilityMap}
        {chosen && <div className={tokyoStyles.mapSelectionPanel} data-testid="map-destination-detail">
          <div><strong>目的地：{chosen.name}</strong><button onClick={clearDestination}>場所の選択解除</button></div>
          <p>{chosen.floor}・{chosen.location}</p><p>{kyoceraFacilityDetail(chosen)}</p>{chosen.anchor && <button onClick={() => dispatch({ type: "origin", origin: { diagramId: chosen.anchor!.diagramId, facilityId: chosen.id } })}>この設備を目印にする</button>}<Sources guide={guide} ids={chosen.sourceIds} />
        </div>}
        {state.groupIds && <div className={tokyoStyles.mapSelectionPanel} data-testid="map-group-detail"><div><strong>選択した範囲の設備{groupItems?.length ?? 0}件</strong><button onClick={clearDestination}>場所の選択解除</button></div><p>図の下の一覧で個々の設備と公式案内を確認できます。</p><a href="#venue-facility-results">設備の一覧を見る ↓</a></div>}
      </DomeFloorPicker> : facilityMap}
      {state.origin && <div className={styles.originChip} data-testid="origin-context"><span>{origin ? `目印：${origin.scope}・${origin.floor}・${origin.name}` : "選択した目印の対応位置は未確認"}
        {origin && (origin.scope !== state.scope || (state.scope === "場内" && origin.floor !== state.floor)) && <small>現在の図とは別の場所です。位置は引き継いで描画しません。</small>}</span><button onClick={() => dispatch({ type: "origin", origin: null })}>目印を解除</button></div>}
  </>;
  const resultsPanel = <>

      <div className={styles.results}><span aria-live="polite">{kyocera ? `地図に表示${mapped.length}件・場所の案内${unlocated.length}件` : `図上${mapped.length}件・位置未確認${unlocated.length}件`}</span><button onClick={() => { dispatch({ type: "reset" }); setShowAll(false); }}>絞り込みを解除</button></div>
      {(state.groupIds || state.selectedId) && !(kyocera && state.scope === "場内") && <div className={styles.selection}><strong>{chosen ? `目的地：${chosen.name}` : `選択した範囲の設備${groupItems?.length ?? 0}件`}</strong><button onClick={clearDestination}>場所の選択解除</button></div>}
      {chosen && !(kyocera && state.scope === "場内") && <div className={styles.destinationDetail}>{facilityCard(chosen)}</div>}
      <div id="venue-facility-results" className={styles.facilityGrid} data-result-cards>{list.filter(item => (kyocera && state.scope === "場内") || item.id !== state.selectedId).map(facilityCard)}</div>
      {facilities.length === 0 && <div className={styles.empty} data-testid="empty-results"><strong>この条件の掲載情報なし</strong>{state.floor !== "すべて" && allFloor.length > 0 && <button onClick={() => dispatch({ type: "floor", floor: "すべて" })}>全フロアで探す（{allFloor.length}件）</button>}<p>設備が存在しないという意味ではありません。</p></div>}
      {!showAll && !state.query && !state.groupIds && mapped.length > 6 && <button className={styles.more} onClick={() => setShowAll(true)}>もっと見る（残り{mapped.length - 6}件）</button>}
      {unlocated.length > 0 && <details className={styles.unplaced} open={Boolean(state.query) || undefined}><summary>{kyocera ? "図にない設備の場所" : "位置未確認・番号案内"}（{unlocated.length}件）</summary><p className={styles.caption}>{kyocera ? "場所は各設備の案内で確認できます。" : "記述の場所は確認済み。図上位置は確認中です。"}</p><div className={styles.facilityGrid} data-result-cards>{unlocated.map(facilityCard)}</div></details>}
  </>;

  return <div ref={guideRoot} data-dome-guide={kyocera || undefined} className={`${styles.guide}${kyocera ? ` ${domeStyles.root}` : ""}`} onPointerDownCapture={cancelFocusReturn}>
    {kyocera ? <DomeGuideHeader name={guide.name} showHero={!embedded} /> : <nav className={styles.jumpNav} aria-label="会場ガイドの目次">{[["venue-seats", "座席"], ["venue-facilities", "設備"], ["venue-access", "アクセス"], ["venue-prep", "準備"], ["venue-faq", "FAQ"]].map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}<a href={guide.venueId === "kyocera-dome" ? "#upcoming-events-title" : `/venues/${guide.venueId}#upcoming-events-title`}>公演</a></nav>}
    <section id="venue-seats" className={kyocera ? "border-y border-[#eddfe5] bg-[#fffafb] py-8 sm:py-10" : styles.section} aria-labelledby="seat-heading"><div className={kyocera ? "zr-container" : undefined}>
      <p className={kyocera ? "artist-kicker" : styles.eyebrow}>Seat finder</p><h2 id="seat-heading" className={kyocera ? `artist-heading ${tokyoSeatStyles.title}` : undefined}>{guide.name}の座席を探す</h2>
      <div className={kyocera ? "mt-5" : undefined}>{guide.seats.length > 0 ? <VenueSeatMap guide={guide} selectedId={selectedId} rowLabel={rowLabel} seatNumber={seatNumber} onSelect={selectArea} onClear={clearSeat} onRow={chooseRow} onTicket={chooseTicket} />
        : <div className={styles.empty} data-testid="seat-data-pending"><strong>座席検索は確認中です</strong><p>{guide.seatNote}</p><Sources guide={guide} ids={guide.sources.filter(source => source.id.includes("seat")).map(source => source.id)} /></div>}</div>
      {row && guide.venueId !== "kyocera-dome" && <div className={styles.rowDetail}>
        {seatNumbers.length > 0 ? <><label>席番号で通路を確認（任意）<select aria-label="席番号" value={seatNumber} onChange={event => setSeatNumber(event.target.value)}><option value="">席番号を選ぶ</option>{seatNumbers.map(number => <option key={number} value={number}>{number}番</option>)}</select></label><p aria-live="polite">{passage ? `公式検索に掲載された通路：${passage}` : "席番号を選ぶと掲載通路を確認できます。"}</p></> : <p>席番号・欠番は公式詳細図で確認してください。</p>}
      </div>}
      {selected && <a className={styles.seatToFacilities} href="#venue-facilities" onClick={() => { dispatch({ type: "seat", floor: selected.floor }); setShowAll(false); }}>{selected.floor}の設備を探す ↓</a>}
      <p className={styles.caption}>アリーナ配置・ステージ・当日の入口は公演案内を優先してください。</p>
    </div></section>

    <section id="venue-facilities" className={kyocera ? tokyoStyles.section : styles.section} aria-labelledby="facilities-heading"><div className={kyocera ? `zr-container ${tokyoStyles.guide}` : undefined}>
      <div className={styles.eyebrow}>FACILITIES</div><h2 id="facilities-heading">必要な設備を探す</h2>
      {guide.seats.length === 0 && <p className={styles.caption}>{guide.diagramNote}</p>}
      {selected && <div className={styles.seatContext} data-testid="seat-facility-context"><strong>選択中：{selected.label}・{selected.type}{rowLabel ? `・${rowLabel}列` : ""}</strong><span>{kyocera ? `選択席は${selected.floor}側／今は${state.scope === "場外" ? "場外" : state.floor === "すべて" ? "全階" : state.floor}を表示しています。` : `${selected.floor}の設備案内へ連携しています。最寄り設備・到達経路を保証するものではありません。`}</span><a href="#venue-seats">座席を確認 ↑</a></div>}
      {kyocera ? <KyoceraFacilityFinder guide={guide} state={state} onAction={dispatch} detail={kyoceraFacilityDetail} sources={item => <KyoceraFacilityLinks guide={guide} item={item} />} /> : <>
      <div className={kyocera ? `${tokyoStyles.areaPicker} ${domeStyles.scope}` : styles.controls} role="group" aria-label="利用する場所">{(["場内", "場外"] as const).map(scope => <button key={scope} aria-pressed={state.scope === scope} onClick={() => { dispatch({ type: "scope", scope }); setShowAll(false); }}>{scope === "場外" ? "場外・入場前" : scope}</button>)}</div>
      <div className={kyocera ? `${tokyoStyles.purposeGrid} ${domeStyles.purposes}` : styles.purposes} role="group" aria-label="探す目的">{purposes.filter(item => !kyocera || item.label !== "AED").map(({ label, Icon }) => <button key={label} aria-pressed={state.purpose === label || (kyocera && label === "案内" && state.purpose === "AED")} onClick={() => { dispatch({ type: "purpose", purpose: label }); setShowAll(false); }}><Icon size={26} aria-hidden="true" /><span>{label}</span></button>)}</div>
      {kyocera && <div className={tokyoStyles.quickFilters} role="group" aria-label="案内の絞り込み"><button aria-pressed={state.purpose === "AED"} onClick={() => { dispatch({ type: "purpose", purpose: "AED" }); setShowAll(false); }}><HeartPulse size={18} aria-hidden="true" />AED</button></div>}
      <label className={styles.searchBar}><Search size={18} aria-hidden="true" /><input aria-label="名前・場所・通路" type="search" value={state.query} onChange={event => { dispatch({ type: "query", query: event.target.value }); setShowAll(false); }} placeholder="通路、柱番号、ロッカー…" /></label>
      {state.purpose === "トイレ" && <div className={kyocera ? tokyoStyles.quickFilters : styles.controls} role="group" aria-label="トイレの種類">{[["すべて", "すべて"], ["women", "女性"], ["men", "男性"], ["accessible", "バリアフリー"]].map(([value, label]) => <button key={value} aria-pressed={state.toiletType === value} onClick={() => dispatch({ type: "toilet", toiletType: value })}>{kyocera && value === "accessible" && <Accessibility size={16} aria-hidden="true" />}{label}</button>)}{kyocera && ["women", "men"].includes(state.toiletType) && facilities.some(item => item.toiletType === "mixed") && <small>男女・共用も含む</small>}</div>}
      {!kyocera && state.scope === "場内" && <label className={styles.floorSelect}>フロア<select aria-label="設備の階" value={state.floor} onChange={event => { dispatch({ type: "floor", floor: event.target.value }); setShowAll(false); }}><option>すべて</option>{[...new Set([...(guide.diagrams ?? []).filter(item => item.scope === "場内").map(item => item.floor), ...guide.facilities.filter(item => item.scope === "場内").map(item => item.floor)])].sort().map(floor => <option key={floor}>{floor}</option>)}</select></label>}
      {kyocera ? <DomeFinderLayout map={mapPanel} results={resultsPanel} /> : <>{mapPanel}{resultsPanel}</>}
      </>}
    </div></section>

    {kyocera ? <KyoceraVisitorContent guide={guide} /> : <>
    <section id="venue-access" className={kyocera ? tokyoStyles.section : styles.section} aria-labelledby="outside-heading"><div className={kyocera ? `zr-container ${tokyoStyles.guide}` : undefined}><div className={styles.eyebrow}>ACCESS</div><h2 id="outside-heading">駅から入口へ</h2><p className={styles.note}>{guide.venueId === "osaka-jo-hall" ? "場外図は駅の代表位置と入口を案内しています。改札・大阪ビジネスパーク駅4番出口の位置は未確認です。公式の道順と当日の公演案内を確認してください。" : guide.diagrams?.some(item => item.scope === "場外") ? "確認済みの駅・入口・入場前設備の位置関係は設備案内の場外図で確認できます。通行規制・連続した段差なし経路は当日の案内を優先してください。" : "場外図の位置照合は確認中です。確認済みの公式道順を案内します。"}</p>
      <div className={styles.controls} role="group" aria-label="来場駅">{guide.routes.map(item => <button key={item.id} aria-pressed={routeId === item.id} onClick={() => setRouteId(item.id)}>{item.from}</button>)}</div>
      {route && <div className={styles.accessText}><strong>{route.from} → {route.destination}</strong><p>{route.exit}{route.stops.length > 0 && ` → ${route.stops.join(" → ")}`}</p><p>{route.note}</p><Sources guide={guide} ids={route.sourceIds} /></div>}
    </div></section>
    <section id="venue-prep" className={kyocera ? tokyoStyles.section : styles.section}><div className={kyocera ? `zr-container ${tokyoStyles.guide}` : undefined}><div className={styles.eyebrow}>BEFORE YOU GO</div><h2>出発前に確認</h2><div className={styles.prepGrid}><div><strong>指定入口・券面</strong><p>公演案内の入口と座席表記を確認してください。</p></div><div><strong>荷物</strong><p>{guide.venueId === "osaka-jo-hall" ? "ロッカーは100円硬貨のみ。両替サービスはありません。空きは当日確認してください。" : "荷物の預け先・ロッカーの条件は公式と公演案内で確認してください。"}</p></div><div><strong>設備の開放</strong><p>開放範囲・営業・支払い方法は公演当日の案内を確認してください。</p></div></div></div></section>
    <section id="venue-faq" className={kyocera ? tokyoStyles.section : styles.section}><div className={kyocera ? `zr-container ${tokyoStyles.guide}` : undefined}><div className={styles.eyebrow}>FAQ</div><h2>よくある確認</h2><details className={styles.facility}><summary><strong>アリーナの座席位置は確認できますか？</strong></summary><div className={styles.facilityBody}>公演ごとの配置が必要です。常設スタンドの情報からアリーナ席の位置を確定しません。</div></details><details className={styles.facility}><summary><strong>図にない設備は使えませんか？</strong></summary><div className={styles.facilityBody}>位置の照合が済んでいない場合もあります。公式案内と当日の現地表示を確認してください。</div></details><a className={styles.seatToFacilities} href={guide.venueId === "kyocera-dome" ? "#upcoming-events-title" : `/venues/${guide.venueId}#upcoming-events-title`}>会場ページ・公演を確認 →</a></div></section>
    </>}
    {!embedded && guide.venueId === "kyocera-dome" && <section id="upcoming-events-title" className={kyocera ? tokyoStyles.section : styles.section}><div className={kyocera ? `zr-container ${tokyoStyles.guide}` : undefined}>
      <h2>公演・座席レポ</h2>
      <a className={styles.seatToFacilities} href="https://tixrepo.com/venues/kyocera-dome#upcoming-events-title">公演・座席レポを見る ↗</a>
    </div></section>}
    {!kyocera && <section className={styles.section} aria-labelledby="evidence-heading"><div><h2 id="evidence-heading">ローカル検証の確認範囲</h2><p className={styles.note}>確認日：2026年9月30日。部分実装・元checkout未統合。</p><ul className={styles.pending}>{guide.unverified.map(item => <li key={item}>{item}</li>)}</ul>
      <details className={styles.evidence}><summary>参照資料と利用条件（{guide.sources.length}件）</summary>{guide.sources.map(source => <div key={source.id}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title} ↗</a><p>{source.scope}</p><small>確認日 {source.checkedAt}</small></div>)}{guide.rights && <div><a href={guide.rights.url} target="_blank" rel="noopener noreferrer">公式サイトの利用条件 ↗</a><p>{guide.rights.note}</p><small>公開利用条件：未確認項目あり</small></div>}</details>
    </div></section>}
  </div>;
}
