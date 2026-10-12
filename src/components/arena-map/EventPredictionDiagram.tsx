"use client";

import { useMemo, useState, type Ref } from "react";
import { Maximize2, MapPin } from "lucide-react";
import { focusBounds, localToWorld, shapeBounds, type SeatAddress } from "@/lib/arena-map/layoutModel";
import { generateCandidateSeats, seatKey } from "@/lib/arena-map/candidateSeatModel";
import { proposalLayout } from "@/lib/arena-map/eventPredictionLayout";
import { proposalSeatRelationV5 } from "@/lib/arena-map/patternInferenceV5";
import type { PatternProposal } from "@/lib/arena-map/patternInference";
import type { EventPredictionInput } from "@/lib/arena-map/eventPredictionInput";

export function EventPredictionDiagram({ input, proposal, address, onAddressChange, svgRef, compact = false }: {
  input: EventPredictionInput; proposal: PatternProposal; address?: SeatAddress;
  onAddressChange: (address?: SeatAddress) => void; svgRef?: Ref<SVGSVGElement>; compact?: boolean;
}) {
  // A new selection opens its surroundings; the overview choice belongs only to that seat.
  const [overviewSeat, setOverviewSeat] = useState<string | null>(null);
  const addresses = useMemo(() => [...new Map(input.analysis.accepted.map(item => [seatKey(item), item])).values()], [input]);
  const candidate = useMemo(() => generateCandidateSeats(proposalLayout(proposal, input.eventId), proposal.numbering,
    [...addresses, ...(address ? [address] : [])], true), [proposal, input.eventId, addresses, address]);
  const layout = candidate.layout;
  const relation = address ? proposalSeatRelationV5(candidate, address) : { mapped: false as const };
  const self = relation.mapped && !relation.collision ? relation.point : undefined;
  const targetLabel = relation.mapped ? layout.landmarks.find(landmark => landmark.id === relation.centerId)?.label ?? "センステ" : "センステ";
  const fullBounds = useMemo(() => {
    const points = layout.blocks.flatMap(block => block.outline.map(point => localToWorld(block, point)));
    for (const landmark of layout.landmarks) {
      const bounds = shapeBounds(landmark.shape);
      points.push({ x: bounds.x, y: bounds.y }, { x: bounds.x + bounds.width, y: bounds.y + bounds.height });
    }
    const left = Math.min(...points.map(point => point.x)) - 12, top = Math.min(...points.map(point => point.y));
    return { x: left, y: top, width: Math.max(...points.map(point => point.x)) + 12 - left,
      height: Math.max(...points.map(point => point.y)) - top };
  }, [layout]);
  const zoom = !compact && Boolean(self && address && overviewSeat !== seatKey(address));
  const view = zoom && self ? focusBounds(layout, self, relation.mapped ? relation.centerId ?? "main" : "main") : fullBounds;
  const viewBox = { ...view, y: view.y - 26, height: view.height + 52 };
  const markedBlocks = new Set(addresses.map(item => item.block));
  const shortDate = input.date ? `${Number(input.date.slice(5, 7))}/${Number(input.date.slice(8, 10))}` : "";
  return <div className="min-w-0 bg-white">
    {!compact && <div className="flex min-w-0 items-center gap-2 border-b border-[#ded8dc] px-3 py-2">
      <label className="flex min-w-0 flex-1 items-center gap-2">
        <MapPin size={18} aria-hidden className="shrink-0 text-[#bd2865]" />
        <select aria-label="報告された席を確認" className="zr-focus min-h-11 min-w-0 flex-1 rounded-md border border-[#ded8dc] bg-white px-2 text-[14px] font-bold"
          value={address ? seatKey(address) : ""} onChange={event => {
            setOverviewSeat(null);
            onAddressChange(addresses.find(item => seatKey(item) === event.target.value));
          }}>
          <option value="">報告された席を確認</option>
          {addresses.map(item => <option key={seatKey(item)} value={seatKey(item)}>{item.block} · {item.row}列 {item.seat}番</option>)}
        </select>
      </label>
      {self && <button type="button" aria-pressed={!zoom} onClick={() => setOverviewSeat(zoom && address ? seatKey(address) : null)}
        className="zr-focus flex min-h-11 shrink-0 items-center gap-1 rounded-md border border-[#ded8dc] px-2 text-[12px] font-bold">
        <Maximize2 size={15} aria-hidden />{zoom ? "全体" : "席の周辺"}
      </button>}
    </div>}
    <svg ref={svgRef} role="img" aria-label={`${shortDate} チケレポ予想${address ? ` ${address.block}の位置` : ""}`}
      data-prediction-candidate={proposal.id} data-layout-id={layout.id}
      viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`} width="100%"
      className={`block w-full ${compact ? "max-h-64" : "max-h-[620px]"}`} style={{ background: "white" }}>
      <title>{`${shortDate} チケレポ予想 — 座席報告と舞台の位置関係`}</title>
      <rect x={viewBox.x} y={viewBox.y} width={viewBox.width} height={viewBox.height} fill="white" />
      {layout.blocks.map(block => {
        const selected = block.id === address?.block, marked = markedBlocks.has(block.id);
        // Authored labelAt is already in world coordinates, unlike outline vertices.
        const at = block.labelAt;
        return <g key={block.id}>
          <polygon points={block.outline.map(point => { const p = localToWorld(block, point); return `${p.x},${p.y}`; }).join(" ")}
            fill={selected ? "#fce6f0" : marked ? "#f4eef2" : "#faf8fa"} stroke={selected ? "#bd2865" : "#ded8dc"} strokeWidth={selected ? 2 : .6} />
          <text x={at.x} y={at.y} textAnchor="middle" dominantBaseline="middle" fontSize={selected ? 18 : marked ? 14 : 10}
            stroke="white" strokeWidth={2} paintOrder="stroke"
            fill={selected || marked ? "#382c35" : "#817981"} fontWeight={selected || marked ? 800 : 500}>{block.id}</text>
        </g>;
      })}
      {layout.landmarks.map(landmark => <g key={landmark.id}>
        {landmark.shape.kind === "circle" ? <circle cx={landmark.shape.center.x} cy={landmark.shape.center.y} r={landmark.shape.radius}
          fill="#64536d" stroke="#45334f" strokeWidth={1} strokeDasharray="4 2" /> : <polygon
          points={landmark.shape.points.map(p => `${p.x},${p.y}`).join(" ")} fill="#64536d" stroke="#45334f" strokeWidth={1} strokeDasharray="4 2" />}
        {landmark.kind !== "runway" && <text x={landmark.labelAt.x} y={landmark.labelAt.y} textAnchor="middle" dominantBaseline="middle"
          fontSize={Math.min(landmark.kind === "main" ? 20 : 16, shapeBounds(landmark.shape).width / (landmark.label.length + .5))}
          fill="white" fontWeight={800}>{landmark.label}</text>}
      </g>)}
      {addresses.map(item => {
        const point = candidate.byLabel.get(seatKey(item))?.[0]?.point;
        return point ? <circle data-report-point="" key={seatKey(item)} cx={point.x} cy={point.y} r={5} fill="#45334f" stroke="white" strokeWidth={1.5} /> : null;
      })}
      {self && <g>
        <circle cx={self.x} cy={self.y} r={8} fill="white" stroke="#bd2865" strokeWidth={3} />
        <path d={`M ${self.x} ${self.y - 10} v -15`} stroke="#bd2865" strokeWidth={2} />
        <rect x={self.x - 36} y={self.y - 45} width={72} height={20} rx={10} fill="#bd2865" />
        <text x={self.x} y={self.y - 31} textAnchor="middle" fill="white" fontSize={12} fontWeight={800}>この席 · {address?.block}</text>
      </g>}
      {/* Paint the viewport heading last: off-screen blocks/runways must not cover it when focused. */}
      <rect x={viewBox.x} y={viewBox.y} width={viewBox.width} height={24} fill="white" />
      <text x={viewBox.x + 10} y={viewBox.y + 18} fontSize={12} fill="#7c4562" fontWeight={700}>{shortDate} · {zoom ? "予想" : "チケレポ予想"}</text>
      {zoom && layout.landmarks.some(landmark => landmark.kind === "main" && landmark.labelAt.y < view.y) &&
        <text x={viewBox.x + viewBox.width - 10} y={viewBox.y + 18} textAnchor="end" fontSize={12} fill="#45334f" fontWeight={800}>↑ メイン</text>}
      <text x={viewBox.x + viewBox.width - 10} y={viewBox.y + viewBox.height - 9} textAnchor="end" fill="#7c4562" fontSize={10}>ちけレポ · 予想</text>
    </svg>
    {!compact && address && <div className="flex min-w-0 items-start gap-2 border-t border-[#ded8dc] px-3 py-2">
      <MapPin size={18} aria-hidden className="shrink-0 text-[#bd2865]" />
      <p role="status" className="min-w-0 text-[14px] font-bold text-[#7c4562]">{self && relation.mapped
        ? `${relation.main === "センステ寄り" ? `${targetLabel}寄り` : relation.main}${relation.center !== "なし" ? ` · ${targetLabel}${relation.center}` : ""}${relation.runway === "花道の横" ? " · 花道の横" : ""}`
        : "この案では席を配置できません"}</p>
    </div>}
  </div>;
}
