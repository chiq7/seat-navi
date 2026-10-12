export type MapView = { zoom: number; x: number; y: number };
export type MapPointer = { x: number; y: number };
export type MapGesture = { center: MapPointer; distance: number; view: MapView };
function metrics(points: readonly MapPointer[]) {
  const pair = points.slice(0, 2);
  return { center: { x: pair.reduce((n,p)=>n+p.x,0)/pair.length, y: pair.reduce((n,p)=>n+p.y,0)/pair.length },
    distance: pair.length===2 ? Math.hypot(pair[0].x-pair[1].x,pair[0].y-pair[1].y) : 0 };
}
export function beginMapGesture(points: readonly MapPointer[], view: MapView): MapGesture | null {
  return points.length ? { ...metrics(points), view: {...view} } : null;
}
// Pointer coordinates are local to the map centre, matching CSS transform-origin:center.
export function moveMapGesture(gesture: MapGesture, points: readonly MapPointer[]): MapView {
  if (!points.length) return gesture.view;
  const next=metrics(points),v=gesture.view;
  const zoom=Math.max(1,Math.min(5,gesture.distance && next.distance ? v.zoom*next.distance/gesture.distance : v.zoom));
  const ratio=zoom/v.zoom;
  return {zoom,x:next.center.x-(gesture.center.x-v.x)*ratio,y:next.center.y-(gesture.center.y-v.y)*ratio};
}
