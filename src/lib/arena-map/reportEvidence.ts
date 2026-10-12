import { checkCandidate, normalizeLabel, type ArenaLayout, type LayoutObservation } from "./layoutModel";

/** Raw labels must come from the original report, never parseInt or expanded resale cells. */
export type TimedSeatEvidence = LayoutObservation & {
  availableAt: string | null;
  source: "fan-report" | "seat-record" | "external";
  sourceRef: string;
};
export type Interval = { first: number; last: number };
export type RowEvidence = {
  block: string; row: string;
  observedNumbers: number[];
  observedRuns: Interval[];
  unreportedBetween: Interval[];
  observedMin: number; observedMax: number;
  uniquePositions: number;
  sources: TimedSeatEvidence["source"][];
};
export type EvidenceAnalysis = {
  eventId: string; cutoff: string;
  accepted: TimedSeatEvidence[];
  rows: RowEvidence[];
  held: { evidence: TimedSeatEvidence; reason: "other-event" | "unknown-time" | "after-cutoff" | "range" | "invalid-label" | "missing-source" | "conflicting-id" }[];
  repeatedPositions: number;
};

// Require an explicit timezone; local-machine timezone must not change a backtest.
function timestamp(value: string | null): number | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return undefined;
  const datePart = value.slice(0, 10);
  const calendarDate = Date.parse(`${datePart}T12:00:00Z`);
  if (!Number.isFinite(calendarDate) || new Date(calendarDate).toISOString().slice(0, 10) !== datePart) return undefined;
  if (Number(value.slice(11, 13)) > 23 || Number(value.slice(14, 16)) > 59 || Number(value.slice(17, 19)) > 59) return undefined;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
const label = (s: string) => normalizeLabel(s);
const seatNumber = (s: string) => /^[0-9]{1,5}$/.test(s) && Number(s) >= 1 && Number(s) <= 10000 ? Number(s) : undefined;
const addressKey = (e: LayoutObservation) => JSON.stringify([e.block, e.row, e.seat]);

/** Describes reports only: neither a maximum nor an unreported interval is a physical edge. */
export function analyzeReports(input: TimedSeatEvidence[], eventId: string, cutoff: string, scopeEventIds: readonly string[] = [eventId]): EvidenceAnalysis {
  const end = timestamp(cutoff);
  if (end === undefined || !eventId.trim()) throw new Error("Explicit event and timezone-aware cutoff required");
  if (!scopeEventIds.includes(eventId) || scopeEventIds.some(id => !id.trim())) throw new Error("Explicit scope must include selected event");
  const scope = new Set(scopeEventIds);
  const result: EvidenceAnalysis = { eventId, cutoff, accepted: [], rows: [], held: [], repeatedPositions: 0 };
  const valid: TimedSeatEvidence[] = [];
  for (const raw of input) {
    const time = timestamp(raw.availableAt);
    const block = label(raw.block), row = label(raw.row), number = seatNumber(label(raw.seat));
    const reason = !scope.has(raw.eventId) ? "other-event"
      : time === undefined ? "unknown-time"
      : time > end ? "after-cutoff"
      : raw.precision !== "exact" ? "range"
      : !block || !row || block.length > 80 || row.length > 40 || number === undefined ? "invalid-label"
      : !raw.id.trim() || !raw.sourceRef.trim() ? "missing-source" : null;
    if (reason) { result.held.push({ evidence: raw, reason }); continue; }
    valid.push({ ...raw, block, row, seat: String(number) });
  }
  // A changed value under the same source ID is not silently resolved by array order.
  const identities = new Map<string, Set<string>>();
  for (const e of valid) {
    const key = JSON.stringify([e.source, e.id]);
    const values = identities.get(key) ?? new Set<string>();
    values.add(addressKey(e)); identities.set(key, values);
  }
  const positions = new Set<string>();
  const grouped = new Map<string, { block: string; row: string; numbers: Set<number>; sources: Set<TimedSeatEvidence["source"]> }>();
  for (const e of valid) {
    if (identities.get(JSON.stringify([e.source, e.id]))!.size > 1) { result.held.push({ evidence: e, reason: "conflicting-id" }); continue; }
    result.accepted.push(e); // Preserve provenance even where several reports name one position.
    const key = addressKey(e);
    if (positions.has(key)) result.repeatedPositions++;
    positions.add(key);
    const rowKey = JSON.stringify([e.block, e.row]);
    const group = grouped.get(rowKey) ?? { block: e.block, row: e.row, numbers: new Set<number>(), sources: new Set<TimedSeatEvidence["source"]>() };
    group.numbers.add(Number(e.seat)); group.sources.add(e.source); grouped.set(rowKey, group);
  }
  for (const group of grouped.values()) {
    const numbers = [...group.numbers].sort((a, b) => a - b);
    const runs: Interval[] = [], unreported: Interval[] = [];
    for (const number of numbers) {
      const last = runs.at(-1);
      if (last && last.last + 1 === number) last.last = number;
      else {
        if (last) unreported.push({ first: last.last + 1, last: number - 1 });
        runs.push({ first: number, last: number });
      }
    }
    result.rows.push({ block: group.block, row: group.row, observedNumbers: numbers, observedRuns: runs, unreportedBetween: unreported, observedMin: numbers[0], observedMax: numbers.at(-1)!, uniquePositions: numbers.length, sources: [...group.sources].sort() });
  }
  result.rows.sort((a, b) => a.block.localeCompare(b.block, "ja", { numeric: true }) || a.row.localeCompare(b.row, "ja", { numeric: true }));
  return result;
}

/** Compare the same observations. A candidate may not improve by dropping inconvenient dates. */
export function compareLayouts(layouts: ArenaLayout[], analysis: EvidenceAnalysis) {
  const keys = layouts.map(l => JSON.stringify([l.id, l.version]));
  if (new Set(keys).size !== keys.length) throw new Error("Duplicate candidate version");
  const candidates = layouts.map(layout => {
    if (!layout.eventIds.includes(analysis.eventId)) return { id: layout.id, version: layout.version, state: "wrong-event" as const, check: null };
    const check = checkCandidate(layout, analysis.accepted);
    return { id: layout.id, version: layout.version, state: check.state, check };
  });
  const compatible = candidates.filter(c => c.state === "no-conflict");
  return {
    candidates,
    // No winner and no confidence percentage: surviving sparse evidence is not proof.
    state: !analysis.accepted.length ? "no-evidence" as const
      : !compatible.length ? "needs-review" as const
      : compatible.length > 1 ? "ambiguous" as const : "one-compatible-unverified" as const,
    compatibleIds: compatible.map(c => c.id),
  };
}
