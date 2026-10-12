import { normalizeLabel, type ArenaLayout, type LayoutBlock, type Landmark } from "./layoutModel";
import { patternLayout, rectShape } from "./historicalLayoutPatterns";
import type { SeatCandidate } from "./candidateSeatModel";

// Internal research only. These files are never copied to public/ or used as ticket reports.
export const referenceImages = {
  "baby-prediction": "babymonster-kyocera-2026-09-21-prediction.png",
  "baby-board": "babymonster-kyocera-2026-09-22-actual-board.webp",
  "skz-prediction": "skz-kyocera-2026-09-15-prediction.png",
  "skz-board": "skz-kyocera-2026-09-19-actual-board-post.png",
  "txt-board": "txt-ariake-2025-05-24-actual-board.jpg",
  "le-before": "lesserafim-fukuoka-2026-08-24-prediction-arena.webp",
  "le-after": "lesserafim-fukuoka-2026-08-27-prediction-arena.webp",
} as const;

const coarseBlock = (id: string, x: number, y: number, w: number, h: number): LayoutBlock => ({ id, origin: { x, y }, rotation: 0,
  labelAt: { x: x + w / 2, y: y + h / 2 }, outline: [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }], rows: [] });
const mark = (id: string, kind: Landmark["kind"], label: string, x: number, y: number, w: number, h: number): Landmark => ({ id, kind, label, shape: rectShape(x, y, w, h), labelAt: { x: x + w / 2, y: y + h / 2 } });
function boardLayout(id: string, label: string, blocks: LayoutBlock[], landmarks: Landmark[]): ArenaLayout {
  return { id: `reference:${id}`, version: "coarse-v5", label, eventIds: [], status: "sample", bounds: { x: 0, y: 0, width: 600, height: 540 }, blocks, landmarks };
}

export function babyBoardStructure() {
  // Explicitly readable block extents; not a full rectangular carpet of seats.
  const bands = [
    { name: "A", numbers: [1,2,3,4,5,6,7,9,10,11,12,13,14,15] },
    { name: "B", numbers: [1,2,3,4,5,6,7,9,10,11,12,13,14,15] },
    { name: "C", numbers: Array.from({ length: 15 }, (_, i) => i + 1) },
    { name: "D", numbers: Array.from({ length: 13 }, (_, i) => i + 2) },
    { name: "E", numbers: [5,6,7,8,9,10,11] },
    { name: "F", numbers: [4,5,6,7,9,10,11,12] },
  ];
  const blocks = bands.flatMap((b, band) => b.numbers.map(n => coarseBlock(`${b.name}${n}`, 22 + (n - 1) * 37, 78 + band * 68, 31, b.name === "B" && (n === 7 || n === 9) || b.name === "D" && n === 8 || b.name === "F" && (n === 4 || n === 12) ? 25 : 52)));
  return boardLayout("baby", "BABYMONSTER 当日案内板・構造転記", blocks, [mark("main", "main", "メイン", 35, 20, 530, 28), mark("runway", "runway", "花道", 287, 48, 26, 115), mark("center", "center", "センステ", 245, 162, 110, 52),
    mark("viewing", "passage", "観覧エリア", 207, 224, 179, 26), mark("entry", "passage", "観覧入場導線", 185, 342, 230, 9)]);
}

export function txtBoardStructure() {
  const blocks: LayoutBlock[] = [];
  for (const [band, name] of ["A", "B", "C"].entries()) for (let n = 1; n <= 7; n++) {
    if (name === "A" && n === 4) continue;
    blocks.push(coarseBlock(`${name}${n}`, 30 + (n - 1) * 78, 78 + band * 122, 65, name === "C" && n === 4 ? 28 : name === "C" ? 80 : 98));
  }
  return boardLayout("txt", "TXT 有明・当日案内板の構造転記", blocks, [mark("main", "main", "メイン", 45, 20, 510, 28), mark("runway", "runway", "花道", 287, 48, 26, 82), mark("center", "center", "センステ", 255, 130, 90, 50), mark("pa", "equipment", "機材", 264, 360, 63, 55)]);
}

export function skzBoardStructure() {
  // The low-resolution board supports connectivity, not a precise transcription of every outer block.
  const base = patternLayout("rear", "reference:skz", { offset: 0, width: 1, grid: 1 });
  return { ...base, id: "reference:skz", eventIds: [], status: "sample" as const, blocks: base.blocks.map(b => ({ ...b, rows: [] })),
    landmarks: base.landmarks.map(l => l.kind === "main" ? { ...l, shape: { kind: "polygon" as const, points: [{ x: 40, y: 28 }, { x: 150, y: 28 }, { x: 150, y: 20 }, { x: 450, y: 20 }, { x: 450, y: 28 }, { x: 560, y: 28 }, { x: 560, y: 46 }, { x: 365, y: 46 }, { x: 365, y: 60 }, { x: 235, y: 60 }, { x: 235, y: 46 }, { x: 40, y: 46 }] } } : l) };
}

/** Only the readable edge width is transcribed. Interior rows remain unspecified. */
export function leEdgeNumberingUpdate(width: 4 | 5) {
  const blocks = ["A1", "A7", "B1", "B7"].map((id, i) => ({ ...coarseBlock(id, 30 + (i % 2) * 470, 60 + Math.floor(i / 2) * 210, 60, 180),
    rows: Array.from({ length: 17 }, (_, row) => ({ label: String(row + 1), segments: [{ first: 1, last: width, origin: { x: 4, y: 4 + row * 10 }, step: { x: 10, y: 0 } }] })) }));
  return boardLayout(`le-edge-${width}`, `端区画1〜${width}番という予想`, blocks, []);
}

export const structuralReferences = [
  { id: "baby", label: "BABYMONSTER · 京セラ 9/22", kind: "予想 → 当日", images: [{ id: "baby-prediction", label: "最終予想" }, { id: "baby-board", label: "当日案内板" }],
    createLayout: babyBoardStructure, read: ["中央花道＋四角いセンステ", "外周でブロックが減る", "観覧エリア・入場導線は舞台ではない"], unknown: ["全列・全番号・実寸", "導線と細かい列端の形"],
    source: "https://x.com/TheTreasonWall/status/2102293083497128242", effect: "空白を舞台だけで説明せず、通路の属性を維持。外周の全マスを存在席にしない。" },
  { id: "skz", label: "Stray Kids · 京セラ 9/19", kind: "予想 → 当日", images: [{ id: "skz-prediction", label: "9/15予想" }, { id: "skz-board", label: "当日案内板" }],
    createLayout: skzBoardStructure, read: ["多角形センステ", "前後の花道＋後方ステージ", "メイン前縁は段差"], unknown: ["全ブロックの転記（表示区画は参考テンプレート）", "舞台の実寸と厳密な列端"],
    source: "https://x.com/aesilix/status/2101223477898584232", effect: "後方舞台を独立した対象にし、近い舞台が変わっても前後の軸を反転させない。" },
  { id: "txt", label: "TXT · 有明 2025/5/24", kind: "当日構造の再現", images: [{ id: "txt-board", label: "当日案内板" }],
    createLayout: txtBoardStructure, read: ["A3/A5の間にセンステ", "B4はセンステ後方", "C4の後ろに機材区画"], unknown: ["図の四角と予想の多角形のどちらが実輪郭か", "全席の番号・寸法", "サウチェと本編の採番が共通か"],
    source: "https://ameblo.jp/txt-yj0913/entry-12907826638.html", effect: "当日図は粗い構造の答え合わせに限定。部分報告から列番を捏造しない。" },
  { id: "le", label: "LE SSERAFIM · 福岡 2026", kind: "予想の更新", images: [{ id: "le-before", label: "8/24予想" }, { id: "le-after", label: "8/27更新" }],
    createLayout: () => leEdgeNumberingUpdate(4), read: ["端区画の1〜5番を1〜4番へ訂正", "B4最前8列という予想", "券種は日別に異なる"], unknown: ["当日の同公演の案内板", "修正後の実配置一致"],
    source: "https://x.com/kh___un/status/2092749360165777564", effect: "番号境界の更新を再コンパイルして検証。券種色・白抜きを席の有無へ変換しない。" },
] as const;

export type PartialSeatReference = { id: string; url: string; date: string | null; phase: "soundcheck" | "main" | "unknown"; kind: "person" | "issuance" | "listing" | "lost-item" | "hearsay";
  verified: boolean; block?: string; row?: number | [number, number]; seat?: number | [number, number]; raw: string };
const txt = (id: string, account: string, post: string, values: Omit<PartialSeatReference, "id" | "url" | "verified">): PartialSeatReference => ({ id, url: `https://x.com/${account}/status/${post}`, verified: false, ...values });
// Received research summaries, not re-verified original posts. Raw ambiguous descriptions remain raw.
export const txtPartialReferences: PartialSeatReference[] = [
  txt("T01", "chichan1108", "1926470323983044942", { date: "2025-05-24", phase: "soundcheck", kind: "person", block: "A3", raw: "A3、真ん中、センステ横。列・番号なし。画像は会場外中心" }),
  txt("T02", "maiming913", "1925874298238967845", { date: null, phase: "soundcheck", kind: "issuance", block: "A5", row: 5, raw: "A-5／5列／番号なし" }),
  txt("T03", "baby_sungho_", "1923041765914812624", { date: null, phase: "unknown", kind: "issuance", block: "B3", raw: "前から3列目・10何番・センステ目の前（発券時の解釈）" }),
  txt("T04", "mikirinmikirin", "1926294020201808051", { date: null, phase: "unknown", kind: "person", block: "B4", raw: "B4、真正面。公演日・本編／サウチェ未確定" }),
  txt("T05", "miina_yeonjun", "1926473276529721638", { date: "2025-05-24", phase: "soundcheck", kind: "person", row: 3, raw: "ブロック不明、3列目、センステど正面" }),
  txt("T06", "naoko8786", "1926579292214796563", { date: null, phase: "soundcheck", kind: "person", row: 1, raw: "ステージ左横1列目。メイン／センステ不明" }),
  txt("T07", "TTmomi13", "1926631085489737853", { date: null, phase: "soundcheck", kind: "person", raw: "センステ横。ブロック・列・番号なし" }),
  txt("T08", "_Asanoha_Kaede", "1926528685424742571", { date: "2025-05-24", phase: "soundcheck", kind: "person", raw: "最前列のみ。ブロック・舞台対象不明" }),
  txt("T09", "tyuniebin05", "1924103807442780475", { date: null, phase: "unknown", kind: "issuance", raw: "around B5。確定ブロック名ではない" }),
  txt("T10", "xoxo_O913", "1926505986820280639", { date: "2025-05-24", phase: "main", kind: "person", raw: "ステサイ体感席、メイン奥が見えない。席位置不明" }),
  txt("T11", "sbg_apl", "1926588946445701292", { date: "2025-05-25", phase: "unknown", kind: "lost-item", block: "B6", row: 10, raw: "7番付近の落とし物。本人席・確定番号ではない" }),
  txt("T12", "6vnay5", "1925926221054910751", { date: "2025-05-24", phase: "unknown", kind: "listing", block: "B4", row: [16,20], raw: "B4・16〜20列。区間のどこかであり5点ではない" }),
  txt("T13", "6vnay5", "1925983440576422246", { date: "2025-05-24", phase: "unknown", kind: "listing", block: "B2", row: [5,10], raw: "B2・5〜10列。現地確認ではない" }),
  txt("T14", "nyannyaneeee", "1926503324905247043", { date: "2025-05-25", phase: "unknown", kind: "listing", raw: "スタンドB・47〜70番。実質1列とセンステ横は投稿者予想" }),
  txt("T15", "baku_ENGENE", "1924054840935858683", { date: null, phase: "unknown", kind: "hearsay", block: "B4", raw: "有明ならB4最前＝センステ最前、という一般化" }),
];

/** Auxiliary range-existence check. It never expands a range into invented exact reports. */
export function checkPartialReference(candidate: SeatCandidate, reference: PartialSeatReference, scope: { date: string; phase: "soundcheck" | "main" }) {
  if (!reference.verified || reference.date !== scope.date || reference.phase !== scope.phase || !reference.block || ["listing", "lost-item", "hearsay"].includes(reference.kind)) return "not-used";
  const within = (value: number, constraint?: number | [number, number]) => constraint === undefined || (typeof constraint === "number" ? value === constraint : value >= constraint[0] && value <= constraint[1]);
  return candidate.seats.some(s => normalizeLabel(s.address.block) === normalizeLabel(reference.block!) && within(Number(s.address.row), reference.row) && within(Number(s.address.seat), reference.seat)) ? "possible" : "incompatible";
}
