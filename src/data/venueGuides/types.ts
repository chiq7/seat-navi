export type GuideSource = {
  id: string;
  title: string;
  url: string;
  checkedAt: string;
  scope: string;
  usage?: "facts-only" | "research-only" | "permission-unconfirmed";
};

export type SeatRow = {
  label: string;
  ranges?: { start: number; end: number; passage: string }[];
};

export type SeatArea = {
  id: string;
  label: string;
  type: string;
  floor: string;
  x: number;
  y: number;
  rows: SeatRow[];
  sourceIds: string[];
};

export type GuideFacility = {
  id: string;
  name: string;
  purpose: "トイレ" | "荷物" | "赤ちゃん" | "案内" | "AED" | "飲食";
  floor: string;
  scope: "場内" | "場外";
  location: string;
  detail: string;
  sourceIds: string[];
  // 記述根拠だけの場所に架空のピンを追加しない。
  precision: "text-only" | "diagram-point" | "landmark-area" | "unplaced";
  kind?: string;
  storageKind?: "coin" | "staffed";
  bookingUrl?: string;
  accessCondition?: "before-admission" | "ticket-required" | "unconfirmed";
  toiletType?: "women" | "men" | "mixed" | "accessible" | null;
  anchor?: GuideAnchor;
};

export type GuideAnchor = {
  diagramId: string;
  x: number;
  y: number;
  sourceIds: string[];
  reference: string;
};

export type GuideDiagram = {
  id: string;
  floor: string;
  scope: "場内" | "場外";
  viewBox: number[];
  concoursePaths: string[];
  contextPaths: string[];
  landmarks: { id: string; label: string; name?: string; x: number; y: number;
    kind: "passage" | "gate" | "pillar" | "stairs" | "shop" | "plaza" | "station" | "exit" | "entrance";
    sourceIds: string[]; reference: string }[];
  evidence: {
    sourceIds: string[];
    file: string;
    sha256: string;
    width: number;
    height: number;
    canvasWidth?: number;
    imageOffsetX?: number;
    method: string;
    status: string;
  };
};

export type SeatGeometry = {
  x: number;
  y: number;
  path?: string;
  precision: "diagram-point" | "landmark-area";
  sourceIds: string[];
  reference: string;
  blocks?: { code: string; x: number; y: number }[];
  rowPaths?: Record<string, string[]>;
};

export type GuideSeatMap = {
  viewBox: number[];
  groups: Record<string, SeatGeometry>;
  rowGeometryStatus: "unverified" | "partial" | "verified";
  shapeStatus: string;
  initialView: number[];
};

export type OutsideRoute = {
  id: string;
  from: string;
  exit: string;
  stops: string[];
  destination: string;
  note: string;
  sourceIds: string[];
};

export type DedicatedVenueGuide = {
  venueId: string;
  name: string;
  seatNote: string;
  diagramNote: string;
  seatTypes: string[];
  seats: SeatArea[];
  sources: GuideSource[];
  facilities: GuideFacility[];
  routes: OutsideRoute[];
  unverified: string[];
  seatMap?: GuideSeatMap;
  diagrams?: GuideDiagram[];
  rights?: {
    url: string;
    checkedAt: string;
    status: "publish-use-unconfirmed";
    note: string;
  };
};
