import { type SeatAddress } from "./layoutModel";
import { geometryContains, resolveSearchSeat, type LayoutSearchResult } from "./layoutSearch";

export type EvidenceQuestion =
  | {kind:"row-end";block:string;row:string;worstRemaining:number;alternatives:number}
  | {kind:"position";address:SeatAddress;worstRemaining:number;alternatives:number};

/** Select a useful next observable from all compatible hypotheses, not the truth.
 * This requests a verified fact; it does not manufacture an answer or save data.
 */
export function nextEvidenceQuestion(result:LayoutSearchResult,asked:ReadonlySet<string>=new Set()):EvidenceQuestion|null {
  if(result.budgetLimited || result.analysis.held.length || result.state === "needs-review") return null;
  const candidates=result.hypotheses.filter(h=>h.conflicts===0);
  if(candidates.length<2) return null;
  let best:EvidenceQuestion|null=null;
  const consider=(q:EvidenceQuestion)=>{
    if(q.alternatives<2) return;
    if(!best || q.worstRemaining<best.worstRemaining) best=q;
  };
  for(const row of result.grid.rows) {
    const address=row.slots[0].address,key=`row-end:${address.block}:${address.row}`;
    if(asked.has(key)) continue;
    const groups=new Map<number,number>();let unsupported=false;
    for(const h of candidates) {
      let last=0,count=0;
      for(const slot of row.slots) if(!geometryContains(h.geometry,slot.point,result.grid)) {count++;last=Number(slot.address.seat);}
      const answer=h.numbering === "row-reset" ? count:last;
      if(!answer){unsupported=true;break;}
      groups.set(answer,(groups.get(answer)??0)+1);
    }
    if(!unsupported) consider({kind:"row-end",block:address.block,row:address.row,worstRemaining:Math.max(...groups.values()),alternatives:groups.size});
  }
  // A small deterministic report subset bounds the cost of position questions.
  const addresses=[...new Map(result.analysis.accepted.map(a=>[JSON.stringify([a.block,a.row,a.seat]),a])).values()]
    .sort((a,b)=>JSON.stringify([a.block,a.row,a.seat]).localeCompare(JSON.stringify([b.block,b.row,b.seat]),"en"))
    .slice(0,8);
  for(const address of addresses) {
    if(asked.has(`position:${address.block}:${address.row}:${address.seat}`)) continue;
    const groups=new Map<string,number>();let unsupported=false;
    for(const h of candidates) {
      const p=resolveSearchSeat(result.grid,h,address);
      if(!p){unsupported=true;break;}
      const key=JSON.stringify([p.x,p.y]);groups.set(key,(groups.get(key)??0)+1);
    }
    if(!unsupported) consider({kind:"position",address:{block:address.block,row:address.row,seat:address.seat},worstRemaining:Math.max(...groups.values()),alternatives:groups.size});
  }
  return best;
}

export const questionKey=(q:EvidenceQuestion)=>q.kind === "row-end" ? `row-end:${q.block}:${q.row}` : `position:${q.address.block}:${q.address.row}:${q.address.seat}`;
