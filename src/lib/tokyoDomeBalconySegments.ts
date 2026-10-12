import {
  TOKYO_DOME_C_BALCONY_PARTITIONS,
  type TokyoDomeDivider,
  type TokyoDomePoint,
} from "@/data/tokyoDomeCBalconyPartitions";

const CENTRE: TokyoDomePoint = [579.25, 316.5];
const EXTENSION = 80;

function distanceFromCentre([x, y]: TokyoDomePoint) {
  return Math.hypot(x - CENTRE[0], y - CENTRE[1]);
}

function extendedBoundary(divider: TokyoDomeDivider) {
  const [inner, outer] = [...divider].sort((left, right) => distanceFromCentre(left) - distanceFromCentre(right));
  const dx = outer[0] - inner[0];
  const dy = outer[1] - inner[1];
  return {
    inner: [inner[0] - dx * EXTENSION, inner[1] - dy * EXTENSION] as TokyoDomePoint,
    outer: [outer[0] + dx * EXTENSION, outer[1] + dy * EXTENSION] as TokyoDomePoint,
  };
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
      const before = extendedBoundary(partition.beforeDivider);
      const after = extendedBoundary(partition.afterDivider);
      return {
        code: partition.code,
        sourcePath: partition.bandPath,
        regionPath: `M${point(before.inner)} L${point(before.outer)} L${point(after.outer)} L${point(after.inner)} Z`,
        beforeDivider: partition.beforeDivider,
        afterDivider: partition.afterDivider,
        selectionPoint: partition.selectionPoint,
        groupId: groupIds.get(partition.runId)!,
      };
    });
}
