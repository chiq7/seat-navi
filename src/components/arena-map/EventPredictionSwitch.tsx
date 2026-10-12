"use client";

import { useEffect, useMemo, useState, type ReactNode, type Ref } from "react";
import { Grid2X2, Sparkles, ArrowLeftRight } from "lucide-react";
import dynamic from "next/dynamic";
import type { SeatReport } from "@/lib/types";
import type { ExternalSeatObservation } from "@/lib/external-seats/types";
import type { SeatAddress } from "@/lib/arena-map/layoutModel";
import { isEventPredictionEnabled, prepareEventPrediction, type PredictionEvent } from "@/lib/arena-map/eventPredictionInput";
import { distinctProposals } from "@/lib/arena-map/proposalSelection";
import type { PatternProposal } from "@/lib/arena-map/patternInference";
import { useEventPrediction } from "./useEventPrediction";

const EventPredictionDiagram = dynamic(() => import("./EventPredictionDiagram").then(module => module.EventPredictionDiagram), { ssr: false });
const NO_EXTERNAL: ExternalSeatObservation[] = [];

const familyNames: Record<string, string> = { rear: "後方ステージ", square: "四角いセンステ", round: "丸いセンステ" };
function candidateName(proposal: PatternProposal) {
  return `${proposal.variant.mainOnly ? "メインのみ" : familyNames[proposal.family] ?? "別案"} · ${proposal.layoutDefinition?.rows}列×${proposal.layoutDefinition?.columns}席 · ${{ "block-continuous": "通し番号", "row-reset": "列ごとに詰める", preserved: "欠けは欠番" }[proposal.numbering.kind]}`;
}

export function EventPredictionSwitch({ eventId, reports, external = NO_EXTERNAL, events, children, address, onAddressChange,
  svgRef, compact = false, readState = "ready", limited = false, initialPrediction = false, initialCandidate = "", onViewChange }: {
  eventId: string; reports: SeatReport[]; external?: ExternalSeatObservation[]; events: PredictionEvent[]; children: ReactNode;
  address?: SeatAddress; onAddressChange: (address?: SeatAddress) => void; svgRef?: Ref<SVGSVGElement>; compact?: boolean;
  readState?: "ready" | "unavailable"; limited?: boolean; initialPrediction?: boolean; initialCandidate?: string;
  onViewChange?: (view: { prediction: boolean; candidate?: string; date?: string }) => void;
}) {
  const enabled = isEventPredictionEnabled(eventId);
  const [requested, setRequested] = useState(initialPrediction && enabled);
  const [chosenId, setChosenId] = useState(initialCandidate);
  const input = useMemo(() => prepareEventPrediction({ reports, external, events, selectedEventId: eventId, readState, limited }),
    [reports, external, events, eventId, readState, limited]);
  const snapshot = useEventPrediction(input, enabled && requested && input.state === "ready");
  const compatible = snapshot.result?.evaluated.filter(proposal => proposal.top && !proposal.conflicts) ?? [];
  const chosen = compatible.find(proposal => proposal.id === chosenId) ?? compatible[0];
  const showPrediction = enabled && requested && snapshot.status === "ready" && Boolean(chosen);
  // Synchronize the currently rendered SVG, not the requested mode while calculation is pending.
  useEffect(() => { onViewChange?.({ prediction: showPrediction, candidate: chosen?.id, date: input.date }); },
    [showPrediction, chosen?.id, input.date, onViewChange]);
  const choices = distinctProposals(compatible);
  if (chosen && !choices.some(proposal => proposal.id === chosen.id)) choices.unshift(chosen);
  const opposite = chosen && compatible.find(proposal => proposal.family === chosen.family
    && JSON.stringify(proposal.variant) === JSON.stringify(chosen.variant)
    && JSON.stringify(proposal.layoutDefinition) === JSON.stringify(chosen.layoutDefinition)
    && proposal.numbering.kind === chosen.numbering.kind && proposal.numbering.start === chosen.numbering.start
    && proposal.numbering.direction === -chosen.numbering.direction);
  if (!enabled) return <>{children}</>;
  const status = input.state === "unavailable" ? "読込みを確認中 · 座席報告を表示"
    : input.state === "limited" ? "読込みが未完了 · 座席報告を表示"
    : input.state === "empty" ? "予想に使える座席はまだありません"
    : input.state === "unsupported" ? "この座席は予想未対応 · 座席報告を表示"
    : snapshot.status === "failed" ? "予想を作れませんでした · 座席報告を表示"
    : snapshot.status === "ready" && !chosen ? "合う予想がありません · 座席報告を表示" : "予想を作成中…";
  return <div className="min-w-0" data-prediction-view={showPrediction ? "prediction" : "reports"}>
    <div className="flex items-center gap-1 border-b border-[#ded8dc] bg-white p-1" role="group" aria-label="座席図の表示">
      {[{ prediction: false, label: "座席報告", icon: Grid2X2 }, { prediction: true, label: "チケレポ予想", icon: Sparkles }].map(item => <button
        key={item.label} type="button" aria-pressed={requested === item.prediction} onClick={() => setRequested(item.prediction)}
        className={`zr-focus flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-md px-2 text-[12px] font-bold ${requested === item.prediction ? "bg-[#fce6f0] text-[#a72358]" : "text-[#71636c]"}`}>
        <item.icon size={15} aria-hidden />{item.label}
      </button>)}
    </div>
    {requested && <p role="status" className="px-3 py-2 text-[12px] font-bold text-[#7c4562]">{showPrediction
      ? `${Number(input.date.slice(5, 7))}/${Number(input.date.slice(8, 10))}の予想` : status}</p>}
    <div hidden={showPrediction}>{children}</div>
    {showPrediction && chosen && <>
      <EventPredictionDiagram input={input} proposal={chosen} address={address} onAddressChange={onAddressChange} svgRef={svgRef} compact={compact} />
      {!compact && (choices.length > 1 || opposite) && <details className="border-t border-[#ded8dc] px-3 py-1 text-[12px]">
        <summary className="zr-focus flex min-h-11 cursor-pointer items-center font-bold text-[#71636c]">別案・番号方向</summary>
        <div className="flex min-w-0 flex-wrap gap-2 pb-2">
          <select aria-label="予想の別案" value={chosen.id} onChange={event => setChosenId(event.target.value)}
            className="zr-focus min-h-11 min-w-0 flex-1 rounded-md border border-[#ded8dc] bg-white px-2">
            {choices.map(proposal => <option key={proposal.id} value={proposal.id}>{candidateName(proposal)}{proposal.numbering.direction === -1 ? " · 逆番号" : ""}</option>)}
          </select>
          {opposite && <button type="button" onClick={() => setChosenId(opposite.id)} className="zr-focus flex min-h-11 items-center gap-1 rounded-md border border-[#ded8dc] px-3 font-bold">
            <ArrowLeftRight size={15} aria-hidden />番号を反転
          </button>}
        </div>
      </details>}
    </>}
  </div>;
}

