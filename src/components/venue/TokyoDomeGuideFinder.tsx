"use client";
import { VenueProgramAnchor } from "@/components/venue/VenueProgramLinks";
import { trackVenueFacilityOpen } from "@/lib/venueAnalytics";

import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight, MapPin, Info, Footprints,
  HeartPulse, IceCreamBowl, Sandwich, Soup, ChevronDown,
  Accessibility, X,
} from "lucide-react";
import {
  DOME_GUIDE_SPOTS, DOME_GUIDE_SOURCES, DOME_LOCKER_URL,
  filterDomeGuideSpots, type DomeGuideMapZone, type DomeGuideSpot,
  domeSpotSource, splitDomeGuideResults,
  type GuideArea, type GuideCategory, type GuideFloor, type DomeToiletFilter,
} from "@/data/tokyoDomeVisitorGuide";
import { outsideFacilityKind } from "@/lib/domeOutsideMapDisplay";
import type { DomeGuideOrigin } from "@/lib/domeGuideLandmarks";
import { TOKYO_DOME_SEAT_SELECTION_EVENT, type TokyoDomeVenueSeatSelection } from "@/lib/tokyoDomeVenueSelection";
import styles from "./TokyoDomeVisitorGuide.module.css";
import TokyoDomeFacilityMap, { StairsIcon } from "./TokyoDomeFacilityMap";
import TokyoDomeOutsideMap from "./TokyoDomeOutsideMap";
import { matchesDomeGuidePurpose, type DomeGuidePurpose } from "@/lib/domeGuideDisplay";
import { DOME_FACILITY_SIGNS, ToiletSign as Toilet, LockerSign as Luggage, FoodSign as Utensils, type DomeSignIcon } from "./DomeFacilitySigns";
import controls from "./template/VenueFacilityFinder.module.css";
import { FACILITY_FLOORS, SHOP_DIAGRAMS, facilityFloorId } from "@/data/tokyoDomeFacilityMap";
import context from "@/data/tokyoDomeFacilityContext.json";
import { resolveDomeGuideOrigin, domeFacilityCamera } from "@/lib/domeGuideLandmarks";
import { tokyoFacilityAreas, tokyoLandmarkAreaIds } from "@/data/tokyoDomeFacilityAreas";
import { inTokyoStationScope, tokyoStationScope } from "@/data/tokyoDomeOutsideAreas";
import { TOKYO_DOME_ACCESS_EVENT } from "@/lib/tokyoDomeAccess";
import { OUTSIDE_STATIONS, OUTSIDE_ZONES } from "@/data/tokyoDomeOutsideGuide";
import { FacilityAreaResultsHeading, useFacilityResultNavigation } from "./template/FacilityResultNavigation";
import { useVenueFacilitySearchTarget } from "./template/useVenueFacilitySearchTarget";
import { isBabyFacilitySearch, matchesBabyFacilitySearch } from "@/lib/venueFacilitySearch";
const Baby=DOME_FACILITY_SIGNS.baby;

type Purpose = DomeGuidePurpose;
const purposes: { value: Purpose; label: string; icon: DomeSignIcon; category: GuideCategory | "all" }[] = [
  { value: "toilet", label: "トイレ", icon: Toilet, category: "facility" },
  { value: "locker", label: "荷物", icon: Luggage, category: "locker" },
  { value: "food", label: "飲食", icon: Utensils, category: "food" },
  { value: "baby", label: "赤ちゃん", icon: Baby, category: "facility" },
  { value: "help", label: "案内", icon: Info, category: "facility" },
  { value:"aed", label:"AED", icon:HeartPulse, category:"facility" },
];

function spotIcon(item: DomeGuideSpot): DomeSignIcon {
  if(item.area==="outside")return DOME_FACILITY_SIGNS[outsideFacilityKind(item)];
  if(item.facilityAnchor)return DOME_FACILITY_SIGNS[item.facilityAnchor.kind];
  if (item.category === "locker") return Luggage;
  if (item.id.startsWith("toilet")) return Toilet;
  if (item.id.startsWith("baby")) return Baby;
  if (item.id.startsWith("atm")) return DOME_FACILITY_SIGNS.atm;
  if (item.id.startsWith("stairs")) return Footprints;
  if (item.category !== "food") return Info;
  if (item.description.includes("アイス") || item.description.includes("クレープ")) return IceCreamBowl;
  if (item.description.includes("ハンバーガー") || item.description.includes("ホットドッグ")) return Sandwich;
  if (item.description.includes("ラーメン")) return Soup;
  return Utensils;
}
function matchesPurpose(item: DomeGuideSpot, purpose: Purpose) {
  const category = purposes.find(option=>option.value===purpose)!.category;
  return (category==="all"||item.category===category)&&matchesDomeGuidePurpose(item,purpose);
}
const spotIcons = Object.fromEntries(DOME_GUIDE_SPOTS.map((item) => [item.id, spotIcon(item)])) as Record<string, DomeSignIcon>;

function Spot({ item, selected, onLocate }: { item: DomeGuideSpot; selected: boolean; onLocate: (item: DomeGuideSpot) => void }) {
  const helpDialog = useRef<HTMLDialogElement>(null);
  const numberedHelp = item.area === "inside" && !item.facilityAnchor && item.sources.includes("barrierfree");
  const Icon = spotIcons[item.id] ?? Info;
  const staffedStorage = item.storageKind === "staffed";
  const title = item.category === "food" && item.area === "inside" ? item.description : item.category === "locker" && !staffedStorage ? "ロッカー" : item.id.startsWith("baby") ? "ベビールーム" : item.name;
  return <details open={selected} className={`${styles.spot} ${selected ? styles.spotSelected : ""}`}>
    <summary aria-label={`${item.name}の詳細`}>
      <span className={styles.spotIcon}>{item.id.startsWith("stairs")?<StairsIcon size={26}/>:<Icon size={26} aria-hidden="true" />}</span>
      <span className={styles.spotMain}><strong>{title}</strong><span><MapPin size={12} aria-hidden="true" />{item.location}</span>{staffedStorage && <small className={styles.storageHint}>店で預ける・予約{item.priceFrom !== undefined ? `・${item.priceFrom.toLocaleString("ja-JP")}円／日〜` : ""}</small>}{item.category === "food" && item.area === "inside" && <small>{item.name}</small>}</span>
      <span className={styles.spotEnd}><ChevronDown size={18} aria-hidden="true" /></span>
    </summary>
    <div className={styles.spotDetail}><h3>{item.name}</h3><p>{item.description}</p>{item.accessCondition&&<p>{item.accessCondition}</p>}{item.reservation==="available"&&item.bookingUrl&&<a className={styles.bookingLink} href={item.bookingUrl} target="_blank" rel="noopener noreferrer">料金・予約方法を見る<ArrowUpRight size={16}/></a>}{staffedStorage ? <><p>料金は荷物の大きさ・利用日時により変わります。</p><a className={styles.bookingLink} href={item.bookingUrl} target="_blank" rel="noopener noreferrer">料金・予約を見る<ArrowUpRight size={16} aria-hidden="true" /></a></> : item.facilityAnchor ? null : item.area === "inside" || item.mapAccuracy === "unplaced" ? <p className={styles.mapUnplaced}>図上の個別位置は未確認</p> : <p className={styles.mapAccuracyNote}>地図は{item.mapAccuracy === "named-point" ? "公式に示された場所" : "公式の側・エリア"}を表示</p>}{(item.facilityAnchor || (item.area === "outside" && item.mapZone)) && <button type="button" className={styles.locateSpot} onClick={() => onLocate(item)}><MapPin size={15} aria-hidden="true" />この場所を図で見る</button>}
      {numberedHelp && <><button type="button" className={styles.locateSpot} onClick={()=>helpDialog.current?.showModal()}><Accessibility size={18} aria-hidden="true"/>係員に見せる</button><dialog ref={helpDialog} className={styles.staffDialog} aria-labelledby={`staff-${item.id}`}><button type="button" className={styles.staffClose} aria-label="係員向け案内を閉じる" onClick={()=>helpDialog.current?.close()}><X size={22}/></button><Accessibility size={42} aria-hidden="true"/><h3 id={`staff-${item.id}`}><span>バリアフリー</span><span>{item.name.replace("バリアフリー","")}</span></h3><strong>{item.location}</strong><p>このトイレの場所を教えてください</p><div className={styles.staffFeatures}>{item.description.includes("オストメイト")&&<span>オストメイト対応</span>}{item.description.includes("介護用ベッド")&&<span>介護用ベッドあり</span>}</div><small>公式掲載の設備です。現在の利用可否もご確認ください。</small></dialog></>}
      {item.category==="food"&&<p className={styles.eventNote}><Info size={16} aria-hidden="true"/>当日の営業は未確認 <VenueProgramAnchor>参加公演の案内へ</VenueProgramAnchor></p>}
      {!staffedStorage && <details className={styles.spotSource}><summary>最新条件・出典を見る</summary><a href={item.guideUrl ?? (item.category === "locker" ? DOME_LOCKER_URL : DOME_GUIDE_SOURCES[domeSpotSource(item)].url)} target="_blank" rel="noopener noreferrer">{item.category === "locker" ? "ロッカーの利用条件" : "公式案内を開く"}<ArrowUpRight size={16} aria-hidden="true" /></a></details>}</div>
  </details>;
}

export function TokyoDomeGuideFinder({ onReady }: { onReady?: () => void } = {}) {
  const finderRef = useRef<HTMLDivElement>(null);
  const navigation = useFacilityResultNavigation(finderRef);
  const [outsideResetKey,setOutsideResetKey]=useState(0);
  const [,setLandmarkResetKey]=useState(0);
  const [purpose,setPurpose]=useState<Purpose>("toilet");
  const [toiletType,setToiletType]=useState<DomeToiletFilter>("all");
  const [area,setArea]=useState<GuideArea>("inside");
  const [floor,setFloor]=useState<GuideFloor>("1F");
  const [query,setQuery]=useState("");
  const [selectedZone,setSelectedZone]=useState<DomeGuideMapZone|null>(null);
  const [nearbyStation,setNearbyStation]=useState<string|null>(null);
  const [groupIds,setGroupIds]=useState<string[]|null>(null);
  const [selectedSpotId,setSelectedSpotId]=useState<string|null>(null);
  const [seatSelection,setSeatSelection]=useState<TokyoDomeVenueSeatSelection|null>(null);
  const [origin,setOrigin]=useState<DomeGuideOrigin|null>(null);
  const clearPlace=()=>{setOutsideResetKey(key=>key+1);setLandmarkResetKey(key=>key+1);setNearbyStation(null);setSelectedZone(null);setGroupIds(null);setSelectedSpotId(null);setOrigin(null);};
  useVenueFacilitySearchTarget(finderRef, target => {
    const next = target === "luggage" ? "locker" : "baby";
    const specific = isBabyFacilitySearch(target);
    const matching = DOME_GUIDE_SPOTS.filter(s => matchesPurpose(s, next)
      && (!specific || (s.sources.length > 0 && matchesBabyFacilitySearch(target, s.name, s.description))));
    const spot = matching.find(s => s.area === "inside" && s.floor !== "各階")
      ?? matching.find(s => s.area === "outside");
    if (!spot) return false;
    setArea(spot.area);
    setFloor(spot.floor);
    setPurpose(next);
    setQuery("");
    setToiletType("all");
    clearPlace();
    if (specific) setSelectedSpotId(spot.id);
    return true;
  });
  // Outside the dome only what is needed before entry is listed (lockers, baby rooms, help); toilets and food are inside.
  const hiddenOutside=(scope:GuideArea,p:Purpose)=>scope==="outside"&&(p==="toilet"||p==="food");
  const scoped=(scope:GuideArea,level:GuideFloor)=>DOME_GUIDE_SPOTS.filter(s=>s.area===scope&&(scope==="outside"||s.floor===level));
  const chooseContext=(scope:GuideArea,level:GuideFloor)=>{
    setArea(scope);setFloor(level);setQuery("");clearPlace();setToiletType("all");
    const available=purposes.filter(p=>!hiddenOutside(scope,p.value)&&scoped(scope,level).some(s=>matchesPurpose(s,p.value)));
    setPurpose(previous=>available.some(p=>p.value===previous)?previous:(scope==="outside"&&available.some(p=>p.value==="help")?"help":available[0]?.value??"toilet"));
  };
  useEffect(()=>{
    const handler=(event:Event)=>{
      const seat=(event as CustomEvent<TokyoDomeVenueSeatSelection|null>).detail;
      setSeatSelection(seat);
      setQuery("");setNearbyStation(null);setOutsideResetKey(key=>key+1);setLandmarkResetKey(key=>key+1);setToiletType("all");setSelectedSpotId(null);setGroupIds(null);setSelectedZone(null);setOrigin(null);
      if(seat?.floor){setArea("inside");setFloor(seat.floor);}
    };
    const baggage=()=>{setPurpose("locker");setArea("outside");setQuery("");setNearbyStation(null);setOutsideResetKey(key=>key+1);setSelectedSpotId(null);setGroupIds(null);setSelectedZone(null);setOrigin(null);};
    const openStation=(event:Event)=>{
      const id=(event as CustomEvent<unknown>).detail;
      if(typeof id!=="string"||!OUTSIDE_STATIONS.some(station=>station.id===id))return;
      setPurpose("locker");setArea("outside");setQuery("");setNearbyStation(id);setOutsideResetKey(key=>key+1);setSelectedSpotId(null);setGroupIds(null);setSelectedZone(null);setOrigin(null);
      requestAnimationFrame(()=>document.getElementById("dome-outside-map")?.scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth",block:"start"}));
    };
    window.addEventListener(TOKYO_DOME_ACCESS_EVENT,openStation);
    window.addEventListener(TOKYO_DOME_SEAT_SELECTION_EVENT,handler);
    window.addEventListener("venue-open-luggage",baggage);
    onReady?.();
    return()=>{window.removeEventListener(TOKYO_DOME_ACCESS_EVENT,openStation);window.removeEventListener(TOKYO_DOME_SEAT_SELECTION_EVENT,handler);window.removeEventListener("venue-open-luggage",baggage);};
  },[]);
  const category=purposes.find(p=>p.value===purpose)!.category;
  const results=hiddenOutside(area,purpose)?[]:filterDomeGuideSpots({area,floor:area==="outside"?"all":floor,category,query,toiletType}).filter(s=>s.floor!=="各階"&&matchesDomeGuidePurpose(s,purpose));
  const selected=results.find(s=>s.id===selectedSpotId);
  const currentFloor=facilityFloorId(floor);
  const resolvedOrigin=currentFloor?resolveDomeGuideOrigin(origin,currentFloor,purpose==="food"?"shops":"floors"):null;
  const crop=currentFloor?(purpose==="food"?SHOP_DIAGRAMS[currentFloor]?.crop:context.floors.find(f=>f.id===currentFloor)?.crop):null;
  const camera=crop?domeFacilityCamera(crop,resolvedOrigin):null;
  const landmarkMembers=currentFloor&&resolvedOrigin&&camera?new Set(tokyoLandmarkAreaIds(currentFloor,purpose==="food"?"shops":"floors",purpose,camera,DOME_GUIDE_SPOTS.filter(s=>matchesPurpose(s,purpose)))):null;
  const visible=area==="inside"&&landmarkMembers?results.filter(s=>!s.facilityAnchor||landmarkMembers.has(s.id)):results;
  const rows=groupIds?visible.filter(s=>groupIds.includes(s.id)):selectedZone?visible.filter(s=>s.mapZone===selectedZone):visible.filter(s=>inTokyoStationScope(s,nearbyStation));
  const nearbyLabel=tokyoStationScope(nearbyStation)?.label;
  const lists=splitDomeGuideResults(rows,area);
  const groupArea=currentFloor&&groupIds?tokyoFacilityAreas(DOME_GUIDE_SPOTS.filter(s=>matchesPurpose(s,purpose)),currentFloor,purpose==="food"?"shops":"floors",purpose).find(g=>g.members.some(s=>groupIds.includes(s.id)))?.area:null;
  const title=purposes.find(p=>p.value===purpose)!.label;
  const placeChoices:{key:string;scope:GuideArea;level:GuideFloor;label:string}[]=[...FACILITY_FLOORS.map(f=>({key:f.id,scope:"inside" as GuideArea,level:f.floor as GuideFloor,label:({"1F":"1F","外野":"外野","2F":"2F","3F":"バルコニー","4F":"2階席"} as Record<string,string>)[f.floor]??f.label})),{key:"outside",scope:"outside",level:floor,label:"場外"}];
  const countFor=(scope:GuideArea,level:GuideFloor,p:Purpose,type:DomeToiletFilter="all")=>hiddenOutside(scope,p)?0:filterDomeGuideSpots({area:scope,floor:scope==="outside"?"all":level,category:purposes.find(x=>x.value===p)!.category,query:"",toiletType:type}).filter(s=>s.floor!=="各階"&&matchesDomeGuidePurpose(s,p)).length;
  // A kind with nothing listed anywhere (AED today) gets no button rather than a dead one.
  const offered=purposes.filter(p=>placeChoices.some(c=>countFor(c.scope,c.level,p.value)>0));
  /** Picking what to find first: stay on this floor when it has one, otherwise move to the first place that does. */
  const choosePurpose=(p:Purpose)=>{
    setPurpose(p);setQuery("");setToiletType("all");clearPlace();
    if(countFor(area,floor,p)>0)return;
    const next=placeChoices.find(c=>countFor(c.scope,c.level,p)>0);
    if(next){setArea(next.scope);if(next.scope==="inside")setFloor(next.level);}
  };
  const select=(id:string,trigger:HTMLButtonElement)=>{
    if(selectedSpotId===id){setSelectedSpotId(null);return;}
    trackVenueFacilityOpen(purpose,area,"tokyo-dome");
    setSelectedSpotId(id);
    navigation.openDetail(trigger);
  };
  const close=()=>{setSelectedSpotId(null);navigation.backToList();};
  function returnToMap() {
    setGroupIds(null);setSelectedZone(null);setSelectedSpotId(null);
    navigation.backToMap();
  }
  return <div className={controls.finder} ref={finderRef} data-testid="tokyo-facility-finder">
    {seatSelection&&<div className={styles.seatContext}><strong>選択席 {seatSelection.section}{seatSelection.row?`・${seatSelection.row}列`:""}</strong><a href="#dome-seats">座席を確認</a></div>}
    {/* Tap-only picker: 1) what to find, 2) where (each place shows how many), 3) narrow down. */}
    <div className={`${controls.toolbar} ${styles.picker}`}>
      <div className={styles.pickRow} role="group" aria-label="探す設備" style={{gridTemplateColumns:`repeat(${offered.length},minmax(0,1fr))`}}>{offered.map(p=><button key={p.value} type="button" aria-pressed={purpose===p.value} onClick={()=>choosePurpose(p.value)}><p.icon size={22}/><span>{p.label}</span></button>)}</div>
      <div className={`${styles.pickRow} ${styles.placeRow}`} role="group" aria-label="探す場所">{placeChoices.map(c=>{const n=countFor(c.scope,c.level,purpose);const on=c.scope==="outside"?area==="outside":area==="inside"&&floor===c.level;return <button key={c.key} type="button" disabled={n===0} aria-pressed={on} aria-label={`${c.label} ${n}件`} onClick={()=>chooseContext(c.scope,c.level)}><span className={c.label.length>3?styles.longPlace:undefined}>{c.label}</span><b>{n}</b></button>;})}</div>
      {purpose==="toilet"&&<div className={styles.filterRow} role="group" aria-label="トイレの種類">{([["all","すべて"],["women","女性"],["men","男性"],["accessible","車いす"]] as const).map(([value,label])=>{const n=countFor(area,floor,"toilet",value);return <button key={value} type="button" aria-pressed={toiletType===value} disabled={n===0} onClick={()=>{setToiletType(value);clearPlace();}}>{value==="accessible"&&<Accessibility size={15} aria-hidden="true"/>}{label}<b>{n}</b></button>;})}</div>}
    </div>
    <div className={controls.body}>
      <div id="dome-outside-map" className={controls.mapPanel} data-facility-map-panel tabIndex={-1} style={{scrollMarginTop:80}}><div className={controls.panelHeading}><strong>{area==="outside"?"場外":floor}・{title}{origin?`／${origin.label}`:""}</strong>{origin&&<button type="button" onClick={clearPlace}>この階全体へ</button>}</div>
        {area==="inside"?<TokyoDomeFacilityMap floor={floor} spots={results} purpose={purpose} mode={purpose==="food"?"food":"equipment"} selectedId={selectedSpotId} origin={origin} onOrigin={next=>{setOrigin(next);setGroupIds(null);setSelectedSpotId(null);}} seat={seatSelection} groupIds={groupIds} onGroup={(ids,trigger)=>{setGroupIds(ids);setSelectedSpotId(null);navigation.openList(trigger);}}/>
          :<TokyoDomeOutsideMap key={`${purpose}-${outsideResetKey}`} initialStationId={nearbyStation??""} onNearby={id=>{setNearbyStation(id);setGroupIds(null);setSelectedZone(null);setSelectedSpotId(null);}} spots={rows.filter(s=>s.mapZone)} selectedZone={selectedZone} selectedSpotId={selectedSpotId} onSelectZone={(zone,trigger)=>{setSelectedZone(trigger?zone:selectedZone===zone?null:zone);setGroupIds(null);setSelectedSpotId(null);if(trigger)navigation.openList(trigger);}} compact/>}
      </div>
      <div className={controls.results}>
        {selected&&<section className={`${controls.detail} ${controls.tokyoDetail}`} aria-label="選んだ設備の詳細"><div><strong tabIndex={-1} data-facility-detail-heading>{selected.name}</strong><button type="button" aria-label="設備の詳細を閉じる" onClick={close}><X size={18}/></button></div><p>{selected.location}</p><Spot key={selected.id} item={selected} selected onLocate={item=>setSelectedSpotId(item.id)}/></section>}
        {groupIds||selectedZone?<FacilityAreaResultsHeading count={rows.length}
          area={groupArea??OUTSIDE_ZONES.find(zone=>zone.id===selectedZone)?.label} onReturn={returnToMap}/>
          :<div className={controls.panelHeading} aria-live="polite"><strong>{nearbyLabel ?? title} {rows.length}件</strong>{nearbyStation&&<button type="button" onClick={clearPlace}>一覧へ戻る</button>}</div>}
        <div className={controls.list}>{rows.length>0&&<section data-result-section="all" aria-label={`${title} ${rows.length}件`}>{[...lists.mapped,...[...lists.unlocated].sort((a,b)=>(a.outsideAreaName??a.location).localeCompare(b.outsideAreaName??b.location,"ja")||a.name.localeCompare(b.name,"ja"))].map(item=>{const Icon=spotIcons[item.id]??Info;return <button key={item.id} type="button" className={controls.resultRow} data-spot-id={item.id} aria-pressed={selectedSpotId===item.id} onClick={event=>select(item.id,event.currentTarget)}><Icon size={22}/><span><strong>{item.name}</strong><small>{item.location}</small>{item.storageKind==="staffed"&&<small>店で預ける・予約{item.priceFrom!==undefined?`・${item.priceFrom}円／日〜`:""}</small>}{item.reservation==="available"&&<small>ロッカー・予約対応</small>}</span><span aria-hidden="true">›</span></button>;})}</section>}</div>
        {!rows.length&&<div className={controls.empty}><p>この条件の掲載情報はありません。</p>{query&&<button type="button" onClick={()=>setQuery("")}>検索を解除</button>}{area==="inside"&&FACILITY_FLOORS.filter(f=>f.floor!==floor&&scoped("inside",f.floor).some(s=>matchesPurpose(s,purpose))).map(f=><button type="button" key={f.id} onClick={()=>chooseContext("inside",f.floor)}>{f.label}の{title}を見る</button>)}</div>}
      </div>
    </div>
  </div>;
}
