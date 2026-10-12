import { analyzeReports, type TimedSeatEvidence } from "@/lib/arena-map/reportEvidence";
import { inferPatternLayouts, type PredictionContext, type PatternPrediction } from "@/lib/arena-map/patternInference";
import { inferPatternLayoutsV5, proposalAgreement } from "@/lib/arena-map/patternInferenceV5";
import type { SeatAddress } from "@/lib/arena-map/layoutModel";
import type { RankingOptions } from "@/lib/arena-map/candidateRanking";

export type SeatAgreement = { main: boolean; center: boolean; runway: boolean; position: boolean; all: boolean };
export type PatternWorkerRequest = { kind: "infer"; reports: TimedSeatEvidence[]; eventId: string; cutoff: string; context: PredictionContext; baseline: boolean; options: RankingOptions }
  | { kind: "agreement"; address: SeatAddress; requestId: string };
export type PatternWorkerResponse = { kind: "prediction"; result: PatternPrediction }
  | { kind: "agreement"; requestId: string; agreement: SeatAgreement }
  | { kind: "error"; error: string };
let current: { result: PatternPrediction; eventId: string } | undefined;
self.addEventListener("message", (event: MessageEvent<PatternWorkerRequest>) => {
  try {
    if (event.data.kind === "agreement") {
      if (!current) return;
      const agreement = proposalAgreement(current.result.top, current.eventId, [event.data.address])[0];
      if (current.result.budgetLimited) agreement.main = agreement.center = agreement.runway = agreement.position = agreement.all = false;
      self.postMessage({ kind: "agreement", requestId: event.data.requestId, agreement } satisfies PatternWorkerResponse);
      return;
    }
    const { reports, eventId, cutoff, context, baseline, options } = event.data;
    const analysis = analyzeReports(reports, eventId, cutoff);
    // The comparison is the actual ranked v3 algorithm, not an unranked placeholder.
    const result = baseline ? inferPatternLayouts(analysis, context, options) : inferPatternLayoutsV5(analysis, context, options);
    current = { result, eventId };
    self.postMessage({ kind: "prediction", result } satisfies PatternWorkerResponse);
  } catch (error) {
    self.postMessage({ kind: "error", error: error instanceof Error ? error.message : "計算を再試行してください" } satisfies PatternWorkerResponse);
  }
});
