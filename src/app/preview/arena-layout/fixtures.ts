import { containsPoint, layoutSeats, type ArenaLayout, type Landmark, type LayoutBlock, type LayoutObservation, type Point, type SeatSegment, type Shape } from "@/lib/arena-map/layoutModel";

const rectangle = (x: number, y: number, width: number, height: number): Shape => ({ kind: "polygon", points: [{ x, y }, { x: x + width, y }, { x: x + width, y: y + height }, { x, y: y + height }] });
export type Scenario = "circle" | "diagonal" | "split";
export const scenarios: { id: Scenario; label: string }[] = [
  { id: "circle", label: "円形センステ" }, { id: "diagonal", label: "斜めの花道" }, { id: "split", label: "列途中の通路" },
];

/** Entirely fictional engineering fixtures. No imported X images or actual concert claims. */
export function sampleLayout(scenario: Scenario, renumber: boolean): ArenaLayout {
  const landmarks: Landmark[] = [
    { id: "main", kind: "main", label: "メイン", shape: rectangle(65, 35, 350, 54), labelAt: { x: 240, y: 65 } },
  ];
  if (scenario === "circle") {
    landmarks.push(
      { id: "runway", kind: "runway", label: "花道", shape: rectangle(229, 89, 22, 120), labelAt: { x: 240, y: 149 } },
      { id: "center", kind: "center", label: "センステ", shape: { kind: "circle", center: { x: 240, y: 263 }, radius: 64 }, labelAt: { x: 240, y: 264 } },
    );
  } else if (scenario === "diagonal") {
    landmarks.push(
      { id: "runway", kind: "runway", label: "花道", shape: { kind: "polygon", points: [{ x: 240, y: 89 }, { x: 261, y: 89 }, { x: 173, y: 312 }, { x: 152, y: 302 }] }, labelAt: { x: 211, y: 190 } },
      { id: "center", kind: "center", label: "センステ", shape: rectangle(104, 285, 86, 43), labelAt: { x: 147, y: 308 } },
    );
  } else {
    landmarks.push(
      { id: "passage", kind: "passage", label: "通路", shape: rectangle(84, 132, 18, 256), labelAt: { x: 93, y: 281 } },
      { id: "runway", kind: "runway", label: "花道", shape: rectangle(62, 245, 356, 20), labelAt: { x: 350, y: 256 } },
      { id: "center", kind: "center", label: "センステ", shape: rectangle(212, 219, 56, 66), labelAt: { x: 240, y: 238 } },
    );
  }
  const blocks: LayoutBlock[] = [];
  for (let br = 0; br < 2; br++) for (let bc = 0; bc < 3; bc++) {
    const origin = { x: 40 + bc * 148, y: br === 0 ? 143 : 299 };
    const block: LayoutBlock = { id: `${br ? "B" : "A"}${bc + 1}`, origin, rotation: 0, labelAt: { x: origin.x + (br === 0 && bc === 1 ? 12 : 49), y: br ? 407 : origin.y - 16 }, outline: [{ x: 0, y: 0 }, { x: 98, y: 0 }, { x: 98, y: 90 }, { x: 0, y: 90 }], rows: [] };
    for (let r = 0; r < 10; r++) {
      const valid: { col: number; point: Point; seat: number }[] = [];
      for (let col = 0; col < 14; col++) {
        const point = { x: origin.x + col * 7 + 3.5, y: origin.y + r * 9 + 4.5 };
        // The sample's known geometry authors the template, not the sparse reports.
        if (landmarks.some(l => containsPoint(l.shape, point))) continue;
        valid.push({ col, point, seat: renumber ? valid.length + 1 : col + 1 });
      }
      const segments: (SeatSegment & { endCol: number })[] = [];
      for (const item of valid) {
        const prev = segments.at(-1);
        if (prev && item.col === prev.endCol + 1 && item.seat === prev.last + 1) { prev.last = item.seat; prev.endCol = item.col; }
        else segments.push({ first: item.seat, last: item.seat, origin: { x: item.point.x - origin.x, y: item.point.y - origin.y }, step: { x: 7, y: 0 }, endCol: item.col });
      }
      block.rows.push({ label: String(r + 1), segments: segments.map(({ first, last, origin: start, step }) => ({ first, last, origin: start, step })) });
    }
    blocks.push(block);
  }
  return { id: `sample-${scenario}-${renumber ? "reset" : "preserved"}`, version: "1", label: "架空公演", eventIds: ["layout-sample-day1", "layout-sample-day2"], status: "sample", bounds: { x: 0, y: 0, width: 480, height: 415 }, blocks, landmarks };
}

export function sampleObservations(layout: ArenaLayout): LayoutObservation[] {
  return layoutSeats(layout).filter((_, index) => index % 7 === 0).map(({ address }, index) => ({ ...address, id: `sample-${index}`, eventId: "layout-sample-day1", precision: "exact" }));
}

export function conflictingCandidate(layout: ArenaLayout): ArenaLayout {
  return { ...layout, id: `${layout.id}-wide`, landmarks: layout.landmarks.map(l => l.kind === "center" ? { ...l, shape: { kind: "circle", center: { x: l.labelAt.x, y: l.labelAt.y }, radius: 110 } as Shape } : l) };
}
