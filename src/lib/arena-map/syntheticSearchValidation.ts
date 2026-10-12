import { type Point, type ArenaLayout, type Landmark } from "./layoutModel";
import { rowKey } from "./candidateSeatModel";
import { analyzeReports } from "./reportEvidence";
import { searchArenaLayouts, geometryContains, resolveSearchSeat, type SearchHypothesis, type LayoutSearchResult } from "./layoutSearch";
import { buildLayoutConsensus } from "./layoutConsensus";
import { createV2Layouts, fullCensusScope, sampleV2Seats, validationCutoff, type V2Profile } from "./syntheticValidationV2";
import { validationEvent, type SyntheticSeat } from "./syntheticValidation";

export type SearchTruth = { id: string; label: string; center: "circle" | "square" | "ellipse" | "none"; runway: "straight" | "cross" | "diagonal" | "none"; x: number; y: number; size: number; width: number; verticalRadius?: number };
// These new evaluation cases are declared independently from all search ranges/refinement seeds.
export const searchTruthCases: SearchTruth[] = [
  {id:"new-circle",label:"未使用：ずれた円",center:"circle",runway:"straight",x:231,y:267,size:43,width:15},
  {id:"new-square",label:"未使用：小さな四角",center:"square",runway:"straight",x:207,y:253,size:34,width:21},
  {id:"unsupported-ellipse",label:"対象外：楕円",center:"ellipse",runway:"straight",x:216,y:242,size:58,verticalRadius:26,width:12},
  {id:"unsupported-diagonal",label:"対象外：斜め花道",center:"circle",runway:"diagonal",x:246,y:248,size:42,width:12},
];
// Fresh evaluation after the original failure became a development regression.
// Frozen before running the boundary-interval solver; no solver input uses these dimensions.
export const freshSquareCases: SearchTruth[] = [
  {id:"fresh-square-left",label:"別検証：左の四角",center:"square",runway:"straight",x:180,y:264,size:29,width:17},
  {id:"fresh-square-right",label:"別検証：右の四角",center:"square",runway:"straight",x:246,y:274,size:41,width:29},
  {id:"fresh-square-no-path",label:"別検証：花道なし",center:"square",runway:"none",x:222,y:228,size:31,width:0},
  {id:"fresh-square-offset",label:"別検証：境界がずれた四角",center:"square",runway:"straight",x:195,y:256,size:38,width:23},
];

/** Independent analytic truth. Does not call search, geometryContains or candidate seat generation. */
export function oracleContains(t: SearchTruth,p: Point) {
  const dx=p.x-t.x,dy=p.y-t.y;
  const center=t.center === "circle" ? dx*dx+dy*dy<=t.size*t.size : t.center === "square" ? Math.abs(dx)<=t.size && Math.abs(dy)<=t.size
    : t.center === "ellipse" ? dx*dx/(t.size*t.size)+dy*dy/((t.verticalRadius ?? t.size)**2)<=1 : false;
  if (center) return true;
  const edge=t.center === "none" ? t.y : t.y-(t.center === "ellipse" ? t.verticalRadius ?? t.size : t.size);
  const straight=t.runway !== "none" && t.runway !== "diagonal" && p.y>=85 && p.y<=edge && Math.abs(dx)<=t.width/2;
  const horizontal=t.runway === "cross" && Math.abs(dy)<=t.width/2 && p.x>=100 && p.x<=332;
  if (t.runway === "diagonal") {
    const vx=t.x-216,vy=edge-85,length=vx*vx+vy*vy;
    const projection=Math.max(0,Math.min(1,((p.x-216)*vx+(p.y-85)*vy)/length));
    if ((p.x-216-projection*vx)**2+(p.y-85-projection*vy)**2<=(t.width/2)**2) return true;
  }
  return straight || horizontal;
}
export function createSearchTruthSeats(t: SearchTruth,reset: boolean): SyntheticSeat[] {
  const seats: SyntheticSeat[]=[];
  for(let br=0;br<2;br++) for(let bc=0;bc<2;bc++) for(let row=1;row<=14;row++) {
    let next=1;
    for(let number=1;number<=20;number++) {
      const point={x:90+bc*132+(number-1)*6,y:116+br*132+(row-1)*8};
      if(oracleContains(t,point)) continue;
      const block=`${br ? "B" : "A"}${bc+1}`,seat=String(reset ? next++ : number);
      seats.push({actualPoint:point,evidence:{id:`${block}:${row}:${seat}`,eventId:validationEvent,block,row:String(row),seat,precision:"exact",source:"fan-report",sourceRef:`independent:${block}:${row}:${seat}`,availableAt:"2026-09-27T09:00:00Z"}});
    }
  }
  return seats;
}

/** Oracle drawing only. This layout is never supplied to the inference process. */
export function createSquareTruthLayout(t:SearchTruth):ArenaLayout {
  if(t.center!=="square" || !["straight","none"].includes(t.runway)) throw new Error("Square oracle drawing requires square/straight or square/no path");
  const base=createV2Layouts().find(l=>l.id === "none-none")!;
  const rect=(x:number,y:number,w:number,h:number)=>({kind:"polygon" as const,points:[{x,y},{x:x+w,y},{x:x+w,y:y+h},{x,y:y+h}]});
  const landmarks:Landmark[]=[...base.landmarks,{id:"center",kind:"center",label:"センステ",labelAt:{x:t.x,y:t.y},shape:rect(t.x-t.size,t.y-t.size,t.size*2,t.size*2)}];
  if(t.runway === "straight") landmarks.push({id:"runway",kind:"runway",label:"花道",labelAt:{x:t.x,y:(85+t.y-t.size)/2},shape:rect(t.x-t.width/2,85,t.width,t.y-t.size-85)});
  return {...base,id:t.id,label:t.label,landmarks};
}

/** Evaluation only; truth labels/coordinates are never sent into the inference process. */
export function evaluateSearch(result: LayoutSearchResult,truthSeats: SyntheticSeat[],truthContains: (p:Point)=>boolean) {
  const labels=new Map<string,number>();
  for(const s of truthSeats) labels.set(rowKey(s.evidence),((labels.get(rowKey(s.evidence)) ?? 0)|(1<<(Number(s.evidence.seat)-1)))>>>0);
  const equivalent=(h: SearchHypothesis) => result.grid.rows.every(row => {
    let mask=0,next=1;
    for(let i=0;i<row.slots.length;i++) if(!geometryContains(h.geometry,row.slots[i].point,result.grid)) {
      const number=h.numbering === "row-reset" ? next++ : i+1;
      mask|=1<<(number-1);
    }
    return (mask>>>0)===(labels.get(row.key) ?? 0);
  });
  const matchingTop=result.top.filter(equivalent);
  const coordinateErrors=(h:SearchHypothesis) => truthSeats.filter(s => {
    const p=resolveSearchSeat(result.grid,h,s.evidence);
    return !p || Math.hypot(p.x-s.actualPoint.x,p.y-s.actualPoint.y)>1e-6;
  }).length;
  const consensus=buildLayoutConsensus(result);
  const falseCommon=consensus.cells.filter(c=>c.kind === "common" && !truthContains({x:c.x+c.size/2,y:c.y+c.size/2})).length;
  const positionMatchingTop=matchingTop.filter(h=>coordinateErrors(h)===0).length;
  return {matchingTop:matchingTop.length,positionMatchingTop,representativeCoordinateErrors:result.top[0] ? coordinateErrors(result.top[0]) : null,
    topCount:result.top.length,feasible:result.compatibleCount,geometries:result.evaluatedGeometries,budgetLimited:result.budgetLimited,
    commonCells:consensus.commonCells,falseCommonCells:falseCommon,possibleCells:consensus.possibleCells,centerPresence:consensus.centerPresence,state:result.state};
}
export function runSearchTruthValidation(t:SearchTruth,profile:V2Profile,seed:number,reset:boolean,census:boolean) {
  const truthSeats=createSearchTruthSeats(t,reset),samples=sampleV2Seats(truthSeats,profile,seed);
  const analysis=analyzeReports(samples.map(s=>s.evidence),validationEvent,validationCutoff);
  const result=searchArenaLayouts(createV2Layouts().find(l=>l.id === "none-none")!,analysis,census ? {census:fullCensusScope()} : {});
  return {truthSeats,samples,result,metrics:evaluateSearch(result,truthSeats,p=>oracleContains(t,p))};
}
