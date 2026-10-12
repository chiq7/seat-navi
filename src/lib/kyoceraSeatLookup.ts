import lookup from "@/data/venueGuides/kyocera-dome/seat-lookup.json";
export type KyoceraSeatRange = { start: number; end: number; blockCode: string; passage: string };
const areas = lookup.areas as Record<string, Record<string, KyoceraSeatRange[]>>;
export function normalizeSeatNumber(value: string): string | null {
  const text = value.normalize("NFKC").trim();
  return /^\d+$/.test(text) && Number.isSafeInteger(Number(text)) && Number(text) > 0 ? String(Number(text)) : null;
}
export function kyoceraRowRanges(areaId: string, row: string | null): readonly KyoceraSeatRange[] {
  return row ? areas[areaId]?.[normalizeSeatNumber(row) ?? row.normalize("NFKC").trim()] ?? [] : [];
}
// Textual rows attached to the exact published blockCode. Never interpolate
// neighbouring numbers, missing rows, seat points, or a ticket block name.
export function kyoceraBlockRows(areaId: string, blockCode: string): { row: string; ranges: readonly KyoceraSeatRange[]; seatCount: number }[] {
  return Object.entries(areas[areaId] ?? {}).flatMap(([row, values]) => {
    const ranges = values.filter(range => range.blockCode === blockCode);
    return ranges.length ? [{ row, ranges, seatCount: ranges.reduce((sum, range) => sum + range.end - range.start + 1, 0) }] : [];
  }).sort((a, b) => a.row.localeCompare(b.row, "ja", { numeric: true }));
}
function publishedRows(labels: string[]): string {
  const runs: string[]=[];
  for(let i=0;i<labels.length;i++) {
    const first=labels[i];let end=i;
    if(/^\d+$/.test(first))while(end+1<labels.length&&/^\d+$/.test(labels[end+1])&&Number(labels[end+1])===Number(labels[end])+1)end++;
    runs.push(end===i?first:`${first}〜${labels[end]}`);i=end;
  }
  return runs.join("・");
}
export function kyoceraBlockCatalog(areaId: string, boundaryCodes: readonly string[]) {
  return boundaryCodes.flatMap(code=>{
    const rows=kyoceraBlockRows(areaId,code);
    if(!rows.length)return [];
    return [{code,rows,rowLabel:publishedRows(rows.map(row=>row.row)),
      firstSeat:Math.min(...rows.flatMap(row=>row.ranges.map(range=>range.start))),
      lastSeat:Math.max(...rows.flatMap(row=>row.ranges.map(range=>range.end))),
      seatCount:rows.reduce((sum,row)=>sum+row.seatCount,0),
      passages:[...new Set(rows.flatMap(row=>row.ranges.map(range=>range.passage)))],
      hasGaps:rows.some(row=>row.ranges.some((range,i)=>i>0&&range.start>row.ranges[i-1].end+1))}];
  });
}
export function resolveKyoceraSeat(areaId: string, row: string, number: string): KyoceraSeatRange | null {
  const normalized = normalizeSeatNumber(number);
  if (!normalized) return null;
  return kyoceraRowRanges(areaId, row).find(range => Number(normalized) >= range.start && Number(normalized) <= range.end) ?? null;
}
