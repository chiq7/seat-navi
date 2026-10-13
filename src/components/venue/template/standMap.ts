export type Point = number[];
export type MapBox = [number, number, number, number];
export type StandRow = { label: string; segments: { start: number; end: number; a: Point; b: Point; points?: Point[] }[] };
export type StandBlock = {
  id: string; level: string; area: string; label: string; aliases: string[]; balcony: boolean;
  zone?: string;
  path: string; box: number[]; center: Point; rows: StandRow[]; neighbors: string[];
  referenceRows?: { label: string; a: Point; b: Point }[];
  // A confirmed block/row association does not confirm its seat numbers.
  confirmedRowLabels?: string[];
  focusPoint?: Point;
  labelAvoidancePoints?: Point[];
  numberEdgeMiddle?: Point;
  edgePoints?: Point[];
  numberReference: { row: string; start: number; young: Point; older: Point } | null;
  rowEdges?: { first: { a: Point; b: Point }; last: { a: Point; b: Point } };
  numberLookup?: "unavailable" | "partial";
  numberPrefix?: string;
  unavailableRows?: string[];
  rowNameLookup?: "unavailable";
  seatNote?: string;
  equipmentFloor: string | null; sourceIds: string[];
};
export type StandZone = { id: string; label: string; aliases: string[]; level: string; area: string; point: Point; blockIds: string[]; viewBox?: number[]; labelRow?: string; hideOnWhole?: boolean };
export type StandPosition = { id: string; label: string; aliases: string[]; level: string; point: Point; span: number };
export type StandMapData = { diagramId: string; viewBox: number[]; detailSpan: number; blocks: StandBlock[]; levelViews?: Record<string, number[]>; areaViews?: Record<string, number[]>; regionViews?: Record<string, number[]>; zones?: StandZone[]; positionTargets?: StandPosition[]; overviewAreas?: { id: string; label: string; area: string; point: Point }[]; areaBlockNames?: boolean; blockNameLabels?: boolean; numericAliasesAreBlocks?: boolean; contextLabels?: { text: string; point: Point }[]; wholeBlockLabels?: boolean; wholeStartNumbers?: boolean; searchPlaceholder?: string; rowSearchPlaceholder?: string; rowZonePrefixes?: boolean; numberSidePrefixes?: string[]; frontLabel?: string; numberLookupNote?: string };
export const normalizeSeatInput = (value: string) => value.normalize("NFKC").toUpperCase().replace(/\s+/g, "").replace(/[列段番]$/, "");

export function parseStandRowInput(data: StandMapData, value: string) {
  const row = normalizeSeatInput(value);
  const zone = data.rowZonePrefixes ? data.zones?.find(z => row.startsWith(z.label) && /^[-・/:]?\d+$/.test(row.slice(z.label.length))) : undefined;
  return { row: zone ? row.slice(zone.label.length).replace(/^[-・/:]/, "") : row, zone };
}

export function standSelectedRow(data: StandMapData, block: StandBlock | undefined, value: string) {
  const { row, zone } = parseStandRowInput(data, value);
  return block && (!zone || block.zone === zone.id || zone.blockIds.includes(block.id)) ? row : "";
}

// Printed row boundaries can be useful before individual seat numbers are
// confirmed. Keep them separate from the segments used by ticket search.
export function standDisplayRows(block: StandBlock) {
  if (!block.rows.length) return block.referenceRows ?? [];
  const numbered = block.rows.flatMap((row, index) => {
    const edge = index === 0 && block.rowEdges ? block.rowEdges.first
      : index === block.rows.length - 1 && block.rowEdges ? block.rowEdges.last
      : row.segments[0];
    // Unnumbered rows may have only published front/back boundaries. Display
    // those boundaries without inventing the intermediate geometry or numbers.
    return edge ? [{ label: row.label, a: edge.a, b: edge.b }] : [];
  });
  const labels = new Set(numbered.map(row => row.label));
  const extra = (block.referenceRows ?? []).filter(row => !labels.has(row.label));
  if (!extra.length) return numbered;
  return [...numbered, ...extra]
    .sort((a, b) => Number(a.label) - Number(b.label));
}

export function searchStandSeats(data: StandMapData, level: string, area: string, row: string, number: string, zoneId?: string | null): { matches: StandBlock[]; error: string; notice?: string; zone?: StandZone; position?: StandPosition } {
  const rowInput = parseStandRowInput(data, row);
  const r = rowInput.row;
  let n = normalizeSeatInput(number);
  // Some tickets reset the same seat numbers on each side (L/R). Only venues
  // declaring these prefixes interpret them; other letter block searches keep
  // their existing meaning. Bare numbers still return all matching choices.
  const numberSide = data.numberSidePrefixes?.find(p => n.startsWith(p) && /^\d+$/.test(n.slice(p.length)));
  if (numberSide) n = n.slice(numberSide.length);
  if (rowInput.zone) zoneId = rowInput.zone.id;
  // A printed block name in the row field is an area lookup. Letter row names
  // and declared zone+row ticket formats retain their row meaning.
  if (r && !/^\d+$/.test(r) && !data.blocks.some(b => b.rows.some(line => normalizeSeatInput(line.label) === r))) {
    const rowZone = data.zones?.find(z => [z.label, ...z.aliases].some(alias => normalizeSeatInput(alias) === r));
    const rowBlocks = data.blocks.filter(b => (level === "all" || b.level === level) && (area === "all" || b.area === area)
      && (rowZone ? rowZone.blockIds.includes(b.id) : [b.label, ...b.aliases].some(alias => normalizeSeatInput(alias) === r)));
    if (rowBlocks.length) return { matches: rowBlocks, zone: rowZone, error: "", notice: n ? "区画を表示しています。席番号は未選択です。列と番号で席を探せます。" : undefined };
  }
  if (!n) return { matches: [] as StandBlock[], error: "番号を入力してください。" };
  const position = data.positionTargets?.find(p => [p.label, ...p.aliases].some(a => normalizeSeatInput(a) === n));
  if (position) return level === "all" || level === position.level
    ? { matches: [], error: "", position }
    : { matches: [], error: "選択中の席種にその扉はありません。条件を解除して探せます。" };
  const zone = data.zones?.find(z => [z.label, ...z.aliases].some(a => normalizeSeatInput(a) === n));
  if (zone) {
    const matches = data.blocks.filter(b => zone.blockIds.includes(b.id) && (level === "all" || b.level === level) && (area === "all" || b.area === area));
    return { matches, zone: matches.length ? zone : undefined, error: matches.length ? "" : "選択中の席種・場所にその区画はありません。条件を解除して探せます。" };
  }
  // A ticket can identify a letter zone as well as a number, e.g. F20 or F-20.
  const prefix = data.zones?.find(z => n.startsWith(z.label) && /^[-・/:]?\d+$/.test(n.slice(z.label.length)));
  if (prefix && data.rowZonePrefixes) return { matches: [], error: `${n}は区画と列の表記です。列欄に${n}、番号欄に席番号を入力してください。` };
  if (prefix) { zoneId = prefix.id; n = n.slice(prefix.label.length).replace(/^[-・/:]/, ""); }
  // Numeric block names (e.g. MUFG 101) are unambiguous only without a row.
  // A filled row + bare number is a seat query, not a block shortcut.
  const seatNumberQuery = data.numericAliasesAreBlocks && r && /^\d+$/.test(n);
  const aliasMatches = seatNumberQuery ? [] : data.blocks.filter(b => [b.id, ...b.aliases].some(a => normalizeSeatInput(a) === n));
  const selectedZone = data.zones?.find(z => z.id === zoneId);
  const pool = data.blocks.filter(b => (level === "all" || b.level === level) && (area === "all" || b.area === area) && (!zoneId || b.zone === zoneId || selectedZone?.blockIds.includes(b.id)) && (!numberSide || b.numberPrefix === numberSide || (!b.numberPrefix && b.numberLookup === "unavailable")));
  if (aliasMatches.length) {
    const matches = aliasMatches.filter(b => pool.includes(b));
    if (data.numericAliasesAreBlocks && r && matches.length) {
      const verified = matches.filter(b => b.rows.some(line => normalizeSeatInput(line.label) === r)
        || b.confirmedRowLabels?.some(label => normalizeSeatInput(label) === r));
      return { matches: verified, error: verified.length ? "" : data.numberLookupNote ?? "この列は確認中です。列を空欄にして区画名で探せます。" };
    }
    return { matches, error: matches.length ? "" : "選択中の席種・場所にその区画はありません。条件を解除して探せます。" };
  }
  if (!/^\d+$/.test(n)) return { matches: [], error: "座席の番号を数字で入力してください。" };
  if (pool.length && pool.every(b => b.numberLookup === "unavailable")) return { matches: [], error: data.numberLookupNote ?? "この席種は地図・区画名で探してください。" };
  if (r && pool.length && pool.every(b => b.rowNameLookup === "unavailable")) return { matches: [], error: "この区画は公式図に列名がないため、列を空欄にして番号や地図で探してください。" };
  const matches = pool.filter(b => b.rows.some(line => (!r || normalizeSeatInput(line.label) === r) && line.segments.some(s => +n >= s.start && +n <= s.end)));
  const pending = pool.some(b => b.numberLookup === "unavailable" || b.numberLookup === "partial" || (r && b.unavailableRows?.some(label => normalizeSeatInput(label) === r)));
  return { matches, error: matches.length ? "" : pending ? data.numberLookupNote ?? "この範囲には番号未対応の席があります。地図・区画名で探してください。" : "この条件の席は見つかりません。席種・列・番号を確認してください。" };
}

export function standBlockLabel(data: StandMapData, block: StandBlock) {
  if (data.blockNameLabels) return block.label;
  return block.zone && block.numberReference ? `${data.areaBlockNames ? `${block.zone}・` : ""}${block.numberReference.start}番〜` : block.label;
}

export function standContextLabel(data: StandMapData, block: StandBlock, closestDetail: boolean) {
  if (closestDetail && block.numberReference && block.numberLookup !== "unavailable") {
    return { text: `${block.numberPrefix ?? ""}${block.numberReference.start}番`, point: youngEdgeMidpoint(block), fixed: true };
  }
  return { text: standBlockLabel(data, block), point: block.center, fixed: false };
}

export function standReferenceLabelKey(block: StandBlock, closestDetail: boolean) {
  return closestDetail && block.numberLookup === "unavailable" && !block.numberReference && block.label.endsWith("・参考区画")
    ? JSON.stringify([block.level, block.area, block.zone ?? "", block.label]) : null;
}

export function boundsOf(blocks: StandBlock[], padding = 28): MapBox {
  const x = Math.min(...blocks.map(b => b.box[0])), y = Math.min(...blocks.map(b => b.box[1]));
  return [x - padding, y - padding, Math.max(...blocks.map(b => b.box[0] + b.box[2])) - x + padding * 2,
    Math.max(...blocks.map(b => b.box[1] + b.box[3])) - y + padding * 2];
}
export function detailBox(block: StandBlock, span: number): MapBox {
  const size = Math.max(span, block.box[2] * 1.7, block.box[3] * 1.65);
  const center = block.focusPoint ?? block.center;
  return [center[0] - size / 2, center[1] - size / 2, size, size];
}
export function clampCamera(box: MapBox, full: number[], minimum: number): MapBox {
  const factor = Math.min(1, full[2] / box[2], full[3] / box[3]);
  const w = Math.max(minimum, box[2] * factor), h = Math.max(minimum, box[3] * factor);
  const cx = Math.max(full[0], Math.min(full[0] + full[2], box[0] + box[2] / 2));
  const cy = Math.max(full[1], Math.min(full[1] + full[3], box[1] + box[3] / 2));
  return [cx - w / 2, cy - h / 2, w, h];
}
export function mapProjection(box: number[], width: number, height: number) {
  const scale = Math.min(width / box[2], height / box[3]);
  const ox = (width - box[2] * scale) / 2, oy = (height - box[3] * scale) / 2;
  return { scale, project: (p: Point) => [(p[0] - box[0]) * scale + ox, (p[1] - box[1]) * scale + oy],
    unproject: (p: Point) => [(p[0] - ox) / scale + box[0], (p[1] - oy) / scale + box[1]] };
}
export function zoneLabelPositions(zones: StandZone[], box: number[], width: number, height: number) {
  const projection = mapProjection(box, width, height);
  const positions = new Map(zones.map(z => [z.id, projection.project(z.point)]));
  const clamp = (n: number, max: number) => Math.max(22, Math.min(max - 22, n));
  for (const z of zones) {
    const p = positions.get(z.id)!;
    positions.set(z.id, [clamp(p[0], width), clamp(p[1], height)]);
  }
  for (const row of new Set(zones.flatMap(z => z.labelRow ? [z.labelRow] : []))) {
    const members = zones.filter(z => z.labelRow === row).sort((a,b) => a.point[0] - b.point[0]);
    if (members.length < 2) continue;
    const first = positions.get(members[0].id)!, last = positions.get(members.at(-1)!.id)!;
    const span = Math.max(last[0] - first[0], (members.length - 1) * 46);
    const center = Math.max(22 + span / 2, Math.min(width - 22 - span / 2, (first[0] + last[0]) / 2));
    members.forEach((z,i) => positions.set(z.id, [center - span / 2 + i * span / (members.length - 1), first[1]]));
  }
  return positions;
}
export function zoomCamera(box: MapBox, factor: number, anchor: Point): MapBox {
  return [anchor[0] - (anchor[0] - box[0]) * factor, anchor[1] - (anchor[1] - box[1]) * factor, box[2] * factor, box[3] * factor];
}
export function isSeatTap(maximumTravel: number, multiplePointers: boolean) { return maximumTravel <= 6 && !multiplePointers; }

export function standLabelOrder(blocks: StandBlock[], selected?: StandBlock) {
  // Reserve space for ticket numbers before broad reference names. Otherwise a
  // reference label can cover a verified seat and receive that seat's tap.
  return [...blocks].sort((a, b) => Number(Boolean(b.numberReference)) - Number(Boolean(a.numberReference))
    || Number(Boolean(selected?.neighbors.includes(b.id))) - Number(Boolean(selected?.neighbors.includes(a.id))));
}

export function labelCoversOtherBlock(id: string, point: Point, width: number, height: number, centers: { id: string; point: Point }[]) {
  return centers.some(other => other.id !== id && Math.abs(point[0] - other.point[0]) <= width / 2 + 3
    && Math.abs(point[1] - other.point[1]) <= height / 2 + 3);
}

export function youngEdgeMidpoint(block: StandBlock): Point {
  if (!block.numberReference) return block.center;
  if (block.numberEdgeMiddle) return block.numberEdgeMiddle;
  const firstRow = block.rows[0], lastRow = block.rows.at(-1)!;
  const first = block.rowEdges?.first ?? { a: firstRow.segments[0].a, b: firstRow.segments.at(-1)!.b };
  const last = block.rowEdges?.last ?? { a: lastRow.segments[0].a, b: lastRow.segments.at(-1)!.b };
  const { young, older } = block.numberReference;
  const dx = older[0] - young[0], dy = older[1] - young[1];
  const youngEnd = (edge: { a: Point; b: Point }) =>
    (edge.b[0] - edge.a[0]) * dx + (edge.b[1] - edge.a[1]) * dy >= 0 ? edge.a : edge.b;
  const a = youngEnd(first), b = youngEnd(last);
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

export function edgeNumberGuide(edgeMiddle: Point, young: Point, older: Point, labelWidth: number, labelHeight = 28) {
  const length = Math.hypot(older[0] - young[0], older[1] - young[1]);
  if (length < .001) return { number: edgeMiddle, arrow: null };
  const ux = (older[0] - young[0]) / length, uy = (older[1] - young[1]) / length;
  const clearance = Math.abs(ux) * labelWidth / 2 + Math.abs(uy) * labelHeight / 2 + 6;
  return { number: edgeMiddle, arrow: {
    start: [edgeMiddle[0] + ux * clearance, edgeMiddle[1] + uy * clearance],
    end: [edgeMiddle[0] + ux * (clearance + 20), edgeMiddle[1] + uy * (clearance + 20)]
  } };
}

export function placeRowLabel(position: Readonly<Point>, outward: Readonly<Point>, width: number, obstacles: number[][]): Point {
  const length = Math.hypot(outward[0], outward[1]);
  if (length < .001) return [...position];
  const direction = outward.map(n => n / length);
  let point = [...position];
  // Keep the number at its physical edge. Move only the row label along its
  // outward stem when a shallow block brings the two labels together.
  for (let step = 0; step < 48; step++) {
    if (!obstacles.some(r => Math.abs(point[0] - r[0]) < (width + r[2]) / 2 + 4 && Math.abs(point[1] - r[1]) < (28 + r[3]) / 2 + 3)) return point;
    point = point.map((n, i) => n + direction[i] * 6);
  }
  return point;
}

export function placeVisibleRowLabel(position: Readonly<Point>, outward: Readonly<Point>, width: number, obstacles: number[][], anchor: Readonly<Point>, canvas: { width: number; height: number }): Point {
  const placed = placeRowLabel(position, outward, width, obstacles);
  // An off-screen source row stays off screen; never turn it into a frame-edge marker.
  if (anchor[0] < 0 || anchor[0] > canvas.width || anchor[1] < 0 || anchor[1] > canvas.height) return placed;
  const clear = (p: Point) => !obstacles.some(r => Math.abs(p[0] - r[0]) < (width + r[2]) / 2 + 4 && Math.abs(p[1] - r[1]) < (28 + r[3]) / 2 + 3);
  const inside = (p: Point) => p[0] >= width / 2 + 2 && p[0] <= canvas.width - width / 2 - 2 && p[1] >= 17 && p[1] <= canvas.height - 17;
  if (inside(placed) && clear(placed)) return placed;
  const clamp = (p: Readonly<Point>) => [Math.max(width / 2 + 2, Math.min(canvas.width - width / 2 - 2, p[0])), Math.max(17, Math.min(canvas.height - 17, p[1]))];
  const base = clamp(position);
  // Only the row tag moves, with a short stem back to its unchanged source anchor.
  for (const [dx, dy] of [[0,0], [0,32], [0,-32], [32,0], [-32,0], [0,48], [0,-48], [48,0], [-48,0]]) {
    const candidate = clamp([base[0] + dx, base[1] + dy]);
    if (inside(candidate) && clear(candidate) && Math.hypot(candidate[0] - anchor[0], candidate[1] - anchor[1]) <= 64) return candidate;
  }
  return placed;
}
