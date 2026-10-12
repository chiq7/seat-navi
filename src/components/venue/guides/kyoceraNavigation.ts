import data from "@/data/venueGuides/kyocera-dome/seat-navigation.json";
import { kyoceraBlockCatalog, type KyoceraSeatRange } from "@/lib/kyoceraSeatLookup";
export type NavigationNode = { id:string; kind:string; areaId:string; tier:string; title:string; hint:string;
  codes:string[]; bounds:number[]; anchor:number[]; rows:string; exception:boolean; children?:NavigationNode[] };
export const navigationLayouts = data as unknown as {mobile:NavigationNode[];desktop:NavigationNode[]};
export function safeKyoceraRanges(row:string|null,ranges:readonly KyoceraSeatRange[]) {
  return ranges.flatMap(range=>{
    if(range.blockCode!=="X_BM_57"||Number(row)!==27||range.start>46||range.end<46)return [range];
    return [...(range.start<46?[{...range,end:45}]:[]),...(range.end>46?[{...range,start:47}]:[])];
  });
}
export function safeKyoceraCatalog(areaId:string,codes:string[]) {
  return kyoceraBlockCatalog(areaId,codes).map(block=>{
    if(block.code!=="X_BM_57")return block;
    const rows=block.rows.map(row=>{const ranges=safeKyoceraRanges(row.row,row.ranges);return {...row,ranges,seatCount:ranges.reduce((n,r)=>n+r.end-r.start+1,0)};});
    return {...block,rows,firstSeat:Math.min(...rows.flatMap(row=>row.ranges.map(r=>r.start))),
      lastSeat:Math.max(...rows.flatMap(row=>row.ranges.map(r=>r.end))),seatCount:rows.reduce((n,row)=>n+row.seatCount,0)};
  });
}
