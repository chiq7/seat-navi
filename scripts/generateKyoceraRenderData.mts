import { readFile, writeFile } from "node:fs/promises";
import { kyoceraLocalDetails, localSegmentRanges } from "../src/components/venue/guides/kyoceraLocalSeatData.ts";
import physicalSeats from "../src/data/venueGuides/kyocera-dome/seat-special-physical.json" with { type: "json" };

const destination = new URL("../src/data/venueGuides/kyocera-dome/seat-render-data.json", import.meta.url);

const directions = kyoceraLocalDetails.flatMap(detail => {
  const segment = detail.rows[Math.floor(detail.rows.length / 2)]?.segments[0];
  if (!segment) return [];
  const dx = segment.endLabel[0] - segment.startLabel[0];
  const dy = segment.endLabel[1] - segment.startLabel[1];
  const length = Math.hypot(dx, dy);
  return length > 1 ? [[detail.code, { x: dx / length, y: dy / length }] as const] : [];
});

const specialSeats = physicalSeats.blocks.map(physical => {
  const detail = kyoceraLocalDetails.find(candidate => candidate.code === physical.sourceBlockCode);
  const segment = detail?.rows.find(row => row.row === physical.row)?.segments.find(part => part.id === physical.segmentId);
  const path = detail?.overview?.paths[physical.overviewPathIndex];
  if (!detail || !segment || !path) throw new Error(`Missing source for Kyocera block ${physical.code}`);

  return {
    code: physical.code,
    sourceCode: detail.code,
    areaId: detail.areaId,
    name: detail.name,
    level: detail.level,
    row: physical.row,
    passage: physical.passage,
    ranges: localSegmentRanges(segment),
    path,
    segmentId: segment.id,
    youngEdge: physical.youngEdge,
    oppositeEdge: physical.oppositeEdge,
  };
});

const result = JSON.stringify({ directions: Object.fromEntries(directions), specialSeats }) + "\n";
if (process.argv.includes("--check")) {
  const existing = await readFile(destination, "utf8");
  if (existing.replaceAll("\r\n", "\n") !== result) throw new Error("Run npm run generate:kyocera-render-data");
} else {
  await writeFile(destination, result);
}
