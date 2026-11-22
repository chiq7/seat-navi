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
import { TOKYO_DOME_FIELD_ART, fieldArtLayout } from "@/data/venueFieldArt";
import styles from "./TokyoDomeFacilityMap.module.css";

export function StairsIcon({size=18,...props}:SVGProps<SVGSVGElement>&{size?:number}) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d="M3 20h5v-5h5v-5h5V5h3"/><path d="M4 11 13 2M4 6v5h5"/></svg>;
}
type Layer="floors"|"shops";
const kindNames:Record<FacilityAnchor["kind"],string>={women:"女性トイレ",men:"男性トイレ",mixed:"男女トイレ",unisex:"共用トイレ",accessible:"バリアフリートイレ",locker:"ロッカー",baby:"授乳室",atm:"ATM",stairs:"階段",information:"案内",wash:"手洗い",charge:"ICチャージ",ticket:"チケット",food:"売店"};
type Props={purpose:DomeGuidePurpose;floor:GuideFloor; spots:readonly DomeGuideSpot[]; mode:"food"|"equipment"; selectedId:string|null; origin:DomeGuideOrigin|null; onOrigin:(origin:DomeGuideOrigin|null)=>void; seat:TokyoDomeVenueSeatSelection|null; groupIds:string[]|null; onGroup:(ids:string[],trigger:HTMLButtonElement)=>void};

function diagram(id:FacilityFloorId,layer:Layer) {
  const source=context.floors.find((f)=>f.id===id)!;
  if(layer==="shops") {
    const shop=SHOP_DIAGRAMS[id];
    return shop?{crop:shop.crop,paths:shop.paths,seating:[] as string[],boundaries:[] as string[]}:null;
  }
  return {crop:source.crop,paths:source.concourse.map((p)=>p.d),seating:source.seating.map((p)=>p.d),boundaries:source.boundaries.map((p)=>p.d)};
}
/** The field illustration (see src/data/venueFieldArt.ts for the image, its size and where it sits on each plan). */
function FieldLandmark({box}:{box:{x:number;y:number;width:number;height:number}}) {
  return <g aria-hidden="true" data-field-landmark="">
    <image href={TOKYO_DOME_FIELD_ART.image.href} x={box.x} y={box.y} width={box.width} height={box.height} preserveAspectRatio="xMidYMid meet"/>
  </g>;
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
  const compactPins = size.width <= 480;
  const landmarks=currentId?domeGuideLandmarks(currentId,layer):[];
  const originHere=currentId?resolveDomeGuideOrigin(origin,currentId,layer):undefined;
  const map=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    if(!map.current) return;
    // Read the size now as well: the observer reports only after a rendering frame (never in a background tab), so
    // the plan would otherwise be laid out at the default size first.
    const now=map.current.getBoundingClientRect();
    if(now.width>0&&now.height>0)setSize(size=>size.width===now.width&&size.height===now.height?size:{width:now.width,height:now.height});
    const observer=new ResizeObserver(([entry])=>setSize({width:entry.contentRect.width,height:entry.contentRect.height}));
    observer.observe(map.current);return()=>observer.disconnect();
  },[currentId]);
  if(!currentId)return null;

  const data=diagram(currentId,layer);const floorInfo=FACILITY_FLOORS.find((f)=>f.id===currentId)!;
  const allShown=floorSpots(spots,currentId,layer);
  const art=fieldArtLayout(TOKYO_DOME_FIELD_ART,`${currentId}:${layer}`);
  // The camera's "whole plan" includes the illustration, so no screen size crops it.
  const plan=data?.crop??[0,0,600,400];
  const whole=art?.cameraArea?(()=>{const a=art.cameraArea,x0=Math.min(plan[0],a.x),y0=Math.min(plan[1],a.y),x1=Math.max(plan[0]+plan[2],a.x+a.width),y1=Math.max(plan[1]+plan[3],a.y+a.height);return [x0,y0,x1-x0,y1-y0];})():plan;
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
  // Facility marks sit exactly on their place, never moved or tied to it by a line. Marks that would overlap there are
  // shown as one mark counting both; passage and gate labels move around the marks instead.
  const pinShape=(members:readonly DomeGuideSpot[])=>{
    const raw=[...new Set(members.map(item=>item.facilityAnchor!.kind))];
    const mixed=raw.includes("mixed")||raw.includes("unisex")||(raw.includes("women")&&raw.includes("men"));
    const kinds=raw.filter(kind=>!mixed||!["women","men","mixed","unisex"].includes(kind));
    if(mixed)kinds.unshift("mixed");
    kinds.sort((a,b)=>Number(a==="accessible")-Number(b==="accessible"));
    const columns = compactPins ? Math.min(3, kinds.length) : kinds.includes("accessible") ? Math.max(1, kinds.length - 1) : Math.min(3, kinds.length);
    const rows = compactPins ? Math.ceil(kinds.length / Math.max(1, columns)) : kinds.includes("accessible") && kinds.length > 1 ? 2 : 1;
    const width = compactPins ? Math.max(44, columns * 18 + 12) : Math.max(100, columns * 28 + 14);
    const height = compactPins ? Math.max(44, rows * 18 + 10) : rows * 26 + 38;
    return {kinds,columns,width,height};
  };
  type Pin={id:string;area:string;x:number;y:number;members:DomeGuideSpot[];memberIds:string[];points:{id:string;kind:FacilityAnchor["kind"];x:number;y:number}[]}&ReturnType<typeof pinShape>;
  let groups:Pin[]=tokyoFacilityAreas(shown,currentId,layer,purpose).map(group=>({
    id:group.id,area:group.area,...position(group),members:[...group.members],memberIds:[...group.memberIds],
    points:group.members.map(item=>({id:item.id,kind:item.facilityAnchor!.kind,...position(item.facilityAnchor!)})),
    ...pinShape(group.members),
  })).filter(group=>group.points.length);
  const touching=(a:Pin,b:Pin)=>Math.abs(a.x-b.x)<(a.width+b.width)/2+2&&Math.abs(a.y-b.y)<(a.height+b.height)/2+2;
  for(let merged=true;merged;){
    merged=false;
    for(let i=0;i<groups.length&&!merged;i++)for(let j=i+1;j<groups.length&&!merged;j++){
      const a=groups[i],b=groups[j];
      if(!touching(a,b))continue;
      const members=[...a.members,...b.members],wa=a.members.length,wb=b.members.length;
      const pin:Pin={id:`${a.id}+${b.id}`,area:`${a.area}・${b.area}`,x:(a.x*wa+b.x*wb)/(wa+wb),y:(a.y*wa+b.y*wb)/(wa+wb),
        members,memberIds:[...a.memberIds,...b.memberIds],points:[...a.points,...b.points],...pinShape(members)};
      groups=[...groups.slice(0,i),pin,...groups.slice(i+1,j),...groups.slice(j+1)];
      merged=true;
    }
  }
  groups=groups.map(g=>({...g,x:Math.max(g.width/2+4,Math.min(size.width-g.width/2-4,g.x)),y:Math.max(g.height/2+4,Math.min(size.height-g.height/2-4,g.y))}));
  const placed=placeMapLabels(labels,size.width,size.height,{reserved:groups.map(g=>({x:g.x,y:g.y,width:g.width,height:g.height}))});
  const outfield=currentId==="1f-outfield";
  const areaItems=shown.filter(item=>groupIds?.includes(item.id));

  return <div className={styles.root} data-floor={currentId} data-map-interaction="landmark-zoom" data-pin-density={compactPins ? "compact" : undefined} aria-label={`${floorInfo.label}の施設図`}>
    <div ref={map} className={styles.map}>
      {data?<>
      <div className={styles.canvas}>
        <svg viewBox={`0 0 ${size.width} ${size.height}`} aria-hidden="true">
          <g transform={`translate(${dx},${dy}) scale(${fit}) translate(${-cx},${-cy})`}>
            {art&&<FieldLandmark box={art}/>}
            <FloorGeometry data={data}/>
            {selectedHere&&<circle data-destination-anchor={selectedHere.id} cx={selectedHere.facilityAnchor!.x} cy={selectedHere.facilityAnchor!.y} r={9/fit} strokeWidth={3/fit} className={styles.selectedAnchor}/>}
            {originHere&&<circle data-origin-anchor={originHere.id} cx={originHere.x} cy={originHere.y} r={10/fit} className={styles.originAnchor} strokeWidth={3/fit}/>}
          </g>
        </svg>
      </div>
      {seat&&facilityFloorId(seat.floor??"")===currentId&&<div className={styles.mapTitle}><small>選択席 {seat.section}{seat.row!==null?`・${seat.row}列`:""}</small></div>}
      {/* Which arm is which side, on the map itself (the plan is seen from the stands, the field at the top). */}
      <span className={`${styles.sideTag} ${styles.sideLeft}`} aria-hidden="true">← {outfield?"レフト側":"3塁側"}</span>
      <span className={`${styles.sideTag} ${styles.sideRight}`} aria-hidden="true">{outfield?"ライト側":"1塁側"} →</span>
      <svg className={styles.leaders} viewBox={`0 0 ${size.width} ${size.height}`} aria-hidden="true">
        {groups.filter(group=>group.points.length>1).map(group=>{
          const xs=group.points.map(point=>point.x),ys=group.points.map(point=>point.y),x=Math.min(...xs)-5,y=Math.min(...ys)-5;
          return <rect key={group.id} data-area-coverage={group.id} x={x} y={y} width={Math.max(...xs)-x+5} height={Math.max(...ys)-y+5} rx={6} className={styles.areaCoverage}/>;
        })}
        {placed.filter(p=>Math.hypot(p.left-p.x,p.top-p.y)>10).map(p=><g key={p.id}><path d={`M${p.x},${p.y} L${p.left},${p.top}`} className={p.kind==="facility"?styles.facilityLeader:styles.landmarkLeader}/>{p.kind!=="facility"&&<circle cx={p.x} cy={p.y} r={2.5} fill="#536773"/>}</g>)}
      </svg>
      {placed.map((p)=>{
        const location={left:p.left,top:p.top};
        if(p.kind==="facility")return null;
        if(p.kind==="gate"){
          const chosen=isOriginLabel(p.id),landmark=landmarks.find((l)=>l.id===`${currentId}:${p.id.replace("gate-","gate:").replace("passage-","passage:")}`);
          return <button key={p.id} type="button" className={`${styles.gateLabel} ${chosen?styles.originLabel:""}`} style={{...location,width:p.width}} data-landmark={p.id.startsWith("gate-")?"gate":"passage"} aria-pressed={chosen} aria-label={chosen?`選んだ場所：${landmark?.label}`:`${landmark?.label}を目印に選ぶ`} onClick={()=>{if(landmark)onOrigin(landmark);}}>{chosen&&<small>選んだ場所</small>}{p.id.startsWith("gate-")?`GATE ${p.id.replace("gate-","")}`:landmark?.label}</button>;
        }
        if(p.kind==="passage")return <span key={p.id} className={styles.passageLabel} style={{...location,width:p.width}} data-landmark="passage">{p.id.replace("passage-","").replace("–","〜")}<small>通路</small></span>;
        return null;
      })}
      {groups.map(group=>{
        const location={left:group.x,top:group.y};
        // The pin holding the facility open in the detail is highlighted too, so the detail's place is findable on the map.
        const expanded=group.points.some(point=>areaItems.some(item=>item.id===point.id)||point.id===selectedHere?.id);
        const label=`${group.area}：${group.kinds.map(kind=>kindNames[kind as FacilityAnchor["kind"]]).join("・")} ${group.points.length}件`;
        return <button key={group.id} type="button" className={styles.pin} data-facility-group={group.id} data-group-size={group.points.length} data-spot-ids={group.points.map(point=>point.id).join(" ")} data-kind={group.kinds.length===1?group.kinds[0]:"area"} aria-label={label} title={label} aria-expanded={expanded} aria-pressed={expanded} style={{...location,width:group.width,height:group.height}} onClick={event=>onGroup([...group.memberIds],event.currentTarget)}>
          <span className={styles.areaIcons} style={{gridTemplateColumns:`repeat(${group.columns},${compactPins ? 18 : 24}px)`}}>{group.kinds.map(kind=>{
            const facilityKind=kind as FacilityAnchor["kind"],Icon=icons[facilityKind];
            return <span key={kind} data-area-kind={kind} className={styles.areaIcon} style={!compactPins && kind==="accessible"?{gridColumn:"1 / -1"}:undefined}><Icon size={compactPins ? 17 : 24}/></span>;
          })}
          </span>{compactPins ? group.points.length > 1 && <small className={styles.compactCount}>{group.points.length}</small>
            : <small className={styles.groupCount}>{group.area}<span>{group.points.length}件</span></small>}
        </button>;
      })}
      </>:<div className={styles.none}>この階に該当する売店の掲載はありません。</div>}
    </div>
    <div className={styles.legend}><span><i className={styles.concourseSwatch}/>通路側</span>{data&&data.seating.length>0&&<span><i className={styles.seatSwatch}/>客席側</span>}</div>
  </div>;
}
