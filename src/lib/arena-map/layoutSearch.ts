import { containsPoint, normalizeLabel, shapeBounds, type ArenaLayout, type Bounds, type Landmark, type Point, type SeatAddress } from "./layoutModel";
import { generateCandidateSeats, rowKey, type SeatCandidate } from "./candidateSeatModel";
import { logChoose, rankingConfig, scoringWindows, validateRankingOptions, type RankingOptions } from "./candidateRanking";
import { type EvidenceAnalysis } from "./reportEvidence";
import { squareCensusSeeds } from "./squareCensusSeeds";

export type SearchGeometry = {
  center: "none" | "circle" | "square"; runway: "none" | "straight" | "cross";
  x: number; y: number; size: number; width: number;
};
export type SearchHypothesis = { id: string; geometry: SearchGeometry; numbering: "preserved" | "row-reset"; score: number; conflicts: number };
export const searchConfig = Object.freeze({ seedsPerFamily: 12, refinementSteps: [6, 3, 1] as readonly number[], maxEvaluations: 60000, displayLimit: 36 });
type SearchRow = { key: string; slots: { address: SeatAddress; point: Point }[]; observed: number; census: boolean; window: { mask: number; count: number } | null };
export type SearchGrid = {
  base: ArenaLayout; reference: SeatCandidate; rows: SearchRow[]; byRow: Map<string, SearchRow>;
  canonicalRows: Map<string, string>; floor: Bounds; spacing: number; rowSpacing: number;
  mainEnd: number; crossLeft: number; crossRight: number; reportedBounds: Bounds | null;
};
export type LayoutSearchResult = {
  grid: SearchGrid; analysis: EvidenceAnalysis; options: RankingOptions;
  hypotheses: SearchHypothesis[]; top: SearchHypothesis[]; display: SearchHypothesis[];
  evaluatedGeometries: number; compatibleCount: number; scoredRows: number;
  budgetLimited: boolean; state: "no-evidence" | "needs-review" | "held-input" | "unresolved" | "leading-unverified";
};
const popcount = (bits: number) => { let n = bits >>> 0, count = 0; while (n) { n &= n - 1; count++; } return count; };
const maskFor = (first: number, last: number) => {
  let mask = 0;
  for (let n = Math.max(1, first); n <= Math.min(30, last); n++) mask |= 1 << (n - 1);
  return mask >>> 0;
};

function compileGrid(base: ArenaLayout, analysis: EvidenceAnalysis, options: RankingOptions): SearchGrid {
  if (base.landmarks.some(l => l.kind !== "main")) throw new Error("Search requires an uncut grid and only known main-stage landmarks");
  if (!base.eventIds.includes(analysis.eventId)) throw new Error("Search grid event mismatch");
  const reference = generateCandidateSeats(base, { kind: "preserved", start: 1, direction: 1 });
  const windows = new Map(scoringWindows(reference, analysis, options).map(w => [w.key, { mask: maskFor(w.min, w.max), count: w.count }]));
  const canonicalRows = new Map<string, string>();
  for (const block of base.blocks) for (const row of block.rows) for (const alias of [block.id, ...(block.aliases ?? [])]) {
    const key = rowKey({ block: alias, row: row.label }), target = rowKey({ block: block.id, row: row.label });
    if (canonicalRows.has(key) && canonicalRows.get(key) !== target) throw new Error("Ambiguous authored block alias");
    canonicalRows.set(key, target);
  }
  const observed = new Map<string, number>();
  for (const e of analysis.accepted) {
    const key = canonicalRows.get(rowKey(e)) ?? rowKey(e), number = Number(e.seat);
    if (number <= 30) observed.set(key, ((observed.get(key) ?? 0) | (1 << (number - 1))) >>> 0);
  }
  const census = new Set(options.census?.rows.map(r => canonicalRows.get(rowKey(r)) ?? rowKey(r)) ?? []);
  const rows = reference.rows.map(row => {
    const slots = [...row.seats].sort((a, b) => Number(a.address.seat) - Number(b.address.seat));
    if (slots.length > 30 || slots.some((s, i) => Number(s.address.seat) !== i + 1)) throw new Error("Search currently requires authored rows numbered 1..N, up to 30 seats");
    return { key: row.key, slots, observed: observed.get(row.key) ?? 0, census: census.has(row.key), window: windows.get(row.key) ?? null };
  });
  if (!rows.length || rows.some(r => r.slots.length < 2)) throw new Error("Search requires nonempty rows with at least two potential positions");
  const points = rows.flatMap(r => r.slots.map(s => s.point));
  const xs = points.map(p => p.x), ys = points.map(p => p.y);
  const spacing = Math.min(...rows.map(r => Math.hypot(r.slots[1].point.x - r.slots[0].point.x, r.slots[1].point.y - r.slots[0].point.y)));
  const levels = [...new Set(ys)].sort((a,b) => a-b), rowSpacing = Math.min(...levels.slice(1).map((y,i) => y-levels[i]));
  if (!Number.isFinite(spacing) || spacing <= 0 || !Number.isFinite(rowSpacing) || rowSpacing <= 0
    || base.blocks.some(b => b.rotation !== 0) || rows.some(r => r.slots.some(s => s.point.y !== r.slots[0].point.y))) throw new Error("Search currently supports known horizontal rows only");
  const floor = { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs)-Math.min(...xs), height: Math.max(...ys)-Math.min(...ys) };
  const mainEnd = Math.max(base.bounds.y, ...base.landmarks.map(l => { const b = shapeBounds(l.shape); return b.y+b.height; }));
  const reportedPoints = rows.filter(r => r.observed).flatMap(r => r.slots.map(s => s.point));
  const reportedBounds = reportedPoints.length ? {
    x: Math.min(...reportedPoints.map(p => p.x)), y: Math.min(...reportedPoints.map(p => p.y)),
    width: Math.max(...reportedPoints.map(p => p.x))-Math.min(...reportedPoints.map(p => p.x)),
    height: Math.max(...reportedPoints.map(p => p.y))-Math.min(...reportedPoints.map(p => p.y)),
  } : null;
  return { base, reference, rows, byRow: new Map(rows.map(r => [r.key,r])), canonicalRows, floor, spacing, rowSpacing, mainEnd,
    crossLeft: floor.x+spacing*2, crossRight: floor.x+floor.width-spacing, reportedBounds };
}

export function geometryContains(g: SearchGeometry, p: Point, grid: Pick<SearchGrid, "mainEnd" | "crossLeft" | "crossRight">): boolean {
  const dx = p.x-g.x, dy = p.y-g.y;
  if (g.center === "circle" && dx*dx+dy*dy <= g.size*g.size+1e-7) return true;
  if (g.center === "square" && Math.abs(dx) <= g.size+1e-7 && Math.abs(dy) <= g.size+1e-7) return true;
  if (g.runway === "none") return false;
  const end = g.center === "none" ? g.y : g.y-g.size;
  if (p.y >= grid.mainEnd-1e-7 && p.y <= end+1e-7 && Math.abs(dx) <= g.width/2+1e-7) return true;
  return g.runway === "cross" && Math.abs(dy) <= g.width/2+1e-7 && p.x >= grid.crossLeft-1e-7 && p.x <= grid.crossRight+1e-7;
}
function keptMask(g: SearchGeometry, row: SearchRow, grid: SearchGrid) {
  let mask = 0;
  for (let i = 0; i < row.slots.length; i++) if (!geometryContains(g, row.slots[i].point, grid)) mask |= 1 << i;
  return mask >>> 0;
}
function expectedMask(kept: number, numbering: SearchHypothesis["numbering"]) {
  return numbering === "preserved" ? kept : maskFor(1, popcount(kept));
}
export function resolveSearchSeat(grid: SearchGrid, hypothesis: Pick<SearchHypothesis,"geometry" | "numbering">, address: SeatAddress): Point | null {
  const key = grid.canonicalRows.get(rowKey(address)), row = key ? grid.byRow.get(key) : null;
  const value = normalizeLabel(address.seat), number = Number(value);
  if (!row || !/^[0-9]{1,5}$/.test(value) || number < 1 || number > 30) return null;
  const kept = keptMask(hypothesis.geometry, row, grid);
  if (hypothesis.numbering === "preserved") return kept & (1 << (number-1)) ? row.slots[number-1]?.point ?? null : null;
  let label = 0;
  for (let i = 0; i < row.slots.length; i++) if (kept & (1 << i)) { label++; if (label === number) return row.slots[i].point; }
  return null;
}

function geometryKey(g: SearchGeometry) { return [g.center,g.runway,g.x,g.y,g.size,g.width].join(":"); }
const canonical = (g: SearchGeometry): SearchGeometry => g.center === "none" && g.runway === "none" ? { center: "none", runway: "none", x:0,y:0,size:0,width:0 }
  : { ...g, size: g.center === "none" ? 0 : g.size, width: g.runway === "none" ? 0 : g.width };

/** Bounded geometric search. Receives no truth ID, dimensions, numbering flag or oracle coordinates. */
export function searchArenaLayouts(base: ArenaLayout, analysis: EvidenceAnalysis, options: RankingOptions = {}): LayoutSearchResult {
  validateRankingOptions(analysis, options);
  const grid = compileGrid(base, analysis, options), hypotheses: SearchHypothesis[] = [];
  const scoredRows = grid.rows.filter(r => r.window).length;
  const empty = { grid, analysis, options, hypotheses, top: [] as SearchHypothesis[], display: [] as SearchHypothesis[], evaluatedGeometries:0, compatibleCount:0, scoredRows, budgetLimited:false };
  if (!analysis.accepted.length && !options.census && !options.additional?.length) return { ...empty, state: analysis.held.length ? "held-input" : "no-evidence" };
  const unknown = analysis.accepted.filter(e => !grid.canonicalRows.has(rowKey(e)) || Number(e.seat)>30).length
    + (options.census?.rows.filter(r => !grid.canonicalRows.has(rowKey(r))).length ?? 0);
  if (unknown) return { ...empty, state: "needs-review" };
  const { floor, spacing, rowSpacing } = grid;
  const minSize=spacing*3, maxSize=spacing*12, maxWidth=spacing*6;
  const valid = (g: SearchGeometry) => g.center === "none" && g.runway === "none" || (
    g.x >= floor.x+spacing && g.x <= floor.x+floor.width-spacing && g.y >= floor.y+rowSpacing && g.y <= floor.y+floor.height-rowSpacing
    && (g.center === "none" || g.size >= minSize && g.size <= maxSize)
    && (g.runway === "none" || g.width >= spacing && g.width <= maxWidth && (g.center === "none" ? g.y : g.y-g.size) >= grid.mainEnd));
  const activeRows = grid.rows.filter(r => r.observed || r.census || r.window || options.additional?.length);
  const chooseTable = Array.from({length:31}, (_, n) => Array.from({length:31}, (_, count) => logChoose(Math.max(n,count), count)));
  const seen = new Set<string>(); let budgetLimited=false;
  const evaluate = (raw: SearchGeometry) => {
    const g=canonical(raw), key=geometryKey(g);
    if (!valid(g) || seen.has(key)) return;
    if (seen.size >= searchConfig.maxEvaluations) { budgetLimited=true; return; }
    seen.add(key);
    const masks=activeRows.map(row => keptMask(g,row,grid));
    for (const numbering of ["preserved","row-reset"] as const) {
      let conflicts=0, score=0;
      for (let i=0;i<activeRows.length;i++) {
        const row=activeRows[i], expected=expectedMask(masks[i],numbering);
        conflicts+=popcount((row.observed & ~expected) >>> 0);
        if (row.census) conflicts+=popcount((expected & ~row.observed) >>> 0);
        if (row.window) score+=chooseTable[popcount(expected & row.window.mask)][row.window.count];
      }
      for (const e of options.additional ?? []) {
        if (e.kind === "no-seats") {
          if (grid.rows.some(row => row.slots.some(s => !geometryContains(g,s.point,grid) && containsPoint(e.region,s.point)))) conflicts++;
          continue;
        }
        const point=resolveSearchSeat(grid,{geometry:g,numbering},e.address);
        if (!point) { conflicts++; continue; }
        if (e.kind === "position") {
          if (Math.hypot(point.x-e.point.x,point.y-e.point.y)>e.tolerance) conflicts++;
          if (geometryContains(g,e.point,grid) || base.landmarks.some(l => containsPoint(l.shape,e.point))) conflicts++;
        } else {
          const row=grid.byRow.get(grid.canonicalRows.get(rowKey(e.address))!)!;
          const expected=expectedMask(keptMask(g,row,grid),numbering);
          const numbers=row.slots.map(s => Number(s.address.seat)).filter(n => expected & (1 << (n-1)));
          const end=e.side === "minimum" ? Math.min(...numbers) : Math.max(...numbers);
          if (end !== Number(e.address.seat)) conflicts++;
        }
      }
      hypotheses.push({ id:`search:${key}:${numbering}`, geometry:g, numbering, score, conflicts });
    }
  };
  evaluate({center:"none",runway:"none",x:0,y:0,size:0,width:0});
  // Census labels constrain boundary intervals; no truth geometry is injected.
  for(const g of squareCensusSeeds(grid,minSize,maxSize,maxWidth)) evaluate(g);
  for (let x=floor.x+spacing;x<=floor.x+floor.width-spacing;x+=spacing*3) for (let y=floor.y+rowSpacing;y<=floor.y+floor.height-rowSpacing;y+=rowSpacing*2) {
    for (const runway of ["straight","cross"] as const) for (const width of [spacing*2,spacing*4,spacing*6]) evaluate({center:"none",runway,x,y,size:0,width});
    for (const center of ["circle","square"] as const) for (const size of [spacing*3,spacing*5,spacing*7,spacing*9,spacing*12]) {
      evaluate({center,runway:"none",x,y,size,width:0});
      for (const runway of ["straight","cross"] as const) for (const width of [spacing*2,spacing*4,spacing*6]) evaluate({center,runway,x,y,size,width});
    }
  }
  const order=(a: SearchHypothesis,b: SearchHypothesis) => a.conflicts-b.conflicts || a.score-b.score || a.id.localeCompare(b.id,"en");
  for (const step of searchConfig.refinementSteps) {
    const families=new Map<string,SearchHypothesis[]>(), spatial=new Set<string>();
    for (const h of [...hypotheses].sort(order)) {
      const g=h.geometry, family=`${g.center}:${g.runway}:${h.numbering}`;
      const cell=`${family}:${Math.floor(g.x/(spacing*2))}:${Math.floor(g.y/(rowSpacing*2))}`;
      const seeds=families.get(family) ?? [];
      if (seeds.length >= searchConfig.seedsPerFamily || spatial.has(cell)) continue;
      seeds.push(h); families.set(family,seeds); spatial.add(cell);
    }
    // This refines competing families/locations, rather than a single chosen winner.
    for (const seeds of families.values()) for (const h of seeds) {
      const g=h.geometry;
      if (g.center === "none" && g.runway === "none") continue;
      for (const dx of [-step,0,step]) for (const dy of [-step,0,step])
        for (const ds of g.center === "none" ? [0] : [-step,0,step]) for (const dw of g.runway === "none" ? [0] : [-step,0,step])
          evaluate({...g,x:g.x+dx,y:g.y+dy,size:g.size+ds,width:g.width+dw});
    }
  }
  const compatible=hypotheses.filter(h => !h.conflicts).sort(order), best=compatible[0]?.score ?? Infinity;
  const top=compatible.filter(h => h.score <= best+rankingConfig.tieLogMargin);
  const state=!compatible.length ? "needs-review" : analysis.held.length ? "held-input" : top.length>1 || budgetLimited ? "unresolved" : "leading-unverified";
  return {grid,analysis,options,hypotheses,top,display:top.slice(0,searchConfig.displayLimit),evaluatedGeometries:seen.size,compatibleCount:compatible.length,scoredRows,budgetLimited,state};
}

const rect=(x:number,y:number,w:number,h:number) => ({kind:"polygon" as const,points:[{x,y},{x:x+w,y},{x:x+w,y:y+h},{x,y:y+h}]});
export function searchHypothesisLayout(grid: SearchGrid, h: SearchHypothesis): ArenaLayout {
  const g=h.geometry, landmarks: Landmark[]=[...grid.base.landmarks];
  if (g.center !== "none") landmarks.push({id:"center",kind:"center",label:"センステ",labelAt:{x:g.x,y:g.y},shape:g.center === "circle" ? {kind:"circle",center:{x:g.x,y:g.y},radius:g.size} : rect(g.x-g.size,g.y-g.size,g.size*2,g.size*2)});
  if (g.runway !== "none") {
    const end=g.center === "none" ? g.y : g.y-g.size;
    landmarks.push({id:"runway",kind:"runway",label:"花道",labelAt:{x:g.x,y:(grid.mainEnd+end)/2},shape:rect(g.x-g.width/2,grid.mainEnd,g.width,end-grid.mainEnd)});
    if (g.runway === "cross") landmarks.push({id:"cross",kind:"runway",label:"横花道",labelAt:{x:g.x,y:g.y},shape:rect(grid.crossLeft,g.y-g.width/2,grid.crossRight-grid.crossLeft,g.width)});
  }
  const centerLabel={none:"センステなし",circle:"円形",square:"四角"}[g.center], pathLabel={none:"花道なし",straight:"直線",cross:"横花道"}[g.runway];
  return {...grid.base,id:h.id,label:`${centerLabel}・${pathLabel}`,status:"prediction",landmarks};
}
