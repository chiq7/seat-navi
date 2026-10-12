export type FacilityMapPoint = { id: string; x: number; y: number; groupable?: boolean; kind?: string };
export type FacilityMapGroup = {
  id: string;
  points: FacilityMapPoint[];
  x: number; y: number;
  columns: number; width: number; height: number;
  kinds: string[];
};

// These are display groups, not shared physical locations. Keep every source point.
export function groupMapFacilities(points: readonly FacilityMapPoint[], viewportWidth: number): FacilityMapGroup[] {
  const groups: FacilityMapGroup[] = [];
  const nearby = (a: FacilityMapPoint, b: FacilityMapPoint) => Math.max(Math.abs(a.x-b.x), Math.abs(a.y-b.y)) < 46;
  for (const point of points) {
    const group = point.groupable===false?undefined:groups.find(g => g.points.every(p => p.groupable!==false&&nearby(p, point)));
    if (group) group.points.push({...point});
    else groups.push({id:point.id, points:[{...point}], x:point.x, y:point.y, columns:1, width:44, height:44,kinds:[]});
  }
  return groups.map(group => {
    const n = group.points.length;
    const kinds=[...new Set(group.points.map(point=>point.kind??point.id))];
    const columns=Math.min(viewportWidth<500?4:5,kinds.length);
    const rows=Math.ceil(kinds.length/columns);
    return {...group,
      x:group.points.reduce((sum,p)=>sum+p.x,0)/n,
      y:group.points.reduce((sum,p)=>sum+p.y,0)/n,
      kinds,columns,width:Math.max(44,columns*24+(columns-1)*4+12),height:Math.max(44,rows*32+8),
    };
  });
}
