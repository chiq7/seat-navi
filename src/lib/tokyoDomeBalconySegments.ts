import {
  TOKYO_DOME_C_BALCONY_PARTITIONS,
  type TokyoDomeDivider,
  type TokyoDomePoint,
} from "@/data/tokyoDomeCBalconyPartitions";
import geometry from "@/data/tokyoDomeSeatGeometry.json";

function clipToDivider(polygon: TokyoDomePoint[], divider: TokyoDomeDivider, inside: TokyoDomePoint) {
  const [a,b]=divider;
  const cross=([x,y]:TokyoDomePoint)=>(b[0]-a[0])*(y-a[1])-(b[1]-a[1])*(x-a[0]);
  const sign=Math.sign(cross(inside));
  const result:TokyoDomePoint[]=[];
  for(let i=0;i<polygon.length;i++){
    const p=polygon[i],q=polygon[(i+1)%polygon.length],dp=cross(p)*sign,dq=cross(q)*sign;
    if(dp>=0)result.push(p);
    if((dp>=0)!==(dq>=0)){
      const t=dp/(dp-dq);
      result.push([p[0]+t*(q[0]-p[0]),p[1]+t*(q[1]-p[1])]);
    }
  }
  return result;
}

const point = ([x, y]: TokyoDomePoint) => `${x.toFixed(2)},${y.toFixed(2)}`;

/**
 * Exact C-balcony hit/fill regions.
 *
 * Each region is bounded by the two sourced PDF divider vectors and then
 * clipped by the exact sourced balcony-band path in the SVG. No label spacing,
 * equal division, or synthetic section boundary is used.
 */
export function buildTokyoDomeBalconySegments() {
  const runIds = [...new Set(Object.values(TOKYO_DOME_C_BALCONY_PARTITIONS).map((partition) => partition.runId))];
  const groupIds = new Map(runIds.map((runId, index) => [runId, index]));

  return Object.values(TOKYO_DOME_C_BALCONY_PARTITIONS)
    .sort((left, right) => Number(left.code.slice(1)) - Number(right.code.slice(1)))
    .map((partition) => {
      const [x,y,width,height]=geometry.viewBox;
      const bounds:TokyoDomePoint[]=[[x,y],[x+width,y],[x+width,y+height],[x,y+height]];
      // Extending both boundary vectors into a four-point polygon can fold
      // across other sections. Keep only the sourced sides containing the
      // official label anchor; the original band outline remains the clip.
      const regionPoints=clipToDivider(clipToDivider(bounds,partition.beforeDivider,partition.selectionPoint),partition.afterDivider,partition.selectionPoint);
      return {
        code: partition.code,
        sourcePath: partition.bandPath,
        regionPath: `M${regionPoints.map(point).join(" L")} Z`,
        regionPoints,
        beforeDivider: partition.beforeDivider,
        afterDivider: partition.afterDivider,
        selectionPoint: partition.selectionPoint,
        groupId: groupIds.get(partition.runId)!,
      };
    });
}
