import type { DedicatedVenueGuide, GuideDiagram, GuideFacility } from "../../../data/venueGuides/types";

export type GuideOrigin = { diagramId: string; facilityId: string; landmarkId?: never }
  | { diagramId: string; landmarkId: string; facilityId?: never };
export type GuideGate = { diagramId: string; landmarkId: string };
export type ResolvedGuideOrigin = { id: string; kind: "facility" | "landmark";
  diagramId: string; floor: string; scope: "場内" | "場外"; name: string; x: number; y: number;
  sourceIds: string[]; reference: string };

export function landmarkDisplayName(diagram: GuideDiagram, landmark: GuideDiagram["landmarks"][number]) {
  const name = landmark.name ?? landmark.label;
  if (diagram.landmarks.filter(item => (item.name ?? item.label) === name).length === 1) return name;
  // Disambiguate repeated symbols using a measured, printed landmark in this
  // same diagram. "Nearby" describes the drawing, not a shortest walking route.
  const nearest = (point: typeof landmark) => diagram.landmarks.filter(item => ["pillar", "gate", "passage"].includes(item.kind))
    .sort((a, b) => Math.hypot(a.x-point.x,a.y-point.y) - Math.hypot(b.x-point.x,b.y-point.y))[0];
  const nearby = nearest(landmark);
  if (!nearby) return name;
  const peers = diagram.landmarks.filter(item => (item.name ?? item.label) === name && nearest(item)?.id === nearby.id);
  if (peers.length === 1) return `${name}（${nearby.name ?? nearby.label}付近）`;
  // Two symbols can share the same nearest printed pillar. Describe their
  // relative position on this drawing, without inventing an on-site stair ID.
  const horizontal = Math.max(...peers.map(item=>item.x))-Math.min(...peers.map(item=>item.x))
    >= Math.max(...peers.map(item=>item.y))-Math.min(...peers.map(item=>item.y));
  const ordered = [...peers].sort((a,b)=>horizontal ? a.x-b.x || a.y-b.y : a.y-b.y || a.x-b.x);
  const position = ordered.findIndex(item=>item.id === landmark.id);
  const relative = peers.length === 2 ? (horizontal ? position === 0 ? "左側" : "右側" : position === 0 ? "上側" : "下側")
    : `${horizontal ? "左" : "上"}から${position+1}つ目`;
  return `${name}（${nearby.name ?? nearby.label}付近・図上で${relative}）`;
}

export function resolveGuideOrigin(guide: DedicatedVenueGuide, origin: GuideOrigin | null): ResolvedGuideOrigin | null {
  if (!origin) return null;
  const diagram = guide.diagrams?.find(item => item.id === origin.diagramId);
  if (!diagram) return null;
  if (origin.landmarkId) {
    const landmark = diagram.landmarks.find(item => item.id === origin.landmarkId);
    return landmark ? { id:landmark.id, kind:"landmark", diagramId:diagram.id, floor:diagram.floor,
      scope:diagram.scope, name:landmarkDisplayName(diagram,landmark), x:landmark.x, y:landmark.y,
      sourceIds:landmark.sourceIds, reference:landmark.reference } : null;
  }
  const facility = guide.facilities.find(item => item.id === origin.facilityId && item.anchor?.diagramId === diagram.id);
  return facility?.anchor ? { id:facility.id, kind:"facility", diagramId:diagram.id, floor:diagram.floor,
    scope:diagram.scope, name:facility.name, x:facility.anchor.x, y:facility.anchor.y,
    sourceIds:facility.anchor.sourceIds, reference:facility.anchor.reference } : null;
}

export function resolveGuideGate(guide: DedicatedVenueGuide, gate: GuideGate | null): GuideFacility | null {
  if (!gate) return null;
  const diagram = guide.diagrams?.find(item => item.id === gate.diagramId && item.scope === "場外");
  const landmark = diagram?.landmarks.find(item => item.id === gate.landmarkId && item.kind === "gate");
  // Use the explicit shared ID and verified anchor; never infer a gate pairing
  // from a nearby point, a printed number, or a different floor's coordinates.
  return landmark ? guide.facilities.find(item => item.id === landmark.id && item.scope === "場外"
    && item.anchor?.diagramId === diagram!.id && item.anchor.x === landmark.x && item.anchor.y === landmark.y) ?? null : null;
}
export type FinderState = {
  scope: "場内" | "場外";
  floor: string;
  insideFloor: string;
  purpose: string;
  toiletType: string;
  query: string;
  selectedId: string | null;
  groupIds: string[] | null;
  origin: GuideOrigin | null;
  outsideGate: GuideGate | null;
  seatLinked: boolean;
};
export const initialFinderState: FinderState = {
  scope: "場内", floor: "すべて", insideFloor: "すべて", purpose: "すべて", toiletType: "すべて",
  query: "", selectedId: null, groupIds: null, origin: null, outsideGate: null, seatLinked: false,
};
export type FinderAction =
  | { type: "scope"; scope: FinderState["scope"] }
  | { type: "floor"; floor: string }
  | { type: "seat"; floor: string | null }
  | { type: "clear-seat" }
  | { type: "purpose"; purpose: string }
  | { type: "toilet"; toiletType: string }
  | { type: "query"; query: string }
  | { type: "select"; id: string | null }
  | { type: "toggle-facility"; id: string }
  | { type: "group"; ids: string[] }
  | { type: "origin"; origin: GuideOrigin | null }
  | { type: "gate"; gate: GuideGate | null }
  | { type: "reset" };

export function finderReducer(state: FinderState, action: FinderAction): FinderState {
  switch (action.type) {
    case "scope": return { ...state, scope: action.scope, insideFloor: state.scope === "場内" ? state.floor : state.insideFloor,
      floor: action.scope === "場外" ? "すべて" : state.insideFloor, selectedId: null, groupIds: null };
    case "floor": return { ...state, floor: action.floor, insideFloor: action.floor, selectedId: null, groupIds: null };
    case "seat": return { ...state, scope: "場内", floor: action.floor ?? "すべて", insideFloor: action.floor ?? "すべて",
      purpose: "すべて", toiletType: "すべて", query: "", selectedId: null, groupIds: null, seatLinked: true };
    case "clear-seat": return state.seatLinked ? { ...state, floor: "すべて", insideFloor: "すべて", selectedId: null, groupIds: null, seatLinked: false } : state;
    case "purpose": return { ...state, purpose: action.purpose, toiletType: "すべて", selectedId: null, groupIds: null };
    case "toilet": return { ...state, toiletType: action.toiletType, selectedId: null, groupIds: null };
    case "query": return { ...state, query: action.query, selectedId: null, groupIds: null };
    case "select": return { ...state, selectedId: action.id, groupIds: null };
    // Only equipment signs toggle. Cards locate explicitly; gates/origins stay selected.
    case "toggle-facility": return { ...state, selectedId: state.selectedId === action.id ? null : action.id, groupIds: null };
    case "group": return { ...state, selectedId: null, groupIds: state.groupIds
      && new Set(state.groupIds).size === new Set(action.ids).size
      && action.ids.every(id => state.groupIds!.includes(id)) ? null : action.ids };
    case "origin": return { ...state, origin: action.origin };
    case "gate": return { ...state, outsideGate: action.gate, groupIds: null,
      selectedId: action.gate?.landmarkId ?? (state.selectedId === state.outsideGate?.landmarkId ? null : state.selectedId) };
    case "reset": return { ...state, purpose: "すべて", toiletType: "すべて", query: "", selectedId: null, groupIds: null };
  }
}

export function normalizeGuideQuery(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase("ja").trim();
}

export function matchesGuideQuery(item: GuideFacility, query: string): boolean {
  const text = normalizeGuideQuery(`${item.name} ${item.location} ${item.detail}`);
  const terms = normalizeGuideQuery(query).split(/\s+/).filter(Boolean);
  return terms.every(term => {
    const number = term.replace(/^柱\s*(\d+)$/, "$1柱").match(/^(\d+)\s*(通路|柱|ゲート|番出口)$/);
    if (number) {
      const target = Number(number[1]);
      const unit = number[2];
      const expression = new RegExp(`(\\d+(?:[・、]\\d+)*)\\s*${unit}|${unit}\\s*(\\d+)`, "g");
      return [...text.matchAll(expression)].some(match => (match[1] ?? match[2]).split(/[・、]/).some(value => Number(value) === target));
    }
    const alternatives: Record<string, string[]> = {
      ロッカー: ["ロッカー"], おむつ: ["おむつ", "赤ちゃん", "ベビー"], 授乳: ["授乳", "赤ちゃん", "ベビー"],
      トイレ: ["トイレ"], 飲み物: ["自動販売機", "飲み物", "ドリンク"],
    };
    return (alternatives[term] ?? [term]).some(word => text.includes(word));
  });
}

export function filterGuideFacilities(items: GuideFacility[], state: FinderState, ignoreFloor = false) {
  return items.filter(item => item.scope === state.scope
    && (ignoreFloor || state.floor === "すべて" || item.floor === state.floor)
    && (state.purpose === "すべて" || item.purpose === state.purpose)
    && (state.toiletType === "すべて" || item.toiletType === state.toiletType || (item.toiletType === "mixed" && ["women", "men"].includes(state.toiletType)))
    && matchesGuideQuery(item, state.query));
}
