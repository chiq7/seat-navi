import type { GuideDiagram, GuideFacility } from "../../../data/venueGuides/types";
import { finderReducer, initialFinderState, type FinderAction, type FinderState, type ResolvedGuideOrigin } from "./guideState";
import type { Box } from "./mapGeometry";
import fourthFloor from "../../../data/venueGuides/kyocera-dome/fourth-floor.json";

export const initialKyoceraFinderState: FinderState = {
  ...initialFinderState, floor: "3F", insideFloor: "3F", purpose: "トイレ",
};

export function kyoceraAvailablePurposes(items: GuideFacility[], state: FinderState) {
  const present = new Set(kyoceraFacilitiesForScope(items, state.scope).filter(item => item.scope === state.scope && (state.scope === "場外" || item.floor === state.floor)).map(item => item.purpose));
  return ["トイレ", "荷物", "飲食", "赤ちゃん", "案内", "AED"].filter(purpose => present.has(purpose as GuideFacility["purpose"]));
}

export function kyoceraFacilitiesForScope(items: GuideFacility[], scope: FinderState["scope"]): GuideFacility[] {
  // The same physical facility retains one ID. Before-admission discovery is a
  // list projection; an indoor diagram point is never copied onto the site map.
  return scope === "場外" ? items.map(item => item.scope === "場内" && item.accessCondition === "before-admission"
    ? { ...item, scope: "場外", anchor: undefined, precision: "text-only" } : item) : items;
}

export function kyoceraFinderReducer(state: FinderState, action: FinderAction, facilities?: GuideFacility[]): FinderState {
  // An unknown seat floor or a cleared seat cannot change the equipment context.
  if (action.type === "clear-seat" || (action.type === "seat" && !action.floor)) {
    return state.seatLinked ? { ...state, seatLinked: false } : state;
  }
  const next = { ...finderReducer(state, action) };
  // Choosing/closing a facility keeps the area's list until another area is chosen.
  if (state.groupIds && action.type === "select" && (action.id === null || state.groupIds.includes(action.id))) next.groupIds = state.groupIds;
  if (["purpose", "floor", "scope", "seat", "reset"].includes(action.type)) next.query = "";
  if (action.type === "origin") { next.groupIds = null; next.selectedId = null; }
  // Seat linking chooses the floor; it does not replace the visitor's purpose.
  if (next.purpose === "すべて") next.purpose = action.type === "reset" ? "トイレ" : state.purpose === "すべて" ? "トイレ" : state.purpose;
  if (next.scope === "場内" && next.floor === "すべて") next.floor = "3F";
  if (next.insideFloor === "すべて") next.insideFloor = "3F";
  if (["floor", "scope", "seat", "reset"].includes(action.type)) {
    next.origin = null; next.outsideGate = null;
    next.toiletType = "すべて";
  }
  if (facilities) {
    const available = kyoceraAvailablePurposes(facilities, next);
    if (action.type !== "seat" && !available.includes(next.purpose) && available.length > 0) {
      next.purpose = available[0]; next.toiletType = "すべて";
      next.selectedId = null; next.groupIds = null; next.query="";
    }
  }
  return next;
}

export function findKyoceraLandmark(diagram: GuideDiagram, kind: "passage" | "gate", input: string) {
  const number = input.normalize("NFKC").trim().replace(/(?:通路|ゲート)$/, "").trim();
  if (!/^\d+$/.test(number) || Number(number) < 1) return undefined;
  return diagram.landmarks.find(mark => mark.kind === kind && Number(mark.label.match(/\d+/)?.[0]) === Number(number));
}

export function kyoceraFacilityCamera(diagram: GuideDiagram, origin: ResolvedGuideOrigin | null): Box {
  const whole = diagram.viewBox;
  if (!origin || origin.diagramId !== diagram.id) return [...whole] as Box;
  if (diagram.id === fourthFloor.diagram.id && origin.kind === "facility") {
    // This small floor inset has one destination and its elevator arrival point.
    // Keep both reviewed points in the camera independently of the active filter.
    const points = fourthFloor.facilities.map(item => item.anchor);
    const minX = Math.min(...points.map(point => point.x)), maxX = Math.max(...points.map(point => point.x));
    const minY = Math.min(...points.map(point => point.y)), maxY = Math.max(...points.map(point => point.y));
    const width = Math.min(whole[2], Math.max(320, maxX - minX + 128));
    const height = Math.min(whole[3], Math.max(320, maxY - minY + 128));
    return [Math.max(whole[0], Math.min((minX + maxX - width) / 2, whole[0] + whole[2] - width)),
      Math.max(whole[1], Math.min((minY + maxY - height) / 2, whole[1] + whole[3] - height)), width, height];
  }
  const width = Math.min(whole[2], 320), height = Math.min(whole[3], 320);
  return [Math.max(whole[0], Math.min(origin.x - width / 2, whole[0] + whole[2] - width)),
    Math.max(whole[1], Math.min(origin.y - height / 2, whole[1] + whole[3] - height)), width, height];
}

export function pointInKyoceraCamera(point: { x: number; y: number }, box: number[]) {
  return point.x >= box[0] && point.x <= box[0] + box[2] && point.y >= box[1] && point.y <= box[1] + box[3];
}

export function kyoceraFacilityLocation(item: GuideFacility, diagrams: GuideDiagram[]) {
  if (!/公式(?:フロア)?図.*(?:記号|売店)/.test(item.location) || !item.anchor) return item.location.replace(/（公式エリア図）/g, "");
  const diagram = diagrams.find(value => value.id === item.anchor!.diagramId);
  const nearest = diagram?.landmarks.filter(mark => mark.kind === "passage")
    .sort((a, b) => Math.hypot(a.x - item.anchor!.x, a.y - item.anchor!.y) - Math.hypot(b.x - item.anchor!.x, b.y - item.anchor!.y))[0];
  return nearest ? `${nearest.label.replace(/^[GS]/, "")}通路付近` : item.location;
}
