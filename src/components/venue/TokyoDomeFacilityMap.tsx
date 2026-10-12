"use client";

import { useEffect, useRef, useState, type SVGProps } from "react";
import { FACILITY_FLOORS, FACILITY_GATES, FACILITY_PASSAGE_LABELS, SHOP_DIAGRAMS, SHOP_GATES, SHOP_PASSAGE_LABELS, facilityFloorId, type FacilityAnchor, type FacilityFloorId } from "@/data/tokyoDomeFacilityMap";
import context from "@/data/tokyoDomeFacilityContext.json";
import { placeMapLabels, type MapLabel } from "@/lib/facilityMapLabels";
import { matchesDomeGuidePurpose, type DomeGuidePurpose } from "@/lib/domeGuideDisplay";
import { tokyoFacilityAreas, tokyoLandmarkAreaIds } from "@/data/tokyoDomeFacilityAreas";
import { DOME_FACILITY_SIGNS as icons } from "./DomeFacilitySigns";
import { DOME_GUIDE_SPOTS, type DomeGuideSpot, type GuideFloor } from "@/data/tokyoDomeVisitorGuide";
import type { TokyoDomeVenueSeatSelection } from "@/lib/tokyoDomeVenueSelection";
import { domeGuideLandmarks, resolveDomeGuideOrigin, domeFacilityCamera, type DomeGuideOrigin } from "@/lib/domeGuideLandmarks";
import styles from "./TokyoDomeFacilityMap.module.css";

export function StairsIcon({size=18,...props}:SVGProps<SVGSVGElement>&{size?:number}) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d="M3 20h5v-5h5v-5h5V5h3"/><path d="M4 11 13 2M4 6v5h5"/></svg>;
}
type Layer="floors"|"shops";
const kindNames:Record<FacilityAnchor["kind"],string>={women:"女性トイレ",men:"男性トイレ",mixed:"男女トイレ",unisex:"共用トイレ",accessible:"バリアフリートイレ",locker:"ロッカー",baby:"授乳室",atm:"ATM",stairs:"階段",information:"案内",wash:"手洗い",charge:"ICチャージ",ticket:"チケット",food:"売店"};
type Props={purpose:DomeGuidePurpose;floor:GuideFloor; spots:readonly DomeGuideSpot[]; mode:"food"|"equipment"; selectedId:string|null; origin:DomeGuideOrigin|null; onOrigin:(origin:DomeGuideOrigin|null)=>void; seat:TokyoDomeVenueSeatSelection|null; groupIds:string[]|null; onGroup:(ids:string[])=>void};

function diagram(id:FacilityFloorId,layer:Layer) {
  const source=context.floors.find((f)=>f.id===id)!;
  if(layer==="shops") {
    const shop=SHOP_DIAGRAMS[id];
    return shop?{crop:shop.crop,paths:shop.paths,seating:[] as string[],boundaries:[] as string[]}:null;
  }
  return {crop:source.crop,paths:source.concourse.map((p)=>p.d),seating:source.seating.map((p)=>p.d),boundaries:source.boundaries.map((p)=>p.d)};
}
function floorSpots(spots:readonly DomeGuideSpot[],id:FacilityFloorId,layer:Layer) { return spots.filter((s)=>s.facilityAnchor?.floorId===id&&s.facilityAnchor.source===layer); }
function FloorGeometry({data}:{data:NonNullable<ReturnType<typeof diagram>>}) {
  return <><g className={styles.seatingShape}>{data.seating.map((d,i)=><path key={i} d={d}/>)}</g><g className={styles.concourseShape}>{data.paths.map((d,i)=><path key={i} d={d}/>)}</g><g className={styles.boundaryShape}>{data.boundaries.map((d,i)=><path key={i} d={d}/>)}</g></>;
}

export default function TokyoDomeFacilityMap({purpose,floor,spots,mode,selectedId,origin,onOrigin,seat,groupIds,onGroup}:Props) {
  const currentId=facilityFloorId(floor);
  const selected=spots.find(s=>s.id===selectedId);
  const layer:Layer=mode==="food"?"shops":"floors";
  const [size,setSize]=useState({width:600,height:500});
  const landmarks=currentId?domeGuideLandmarks(currentId,layer):[];
  const originHere=currentId?resolveDomeGuideOrigin(origin,currentId,layer):undefined;
  const map=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    if(!map.current) return;
    const observer=new ResizeObserver(([entry])=>setSize({width:entry.contentRect.width,height:entry.contentRect.height}));
    observer.observe(map.current);return()=>observer.disconnect();
  },[currentId]);
  if(!currentId)return null;

  const data=diagram(currentId,layer);const floorInfo=FACILITY_FLOORS.find((f)=>f.id===currentId)!;
  const allShown=floorSpots(spots,currentId,layer);
  const whole=data?.crop??[0,0,600,400];
  const crop=domeFacilityCamera(whole,originHere);
  const [cx,cy,cw,ch]=crop;
  const inFrame=(p:{x:number;y:number})=>p.x>=cx&&p.x<=cx+cw&&p.y>=cy&&p.y<=cy+ch;
  const catalog=floorSpots(DOME_GUIDE_SPOTS,currentId,layer).filter(item=>matchesDomeGuidePurpose(item,purpose)&&item.category===(purpose==="food"?"food":purpose==="locker"?"locker":"facility"));
  const nearbyIds=originHere?new Set(tokyoLandmarkAreaIds(currentId,layer,purpose,crop,catalog)):null;
  const shown=allShown.filter(s=>!nearbyIds||nearbyIds.has(s.id));
  const fit=Math.min((size.width-40)/cw,(size.height-56)/ch);const dx=(size.width-cw*fit)/2,dy=(size.height-ch*fit)/2;
  const position=(a:Pick<FacilityAnchor,"x"|"y">)=>({x:dx+(a.x-cx)*fit,y:dy+(a.y-cy)*fit});
  const selectedHere=selected?.facilityAnchor?.floorId===currentId?selected:undefined;
  const floorGates=layer==="floors"?FACILITY_GATES.filter((g)=>g.floorId===currentId):(SHOP_GATES[currentId]??[]).map(([number,x,y])=>({number,x,y}));
  const passages=(layer==="floors"?FACILITY_PASSAGE_LABELS:SHOP_PASSAGE_LABELS)[currentId]??[];
  const isOriginLabel=(id:string)=>originHere?.id===`${currentId}:${id.replace("gate-","gate:").replace("passage-","passage:")}`;
  const labels:MapLabel[]=floorGates.filter(g=>!originHere||inFrame(g)).filter((_,i)=>floorGates.length<=4||i%Math.ceil(floorGates.length/4)===0).map((g)=>({id:`gate-${g.number}`,kind:"gate",...position(g),width:isOriginLabel(`gate-${g.number}`)?112:68,height:44,offset:{x:0,y:8}}));
  passages.forEach(([label,x,y],index)=>{
    const chosen=isOriginLabel(`passage-${label}`);
    if((originHere&&!inFrame({x,y}))||(!chosen&&index%Math.max(1,Math.ceil(passages.length/4))!==0))return;
    labels.push({id:`passage-${label}`,kind:chosen?"gate":"passage",...position({x,y}),width:chosen?112:label.length*8+38,height:chosen?44:22,offset:{x:0,y:-12}});
  });
  const groups=tokyoFacilityAreas(shown,currentId,layer,purpose).map(group=>{
    const raw=[...new Set(group.members.map(item=>item.facilityAnchor!.kind))];
    const mixed=raw.includes("mixed")||raw.includes("unisex")||(raw.includes("women")&&raw.includes("men"));
    const kinds=raw.filter(kind=>!mixed||!["women","men","mixed","unisex"].includes(kind));
    if(mixed)kinds.unshift("mixed");
    kinds.sort((a,b)=>Number(a==="accessible")-Number(b==="accessible"));
    const columns=kinds.includes("accessible")?Math.max(1,kinds.length-1):Math.min(3,kinds.length);
    const rows=kinds.includes("accessible")&&kinds.length>1?2:1;
    return {...group,...position(group),points:group.members.map(item=>({id:item.id,kind:item.facilityAnchor!.kind,...position(item.facilityAnchor!)})),kinds,columns,width:Math.max(100,columns*28+14),height:rows*26+38};
  }).filter(group=>group.points.length);
  groups.forEach(group=>labels.push({id:group.id,kind:"facility",x:group.x,y:group.y,width:group.width,height:group.height}));
  const placed=placeMapLabels(labels,size.width,size.height,{facilitiesFirst:true,keepFacilityAreas:true});
  const outfield=currentId==="1f-outfield";
  const areaItems=shown.filter(item=>groupIds?.includes(item.id));

  return <div className={styles.root} data-floor={currentId} data-map-interaction="landmark-zoom" aria-label={`${floorInfo.label}の施設図`}>
    <div className={styles.orientation}><span>{outfield?"レフト側":"3塁側"} ←</span><span>→ {outfield?"ライト側":"1塁側"}</span></div>
    <div ref={map} className={styles.map}>
      {data?<>
      <div className={styles.canvas}>
        <svg viewBox={`0 0 ${size.width} ${size.height}`} aria-hidden="true">
          <g transform={`translate(${dx},${dy}) scale(${fit}) translate(${-cx},${-cy})`}>
            <FloorGeometry data={data}/>
            {selectedHere&&<circle data-destination-anchor={selectedHere.id} cx={selectedHere.facilityAnchor!.x} cy={selectedHere.facilityAnchor!.y} r={6/fit} className={styles.selectedAnchor}/>}
            {originHere&&<circle data-origin-anchor={originHere.id} cx={originHere.x} cy={originHere.y} r={10/fit} className={styles.originAnchor} strokeWidth={3/fit}/>}
          </g>
        </svg>
      </div>
      <div className={styles.mapTitle}><span>{outfield?"外野席側":"客席側"}</span>{seat&&facilityFloorId(seat.floor??"")===currentId&&<small>選択席 {seat.section}{seat.row!==null?`・${seat.row}列`:""}</small>}</div>
      <svg className={styles.leaders} viewBox={`0 0 ${size.width} ${size.height}`} aria-hidden="true">
        {groups.filter(group=>group.points.length>1).map(group=>{
          const xs=group.points.map(point=>point.x),ys=group.points.map(point=>point.y),x=Math.min(...xs)-5,y=Math.min(...ys)-5;
          return <rect key={group.id} data-area-coverage={group.id} x={x} y={y} width={Math.max(...xs)-x+5} height={Math.max(...ys)-y+5} rx={6} className={styles.areaCoverage}/>;
        })}
        {placed.filter(p=>Math.hypot(p.left-p.x,p.top-p.y)>10).map(p=><g key={p.id}><path d={`M${p.x},${p.y} L${p.left},${p.top}`} className={p.kind==="facility"?styles.facilityLeader:styles.landmarkLeader}/>{p.kind!=="facility"&&<circle cx={p.x} cy={p.y} r={2.5} fill="#536773"/>}</g>)}
      </svg>
      {placed.map((p)=>{
        const location={left:p.left,top:p.top};
        if(p.kind==="gate"){
          const chosen=isOriginLabel(p.id),landmark=landmarks.find((l)=>l.id===`${currentId}:${p.id.replace("gate-","gate:").replace("passage-","passage:")}`);
          return <button key={p.id} type="button" className={`${styles.gateLabel} ${chosen?styles.originLabel:""}`} style={{...location,width:p.width}} data-landmark={p.id.startsWith("gate-")?"gate":"passage"} aria-pressed={chosen} aria-label={chosen?`選んだ場所：${landmark?.label}`:`${landmark?.label}を目印に選ぶ`} onClick={()=>{if(landmark)onOrigin(landmark);}}>{chosen&&<small>選んだ場所</small>}{p.id.startsWith("gate-")?`GATE ${p.id.replace("gate-","")}`:landmark?.label}</button>;
        }
        if(p.kind==="passage")return <span key={p.id} className={styles.passageLabel} style={{...location,width:p.width}} data-landmark="passage">{p.id.replace("passage-","").replace("–","〜")}<small>通路</small></span>;
        const group=groups.find(g=>g.id===p.id)!;
        const expanded=group.points.some(point=>areaItems.some(item=>item.id===point.id));
        const label=`${group.area}：${group.kinds.map(kind=>kindNames[kind as FacilityAnchor["kind"]]).join("・")} ${group.points.length}件`;
        return <button key={p.id} type="button" className={styles.pin} data-facility-group={group.id} data-group-size={group.points.length} data-spot-ids={group.points.map(point=>point.id).join(" ")} data-kind={group.kinds.length===1?group.kinds[0]:"area"} aria-label={label} title={label} aria-expanded={expanded} aria-pressed={expanded} style={{...location,width:p.width,height:p.height}} onClick={()=>onGroup([...group.memberIds])}>
          <span className={styles.areaIcons} style={{gridTemplateColumns:`repeat(${group.columns},24px)`}}>{group.kinds.map(kind=>{
            const facilityKind=kind as FacilityAnchor["kind"],Icon=icons[facilityKind];
            return <span key={kind} data-area-kind={kind} className={styles.areaIcon} style={kind==="accessible"?{gridColumn:"1 / -1"}:undefined}><Icon size={24}/></span>;
          })}
          </span><small className={styles.groupCount}>{group.area}<span>{group.points.length}件</span></small>
        </button>;
      })}
      </>:<div className={styles.none}>この階に該当する売店の掲載はありません。</div>}
    </div>
    <div className={styles.legend}><span><i className={styles.concourseSwatch}/>通路側</span>{data&&data.seating.length>0&&<span><i className={styles.seatSwatch}/>客席側</span>}</div>
  </div>;
}
