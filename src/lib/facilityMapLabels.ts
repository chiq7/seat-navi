export type MapLabel = {
  id: string;
  kind: "gate" | "passage" | "stairs" | "facility";
  x: number; y: number; width: number; height: number;
  offset?: { x: number; y: number };
};
export type PlacedMapLabel = MapLabel & { left: number; top: number };

// Move labels only. The original point remains the end of the leader line.
export function placeMapLabels(labels: readonly MapLabel[], width: number, height: number, options?: { facilitiesFirst?: boolean; keepFacilityAreas?: boolean }): PlacedMapLabel[] {
  const placed: PlacedMapLabel[] = [];
  const priority = options?.facilitiesFirst ? { gate: 0, facility: 1, stairs: 2, passage: 3 } : { gate: 0, passage: 1, stairs: 2, facility: 3 };
  const overlap = (a: PlacedMapLabel, b: PlacedMapLabel) =>
    Math.max(0, Math.min(a.left + a.width / 2 + 3, b.left + b.width / 2 + 3) - Math.max(a.left - a.width / 2 - 3, b.left - b.width / 2 - 3)) *
    Math.max(0, Math.min(a.top + a.height / 2 + 3, b.top + b.height / 2 + 3) - Math.max(a.top - a.height / 2 - 3, b.top - b.height / 2 - 3));
  for (const label of [...labels].sort((a, b) => priority[a.kind] - priority[b.kind])) {
    if ((label.x < -8 || label.y < -8 || label.x > width + 8 || label.y > height + 8) && !(label.kind === "facility" && options?.keepFacilityAreas)) continue;
    const dx = label.offset?.x ?? 0, dy = label.offset?.y ?? 0;
    const candidates = [[dx, dy], [0, 0]];
    for (const radius of [24, 44, 64, 88, 112, 136, 160]) {
      for (const [x, y] of [[0, -1], [0, 1], [-1, 0], [1, 0], [-.7, -.7], [.7, -.7], [-.7, .7], [.7, .7]]) candidates.push([x * radius, y * radius]);
    }
    let best: PlacedMapLabel | undefined, bestScore = Infinity;
    for (const [x, y] of candidates) {
      const left = Math.max(label.width / 2 + 5, Math.min(width - label.width / 2 - 5, label.x + x));
      const top = Math.max(label.height / 2 + 5, Math.min(height - label.height / 2 - 5, label.y + y));
      const candidate = { ...label, left, top };
      const collision = placed.reduce((sum, item) => sum + overlap(candidate, item), 0);
      const score = collision * 1000 + Math.hypot(left - label.x - dx, top - label.y - dy);
      if (score < bestScore) { bestScore = score; best = candidate; }
      if (collision === 0) break;
    }
    // Keep each visible facility directly selectable; only its label may move.
    if (label.kind === "facility" && bestScore >= 1000 && options?.facilitiesFirst) {
      for (let top=label.height/2+5;top<=height-label.height/2-5;top+=8) {
        for (let left=label.width/2+5;left<=width-label.width/2-5;left+=8) {
          const candidate={...label,left,top};
          if(placed.some((item)=>overlap(candidate,item)>0))continue;
          const score=Math.hypot(left-label.x-dx,top-label.y-dy);
          if(score<bestScore){best=candidate;bestScore=score;}
        }
      }
    }
    if (best && !(label.kind === "passage" && bestScore >= 1000)) placed.push(best);
  }
  if(options?.facilitiesFirst) {
    const facilities=placed.filter(p=>p.kind==="facility");
    if(facilities.some(a=>placed.some(b=>a.id!==b.id&&overlap(a,b)>0))) {
      const fixed=placed.filter(p=>p.kind==="gate"||p.kind==="stairs");
      // Group cards have variable dimensions. Repack whole cards, never hide members.
      const critical=[...fixed,...facilities];
      const arrangements:{fixed:PlacedMapLabel[];order:PlacedMapLabel[];compact?:boolean}[]=[
        {fixed,order:[...facilities].sort((a,b)=>b.width*b.height-a.width*a.height)},
        {fixed,order:[...facilities].sort((a,b)=>b.height-a.height||b.width-a.width)},
        {fixed,order:[...facilities].sort((a,b)=>a.y-b.y||a.x-b.x)},
        // On very small maps, gate labels may also move with their leader lines.
        {fixed:[],order:[...critical].sort((a,b)=>b.width*b.height-a.width*a.height)},
        {fixed:[],order:[...critical].sort((a,b)=>b.height-a.height||b.width-a.width)},
        {fixed:[],order:[...critical].sort((a,b)=>b.width*b.height-a.width*a.height),compact:true},
      ];
      for(const arrangement of arrangements) {
        const repacked=new Map<string,PlacedMapLabel>();
        for(const label of arrangement.order) {
          let best:PlacedMapLabel|undefined,bestDistance=Infinity;
          for(let top=label.height/2+5;top<=height-label.height/2-5;top+=4)for(let left=label.width/2+5;left<=width-label.width/2-5;left+=4) {
            const candidate={...label,left,top};
            if([...arrangement.fixed,...repacked.values()].some(p=>overlap(candidate,p)>0))continue;
            const distance=arrangement.compact?top*width+left:Math.hypot(left-label.x,top-label.y);
            if(distance<bestDistance){best=candidate;bestDistance=distance;}
          }
          if(!best)break;
          repacked.set(label.id,best);
        }
        if(repacked.size!==arrangement.order.length)continue;
        const reserved=[...arrangement.fixed,...repacked.values()];
        return placed.flatMap(p=>repacked.has(p.id)?[repacked.get(p.id)!]:p.kind==="passage"&&reserved.some(r=>overlap(p,r)>0)?[]:[p]);
      }
    }
  }
  return placed;
}
