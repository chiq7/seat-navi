import { type ArenaLayout, type LayoutBlock, type Point, type Shape } from "./layoutModel";
import { analyzeReports, type TimedSeatEvidence } from "./reportEvidence";
import { type PatternFamily } from "./historicalLayoutPatterns";
import { type HistoricalSupport, type PredictionContext } from "./patternInference";

export const referenceEvent = "synthetic:reference-validation-v3";
export const referenceCutoff = "2026-09-28T10:00:00Z";
export type ReferenceNumbering = "preserved" | "row-reset" | "block-continuous";
export type ReferenceProfile = "0" | "3" | "30" | "100" | "all" | "front" | "left" | "cluster";
export type ReferenceSeat = { address: { block: string; row: string; seat: string }; point: Point; evidence: TimedSeatEvidence };
type OracleBlock = { id: string; x: number; y: number; width: number; height: number; columns: number; rows: number; rotation: number; start: number };
export type OracleParameters = { offset: number; width: number; grid: number; noCenter?: boolean; runwayWidth?: number; shiftX?: number; rearOffset?: number; direction?: 1 | -1 };

// Oracle declarations intentionally do not call patternLayout, containsPoint,
// generateCandidateSeats, resolveSeat, or proposalSeatRelation.
function oracleBlocks(family: PatternFamily): OracleBlock[] {
  const result: OracleBlock[] = [];
  const add = (id: string, x: number, y: number, columns: number, rows: number, width: number, height: number, rotation = 0, start = 1) => result.push({ id, x, y, columns, rows, width, height, rotation, start });
  if (family === "main-only") {
    for (const [band, name] of ["PR", "A", "B", "C"].entries()) for (let i = 0; i < 6; i++) add(`${name}${i + 1}`, 40 + 86 * i, 58 + 103 * band, 12, band < 2 ? 12 : band === 2 ? 14 : i === 0 || i === 5 ? 3 : 14, 70, 85);
  } else if (family === "angled") {
    add("中央", 38, 52, 140, 41, 524, 343);
    add("サイドL", 50, 390, 28, 10, 215, 68, 25);
    add("サイドR", 355, 480, 28, 10, 215, 68, -25, 189);
  } else if (family === "asymmetric") {
    const names = ["S", "Y", "N", "R", "W", "H"], starts = [1, 2, 5, 5, 6, 8], ends = [19, 19, 16, 15, 14, 12];
    for (let band = 0; band < names.length; band++) for (let n = starts[band]; n <= ends[band]; n++) {
      if (band === 0 && n === 8 || band === 1 && n >= 9 && n <= 11) continue;
      add(`${names[band]}${n}`, 16 + (n - 1) * 30, 60 + 66 * band, 8, 8, 26, 48);
    }
  } else {
    const columns = family === "rear" ? 17 : family === "pointed" ? 14 : family === "bar" ? 13 : 15;
    const bands = family === "rear" ? 7 : family === "pointed" || family === "bar" ? 5 : 6;
    for (let band = 0; band < bands; band++) for (let i = 0; i < columns; i++) add(`${String.fromCharCode(65 + band)}${i + 1}`, 38 + i * 524 / columns, 60 + band * 390 / bands,
      12, family === "bar" && band >= 3 ? 6 : 8, 524 / columns - 6, family === "bar" && band === 0 && (i === 0 || i === columns - 1) ? 70 : 390 / bands - 12);
  }
  return result;
}

const oracleRect = (x: number, y: number, w: number, h: number): Shape => ({ kind: "polygon", points: [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }] });
function oracleStages(family: PatternFamily, p: OracleParameters): ArenaLayout["landmarks"] {
  const shapes: ArenaLayout["landmarks"] = [{ id: "main", kind: "main", label: "メイン", shape: oracleRect(40, 20, 520, 26), labelAt: { x: 300, y: 32 } }];
  const add = (id: string, kind: "center" | "runway" | "equipment", shape: Shape, x: number, y: number) => shapes.push({ id, kind, shape, labelAt: { x, y }, label: kind === "center" ? "センステ" : kind === "equipment" ? "機材席" : "花道" });
  if (p.noCenter) return shapes;
  const y = 183 + p.offset, a = 49 * p.width;
  if (family === "main-only") { add("pa", "equipment", oracleRect(212, 319 + p.offset, 160 * p.width, 40), 292, 339); return shapes; }
  if (family === "round") add("center", "center", { kind: "circle", center: { x: 300, y }, radius: a }, 300, y);
  else if (family === "square") add("center", "center", oracleRect(300 - a, y - 32, 2 * a, 64), 300, y);
  else if (family === "bar") add("center", "center", oracleRect(110, y - 20, 380 * p.width, 38), 300, y);
  else if (family === "asymmetric") add("center", "center", { kind: "polygon", points: [{ x: 235, y: 126 }, { x: 440 * p.width, y: 126 }, { x: 440 * p.width, y: 172 + p.offset }, { x: 265, y: 172 + p.offset }] }, 340, 148);
  else {
    const polygon = family === "pointed" ? [[300 - a, y - 32], [300 + a, y - 32], [300 + a, y + 6], [300, y + 70], [300 - a, y + 6]]
      : [[300, y - 60], [300 + a, y - 32], [300 + a, y + 32], [300, y + 60], [300 - a, y + 32], [300 - a, y - 32]];
    add("center", "center", { kind: "polygon", points: polygon.map(([x, y]) => ({ x, y })) }, 300, y);
  }
  const end = family === "asymmetric" ? 130 : y - (family === "bar" ? 20 : family === "square" ? 32 : 60);
  const stem = 13 * (p.runwayWidth ?? p.width);
  add("runway", "runway", oracleRect(300 - stem, 46, 2 * stem, Math.max(1, end - 46)), 300, 90);
  if (family === "rear") {
    add("rear-runway", "runway", oracleRect(300 - stem, y + 50, 2 * stem, 145), 300, 305);
    add("rear-stage", "center", oracleRect(257, y + 183, 86, 44), 300, y + 205);
  }
  if (family === "pointed") add("cross", "runway", oracleRect(65, y - 32, 470, 16 * p.width), 130, y - 24);
  if (family === "angled") add("pa", "equipment", oracleRect(246, 354, 108, 38), 300, 373);
  return shapes.map(stage => {
    const horizontal = stage.kind === "main" ? 0 : p.shiftX ?? 0;
    const vertical = stage.id.startsWith("rear-") ? p.rearOffset ?? 0 : 0;
    return { ...stage, labelAt: { x: stage.labelAt.x + horizontal, y: stage.labelAt.y + vertical }, shape: stage.shape.kind === "circle"
      ? { ...stage.shape, center: { x: stage.shape.center.x + horizontal, y: stage.shape.center.y + vertical } }
      : { ...stage.shape, points: stage.shape.points.map(vertex => ({ x: vertex.x + horizontal, y: vertex.y + vertical })) } };
  });
}

// Independent winding-angle inclusion, rather than the inference ray-casting helper.
export function oracleContainsV3(shape: Shape, p: Point) {
  if (shape.kind === "circle") return (p.x - shape.center.x) ** 2 + (p.y - shape.center.y) ** 2 <= shape.radius ** 2 + 1e-7;
  let angle = 0;
  for (let i = 0; i < shape.points.length; i++) {
    const a = shape.points[i], b = shape.points[(i + 1) % shape.points.length];
    const ax = a.x - p.x, ay = a.y - p.y, bx = b.x - p.x, by = b.y - p.y;
    const cross = ax * by - ay * bx;
    if (Math.abs(cross) < 1e-7 && ax * bx + ay * by <= 0) return true;
    angle += Math.atan2(cross, ax * bx + ay * by);
  }
  return Math.abs(angle) > Math.PI;
}

export function createReferenceTruth(family: PatternFamily, numbering: ReferenceNumbering, p: OracleParameters = { offset: 0, width: 1, grid: 1 }) {
  const definitions = oracleBlocks(family), stages = oracleStages(family, p), seats: ReferenceSeat[] = [], blocks: LayoutBlock[] = [];
  for (const b of definitions) {
    const angle = b.rotation * Math.PI / 180;
    const origin = { x: 300 + (b.x - 300) * p.grid, y: b.y };
    blocks.push({ id: b.id, origin, rotation: b.rotation, labelAt: { x: 300 + (b.x + b.width / 2 - 300) * p.grid, y: b.y - 3 }, rows: [], outline: [{ x: 0, y: 0 }, { x: b.width * p.grid, y: 0 }, { x: b.width * p.grid, y: b.height }, { x: 0, y: b.height }] });
    let continuous = 1;
    for (let row = 0; row < b.rows; row++) {
      let reset = 1;
      for (let col = 0; col < b.columns; col++) {
        const raw = b.start + col;
        if (family === "angled" && b.id === "中央" && row < 4 && (raw < 13 || raw > 126)) continue;
        const x = (family === "angled" && b.id === "中央" && row < 4 ? 47 + (raw - 13) * 3.74 : 2 + col * (b.width - 4) / Math.max(1, b.columns - 1)) * p.grid;
        const y = family === "angled" && b.id === "中央" && row < 4 ? 2 + row * 8.475 : 2 + row * (b.height - 4) / Math.max(1, b.rows - 1);
        const point = { x: origin.x + x * Math.cos(angle) - y * Math.sin(angle), y: origin.y + x * Math.sin(angle) + y * Math.cos(angle) };
        if (stages.some(l => oracleContainsV3(l.shape, point))) continue;
        const address = { block: b.id, row: String(row + 1), seat: String(numbering === "preserved" ? raw : numbering === "row-reset" ? reset++ : continuous++) };
        const id = `${address.block}:${address.row}:${address.seat}`;
        seats.push({ address, point, evidence: { ...address, id, eventId: referenceEvent, precision: "exact", availableAt: "2026-09-28T09:00:00Z", source: "fan-report", sourceRef: `synthetic-v3:${id}` } });
      }
    }
  }
  if (p.direction === -1) {
    // Independent reverse-numbered truth: relabel within each physical row, keeping
    // continuous prefixes and the physical layout unchanged. Never feed this flag to inference.
    const rows = new Map<string, ReferenceSeat[]>();
    for (const s of seats) { const key = `${s.address.block}:${s.address.row}`, group = rows.get(key) ?? []; group.push(s); rows.set(key, group); }
    for (const group of rows.values()) {
      const b = definitions.find(b => b.id === group[0].address.block)!;
      const maximumSlot = family === "angled" && b.id === "中央" && Number(group[0].address.row) <= 4 ? 126 : b.start + b.columns - 1;
      const numbers = group.map(s => Number(s.address.seat)), sum = Math.min(...numbers) + Math.max(...numbers);
      for (const s of group) {
        s.address = { ...s.address, seat: String(numbering === "preserved" ? maximumSlot - Number(s.address.seat) + 1 : sum - Number(s.address.seat)) };
        const id = `${s.address.block}:${s.address.row}:${s.address.seat}`;
        s.evidence = { ...s.evidence, ...s.address, id, sourceRef: `synthetic-v3:${id}` };
      }
    }
  }
  const layout: ArenaLayout = { id: `oracle-v3:${family}`, version: "synthetic", label: "独立に決めた検証用配置", eventIds: [referenceEvent], status: "sample", bounds: { x: 0, y: 0, width: 600, height: 540 }, blocks, landmarks: stages };
  return { seats, layout };
}

export function sampleReferenceSeats(seats: ReferenceSeat[], profile: ReferenceProfile, seed: number) {
  const source = seats.filter(s => profile === "front" ? s.point.y < 170 : profile === "left" ? s.point.x < 270 : profile === "cluster" ? s.point.x > 330 && s.point.x < 470 && s.point.y < 220 : true);
  let state = seed >>> 0;
  for (let i = source.length - 1; i > 0; i--) { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; const j = Math.floor(state / 4294967296 * (i + 1)); [source[i], source[j]] = [source[j], source[i]]; }
  return source.slice(0, profile === "all" ? source.length : /^\d+$/.test(profile) ? Number(profile) : 100);
}

export function referenceAnalysis(samples: ReferenceSeat[]) {
  return analyzeReports(samples.map(s => s.evidence), referenceEvent, referenceCutoff);
}

// Explicitly synthetic historical example; not a claim about the supplied real artists.
export function sampleHistoricalContext(family: PatternFamily): PredictionContext {
  const record: HistoricalSupport = { family, sourceRef: "synthetic:past-tour-example", originGroup: "synthetic:one-previous-show", availableAt: "2025-09-01T00:00:00Z", artist: "検証アーティスト", tour: "検証ツアー", status: "confirmed" };
  return { artist: "検証アーティスト", tour: "検証ツアー", history: [record] };
}
