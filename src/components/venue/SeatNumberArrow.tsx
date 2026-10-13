import { seatNumberArrowPath } from "@/lib/seatNumberArrow";

export default function SeatNumberArrow({ from, to, unit = 1 }: {
  from: { x: number; y: number }; to: { x: number; y: number }; unit?: number;
}) {
  const d = seatNumberArrowPath(from, to, unit);
  return d ? <g pointerEvents="none" aria-hidden="true">
    <path d={d} fill="#762848" stroke="#fff" strokeWidth={3 * unit} strokeLinejoin="round" />
    <path data-number-arrow="" data-shaft-px="3" data-head-px="8" d={d} fill="#762848" />
  </g> : null;
}
