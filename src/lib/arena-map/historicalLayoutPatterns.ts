import { type ArenaLayout, type Landmark, type LayoutBlock, type Shape } from "./layoutModel";

export type PatternFamily = "square" | "rear" | "main-only" | "angled" | "pointed" | "bar" | "asymmetric" | "round";
export type PatternVariant = { offset: number; width: number; grid: number; mainOnly?: boolean; runwayWidth?: number; shiftX?: number; rearOffset?: number };
export type LayoutPattern = {
  family: PatternFamily; label: string; reference: string; venue: string;
  observed: string[]; assumed: string[]; unknown: string[];
};

// These are structural templates for synthetic previews, not transcriptions of tickets.
// Colours in the supplied images do not enter seat-existence or lottery inference.
export const layoutPatterns: readonly LayoutPattern[] = [
  { family: "square", label: "京セラ型 · BABYMONSTER", reference: "R01", venue: "京セラドーム大阪", observed: ["A〜F・1〜15の配置", "四角いセンステと直線花道"], assumed: ["各区画の列数・番号", "座席間隔と縮尺"], unknown: ["実配置との照合", "色の凡例"] },
  { family: "rear", label: "京セラ型 · Stray Kids", reference: "R02", venue: "京セラドーム大阪", observed: ["多角形センステ", "後方まで続く花道とステージ"], assumed: ["各区画の列数・番号", "座席間隔と縮尺"], unknown: ["公演日", "予想と実配置の別", "色の凡例"] },
  { family: "main-only", label: "城ホール型 · 松田聖子", reference: "R03", venue: "大阪城ホール", observed: ["PR1〜6・A〜Cの配置", "12席幅の通し番号", "B3/B4の10列目以降に機材席"], assumed: ["模式図の縮尺", "C1/C6は3列までを検証"], unknown: ["C1/C6の4列目以降", "実配置との照合"] },
  { family: "angled", label: "Kアリーナ型 · LE SSERAFIM", reference: "R04", venue: "Kアリーナ横浜", observed: ["傾いた側方区画", "列端の変化", "PA席", "プレミアム1次/2次の色凡例"], assumed: ["中央列の番号区間", "サイドの区画名と採番", "縮尺"], unknown: ["細かな席番号の転記", "実配置との照合"] },
  { family: "pointed", label: "ベルーナ型 · &TEAM", reference: "R05", venue: "ベルーナドーム", observed: ["横花道", "尖ったセンステ", "階段状の欠け"], assumed: ["区画名・列数・番号", "縮尺"], unknown: ["原図の細かな採番", "実配置との照合"] },
  { family: "bar", label: "マリンメッセ型 · TXT", reference: "R06", venue: "マリンメッセ福岡", observed: ["横長ステージと縦花道", "区画幅と列数の違い", "予想第二弾の表記"], assumed: ["各区画の列数・番号", "縮尺"], unknown: ["実配置との照合"] },
  { family: "asymmetric", label: "Inkigayo型 · 非対称", reference: "R07", venue: "未確認", observed: ["S/Y/N/R/W/Hの区画名", "非対称な横花道", "ずれた区画"], assumed: ["各区画の席番号・列数", "縮尺"], unknown: ["公演日・会場", "実配置との照合", "色の凡例"] },
  { family: "round", label: "円形センステ · 曲線の欠け", reference: "既存合成例", venue: "架空会場", observed: [], assumed: ["円形と直線花道の検証用配置"], unknown: ["対応する実公演"] },
];

export const patternVariants: readonly PatternVariant[] = [
  { offset: 0, width: 1, grid: 1 },
  { offset: -12, width: 1, grid: 1 }, { offset: 12, width: 1, grid: 1 },
  { offset: 0, width: .85, grid: 1 }, { offset: 0, width: 1.15, grid: 1 },
  { offset: 0, width: 1, grid: .97 }, { offset: 0, width: 1, grid: 1.03 },
  { offset: 0, width: 1, grid: 1, mainOnly: true },
];

export const rectShape = (x: number, y: number, width: number, height: number): Shape => ({ kind: "polygon", points: [{ x, y }, { x: x + width, y }, { x: x + width, y: y + height }, { x, y: y + height }] });
const landmark = (id: string, kind: Landmark["kind"], shape: Shape, x: number, y: number): Landmark => ({ id, kind, shape, labelAt: { x, y }, label: kind === "main" ? "メイン" : kind === "center" ? "センステ" : kind === "equipment" ? "機材席" : "花道" });

function block(id: string, x: number, y: number, columns = 12, rows = 8, width = 28, height = 42, rotation = 0, start = 1): LayoutBlock {
  return { id, origin: { x, y }, rotation, labelAt: { x: x + width / 2, y: y - 3 },
    outline: [{ x: 0, y: 0 }, { x: width, y: 0 }, { x: width, y: height }, { x: 0, y: height }],
    rows: Array.from({ length: rows }, (_, row) => ({ label: String(row + 1), segments: [{ first: start, last: start + columns - 1, origin: { x: 2, y: 2 + row * (height - 4) / Math.max(1, rows - 1) }, step: { x: (width - 4) / Math.max(1, columns - 1), y: 0 } }] })) };
}

const blockCache = new Map<string, LayoutBlock[]>();
function patternBlocks(family: PatternFamily, grid: number) {
  const key = `${family}:${grid}`;
  const cached = blockCache.get(key);
  if (cached) { blockCache.delete(key); blockCache.set(key, cached); return cached; }
  // Long comparison sessions must not retain every historical grid indefinitely.
  // Potential-seat caches are weakly keyed, so evicted grids can also be collected.
  if (blockCache.size >= 64) blockCache.delete(blockCache.keys().next().value!);
  const blocks: LayoutBlock[] = [];
  if (family === "main-only") {
    for (let band = 0; band < 4; band++) for (let col = 0; col < 6; col++) {
      const name = ["PR", "A", "B", "C"][band];
      const rows = band < 2 ? 12 : band === 2 ? 14 : col === 0 || col === 5 ? 3 : 14;
      blocks.push(block(`${name}${col + 1}`, 40 + col * 86, 58 + band * 103, 12, rows, 70, 85));
    }
  } else if (family === "angled") {
    const center = block("中央", 38, 52, 140, 41, 524, 343);
    center.aliases = ["アリーナ", "指定なし"];
    // Explicit multiple segments: absolute seat numbers keep their positions across an aisle.
    center.rows = center.rows.map((row, i) => ({ ...row, segments: i < 4 ? [
      { first: 13, last: 40, origin: { x: 47, y: 2 + i * 8.475 }, step: { x: 3.74, y: 0 } },
      { first: 41, last: 100, origin: { x: 151.72, y: 2 + i * 8.475 }, step: { x: 3.74, y: 0 } },
      { first: 101, last: 126, origin: { x: 376.12, y: 2 + i * 8.475 }, step: { x: 3.74, y: 0 } },
    ] : row.segments }));
    blocks.push(center, block("サイドL", 50, 390, 28, 10, 215, 68, 25, 1), block("サイドR", 355, 480, 28, 10, 215, 68, -25, 189));
  } else if (family === "asymmetric") {
    const bands: [string, number, number, number][] = [["S", 1, 19, 60], ["Y", 2, 19, 126], ["N", 5, 16, 192], ["R", 5, 15, 258], ["W", 6, 14, 324], ["H", 8, 12, 390]];
    for (const [name, first, last, y] of bands) for (let n = first; n <= last; n++) {
      if (name === "S" && n === 8 || name === "Y" && n >= 9 && n <= 11) continue;
      blocks.push(block(`${name}${n}`, 16 + (n - 1) * 30, y, 8, 8, 26, 48));
    }
  } else {
    const cols = family === "rear" ? 17 : family === "pointed" ? 14 : family === "bar" ? 13 : 15;
    const bands = family === "rear" ? 7 : family === "pointed" || family === "bar" ? 5 : 6;
    const pitch = 524 / cols;
    for (let band = 0; band < bands; band++) for (let col = 0; col < cols; col++) {
      const rows = family === "bar" && band >= 3 ? 6 : 8;
      blocks.push(block(`${String.fromCharCode(65 + band)}${col + 1}`, 38 + col * pitch, 60 + band * (390 / bands), 12, rows, pitch - 6, family === "bar" && band === 0 && (col === 0 || col === cols - 1) ? 70 : 390 / bands - 12));
    }
  }
  const stretched = grid === 1 ? blocks : blocks.map(b => ({ ...b, origin: { x: 300 + (b.origin.x - 300) * grid, y: b.origin.y },
    labelAt: { x: 300 + (b.labelAt.x - 300) * grid, y: b.labelAt.y },
    outline: b.outline.map(p => ({ ...p, x: p.x * grid })),
    rows: b.rows.map(r => ({ ...r, segments: r.segments.map(s => ({ ...s, origin: { ...s.origin, x: s.origin.x * grid }, step: { ...s.step, x: s.step.x * grid } })) })) }));
  blockCache.set(key, stretched); return stretched;
}

export function patternLayout(family: PatternFamily, eventId: string, variant: PatternVariant): ArenaLayout {
  const pattern = layoutPatterns.find(p => p.family === family);
  if (!pattern) throw new Error("Unknown pattern family");
  const cy = 183 + variant.offset, half = 49 * variant.width, stem = 13 * (variant.runwayWidth ?? variant.width);
  const landmarks: Landmark[] = [landmark("main", "main", rectShape(40, 20, 520, 26), 300, 32)];
  if (!variant.mainOnly) {
    if (family === "main-only") landmarks.push(landmark("pa", "equipment", rectShape(212, 319 + variant.offset, 160 * variant.width, 40), 292, 339));
    else {
      if (family === "round") landmarks.push(landmark("center", "center", { kind: "circle", center: { x: 300, y: cy }, radius: half }, 300, cy));
      else if (family === "rear" || family === "angled" || family === "pointed") {
        const points = family === "pointed" ? [{ x: 300 - half, y: cy - 32 }, { x: 300 + half, y: cy - 32 }, { x: 300 + half, y: cy + 6 }, { x: 300, y: cy + 70 }, { x: 300 - half, y: cy + 6 }]
          : [{ x: 300, y: cy - 60 }, { x: 300 + half, y: cy - 32 }, { x: 300 + half, y: cy + 32 }, { x: 300, y: cy + 60 }, { x: 300 - half, y: cy + 32 }, { x: 300 - half, y: cy - 32 }];
        landmarks.push(landmark("center", "center", { kind: "polygon", points }, 300, cy));
      } else if (family === "bar") landmarks.push(landmark("center", "center", rectShape(110, cy - 20, 380 * variant.width, 38), 300, cy));
      else if (family === "asymmetric") landmarks.push(landmark("center", "center", { kind: "polygon", points: [{ x: 235, y: 126 }, { x: 440 * variant.width, y: 126 }, { x: 440 * variant.width, y: 172 + variant.offset }, { x: 265, y: 172 + variant.offset }] }, 340, 148));
      else landmarks.push(landmark("center", "center", rectShape(300 - half, cy - 32, half * 2, 64), 300, cy));
      const end = family === "asymmetric" ? 130 : cy - (family === "bar" ? 20 : family === "square" ? 32 : 60);
      landmarks.push(landmark("runway", "runway", rectShape(300 - stem, 46, stem * 2, Math.max(1, end - 46)), 300, 90));
      if (family === "rear") {
        landmarks.push(landmark("rear-runway", "runway", rectShape(300 - stem, cy + 50, stem * 2, 145), 300, 305));
        landmarks.push({ ...landmark("rear-stage", "center", rectShape(257, cy + 183, 86, 44), 300, cy + 205), label: "後方ステージ" });
      }
      if (family === "pointed") landmarks.push(landmark("cross", "runway", rectShape(65, cy - 32, 470, 16 * variant.width), 130, cy - 24));
      if (family === "angled") landmarks.push(landmark("pa", "equipment", rectShape(246, 354, 108, 38), 300, 373));
    }
  }
  const extra = variant.runwayWidth !== undefined || variant.shiftX !== undefined || variant.rearOffset !== undefined;
  const shifted = landmarks.map(l => {
    const dx = l.kind === "main" ? 0 : variant.shiftX ?? 0;
    const dy = l.id.startsWith("rear-") ? variant.rearOffset ?? 0 : 0;
    return { ...l, labelAt: { x: l.labelAt.x + dx, y: l.labelAt.y + dy }, shape: l.shape.kind === "circle"
      ? { ...l.shape, center: { x: l.shape.center.x + dx, y: l.shape.center.y + dy } }
      : { ...l.shape, points: l.shape.points.map(p => ({ x: p.x + dx, y: p.y + dy })) } };
  });
  return { id: `pattern:${family}:${variant.offset}:${variant.width}:${variant.grid}:${!!variant.mainOnly}${extra ? `:${variant.runwayWidth ?? variant.width}:${variant.shiftX ?? 0}:${variant.rearOffset ?? 0}` : ""}`, version: extra ? "v5" : "v3", label: pattern.label,
    eventIds: [eventId], status: "prediction", bounds: { x: 0, y: 0, width: 600, height: 540 }, blocks: patternBlocks(family, variant.grid), landmarks: shifted };
}
