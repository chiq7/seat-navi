type Point = { x: number; y: number };
export const SEAT_DRAG_THRESHOLD = 6;
export const seatTapAllowed = (maximumTravel: number, multiplePointers: boolean, cancelled = false) =>
  !cancelled && !multiplePointers && maximumTravel <= SEAT_DRAG_THRESHOLD;

/** Roving focus considers only visible neighbours in the requested direction. */
export function spatialSeatTarget<T extends Point & { id: string }>(items: readonly T[], currentId: string, key: string) {
  const direction: Record<string, Point> = { ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 }, ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 } };
  const axis = direction[key], current = items.find(item => item.id === currentId);
  if (!axis || !current) return undefined;
  return items.filter(item => item.id !== current.id).map(item => {
    const dx = item.x - current.x, dy = item.y - current.y;
    return { item, along: dx * axis.x + dy * axis.y, across: Math.abs(dx * axis.y - dy * axis.x) };
  }).filter(item => item.along > .01)
    .sort((a, b) => (a.along + a.across * 2) - (b.along + b.across * 2))[0]?.item;
}
