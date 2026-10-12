import type { GuideDiagram, GuideFacility } from "@/data/venueGuides/types";
export type Purpose = GuideFacility["purpose"];
export const purposes: Purpose[] = ["トイレ", "荷物", "飲食", "赤ちゃん", "案内", "AED"];
export type FacilityGroup = { id: string; diagramId: string; purpose: Purpose; label: string; area: string; memberIds: string[]; x: number; y: number; boundary: string; visualReview: "source-checked" | "browser-checked";
  // An independently drawn display may retain the original diagram's coordinate space.
  // Declare the identical source explicitly; never rewrite the original facility anchor.
  sourceCoordinateSpace?: { diagramId: string; sourceId: string; sha256: string; transform: "identity" };
};

export function isFacilityGroupAnchorCompatible(facility: GuideFacility, group: FacilityGroup, diagrams: GuideDiagram[]) {
  const anchor = facility.anchor;
  if (!anchor || !group.memberIds.includes(facility.id) || facility.purpose !== group.purpose) return false;
  if (anchor.diagramId === group.diagramId) return true;
  const space = group.sourceCoordinateSpace;
  if (!space || space.transform !== "identity" || space.diagramId !== anchor.diagramId || !/^[a-f0-9]{64}$/.test(space.sha256)) return false;
  const original = diagrams.find(d => d.id === space.diagramId), display = diagrams.find(d => d.id === group.diagramId);
  if (!original || !display) return false;
  // This contract is deliberately limited to an original point represented by one display group.
  // Group centroids or coordinates from another floor/source need their own reviewed contract.
  return group.memberIds.length === 1 && group.x === anchor.x && group.y === anchor.y &&
    original.floor === facility.floor && display.floor === facility.floor && original.scope === facility.scope && display.scope === facility.scope &&
    anchor.sourceIds.includes(space.sourceId) && facility.sourceIds.includes(space.sourceId) &&
    [original, display].every(d => d.evidence.sourceIds.includes(space.sourceId) && d.evidence.sha256 === space.sha256) &&
    original.evidence.width === display.evidence.width && original.evidence.height === display.evidence.height &&
    (original.evidence.canvasWidth ?? original.evidence.width) === (display.evidence.canvasWidth ?? display.evidence.width) &&
    (original.evidence.imageOffsetX ?? 0) === (display.evidence.imageOffsetX ?? 0);
}
export type FacilityMeta = { location: string; detail: string; area: string; accessCondition: string; scopes?: ("場内" | "場外")[]; outsideViewIds?: string[]; url?: string; name?: string };
export type FacilityOutsideView = { id: string; label: string; diagramId: string; landmarkIds?: string[]; venueLabel?: { name: string; point: number[] }; floorLabel?: string; northUp?: boolean; northDirection?: "↑" | "←" | "→" | "↓" };
export type FacilityConfig = {
  defaultFloor: string; floors: string[]; groups: FacilityGroup[]; meta: Record<string, FacilityMeta>;
  primaryLandmarks: Record<string, string[]>; aliases: Record<string, string[]>;
  outsideDiagramId: string; coverage: { description: string; sourceIds: string[] };
  venueLabel?: { name: string; point: number[] };
  landmarkPlaceholder?: { inside: string; outside: string };
  landmarkLabels?: Record<string, string>;
  landmarkLabelPoints?: Record<string, number[]>;
  landmarkGroupIds?: Record<string, string[]>;
  landmarkFacilityIds?: Record<string, string[]>;
  outsideViews?: FacilityOutsideView[];
};
export type FacilityState = { scope: "場内" | "場外"; floor: string; purpose: Purpose; query: string; toilet: string; group: string | null; selected: string | null; origin: string | null };
export const normalized = (text: string) => text.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
export function inScope(f: GuideFacility, state: Pick<FacilityState, "scope" | "floor">, config: FacilityConfig) {
  return (config.meta[f.id]?.scopes ?? [f.scope]).includes(state.scope) && (state.scope === "場外" || f.floor === state.floor);
}
export function availablePurposes(facilities: GuideFacility[], state: Pick<FacilityState, "scope" | "floor">, config: FacilityConfig) {
  return purposes.filter(p => facilities.some(f => f.purpose === p && inScope(f, state, config)));
}
export function hasUsableLuggage(facilities: GuideFacility[], state: Pick<FacilityState, "scope" | "floor">, config: FacilityConfig) {
  return facilities.some(f => f.purpose === "荷物" && f.kind !== "no-storage" && inScope(f, state, config));
}
export function initialFacilityState(facilities: GuideFacility[], config: FacilityConfig): FacilityState {
  const state: FacilityState = { scope: "場内", floor: config.defaultFloor, purpose: "トイレ", query: "", toilet: "", group: null, selected: null, origin: null };
  state.purpose = availablePurposes(facilities, state, config)[0] ?? "トイレ"; return state;
}
export function changeFacilityPlace(state: FacilityState, patch: Partial<Pick<FacilityState, "scope" | "floor">>, facilities: GuideFacility[], config: FacilityConfig): FacilityState {
  const next = { ...state, ...patch, query: "", toilet: "", group: null, selected: null, origin: null };
  const available = availablePurposes(facilities, next, config);
  if (!available.includes(next.purpose)) next.purpose = next.scope === "場外" && available.includes("案内") ? "案内" : available[0] ?? "トイレ";
  return next;
}
export function linkFacilitySeatFloor(state: FacilityState, floor: string | null, config: FacilityConfig): FacilityState {
  if (!floor || !config.floors.includes(floor)) return state;
  return { ...state, scope: "場内", floor, query: "", toilet: "", group: null, selected: null, origin: null };
}
export function changeFacilityOutsideView(state: FacilityState): FacilityState {
  return { ...state, query: "", toilet: "", origin: null, group: null, selected: null };
}
export function facilitiesForOutsideView(facilities: GuideFacility[], view: FacilityOutsideView | undefined, config: FacilityConfig) {
  if (!view) return facilities;
  return facilities.filter(f => f.anchor?.diagramId === view.diagramId || config.meta[f.id]?.outsideViewIds?.includes(view.id));
}
export function facilitiesAroundLandmark(facilities: GuideFacility[], originId: string | null, config: FacilityConfig) {
  const ids = originId ? config.landmarkFacilityIds?.[originId] : undefined;
  return ids !== undefined ? facilities.filter(f => ids.includes(f.id)) : facilities;
}
export function filterFacilities(facilities: GuideFacility[], state: FacilityState, config: FacilityConfig) {
  const words = normalized(state.query).split(" ").filter(Boolean);
  return facilities.filter(f => inScope(f, state, config) && f.purpose === state.purpose && (!state.toilet || f.toiletType === state.toilet || f.toiletType === "mixed" && ["women", "men"].includes(state.toilet)) &&
    words.every(q => normalized([f.name, f.floor, config.meta[f.id]?.name, config.meta[f.id]?.area, config.meta[f.id]?.location, config.meta[f.id]?.detail, f.storageKind === "coin" ? "ロッカー" : "", f.purpose === "飲食" ? "飲み物 ドリンク drink" : ""].join(" ")).includes(q)));
}
export function resolveLandmarks(diagram: GuideDiagram, input: string, aliases: Record<string, string[]>) {
  const value = normalized(input).replace(/^(gate|ゲート)\s*/i, "");
  if (!value) return [];
  return diagram.landmarks.filter(m => [m.label, m.name ?? "", ...(aliases[m.id] ?? [])].some(a => normalized(a).replace(/^(gate|ゲート)\s*/i, "") === value));
}
export function visibleGroups(facilities: GuideFacility[], groups: FacilityGroup[], diagramId: string) {
  const ids = new Set(facilities.map(f => f.id));
  return groups.filter(g => g.diagramId === diagramId).map(g => ({ ...g, memberIds: g.memberIds.filter(id => ids.has(id)) })).filter(g => g.memberIds.length);
}
export function selectedFacilityGroup(id: string | null, visible: FacilityGroup[], groups: FacilityGroup[], diagramId: string) {
  if (!id) return undefined;
  const shown = visible.find(g => g.id === id);
  if (shown) return shown;
  const group = groups.find(g => g.id === id && g.diagramId === diagramId);
  return group ? { ...group, memberIds: [] } : undefined;
}
export function groupsAroundLandmark(groups: FacilityGroup[], diagram: GuideDiagram, origin: GuideDiagram["landmarks"][number] | undefined, config: FacilityConfig) {
  if (!origin) return groups;
  const ids = config.landmarkGroupIds?.[origin.id];
  return ids !== undefined ? groups.filter(g => ids.includes(g.id)) : groups.filter(g => Math.hypot(g.x - origin.x, g.y - origin.y) < diagram.viewBox[2] * .27);
}
