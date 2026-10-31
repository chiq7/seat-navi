"use client";
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
import { domeGuideLandmarks, resolveDomeGuideOrigin, domeFacilityCamera } from "@/lib/domeGuideLandmarks";
import { tokyoFacilityAreas, tokyoLandmarkAreaIds } from "@/data/tokyoDomeFacilityAreas";
import { inTokyoStationScope, tokyoStationScope } from "@/data/tokyoDomeOutsideAreas";
import VenueLandmarkSearch from "./template/VenueLandmarkSearch";
import { TOKYO_DOME_ACCESS_EVENT } from "@/lib/tokyoDomeAccess";
import { OUTSIDE_STATIONS } from "@/data/tokyoDomeOutsideGuide";
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
      {item.category==="food"&&<p className={styles.eventNote}><Info size={16} aria-hidden="true"/>当日の営業は未確認 <a href="#upcoming-events-title">参加公演の案内へ</a></p>}
      {!staffedStorage && <details className={styles.spotSource}><summary>最新条件・出典を見る</summary><a href={item.guideUrl ?? (item.category === "locker" ? DOME_LOCKER_URL : DOME_GUIDE_SOURCES[domeSpotSource(item)].url)} target="_blank" rel="noopener noreferrer">{item.category === "locker" ? "ロッカーの利用条件" : "公式案内を開く"}<ArrowUpRight size={16} aria-hidden="true" /></a></details>}</div>
  </details>;
}

export function TokyoDomeGuideFinder() {
  const [outsideResetKey,setOutsideResetKey]=useState(0);
  const [landmarkResetKey,setLandmarkResetKey]=useState(0);
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
  const trigger=useRef<HTMLButtonElement|null>(null);
  const clearPlace=()=>{setOutsideResetKey(key=>key+1);setLandmarkResetKey(key=>key+1);setNearbyStation(null);setSelectedZone(null);setGroupIds(null);setSelectedSpotId(null);setOrigin(null);};
  const scoped=(scope:GuideArea,level:GuideFloor)=>DOME_GUIDE_SPOTS.filter(s=>s.area===scope&&(scope==="outside"||s.floor===level));
  const chooseContext=(scope:GuideArea,level:GuideFloor)=>{
    setArea(scope);setFloor(level);setQuery("");clearPlace();setToiletType("all");
    const available=purposes.filter(p=>scoped(scope,level).some(s=>matchesPurpose(s,p.value)));
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
      setPurpose("toilet");setArea("outside");setQuery("");setNearbyStation(id);setOutsideResetKey(key=>key+1);setSelectedSpotId(null);setGroupIds(null);setSelectedZone(null);setOrigin(null);
      requestAnimationFrame(()=>document.getElementById("dome-outside-map")?.scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth",block:"start"}));
    };
    window.addEventListener(TOKYO_DOME_ACCESS_EVENT,openStation);
    window.addEventListener(TOKYO_DOME_SEAT_SELECTION_EVENT,handler);
    window.addEventListener("venue-open-luggage",baggage);
    return()=>{window.removeEventListener(TOKYO_DOME_ACCESS_EVENT,openStation);window.removeEventListener(TOKYO_DOME_SEAT_SELECTION_EVENT,handler);window.removeEventListener("venue-open-luggage",baggage);};
  },[]);
  const category=purposes.find(p=>p.value===purpose)!.category;
  const results=filterDomeGuideSpots({area,floor:area==="outside"?"all":floor,category,query,toiletType}).filter(s=>s.floor!=="各階"&&matchesDomeGuidePurpose(s,purpose));
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
  const landmarks=currentFloor?domeGuideLandmarks(currentFloor,purpose==="food"?"shops":"floors"):[];
  const available=purposes.filter(p=>scoped(area,floor).some(s=>matchesPurpose(s,p.value))).map(p=>p.value);
  const title=purposes.find(p=>p.value===purpose)!.label;
  const select=(id:string)=>{trigger.current=document.activeElement instanceof HTMLButtonElement?document.activeElement:null;if(selectedSpotId!==id)trackVenueFacilityOpen(purpose,area,"tokyo-dome");setSelectedSpotId(previous=>previous===id?null:id);};
  const close=()=>{setSelectedSpotId(null);trigger.current?.focus({preventScroll:true});};
  return <div className={controls.finder} data-testid="tokyo-facility-finder">
    {seatSelection&&<div className={styles.seatContext}><strong>選択席 {seatSelection.section}{seatSelection.row?`・${seatSelection.row}列`:""}</strong><a href="#dome-seats">座席を確認</a></div>}
    <div className={controls.toolbar}>
      <div className={controls.controlRow}><strong className={controls.rowLabel}>場所</strong><div className={controls.topRow}>
        <div className={controls.buttons} role="group" aria-label="利用する場所">{(["inside","outside"] as const).map(value=><button key={value} type="button" aria-pressed={area===value} onClick={()=>chooseContext(value,floor)}>{value==="inside"?"場内":"場外・入場前"}</button>)}</div>
        <div className={controls.buttons} role="group" aria-label="フロアを選ぶ">{FACILITY_FLOORS.map(f=><button key={f.id} type="button" disabled={area!=="inside"} aria-pressed={area==="inside"&&floor===f.floor} onClick={()=>chooseContext("inside",f.floor)}>{f.floor==="外野"?"1F 外野":f.floor==="4F"?"4F 2階席":f.floor==="3F"?"3F バルコニー":f.floor}</button>)}</div>
      </div></div>
      <div className={controls.controlRow}><strong className={controls.rowLabel}>設備</strong><div className={controls.mainRow}>
        <div className={controls.purposes} role="group" aria-label="探す目的">{purposes.map(p=><button key={p.value} type="button" disabled={!available.includes(p.value)} aria-pressed={purpose===p.value} onClick={()=>{setPurpose(p.value);setQuery("");setToiletType("all");clearPlace();}}><p.icon size={20}/><span>{p.label}</span></button>)}</div>
        {area==="inside"&&<VenueLandmarkSearch key={`${floor}-${purpose}-${landmarkResetKey}`} landmarks={landmarks} onShow={id=>{setOrigin(landmarks.find(l=>l.id===id)??null);setGroupIds(null);setSelectedSpotId(null);}}/>}
      </div></div>
      {purpose==="food"&&<div className={controls.controlRow}><strong className={controls.rowLabel}>検索</strong><input className={controls.wordSearch} type="search" aria-label="店名・食べたいもの" placeholder="店名・食べたいもの" value={query} onChange={e=>{setQuery(e.target.value);setSelectedSpotId(null);}}/></div>}
      {purpose==="toilet"&&<div className={controls.controlRow}><strong className={controls.rowLabel}>種類</strong><div className={controls.buttons} role="group" aria-label="トイレの種類">{([["women","女性"],["men","男性"],["accessible","バリアフリー"]] as const).map(([value,label])=><button key={value} type="button" aria-pressed={toiletType===value} disabled={!filterDomeGuideSpots({area,floor:area==="outside"?"all":floor,toiletType:value}).some(s=>matchesPurpose(s,"toilet"))} onClick={()=>{setToiletType(toiletType===value?"all":value);clearPlace();}}>{label}</button>)}</div></div>}
    </div>
    <div className={controls.body}>
      <div id="dome-outside-map" className={controls.mapPanel} style={{scrollMarginTop:80}}><div className={controls.panelHeading}><strong>{area==="outside"?"場外":floor}・{title}{origin?`／${origin.label}`:""}</strong>{origin&&<button type="button" onClick={clearPlace}>この階全体へ</button>}</div>
        {area==="inside"?<TokyoDomeFacilityMap floor={floor} spots={results} purpose={purpose} mode={purpose==="food"?"food":"equipment"} selectedId={selectedSpotId} origin={origin} onOrigin={next=>{setOrigin(next);setGroupIds(null);setSelectedSpotId(null);}} seat={seatSelection} groupIds={groupIds} onGroup={ids=>{setGroupIds(old=>old?.join()===ids.join()?null:ids);setSelectedSpotId(null);}}/>
          :<TokyoDomeOutsideMap key={`${purpose}-${outsideResetKey}`} initialStationId={nearbyStation??""} onNearby={id=>{setNearbyStation(id);setGroupIds(null);setSelectedZone(null);setSelectedSpotId(null);}} spots={rows.filter(s=>s.mapZone)} selectedZone={selectedZone} selectedSpotId={selectedSpotId} onSelectZone={zone=>{setSelectedZone(old=>old===zone?null:zone);setGroupIds(null);setSelectedSpotId(null);}} compact/>}
      </div>
      <div className={controls.results}>
        {selected&&<section className={`${controls.detail} ${controls.tokyoDetail}`} aria-label="選んだ設備の詳細"><div><strong>{selected.name}</strong><button type="button" aria-label="設備の詳細を閉じる" onClick={close}><X size={18}/></button></div><p>{selected.location}</p><Spot key={selected.id} item={selected} selected onLocate={item=>setSelectedSpotId(item.id)}/></section>}
        <div className={controls.panelHeading} aria-live="polite"><strong>{nearbyLabel ?? (groupIds||selectedZone?`選んだ範囲${groupArea?`・${groupArea}`:""}`:title)} {rows.length}件</strong>{(groupIds||selectedZone||nearbyStation)&&<button type="button" onClick={clearPlace}>一覧へ戻る</button>}</div>
        <div className={controls.list}>{([{key:"mapped",label:"図上の設備",items:lists.mapped},{key:"unlocated",label:"場所の案内",items:[...lists.unlocated].sort((a,b)=>(a.outsideAreaName??a.location).localeCompare(b.outsideAreaName??b.location,"ja")||a.name.localeCompare(b.name,"ja"))}]).filter(list=>list.items.length).map(list=><section key={list.key} data-result-section={list.key} aria-label={`${list.label} ${list.items.length}件`}><div className={controls.panelHeading}><strong>{list.label} {list.items.length}件</strong></div>{list.items.map(item=>{const Icon=spotIcons[item.id]??Info;return <button key={item.id} type="button" className={controls.resultRow} data-spot-id={item.id} aria-pressed={selectedSpotId===item.id} onClick={()=>select(item.id)}><Icon size={22}/><span><strong>{item.name}</strong><small>{item.location}</small>{item.storageKind==="staffed"&&<small>店で預ける・予約{item.priceFrom!==undefined?`・${item.priceFrom}円／日〜`:""}</small>}{item.reservation==="available"&&<small>ロッカー・予約対応</small>}</span><span aria-hidden="true">›</span></button>;})}</section>)}</div>
        {!rows.length&&<div className={controls.empty}><p>この条件の掲載情報はありません。</p>{query&&<button type="button" onClick={()=>setQuery("")}>検索を解除</button>}{area==="inside"&&FACILITY_FLOORS.filter(f=>f.floor!==floor&&scoped("inside",f.floor).some(s=>matchesPurpose(s,purpose))).map(f=><button type="button" key={f.id} onClick={()=>chooseContext("inside",f.floor)}>{f.label}の{title}を見る</button>)}</div>}
      </div>
    </div>
  </div>;
}
