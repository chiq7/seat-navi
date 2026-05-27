import type { BlockAnalysis } from "@/lib/seatPrediction";

export type Rect = {
  x: number;
  y: number;
  w: number;
  h: number;
  axis: "seat" | "row";
  source?: "gap" | "cut";
  cutSide?: CutSide;
  gapKind?: "hanamichi" | "yokoHanamichi" | "passage";
};

export type CutSide = "left" | "right" | "both" | "none";
export type CandidateHint = "hanamichi" | "centerStage";
export type LayoutHint = {
  cutSide?: CutSide;
  candidate?: CandidateHint;
  frameExpandX?: number;
};
export type SeatPredictionLayoutHints = Record<string, LayoutHint>;

export type PositionedBlock = {
  block: string;
  x: number;
  y: number;
  blockW: number;
  blockH: number;
  cells: { x: number; y: number }[];
  vLines: number[];
  hLines: number[];
  whiteRects: Rect[];
  topRightLabel: { label: string; color: string } | null;
};

export type MissingMarker = {
  block: string;
  prefix: string;
  num: number;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type ShapeCandidate = {
  kind: "hanamichi" | "centerStage";
  x: number;
  y: number;
  w: number;
  h: number;
  frameX?: number;
  frameY?: number;
  frameW?: number;
  frameH?: number;
  label: string;
};

export type Slot =
  | { kind: "block"; b: BlockAnalysis; cols: number }
  | { kind: "missing"; prefix: string; num: number; cols: number };
