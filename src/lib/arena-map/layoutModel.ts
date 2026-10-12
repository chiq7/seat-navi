/** Seat labels are identifiers, not geometry. Layouts are versioned independently of reports. */
export type Point = { x: number; y: number };
export type Bounds = { x: number; y: number; width: number; height: number };
export type Shape = { kind: "circle"; center: Point; radius: number } | { kind: "polygon"; points: Point[] };
export type SeatSegment = {
  first: number; last: number; origin: Point; step: Point;
};
export type LayoutRow = { label: string; segments: SeatSegment[] };
export type LayoutBlock = {
  id: string; aliases?: string[]; origin: Point; rotation: number;
  labelAt: Point; outline: Point[]; rows: LayoutRow[];
};
export type Landmark = {
  id: string; label: string; kind: "main" | "center" | "runway" | "passage" | "equipment";
  shape: Shape; labelAt: Point;
};
export type ArenaLayout = {
  id: string; version: string; label: string; eventIds: string[];
  status: "sample" | "prediction" | "confirmed";
  bounds: Bounds; blocks: LayoutBlock[]; landmarks: Landmark[];
};
export type SeatAddress = { block: string; row: string; seat: string };
export type LayoutObservation = SeatAddress & {
  id: string; eventId: string; precision: "exact" | "range";
};
export type SeatResolution =
  | { status: "mapped"; point: Point; blockId: string; row: string; seat: number }
  | { status: "invalid" | "unknown-block" | "unknown-row" | "unmapped-seat" | "ambiguous" };

export function normalizeLabel(value: string): string {
  return value.normalize("NFKC").trim().toUpperCase();
}

export function localToWorld(block: LayoutBlock, local: Point): Point {
  const angle = block.rotation * Math.PI / 180;
  return {
    x: block.origin.x + local.x * Math.cos(angle) - local.y * Math.sin(angle),
    y: block.origin.y + local.x * Math.sin(angle) + local.y * Math.cos(angle),
  };
}

export function resolveSeat(layout: ArenaLayout, address: SeatAddress): SeatResolution {
  const seatLabel = normalizeLabel(address.seat);
  const rowLabel = normalizeLabel(address.row);
  if (!/^[0-9]{1,5}$/.test(seatLabel) || Number(seatLabel) < 1 || Number(seatLabel) > 10000 || !rowLabel) return { status: "invalid" };
  const blocks = layout.blocks.filter(b => [b.id, ...(b.aliases ?? [])].some(label => normalizeLabel(label) === normalizeLabel(address.block)));
  if (!blocks.length) return { status: "unknown-block" };
  if (blocks.length !== 1) return { status: "ambiguous" };
  const block = blocks[0];
  const rows = block.rows.filter(row => normalizeLabel(row.label) === rowLabel);
  if (!rows.length) return { status: "unknown-row" };
  if (rows.length !== 1) return { status: "ambiguous" };
  const seat = Number(seatLabel);
  const segments = rows[0].segments.filter(s => seat >= s.first && seat <= s.last);
  if (!segments.length) return { status: "unmapped-seat" };
  if (segments.length !== 1) return { status: "ambiguous" };
  const segment = segments[0];
  const offset = seat - segment.first;
  const point = localToWorld(block, { x: segment.origin.x + segment.step.x * offset, y: segment.origin.y + segment.step.y * offset });
  if (![point.x, point.y].every(Number.isFinite)) return { status: "invalid" };
  return { status: "mapped", point, blockId: block.id, row: rows[0].label, seat };
}

/** Includes the boundary: a seat touching a proposed stage also needs review. */
export function containsPoint(shape: Shape, point: Point): boolean {
  if (shape.kind === "circle") return Math.hypot(point.x - shape.center.x, point.y - shape.center.y) <= shape.radius + 1e-7;
  let inside = false;
  const p = shape.points;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const a = p[j], b = p[i];
    const cross = (point.x - a.x) * (b.y - a.y) - (point.y - a.y) * (b.x - a.x);
    if (Math.abs(cross) < 1e-7 && point.x >= Math.min(a.x, b.x) && point.x <= Math.max(a.x, b.x) && point.y >= Math.min(a.y, b.y) && point.y <= Math.max(a.y, b.y)) return true;
    if ((a.y > point.y) !== (b.y > point.y) && point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

export function shapeBounds(shape: Shape): Bounds {
  if (shape.kind === "circle") return { x: shape.center.x - shape.radius, y: shape.center.y - shape.radius, width: shape.radius * 2, height: shape.radius * 2 };
  const xs = shape.points.map(p => p.x), ys = shape.points.map(p => p.y);
  return { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
}

export function focusBounds(layout: ArenaLayout, point: Point | undefined, landmarkId: string | null): Bounds {
  const landmark = layout.landmarks.find(l => l.id === landmarkId);
  if (!point || !landmark) return layout.bounds;
  // Leave room for the self-seat label, which extends 48 units above the point.
  const b = shapeBounds(landmark.shape), padding = 52;
  const x = Math.min(b.x, point.x) - padding, y = Math.min(b.y, point.y) - padding;
  return { x, y, width: Math.max(120, Math.max(b.x + b.width, point.x) + padding - x), height: Math.max(120, Math.max(b.y + b.height, point.y) + padding - y) };
}

export type CandidateCheck = {
  mapped: { observation: LayoutObservation; position: Extract<SeatResolution, { status: "mapped" }>; conflicts: string[] }[];
  unmapped: { observation: LayoutObservation; reason: SeatResolution["status"] }[];
  duplicateCount: number; excludedRangeCount: number; outOfScopeCount: number;
  state: "no-evidence" | "review" | "no-conflict";
};

/** No ranking or probability: compatibility is not proof of a correct layout. */
export function checkCandidate(layout: ArenaLayout, observations: LayoutObservation[]): CandidateCheck {
  const result: CandidateCheck = { mapped: [], unmapped: [], duplicateCount: 0, excludedRangeCount: 0, outOfScopeCount: 0, state: "no-evidence" };
  const seen = new Set<string>();
  for (const observation of observations) {
    if (!layout.eventIds.includes(observation.eventId)) { result.outOfScopeCount++; continue; }
    if (observation.precision !== "exact") { result.excludedRangeCount++; continue; }
    const position = resolveSeat(layout, observation);
    const key = position.status === "mapped"
      ? JSON.stringify([position.blockId, position.row, position.seat])
      : JSON.stringify([normalizeLabel(observation.block), normalizeLabel(observation.row), normalizeLabel(observation.seat)]);
    if (seen.has(key)) { result.duplicateCount++; continue; }
    seen.add(key);
    if (position.status !== "mapped") { result.unmapped.push({ observation, reason: position.status }); continue; }
    result.mapped.push({ observation, position, conflicts: layout.landmarks.filter(l => containsPoint(l.shape, position.point)).map(l => l.id) });
  }
  if (result.unmapped.length || result.mapped.some(p => p.conflicts.length)) result.state = "review";
  else if (result.mapped.length) result.state = "no-conflict";
  return result;
}

/** Bounded iteration is for an authored template, never for a reported maximum number. */
export function layoutSeats(layout: ArenaLayout, limit = 5000): { address: SeatAddress; point: Point }[] {
  const seats: { address: SeatAddress; point: Point }[] = [];
  const aliases = new Map<string, Set<number>>();
  layout.blocks.forEach((block, index) => {
    for (const name of [block.id, ...(block.aliases ?? [])].map(normalizeLabel)) {
      const indices = aliases.get(name) ?? new Set<number>(); indices.add(index); aliases.set(name, indices);
    }
  });
  for (const block of layout.blocks) {
    if (aliases.get(normalizeLabel(block.id))?.size !== 1) throw new Error("Ambiguous layout mapping");
    const rowLabels = new Set<string>();
    for (const row of block.rows) {
      const label = normalizeLabel(row.label);
      if (rowLabels.has(label)) throw new Error("Ambiguous layout mapping");
      rowLabels.add(label);
      const intervals: { first: number; last: number }[] = [];
      for (const segment of row.segments) {
        if (!Number.isSafeInteger(segment.first) || !Number.isSafeInteger(segment.last) || segment.first < 1 || segment.last < segment.first || segment.last > 10000) throw new Error("Invalid layout segment");
        if (intervals.some(s => s.first <= segment.last && segment.first <= s.last)) throw new Error("Ambiguous layout mapping");
        intervals.push(segment);
        for (let seat = segment.first; seat <= segment.last; seat++) {
          if (seats.length >= limit) throw new Error("Layout seat limit exceeded");
          const address = { block: block.id, row: row.label, seat: String(seat) };
          const offset = seat - segment.first;
          const point = localToWorld(block, { x: segment.origin.x + segment.step.x * offset, y: segment.origin.y + segment.step.y * offset });
          if (![point.x, point.y].every(Number.isFinite)) throw new Error("Ambiguous layout mapping");
          seats.push({ address, point });
        }
      }
    }
  }
  return seats;
}
