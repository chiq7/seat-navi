import { type Bounds, type Point, type SeatAddress } from "./layoutModel";
import { geometryContains, resolveSearchSeat, type LayoutSearchResult, type SearchGeometry, type SearchGrid, type SearchHypothesis } from "./layoutSearch";

export type ConsensusCell = { x: number; y: number; size: number; kind: "common" | "possible" };
export type LayoutConsensus = {
  cells: ConsensusCell[]; commonPath: string; possiblePath: string;
  commonCells: number; possibleCells: number; centerPresence: "all" | "mixed" | "none";
  runwayPresence: "all" | "mixed" | "none"; candidateCount: number;
};
const presence=(values: boolean[]) => values.every(Boolean) ? "all" as const : values.some(Boolean) ? "mixed" as const : "none" as const;
function extent(g: SearchGeometry, grid: SearchGrid): Bounds | null {
  if (g.center === "none" && g.runway === "none") return null;
  let left=g.x-g.size, right=g.x+g.size, top=g.y-g.size, bottom=g.y+g.size;
  if (g.runway !== "none") {
    left=Math.min(left,g.x-g.width/2); right=Math.max(right,g.x+g.width/2); top=grid.mainEnd;
    if (g.runway === "cross") {left=Math.min(left,grid.crossLeft);right=Math.max(right,grid.crossRight);bottom=Math.max(bottom,g.y+g.width/2);}
  }
  return {x:left,y:top,width:right-left,height:bottom-top};
}
const insideBounds=(p: Point,b: Bounds) => p.x>=b.x && p.x<=b.x+b.width && p.y>=b.y && p.y<=b.y+b.height;

// A sampling score cannot prove that a compatible geometry/numbering is impossible.
// Include every hard-compatible hypothesis before asserting a common region or seat relation.
const compatibleHypotheses=(result: LayoutSearchResult) => [...new Set([...result.hypotheses.filter(h=>h.conflicts === 0),...result.top])];

/** Common region uses every hard-compatible hypothesis; possible region uses all top hypotheses. */
export function buildLayoutConsensus(result: LayoutSearchResult): LayoutConsensus {
  const {grid,top}=result;
  const blank: LayoutConsensus={cells:[],commonPath:"",possiblePath:"",commonCells:0,possibleCells:0,centerPresence:"none",runwayPresence:"none",candidateCount:top.length};
  if (!top.length || result.state === "no-evidence" || result.state === "held-input" || result.budgetLimited) return blank;
  const compatible=compatibleHypotheses(result);
  const presences={centerPresence:presence(compatible.map(h => h.geometry.center !== "none")),runwayPresence:presence(compatible.map(h => h.geometry.runway !== "none"))};
  const informed=result.scoredRows>0 || !!result.options.census || !!result.options.additional?.length;
  if (!informed) return {...blank,...presences};
  const bounds=grid.base.bounds, size=Math.min(grid.spacing,grid.rowSpacing)/2;
  const columns=Math.ceil(bounds.width/size), rows=Math.ceil(bounds.height/size), count=columns*rows;
  // Numbering duplicates do not change an intersection/union of physical stage regions.
  const geometries=[...new Set(top.map(h => h.geometry))];
  const commonGeometries=[...new Set(compatible.map(h=>h.geometry))];
  const anyCorners=new Uint8Array(count), allCorners=new Uint8Array(count);
  let commonIndices: number[]=[];
  // Sparse reports plus a few endpoints do not certify coverage of this heuristic
  // search. A missing true geometry must not turn sampled agreement into certainty.
  if (result.options.census && grid.reportedBounds && !commonGeometries.some(g => !extent(g,grid))) {
    for (let y=0;y<rows;y++) for(let x=0;x<columns;x++) {
      const px=bounds.x+x*size,py=bounds.y+y*size;
      if (insideBounds({x:px,y:py},grid.reportedBounds) && insideBounds({x:px+size,y:py+size},grid.reportedBounds)) commonIndices.push(y*columns+x);
    }
  }
  for (const g of commonGeometries) {
    commonIndices=commonIndices.filter(i => {
      const px=bounds.x+(i%columns)*size,py=bounds.y+Math.floor(i/columns)*size;
      return geometryContains(g,{x:px,y:py},grid) && geometryContains(g,{x:px+size,y:py},grid)
        && geometryContains(g,{x:px,y:py+size},grid) && geometryContains(g,{x:px+size,y:py+size},grid);
    });
    if (!commonIndices.length) break;
  }
  for (const g of geometries) {
    const b=extent(g,grid); if (!b) continue;
    const firstX=Math.max(0,Math.floor((b.x-bounds.x)/size)-1),lastX=Math.min(columns-1,Math.ceil((b.x+b.width-bounds.x)/size));
    const firstY=Math.max(0,Math.floor((b.y-bounds.y)/size)-1),lastY=Math.min(rows-1,Math.ceil((b.y+b.height-bounds.y)/size));
    for (let y=firstY;y<=lastY;y++) for (let x=firstX;x<=lastX;x++) {
      const index=y*columns+x;
      if (anyCorners[index]) continue;
      const px=bounds.x+x*size,py=bounds.y+y*size;
      if (geometryContains(g,{x:px,y:py},grid) || geometryContains(g,{x:px+size,y:py},grid)
        || geometryContains(g,{x:px,y:py+size},grid) || geometryContains(g,{x:px+size,y:py+size},grid)
        || geometryContains(g,{x:px+size/2,y:py+size/2},grid)) anyCorners[index]=1;
    }
  }
  for (const i of commonIndices) allCorners[i]=1;
  const cells: ConsensusCell[]=[], kinds=new Uint8Array(count);
  for (let y=0;y<rows;y++) for (let x=0;x<columns;x++) {
    const i=y*columns+x,px=bounds.x+x*size,py=bounds.y+y*size;
    if (!anyCorners[i]) continue;
    const common=allCorners[i] === 1;
    kinds[i]=common ? 2 : 1;
    cells.push({x:px,y:py,size,kind:common ? "common" : "possible"});
  }
  // Join horizontal runs so thousands of raster cells do not become thousands of SVG elements.
  const path=(kind: number) => {
    let d="";
    for (let y=0;y<rows;y++) for (let x=0;x<columns;x++) {
      if (kinds[y*columns+x] !== kind) continue;
      const first=x; while(x+1<columns && kinds[y*columns+x+1] === kind) x++;
      const width=(x-first+1)*size;
      d+=`M${bounds.x+first*size},${bounds.y+y*size}h${width}v${size}h-${width}Z`;
    }
    return d;
  };
  return {cells,commonPath:path(2),possiblePath:path(1),commonCells:cells.filter(c => c.kind === "common").length,possibleCells:cells.filter(c => c.kind === "possible").length,
    ...presences,candidateCount:top.length};
}

export type SeatRelation = { bounds: Bounds | null; representative: Point | null; label: string; mappedCandidates: number; candidateCount: number };
function relativeLabel(h: SearchHypothesis,p: Point) {
  if (h.geometry.center === "none") return "センステの有無は未判定";
  const g=h.geometry,threshold=g.size/2,parts: string[]=[];
  if (p.x>g.x+threshold) parts.push("右側"); else if (p.x<g.x-threshold) parts.push("左側");
  if (p.y>g.y+threshold) parts.push("後方"); else if (p.y<g.y-threshold) parts.push("前方");
  return parts.length ? `センステの${parts.join("・")}` : "センステ周辺";
}
export function describeSeatRelation(result: LayoutSearchResult,address: SeatAddress): SeatRelation {
  if (result.state === "held-input" || result.state === "needs-review" || result.budgetLimited) return {bounds:null,representative:null,label:"席の位置は未判定",mappedCandidates:0,candidateCount:result.top.length};
  const confirmed=result.options.additional?.find(e=>e.kind === "position" && e.address.block === address.block && e.address.row === address.row && e.address.seat === address.seat);
  if (!result.options.census && confirmed?.kind === "position") return {
    bounds:{x:confirmed.point.x-confirmed.tolerance,y:confirmed.point.y-confirmed.tolerance,width:confirmed.tolerance*2,height:confirmed.tolerance*2},
    representative:confirmed.point,label:"席の位置は確認済み・ステージは未判定",mappedCandidates:result.compatibleCount,candidateCount:result.compatibleCount,
  };
  if (!result.options.census) return {bounds:null,representative:null,label:"位置関係は未判定",mappedCandidates:0,candidateCount:result.compatibleCount};
  const points: Point[]=[],labels=new Set<string>();
  const compatible=compatibleHypotheses(result);
  for (const h of compatible) {
    const point=resolveSearchSeat(result.grid,h,address);
    if (point) {points.push(point);labels.add(relativeLabel(h,point));}
  }
  const candidateCount=compatible.length;
  if (!points.length) return {bounds:null,representative:null,label:"この席はまだ対応できません",mappedCandidates:0,candidateCount};
  const x=Math.min(...points.map(p => p.x)),y=Math.min(...points.map(p => p.y));
  const bounds={x,y,width:Math.max(...points.map(p => p.x))-x,height:Math.max(...points.map(p => p.y))-y};
  const unmapped=points.length !== candidateCount;
  const label=unmapped ? "席の位置は未判定" : [...labels].some(l => l === "センステの有無は未判定") ? "センステの有無は未判定"
    : labels.size === 1 ? [...labels][0] : "位置関係は候補で変わります";
  return {bounds,representative:points[0],label,mappedCandidates:points.length,candidateCount};
}
