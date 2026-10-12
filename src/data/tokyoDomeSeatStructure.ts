import rawGeometry from "./tokyoDomeSeatGeometry.json";
import topologyData from "./tokyoDomeSectionTopology.json";
import { TOKYO_DOME_GATE_ANCHORS } from "./tokyoDomeGateAnchors";
import { TOKYO_DOME_ROW_CORRECTIONS } from "./tokyoDomeSeatRowCorrections";
import {
  TOKYO_DOME_NARROW_ROW_CORRECTIONS,
  TOKYO_DOME_SHAPE_CORRECTIONS,
} from "./tokyoDomeSeatShapeCorrections";
import {
  TOKYO_DOME_C_BALCONY_PARTITIONS,
  TOKYO_DOME_C_BALCONY_RUNS,
  type TokyoDomeCBalconyPartition,
} from "./tokyoDomeCBalconyPartitions";

/**
 * Tokyo Dome stand-seat structure, extracted for a future original renderer.
 *
 * This module intentionally contains no React/UI code and no source PDF/image
 * asset.  A consumer must respect each status field: `unresolved` must never
 * be rendered as if it were an exact individual section boundary.
 */

export type TokyoDomeTier = "A" | "B" | "C" | "D" | "E" | "F";
export type VerificationStatus = "confirmed" | "reconstructed" | "unresolved";

export type TokyoDomeSectionStructure = {
  code: string;
  tier: TokyoDomeTier;
  /** Label anchor in the official PDF coordinate system (viewBox 145 26 900 790). */
  label: { x: number; y: number };
  /** Inclusive row range. Null means that the supplied PDFs do not establish it. */
  rows: readonly [number, number] | null;
  rowStatus: VerificationStatus;
  /** The direction in which row numbers increase, from the playing field. */
  rowDirection: "inner_to_outer" | "not_established";
  /** An exact individual SVG path only when the PDF gives one for this section. */
  svgPath: string | null;
  shapeStatus: VerificationStatus;
  shapeEvidence:
    | "official_pdf_vector"
    | "official_pdf_visual_transcription"
    | "reconstructed_from_adjacent_official_vectors"
    | "official_pdf_band_path_and_divider_vectors"
    | "shared_pdf_path_not_an_individual_section";
  compositeGeometry: TokyoDomeCBalconyPartition | null;
  /** The section-level neighbour list was not inferred from touching bboxes. */
  adjacentSections: readonly string[];
  adjacencyStatus: "confirmed" | "partial" | "unresolved";
  notes: readonly string[];
};

export type { TokyoDomeGateAnchor } from "./tokyoDomeGateAnchors";

const tierOf = (code: string) => code.slice(0, 1) as TokyoDomeTier;

const correctedRows = (code: string, sourceRows: readonly number[] | null) => {
  const rowCorrection = TOKYO_DOME_ROW_CORRECTIONS[code]
    ?? TOKYO_DOME_NARROW_ROW_CORRECTIONS[code];
  return rowCorrection ?? sourceRows;
};

const hasIndividualSourcePath = (code: string, shared: boolean) =>
  tierOf(code) !== "C" && !shared;

type TopologyNeighbors = {
  inner: string[];
  outer: string[];
  clockwise: string[];
  counterClockwise: string[];
};

const topologyNeighbors = new Map<string, TopologyNeighbors>();
const neighborsFor = (code: string) => {
  const existing = topologyNeighbors.get(code);
  if (existing) return existing;
  const created: TopologyNeighbors = { inner: [], outer: [], clockwise: [], counterClockwise: [] };
  topologyNeighbors.set(code, created);
  return created;
};

for (const run of topologyData.lateralRuns) {
  run.codes.forEach((code, index) => {
    const neighbors = neighborsFor(code);
    if (index > 0) neighbors.counterClockwise.push(run.codes[index - 1]);
    if (index < run.codes.length - 1) neighbors.clockwise.push(run.codes[index + 1]);
  });
}

for (const link of topologyData.radialLinks) {
  neighborsFor(link.inner).outer.push(link.outer);
  neighborsFor(link.outer).inner.push(link.inner);
}

const unique = (values: readonly string[]) => [...new Set(values)];

export const TOKYO_DOME_SEAT_STRUCTURE = {
  version: "2026-09-20-topology-complete",
  coordinateSystem: {
    viewBox: rawGeometry.viewBox,
    origin: "top_left",
    xAxis: "right",
    yAxis: "down",
  },
  sources: [
    {
      id: "official-tokyo-dome-2023",
      file: "dome_seating-map (1).pdf",
      role: "primary",
      title: "東京ドーム座席表（2023改定）",
      method: "vector paths, labels, and visual row-direction check",
    },
    {
      id: "mdata-8759",
      file: "8759.pdf",
      role: "cross_check",
      title: "東京ドーム座席表",
      method: "visual cross-check for row labels, arrows, gates, and cut-outs",
    },
  ] as const,
  sections: rawGeometry.sections
    .filter((section) => /^[A-F]/.test(section.code))
    .map((section): TokyoDomeSectionStructure => {
      const tier = tierOf(section.code);
      const rows = correctedRows(section.code, section.rows);
      const correctionPath = TOKYO_DOME_SHAPE_CORRECTIONS[section.code];
      const balconyPartition = TOKYO_DOME_C_BALCONY_PARTITIONS[section.code];
      const hasSourcePath = hasIndividualSourcePath(section.code, section.shared);
      const shapeStatus: VerificationStatus = balconyPartition
        ? "confirmed"
        : correctionPath
          ? (section.code === "F10" || section.code === "F11" ? "reconstructed" : "confirmed")
          : hasSourcePath ? "confirmed" : "unresolved";

      const notes: string[] = [];
      if (tier === "C" && !balconyPartition) {
        notes.push("公式PDFのパスは複数C区画で共有され、個別境界ではない。個別多角形は確認不能。");
      }
      if (balconyPartition) notes.push("公式の共有帯パスを、前後の実区切り線で分割し、ラベル座標を含む領域として一意に復元する。");
      if (section.code === "F10" || section.code === "F11") {
        notes.push("公式PDFの抽出結果が周囲の弧と結合していたため、隣接ベクターを根拠に個別枠を再構成。要目視再確認。");
      }
      if (!rows) notes.push("列範囲は2つの見本PDFから確定できない。");
      if (rows && (TOKYO_DOME_ROW_CORRECTIONS[section.code] || TOKYO_DOME_NARROW_ROW_CORRECTIONS[section.code])) {
        notes.push("回転・狭小箇所の表記をPDF目視で補正済み。");
      }

      const adjacency = neighborsFor(section.code);
      return {
        code: section.code,
        tier,
        label: { x: section.label[0], y: section.label[1] },
        rows: rows ? [rows[0], rows[1]] : null,
        rowStatus: rows ? "confirmed" : "unresolved",
        rowDirection: rows && tier !== "C" ? "inner_to_outer" : "not_established",
        svgPath: correctionPath ?? (hasSourcePath ? section.path : null),
        shapeStatus,
        shapeEvidence: correctionPath
          ? (section.code === "F10" || section.code === "F11"
            ? "reconstructed_from_adjacent_official_vectors"
            : "official_pdf_visual_transcription")
          : balconyPartition
            ? "official_pdf_band_path_and_divider_vectors"
          : hasSourcePath
            ? "official_pdf_vector"
            : "shared_pdf_path_not_an_individual_section",
        compositeGeometry: balconyPartition ?? null,
        adjacentSections: unique([
          ...adjacency.inner,
          ...adjacency.outer,
          ...adjacency.clockwise,
          ...adjacency.counterClockwise,
        ]),
        adjacencyStatus: "confirmed",
        notes,
      };
    }),
  /**
   * These are verified tier-level relationships. The section-level table below
   * separately distinguishes lateral next-block links from radial overlap.
   */
  topology: {
    tierRelationships: [
      { inner: "A", outer: "B", status: "confirmed", detail: "1F内野スタンド。Aの外側にBが連続し、行番号はAの最大26からBの最小27へ接続する。" },
      { inner: "B", outer: "C", status: "confirmed", detail: "内野側ではCバルコニー帯がBの外周側に配置される。" },
      { inner: "D", outer: "E", status: "confirmed", detail: "2Fスタンド。Dが内側、Eが外側の環状帯として配置される。" },
      { inner: "F", outer: "C", status: "confirmed", detail: "外野側ではFの後方・外周側にCバルコニー帯が配置される。" },
    ],
    knownCutOuts: [
      "C49: official diagrams skip this code; the gap is retained and no section is invented.",
      "F10/F11: centre-field boxes were merged with surrounding arc by vector extraction.",
      "D01/D02/D51 and E06–E08/E44–E46: narrow outlines required visual-path transcription.",
    ],
  },
} as const;

/**
 * Directly extracted from the official PDF character vectors. These are label
 * anchors, not an estimate of the physical door centre.
 */
export { TOKYO_DOME_GATE_ANCHORS };

/**
 * The C tier does not expose individual closed outlines in the primary PDF.
 * This records the exact shared source areas and their member codes without
 * falsely converting each member into an equal-sized polygon.
 */
export const TOKYO_DOME_C_BALCONY_SHARED_AREAS = TOKYO_DOME_C_BALCONY_RUNS.map((run) => ({
  id: run.id,
  codes: run.codes,
  sourcePath: TOKYO_DOME_C_BALCONY_PARTITIONS[run.codes[0]].bandPath,
  individualBoundaryStatus: "confirmed_by_band_partition" as const,
  notes: "公式PDFの共有帯パスと全実区切り線を組み合わせ、各C区画を一意に復元可能。",
}));

/**
 * Reproducible topology derived from the sourced outlines. `radialLinks` means
 * the two official section outlines occupy an overlapping angular interval;
 * it does not claim that the sections physically share a wall.
 */
export const TOKYO_DOME_SECTION_TOPOLOGY = topologyData;

/**
 * A complete, explicit topology ledger. Every section is present. Lateral
 * fields name the next official block in that direction (an aisle may be
 * present); inner/outer fields are radial correspondences, not shared walls.
 * An empty array is a confirmed absence within the defined adjacent tier.
 */
export const TOKYO_DOME_SECTION_ADJACENCY = TOKYO_DOME_SEAT_STRUCTURE.sections.map((section) => {
  const neighbors = neighborsFor(section.code);
  return {
    code: section.code,
    inner: unique(neighbors.inner),
    outer: unique(neighbors.outer),
    clockwise: unique(neighbors.clockwise),
    counterClockwise: unique(neighbors.counterClockwise),
    status: "confirmed" as const,
    lateralEvidence: section.tier === "C"
      ? "official_pdf_band_edges_and_divider_vectors" as const
      : "official_pdf_section_order_and_boundaries" as const,
    radialEvidence: "official_pdf_outline_angular_overlap" as const,
    reason: "左右は公式区画順と境界線、内外は公式輪郭の角度範囲の重なりで確認。内外は壁の共有ではなく、通路・階層を挟む対応区画を示す。",
  };
});

export const TOKYO_DOME_STRUCTURE_UNRESOLVED = [
  {
    subject: "A01, A49, F10",
    field: "row_range",
    reason: "No reliable inclusive row-range label was read from either supplied PDF.",
  },
] as const;
