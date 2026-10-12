import { type SearchGeometry, type SearchGrid } from "./layoutSearch";

const epsilon=1e-5;

/** Construct rectangle patterns from explicitly complete rows, never unreported gaps.
 * Search hints only: every geometry still passes the normal full hard checks.
 * Horizontal rows must share complete potential x positions at each y level.
 */
export function squareCensusSeeds(grid:SearchGrid,minimumSize:number,maximumSize:number,maximumWidth:number):SearchGeometry[] {
  if(!grid.rows.every(r=>r.census)) return [];
  const grouped=new Map<number,{x:number;missing:boolean}[]>();
  for(const row of grid.rows) for(let i=0;i<row.slots.length;i++) {
    const p=row.slots[i].point,slots=grouped.get(p.y)??[];
    slots.push({x:p.x,missing:!(row.observed & (1<<i))}); grouped.set(p.y,slots);
  }
  const levels=[...grouped].sort((a,b)=>a[0]-b[0]).map(([y,slots])=>({y,slots:slots.sort((a,b)=>a.x-b.x)}));
  const xs=levels[0]?.slots.map(s=>s.x)??[];
  if(!xs.length || xs.length>256 || levels.length>128 || levels.some(l=>l.slots.length!==xs.length || l.slots.some((s,i)=>s.x!==xs[i])) || xs.some((x,i)=>i>0 && x===xs[i-1])) return [];
  // Counts are valid for preserved numbering and per-row resetting.
  const removed=levels.map(l=>l.slots.filter(s=>s.missing).length);
  const maximum=Math.max(...removed);
  if(!maximum || maximum>=xs.length) return [];
  const seeds:SearchGeometry[]=[];
  const spans=(length:number)=>Array.from({length:xs.length-length+1},(_,i)=>({
    previous:i?xs[i-1]:xs[0]-grid.spacing, first:xs[i],last:xs[i+length-1],next:xs[i+length]??xs.at(-1)!+grid.spacing,
  }));
  // One widest constant-count band. Cross paths or varying grids stay with
  // the general search rather than silently changing their interpretation.
  for(let first=0;first<levels.length;first++) {
    if(removed[first]!==maximum || first>0 && removed[first-1]===maximum) continue;
    let last=first;while(last+1<levels.length && removed[last+1]===maximum) last++;
    if(removed.slice(last+1).some(Boolean)) continue;
    const front=removed.slice(0,first),pathCount=front[0]??0;
    if(front.some(c=>c!==pathCount)) continue;
    const topPrevious=first?levels[first-1].y:grid.mainEnd,topFirst=levels[first].y;
    const bottomLast=levels[last].y,bottomNext=levels[last+1]?.y??bottomLast+grid.rowSpacing;
    const paths=pathCount?spans(pathCount):[null];
    for(const span of spans(maximum)) for(const path of paths) {
      const minimumSide=Math.max(2*minimumSize,span.last-span.first,bottomLast-topFirst);
      const maximumSide=Math.min(2*maximumSize,span.next-span.previous,bottomNext-topPrevious);
      if(maximumSide<=minimumSide+epsilon) continue;
      // Side-length feasibility changes at these linear interval boundaries.
      const critical=[minimumSide,maximumSide];
      if(path) {
        const lo=Math.max((path.previous+path.last)/2,path.last-maximumWidth/2);
        const hi=Math.min((path.first+path.next)/2,path.first+maximumWidth/2);
        for(const x of [lo,hi]) for(const edge of [span.previous,span.first,span.last,span.next]) critical.push(2*Math.abs(x-edge));
      }
      const cuts=[...new Set(critical.filter(v=>v>=minimumSide && v<=maximumSide))].sort((a,b)=>a-b);
      for(let j=1;j<cuts.length;j++) {
        const side=(cuts[j-1]+cuts[j])/2,size=side/2;
        let left=Math.max(span.previous+epsilon,span.last-side)+size;
        let right=Math.min(span.first,span.next-epsilon-side)+size;
        left=Math.max(left,grid.floor.x+grid.spacing);right=Math.min(right,grid.floor.x+grid.floor.width-grid.spacing);
        if(path) {
          left=Math.max(left,(path.previous+path.last)/2+epsilon,path.last-maximumWidth/2);
          right=Math.min(right,(path.first+path.next)/2-epsilon,path.first+maximumWidth/2);
        }
        const top=Math.max(topPrevious+epsilon,bottomLast-side)+size;
        const bottom=Math.min(topFirst,bottomNext-epsilon-side)+size;
        const yLow=Math.max(top,grid.floor.y+grid.rowSpacing),yHigh=Math.min(bottom,grid.floor.y+grid.floor.height-grid.rowSpacing);
        if(left>right || yLow>yHigh) continue;
        const x=(left+right)/2,y=(yLow+yHigh)/2;
        let width=0;
        if(path) {
          const lo=Math.max(grid.spacing,2*(x-path.first),2*(path.last-x));
          const hi=Math.min(maximumWidth,2*(x-path.previous)-epsilon,2*(path.next-x)-epsilon);
          if(lo>hi) continue; width=(lo+hi)/2;
        }
        seeds.push({center:"square",runway:path?"straight":"none",x,y,size,width});
        if(seeds.length>=2048) return seeds;
      }
    }
  }
  return seeds;
}
