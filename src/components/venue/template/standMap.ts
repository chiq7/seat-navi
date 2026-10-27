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
  // Keep a confirmed selected shape above an overlapping reference-only shape.
  selectionPaintOnTop?: boolean;
  revealSelectedRowOnDetailZoom?: boolean;
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
  const prefixMatch = data.zones?.flatMap(z => [z.label, ...z.aliases].map(normalizeSeatInput)
    .filter(alias => n.startsWith(alias) && /^[-・/:]?\d+$/.test(n.slice(alias.length)))
    .map(alias => ({ zone: z, alias }))).sort((a, b) => b.alias.length - a.alias.length)[0];
  const prefix = prefixMatch?.zone;
  if (prefix && data.rowZonePrefixes) return { matches: [], error: `${n}は区画と列の表記です。列欄に${n}、番号欄に席番号を入力してください。` };
  if (prefixMatch) { zoneId = prefixMatch.zone.id; n = n.slice(prefixMatch.alias.length).replace(/^[-・/:]/, ""); }
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

export function standContextLabel(data: StandMapData, block: StandBlock, closestDetail: boolean, areaNames = false) {
  // A printed location reference is more useful than a repeated start number
  // when choosing a block. Retain "付近": this is not an exact seat/aisle ID.
  const location = areaNames ? block.label.match(/^\d+付近(?=・|$)/)?.[0] : undefined;
  if (location) return { text: location, point: referenceDisplayCenter(block), fixed: false };
  if (closestDetail && block.numberReference && block.numberLookup !== "unavailable") {
    return { text: `${block.numberPrefix ?? ""}${block.numberReference.start}番`, point: youngEdgeMidpoint(block), fixed: true };
  }
  return { text: standBlockLabel(data, block), point: referenceDisplayCenter(block), fixed: false };
}

// A generic area/floor tag repeats the known selected context at closest zoom.
// Distinct unnamed/special areas remain selectable and keep their own labels.
export function standRedundantContextLabel(block: StandBlock, selected: StandBlock | undefined, closestDetail: boolean) {
  const compact = (text: string) => text.replace(/\s+/g, "");
  return Boolean(closestDetail && selected?.numberReference && selected.numberLookup !== "unavailable"
    && block.numberLookup === "unavailable" && !block.numberReference
    && block.level === selected.level && block.area === selected.area
    && compact(block.label) === compact(`${block.area}${block.level}`));
}

// Hide only a floor/area/type caption already repeated in the selected detail.
export function standRedundantContextText(text: string, block: StandBlock | undefined, closestDetail: boolean) {
  const compact = (value: string) => value.replace(/[\s・]/g, "");
  return Boolean(closestDetail && block?.numberReference
    && ((block.equipmentFloor && compact(text) === compact(block.equipmentFloor + block.area + block.level))
      || (block.numberPrefix && compact(text) === compact(`${block.area}${block.level}（${block.numberPrefix}）`))));
}
export function standReferenceLabelKey(block: StandBlock, groupReferences: boolean) {
  const repeatedReference = /(?:・|の)参考区画$/.test(block.label)
    || /付近・下層後列$/.test(block.label)
    || Boolean(block.referenceRows?.length && /・前方\d+〜\d+列$/.test(block.label));
  return groupReferences && block.numberLookup === "unavailable" && !block.numberReference && repeatedReference
    ? JSON.stringify([block.level, block.area, block.zone ?? "", block.label]) : null;
}

export function boundsOf(blocks: StandBlock[], padding = 28): MapBox {
  const x = Math.min(...blocks.map(b => b.box[0])), y = Math.min(...blocks.map(b => b.box[1]));
  return [x - padding, y - padding, Math.max(...blocks.map(b => b.box[0] + b.box[2])) - x + padding * 2,
    Math.max(...blocks.map(b => b.box[1] + b.box[3])) - y + padding * 2];
}
export function detailBox(block: StandBlock, span: number): MapBox {
  const size = Math.max(span, block.box[2] * 1.7, block.box[3] * 1.65);
  const center = block.focusPoint ?? referenceDisplayCenter(block);
  return [center[0] - size / 2, center[1] - size / 2, size, size];
}
// Keep a confirmed start badge and arrow inside an explicitly focused maximum
// frame without moving the source edge or overriding a declared focus point.
export function standDetailCamera(block: StandBlock, data: StandMapData, canvas?: { width: number; height: number }): MapBox {
  // This search selects a whole, unnumbered room. A square clamped to the
  // shallow overview cut off its left stage side; retain the room's aspect.
  if (data.diagramId === "toki-seats-main" && block.id === "toki-snow" && !block.numberReference) {
    const room = boundsOf([block]);
    // The upright caption above the left-side marker also needs horizontal
    // breathing room at 320px. This changes search framing, not zoom limits.
    return clampCamera([room[0] - 52, room[1], room[2] + 104, room[3]], data.viewBox, data.detailSpan * .45);
  }
  const view = clampCamera(detailBox(block, data.detailSpan), data.viewBox, data.detailSpan * .45);
  if (block.focusPoint || !block.numberReference) return view;
  const unnumberedRows = block.rowNameLookup === "unavailable";
  if (!unnumberedRows && !canvas) return view;
  const edge = youngEdgeMidpoint(block);
  const halfDetail = data.detailSpan * .45 / 2;
  let outside = Math.abs(edge[0] - view[0] - view[2] / 2) > halfDetail || Math.abs(edge[1] - view[1] - view[3] / 2) > halfDetail;
  if (!unnumberedRows && canvas) {
    // Test the actual badge and arrow footprint in the future maximum frame.
    // A confirmed edge can be inside the frame while its number is clipped.
    const maximum: MapBox = [view[0] + view[2] / 2 - halfDetail, view[1] + view[3] / 2 - halfDetail, halfDetail * 2, halfDetail * 2];
    const projection = mapProjection(maximum, canvas.width, canvas.height);
    const reference = block.numberReference;
    const labelWidth = Math.max(48, `${block.numberPrefix ?? ""}${reference.start}`.length * 8 + 28);
    const guide = edgeNumberGuide(projection.project(edge), projection.project(reference.young), projection.project(reference.older), labelWidth);
    const footprints = [[...guide.number, labelWidth, 28], ...(guide.arrow ? [standArrowObstacle(guide.arrow)] : [])];
    outside = footprints.some(([x, y, w, h]) => x - w / 2 < 4 || x + w / 2 > canvas.width - 4 || y - h / 2 < 4 || y + h / 2 > canvas.height - 4);
  }
  const focused = outside ? clampCamera([edge[0] - view[2] / 2, edge[1] - view[3] / 2, view[2], view[3]], data.viewBox, data.detailSpan * .45) : view;
  if (!canvas || unnumberedRows) return focused;
  const rows = standDisplayRows(block);
  if (rows.length < 2) return focused;
  const first = rows[0], last = rows.at(-1)!;
  const front = [(first.a[0] + first.b[0]) / 2, (first.a[1] + first.b[1]) / 2];
  const back = [(last.a[0] + last.b[0]) / 2, (last.a[1] + last.b[1]) / 2];
  const fits = (camera: MapBox) => {
    const projection = mapProjection([camera[0] + camera[2] / 2 - halfDetail, camera[1] + camera[3] / 2 - halfDetail, halfDetail * 2, halfDetail * 2], canvas.width, canvas.height);
    const fm = projection.project(front), lm = projection.project(back);
    if ([fm, lm].some(([x, y]) => x < 0 || x > canvas.width || y < 0 || y > canvas.height)) return false;
    const reference = block.numberReference!;
    const width = Math.max(48, `${block.numberPrefix ?? ""}${reference.start}`.length * 8 + 28);
    const guide = edgeNumberGuide(projection.project(edge), projection.project(reference.young), projection.project(reference.older), width);
    const obstacles = [[...guide.number, width, 28], ...(guide.arrow ? [standArrowObstacle(guide.arrow)] : [])];
    const inside = ([x, y, w, h]: number[]) => x - w / 2 >= 2 && x + w / 2 <= canvas.width - 2 && y - h / 2 >= 3 && y + h / 2 <= canvas.height - 3;
    if (!obstacles.every(inside)) return false;
    const depth = Math.hypot(lm[0] - fm[0], lm[1] - fm[1]);
    if (depth < 1) return false;
    const direction = [(lm[0] - fm[0]) / depth, (lm[1] - fm[1]) / depth];
    for (const [row, anchor, sign] of [[first, fm, -1], [last, lm, 1]] as const) {
      const rowWidth = Math.max(48, [...`${row.label}列`].reduce((sum, char) => sum + 14 * (char.charCodeAt(0) < 128 ? .6 : 1), 0) + 14);
      const outward = direction.map(n => n * sign);
      const desired = anchor.map((n, i) => n + outward[i] * 21);
      const placed = placeVisibleRowLabel(desired, outward, rowWidth, obstacles, anchor, canvas);
      const footprint = [...placed, rowWidth, 28];
      if (!inside(footprint)) return false;
      obstacles.push(footprint);
    }
    return true;
  };
  if (fits(focused)) return focused;
  // Reframe only when the real front/back row anchors and number guide can all
  // fit at the existing maximum zoom. Never pin an off-screen row to the frame,
  // widen the zoom limit or change a declared venue focus/source coordinate.
  const centers = [[(front[0] + back[0]) / 2, (front[1] + back[1]) / 2],
    [0, 1].map(axis => (Math.min(front[axis], back[axis], edge[axis]) + Math.max(front[axis], back[axis], edge[axis])) / 2)];
  for (const center of centers) {
    const candidate = clampCamera([center[0] - focused[2] / 2, center[1] - focused[3] / 2, focused[2], focused[3]], data.viewBox, data.detailSpan * .45);
    if (fits(candidate)) return candidate;
  }
  return focused;
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
export function overviewAreaLabelWidth(text: string) {
  return Math.max(44, [...text].reduce((sum, char) => sum + (char.charCodeAt(0) < 128 ? 7.2 : 12), 0) + 16);
}

export function overviewAreaLabelPosition(point: Point, text: string, box: number[], width: number, height: number) {
  const p = mapProjection(box, width, height).project(point);
  const inset = Math.min(width / 2, overviewAreaLabelWidth(text) / 2 + 4);
  return [Math.max(inset, Math.min(width - inset, p[0])), Math.max(22, Math.min(height - 22, p[1]))];
}

const zoneLabelOffsets: Point[] = [
  ...Array.from({ length: 17 }, (_, x) => Array.from({ length: 17 }, (_, y) => [(x - 8) * 2, (y - 8) * 2])).flat()
    .filter(p => Math.hypot(...p) <= 16).sort((a, b) => Math.hypot(...a) - Math.hypot(...b)),
  [0, -46], [0, 46], [-46, 0], [46, 0],
  ...Array.from({ length: 33 }, (_, x) => Array.from({ length: 33 }, (_, y) => [(x - 16) * 4, (y - 16) * 4])).flat()
    .filter(p => Math.hypot(...p) <= 64).sort((a, b) => Math.hypot(...a) - Math.hypot(...b)),
];

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
  // Dense runs of short zone names need staggered rows at narrow widths.
  // Keep their left-to-right order and connect moved tags to the source point.
  const pending = new Set(zones.map(z => z.id));
  for (const seed of zones) {
    if (!pending.delete(seed.id)) continue;
    const group = [seed];
    for (let i = 0; i < group.length; i++) for (const other of zones) {
      if (!pending.has(other.id)) continue;
      const a = positions.get(group[i].id)!, b = positions.get(other.id)!;
      if (Math.abs(a[0] - b[0]) < (overviewAreaLabelWidth(group[i].label) + overviewAreaLabelWidth(other.label)) / 2 + 2
        && Math.abs(a[1] - b[1]) < 46) { pending.delete(other.id); group.push(other); }
    }
    if (group.length < 6 || group.some(z => overviewAreaLabelWidth(z.label) !== 44)) continue;
    group.sort((a, b) => positions.get(a.id)![0] - positions.get(b.id)![0]);
    const left = Math.max(24, positions.get(group[0].id)![0]), right = Math.min(width - 24, positions.get(group.at(-1)!.id)![0]);
    const rows = Math.ceil(group.length / Math.max(1, Math.floor((right - left + 44) / 46)));
    const columns = Math.ceil(group.length / rows), step = columns > 1 ? (right - left) / (columns - 1) : 0;
    const middleY = group.reduce((sum, z) => sum + positions.get(z.id)![1], 0) / group.length;
    for (let row = 0; row < rows; row++) {
      const members = group.filter((_, i) => i % rows === row), firstX = (left + right - (members.length - 1) * step) / 2;
      members.forEach((z, i) => positions.set(z.id, [firstX + i * step, clamp(middleY + (row - (rows - 1) / 2) * 46, height)]));
    }
  }
  const placed: { point: Point; width: number }[] = [];
  for (const zone of zones) {
    const base = positions.get(zone.id)!, labelWidth = overviewAreaLabelWidth(zone.label);
    const inset = Math.min(width / 2, labelWidth / 2 + 2);
    for (const [dx, dy] of zoneLabelOffsets) {
      const point = [Math.max(inset, Math.min(width - inset, base[0] + dx)), clamp(base[1] + dy, height)];
      if (Math.hypot(point[0] - base[0], point[1] - base[1]) > 64) continue;
      if (placed.some(other => Math.abs(point[0] - other.point[0]) < (labelWidth + other.width) / 2 + 2
        && Math.abs(point[1] - other.point[1]) < 46)) continue;
      positions.set(zone.id, point); break;
    }
    placed.push({ point: positions.get(zone.id)!, width: labelWidth });
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

/** Reserve the short arrow, including its 8px head, before adding context tags. */
export function standArrowObstacle(arrow: {start: Point; end: Point}) {
  return [(arrow.start[0] + arrow.end[0]) / 2, (arrow.start[1] + arrow.end[1]) / 2,
    Math.abs(arrow.end[0] - arrow.start[0]) + 8, Math.abs(arrow.end[1] - arrow.start[1]) + 8];
}


function standNumberZonePrefix(data: StandMapData, n: string) {
  return data.zones?.flatMap(z => [z.label, ...z.aliases].map(normalizeSeatInput)
    .filter(alias => n.startsWith(alias) && /^[-・/:]?\d+$/.test(n.slice(alias.length)))
    .map(alias => ({ zone: z, alias }))).sort((a, b) => b.alias.length - a.alias.length)[0];
}

export function standSelectedNumberRun(data: StandMapData, block: StandBlock | undefined, row: string, number: string) {
  if (!block || block.numberLookup === "unavailable" || block.rowNameLookup === "unavailable") return null;
  const selectedRow = standSelectedRow(data, block, row);
  if (!selectedRow) return null;
  let n = normalizeSeatInput(number);
  if (block.numberPrefix && n.startsWith(block.numberPrefix) && /^\d+$/.test(n.slice(block.numberPrefix.length))) n = n.slice(block.numberPrefix.length);
  const prefix = standNumberZonePrefix(data, n);
  if (prefix) {
    if (data.rowZonePrefixes || !(block.zone === prefix.zone.id || prefix.zone.blockIds.includes(block.id))) return null;
    n = n.slice(prefix.alias.length).replace(/^[-・/:]/, "");
  }
  if (!/^\d+$/.test(n)) return null;
  const matches = block.rows.flatMap(r => normalizeSeatInput(r.label) === selectedRow
    ? r.segments.filter(s => Number(n) >= s.start && Number(n) <= s.end).map(segment => ({ row: r.label, segment })) : []);
  return matches.length === 1 ? matches[0] : null;
}

function referenceDisplayCenter(block: StandBlock): Point {
  return block.numberLookup === "unavailable" && !block.numberReference
    && (block.id === "belluna-shape-16" || block.id === "belluna-shape-18")
    ? [block.box[0] + block.box[2] / 2, block.box[1] + block.box[3] / 2]
    : block.center;
}

export function standGroupReferenceLabels(data: StandMapData, selected: StandBlock | undefined, viewWidth: number) {
  if (!selected) return false;
  if (viewWidth <= data.detailSpan * .55) return true;
  if (!selected.numberReference || selected.numberLookup === "unavailable") return false;
  const detailWidth = clampCamera(detailBox(selected, data.detailSpan), data.viewBox, data.detailSpan * .45)[2];
  return viewWidth <= detailWidth + .005;
}

export function standVisibleRowHints(block: StandBlock, view: MapBox, canvas: { width: number; height: number }) {
  if (block.rowNameLookup === "unavailable" || canvas.width <= 8 || canvas.height <= 8) return [];
  const project = mapProjection(view, canvas.width, canvas.height).project;
  const clip = (a: Point, b: Point): [Point, Point] | null => {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    let from = 0, to = 1;
    for (const [p, q] of [[-dx, a[0] - 4], [dx, canvas.width - 4 - a[0]], [-dy, a[1] - 4], [dy, canvas.height - 4 - a[1]]]) {
      if (Math.abs(p) < .000001) { if (q < 0) return null; continue; }
      const ratio = q / p;
      if (p < 0) from = Math.max(from, ratio); else to = Math.min(to, ratio);
      if (from > to) return null;
    }
    return [[a[0] + dx * from, a[1] + dy * from], [a[0] + dx * to, a[1] + dy * to]];
  };
  return block.rows.flatMap(row => {
    if (!row.label.trim() || block.unavailableRows?.some(label => normalizeSeatInput(label) === normalizeSeatInput(row.label))) return [];
    const pieces = row.segments.flatMap(segment => {
      const points = (segment.points?.length ? segment.points : [segment.a, segment.b]).map(project);
      return points.slice(1).flatMap((b, index) => {
        const part = clip(points[index], b);
        if (!part) return [];
        const [a, end] = part, length = Math.hypot(end[0] - a[0], end[1] - a[1]);
        return length >= 24 ? [{ anchor: a, outward: [(a[0] - end[0]) / length, (a[1] - end[1]) / length], length }] : [];
      });
    }).sort((a, b) => b.length - a.length);
    return pieces.length ? [{ label: row.label, anchor: pieces[0].anchor, outward: pieces[0].outward }] : [];
  });
}

export function hasStandCanvasArea(canvas: { width: number; height: number }) {
  return Number.isFinite(canvas.width) && Number.isFinite(canvas.height) && canvas.width > 0 && canvas.height > 0;
}

export function fitStandNumberGuide(view: MapBox, canvas: { width: number; height: number }, young: Point, older: Point, width: number, wasVisible = false): MapBox {
  // A detached/temporarily hidden surface has no projection. Keep its last view.
  if (!hasStandCanvasArea(canvas)) return view;
  const projection = mapProjection(view, canvas.width, canvas.height);
  const anchor = projection.project(young);
  // Panning an endpoint off screen must not pull it back into the frame.
  if (!wasVisible && (anchor[0] < 0 || anchor[0] > canvas.width || anchor[1] < 0 || anchor[1] > canvas.height)) return view;
  const guide = edgeNumberGuide(anchor, anchor, projection.project(older), width);
  const xs = [anchor[0] - width / 2, anchor[0] + width / 2], ys = [anchor[1] - 14, anchor[1] + 14];
  if (guide.arrow) for (const p of [guide.arrow.start, guide.arrow.end]) { xs.push(p[0] - 9, p[0] + 9); ys.push(p[1] - 9, p[1] + 9); }
  const shift = (low: number, high: number, length: number) => low < 3 ? low - 3 : high > length - 3 ? high - length + 3 : 0;
  const dx = shift(Math.min(...xs), Math.max(...xs), canvas.width), dy = shift(Math.min(...ys), Math.max(...ys), canvas.height);
  return [view[0] + dx / projection.scale, view[1] + dy / projection.scale, view[2], view[3]];
}

export function standRowDetailTransition(block: StandBlock, data: StandMapData, from: MapBox, next: MapBox, canvas: { width: number; height: number }, row: string, number: string): MapBox {
  if (!block.revealSelectedRowOnDetailZoom || from[2] <= data.detailSpan * .55 || next[2] > data.detailSpan * .55 || !hasStandCanvasArea(canvas)) return next;
  const reference = mapProjection(from, canvas.width, canvas.height).project(youngEdgeMidpoint(block));
  if (reference[0] < 0 || reference[0] > canvas.width || reference[1] < 0 || reference[1] > canvas.height) return next;
  const run = standSelectedNumberRun(data, block, row, number);
  if (!run) return next;
  const older = run.segment.start === run.segment.end ? run.segment.a : run.segment.points?.find(p => Math.hypot(p[0] - run.segment.a[0], p[1] - run.segment.a[1]) > .001) ?? run.segment.b;
  const text = `${run.row}列 ${block.numberPrefix ?? ""}${run.segment.start}`;
  return fitStandNumberGuide(next, canvas, run.segment.a, older, Math.max(48, text.length * 8 + 28), true);
}

export function standLabelInsideCanvas(point: Readonly<Point>, width: number, height: number, canvas: { width: number; height: number }) {
  // Projection of an exact frame boundary can differ by a few floating-point bits.
  const epsilon = 1e-7;
  return point[0] >= width / 2 + 2 - epsilon && point[0] <= canvas.width - width / 2 - 2 + epsilon
    && point[1] >= height / 2 + 3 - epsilon && point[1] <= canvas.height - height / 2 - 3 + epsilon;
}

export function fitStandArrowToCanvas(arrow: {start: Point; end: Point} | null, canvas: {width: number; height: number}) {
  if (!arrow || !hasStandCanvasArea(canvas)) return null;
  const [x, y] = arrow.start;
  const length = Math.hypot(arrow.end[0] - x, arrow.end[1] - y);
  if (![x, y, length].every(Number.isFinite) || length < 8) return null;
  const ux = (arrow.end[0] - x) / length, uy = (arrow.end[1] - y) / length;
  let minimum = 8, maximum = length;
  // These are the seven vertices of SeatNumberArrow, including its fixed shaft.
  for (const [offset, across, moving] of [[0, 1.5, 0], [-7, 1.5, 1], [-7, 4, 1], [0, 0, 1], [-7, -4, 1], [-7, -1.5, 1], [0, -1.5, 0]]) {
    for (const [base, slope, limit] of [[x + ux * offset - uy * across, ux * moving, canvas.width], [y + uy * offset + ux * across, uy * moving, canvas.height]]) {
      // 1px outline plus 1px clearance, in final CSS pixels.
      if (Math.abs(slope) < 1e-10) {
        if (base < 2 || base > limit - 2) return null;
      } else {
        const a = (2 - base) / slope, b = (limit - 2 - base) / slope;
        minimum = Math.max(minimum, Math.min(a, b));
        maximum = Math.min(maximum, Math.max(a, b));
      }
    }
  }
  if (maximum < minimum) return null;
  return maximum >= length ? arrow : { start: arrow.start, end: [x + ux * maximum, y + uy * maximum] as Point };
}
