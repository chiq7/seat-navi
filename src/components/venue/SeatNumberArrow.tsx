import { seatNumberArrowPath } from "@/lib/seatNumberArrow";

export default function SeatNumberArrow({ from, to, unit = 1 }: {
  from: { x: number; y: number }; to: { x: number; y: number }; unit?: number;
}) {
  const d = seatNumberArrowPath(from, to, unit);
  return d ? <g pointerEvents="none" aria-hidden="true">
    <path d={d} fill="#fff" stroke="#762848" strokeWidth={1 * unit} strokeLinejoin="round" />
    <path data-number-arrow="" data-shaft-px="3" data-head-px="8" d={d} fill="#fff" />
  </g> : null;
}
