import type { GuideDiagram } from "@/data/venueGuides/types";
import type { MapLabel, PlacedMapLabel } from "@/lib/facilityMapLabels";
import { projectMapPoint } from "./mapGeometry";

export const KYOCERA_MARK_MAX_SHIFT = 32;
export function kyoceraMarkText(mark: GuideDiagram["landmarks"][number]) {
  const type = mark.kind === "gate" ? "ゲート" : mark.kind === "passage" ? "通路" : mark.kind === "shop" ? "売店" : mark.kind === "stairs" ? "階段" : "広場";
  const value = ["gate", "passage", "shop"].includes(mark.kind) ? mark.label.replace(/^[GS]/, "") : mark.label;
  return { type, value };
}
const collision = (a: PlacedMapLabel, b: PlacedMapLabel) =>
  Math.max(0, Math.min(a.left+a.width/2+1,b.left+b.width/2+1)-Math.max(a.left-a.width/2-1,b.left-b.width/2-1)) *
  Math.max(0, Math.min(a.top+a.height/2+1,b.top+b.height/2+1)-Math.max(a.top-a.height/2-1,b.top-b.height/2-1));

export type KyoceraFloorLabel = PlacedMapLabel & { memberIds: string[]; memberPoints: {id:string;x:number;y:number}[]; value:string; type:string };
// Like the main numbers on a clock, a few source landmarks establish the ring.
// Hidden landmarks stay in the data and selector. A chosen landmark is pinned.
export function kyoceraFloorMarks(diagram: GuideDiagram, width: number, height: number,
  options: { food?: boolean; pinnedIds?: string[]; detail?: boolean; interactive?: boolean } = {}): KyoceraFloorLabel[] {
  const centre=projectMapPoint(359,341,diagram.viewBox,width,height);
  const nodes=diagram.landmarks.map(mark=>({mark,...projectMapPoint(mark.x,mark.y,diagram.viewBox,width,height)}));
  const chosen: typeof nodes = [];
  for (const kind of ["gate", "passage", ...(options.food ? ["shop"] : [])]) {
    const candidates = nodes.filter(n => n.mark.kind === kind).sort((a, b) => a.mark.label.localeCompare(b.mark.label, "ja", { numeric: true }));
    const representatives: typeof nodes = [];
    while (representatives.length < (options.detail ? Infinity : 4) && candidates.length) {
      const best = representatives.length ? candidates.reduce((a, b) => {
        const gap = (n: typeof a) => Math.min(...representatives.map(p => Math.abs(Math.atan2(Math.sin(Math.atan2(n.y-centre.y,n.x-centre.x)-Math.atan2(p.y-centre.y,p.x-centre.x)), Math.cos(Math.atan2(n.y-centre.y,n.x-centre.x)-Math.atan2(p.y-centre.y,p.x-centre.x))))));
        return gap(b) > gap(a) ? b : a;
      }) : candidates[0];
      representatives.push(best); candidates.splice(candidates.indexOf(best), 1);
    }
    chosen.push(...representatives);
  }
  for (const id of options.pinnedIds ?? []) {
    const node = nodes.find(n => n.mark.id === id);
    if (node && !chosen.some(n => n.mark.id === id)) chosen.push(node);
  }
  const sets = chosen.map(node => [node]);
  const initial:KyoceraFloorLabel[]=sets.map(items=>{
    const mark=items[0].mark, text=kyoceraMarkText(mark), value=items.map(n=>kyoceraMarkText(n.mark).value).join("·");
    const x=items.reduce((s,n)=>s+n.x,0)/items.length,y=items.reduce((s,n)=>s+n.y,0)/items.length;
    return {id:`landmark:${mark.id}`,kind:"gate",x,y,left:x,top:y,memberIds:items.map(n=>n.mark.id),memberPoints:items.map(n=>({id:n.mark.id,x:n.x,y:n.y})),type:text.type,value,
      width:mark.kind==="gate"?44:mark.kind==="plaza"?36:mark.kind==="stairs"?24:Math.max(options.interactive ? 44 : 38,value.length*7+19),height:mark.kind==="gate" || (options.interactive && mark.kind==="passage")?44:24};
  });
  let winner=initial,winnerScore=Infinity;
  for(let seed=0;seed<8;seed++){
  const placed=initial.map(p=>({...p}));
  const order=placed.map((_,i)=>i).sort((a,b)=>seed===0?a-b:((a*17+seed*13)%placed.length)-((b*17+seed*13)%placed.length));
  if(seed%2)order.reverse();
  for(let pass=0;pass<10;pass++)for(const i of order){
    const label=placed[i],angle=Math.atan2(label.y-centre.y,label.x-centre.x);let best=label,score=Infinity;
    const radius=Math.hypot(label.x-centre.x,label.y-centre.y);
    const neighbours=placed.filter(p=>p.type===label.type&&p.id!==label.id);
    const gap=Math.min(Math.PI/8,...neighbours.map(p=>Math.abs(Math.atan2(Math.sin(Math.atan2(p.y-centre.y,p.x-centre.x)-angle),Math.cos(Math.atan2(p.y-centre.y,p.x-centre.x)-angle)))));
    for(const offset of [0,...Array.from({length:8},(_,i)=>(i+1)*4).flatMap(n=>[n,-n])])for(const turn of [0,-gap*.25,gap*.25]){
      const candidate={...label,left:centre.x+Math.cos(angle+turn)*(radius+offset),top:centre.y+Math.sin(angle+turn)*(radius+offset)};
      const distance=Math.hypot(candidate.left-label.x,candidate.top-label.y);if(distance>KYOCERA_MARK_MAX_SHIFT+1e-6)continue;
      if(candidate.left<label.width/2+2||candidate.left>width-label.width/2-2||candidate.top<label.height/2+2||candidate.top>height-label.height/2-2)continue;
      const next=placed.reduce((n,b,j)=>n+(j===i?0:collision(candidate,b)),0)*1000+distance;
      if(next<score){score=next;best=candidate;}
    }
    placed[i]=best;
  }
  const overlapScore=placed.reduce((sum,p,i)=>sum+placed.slice(i+1).reduce((n,b)=>n+collision(p,b),0),0);
  const total=overlapScore*1000+placed.reduce((sum,p)=>sum+Math.hypot(p.left-p.x,p.top-p.y),0);
  if(total<winnerScore){winnerScore=total;winner=placed;}
  if(overlapScore===0)break;
  }
  return winner;
}

// Equipment may use nearby free space, but never re-pack the numbered marks.
export function kyoceraEquipmentLabels(items:MapLabel[], marks:PlacedMapLabel[], width:number,height:number,
  options: { maxShift?: number; centre?: { x: number; y: number }; maxTurn?: number } = {}):PlacedMapLabel[] {
  const orders=[
    [...items].sort((a,b)=>b.width*b.height-a.width*a.height||a.id.localeCompare(b.id)),
    [...items].sort((a,b)=>a.x-b.x||a.y-b.y),
    [...items].sort((a,b)=>b.x-a.x||a.y-b.y),
    [...items].sort((a,b)=>a.y-b.y||a.x-b.x),
    [...items].sort((a,b)=>b.y-a.y||a.x-b.x),
  ];
  let winner:PlacedMapLabel[]=[],winnerScore=Infinity;
  for(const order of orders){
    const placed:PlacedMapLabel[]=[];
    for(const item of order){
      let best:PlacedMapLabel|undefined,score=Infinity;
      for(let top=item.height/2+3;top<=height-item.height/2-3;top+=4)for(let left=item.width/2+3;left<=width-item.width/2-3;left+=4){
        const distance=Math.hypot(left-item.x,top-item.y);if(distance>(options.maxShift ?? 160))continue;
        if (options.centre && options.maxTurn !== undefined) {
          const angle = Math.atan2(item.y-options.centre.y,item.x-options.centre.x);
          const turn = Math.atan2(top-options.centre.y,left-options.centre.x)-angle;
          if (Math.abs(Math.atan2(Math.sin(turn),Math.cos(turn)))>options.maxTurn) continue;
        }
        const candidate={...item,left,top};const next=[...marks,...placed].reduce((n,p)=>n+collision(candidate,{...p,width:p.width+2,height:p.height+2}),0)*10000+distance;
        if(next<score){score=next;best=candidate;}
      }
      placed.push(best??{...item,left:item.x,top:item.y});
    }
    const overlaps=placed.reduce((n,item,i)=>n+[...marks,...placed.slice(i+1)].reduce((sum,p)=>sum+collision(item,{...p,width:p.width+2,height:p.height+2}),0),0);
    const score=overlaps*10000+placed.reduce((n,p)=>n+Math.hypot(p.left-p.x,p.top-p.y),0);
    if(score<winnerScore){winnerScore=score;winner=placed;}if(overlaps===0)break;
  }
  return winner;
}
