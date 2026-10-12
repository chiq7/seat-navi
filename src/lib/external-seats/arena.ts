import type { ArenaMapReport } from "@/lib/arena-map/arenaMapTypes";
import type { ExternalSeatObservation } from "./types";

const MAX_EXPANDED_CELLS_PER_OBSERVATION = 500;

/** 承認済みのアリーナ情報だけを、集計外のマップ描画用セルへ変換する。 */
export function externalObservationsToArenaReports(
  observations: ExternalSeatObservation[],
): ArenaMapReport[] {
  const result: ArenaMapReport[] = [];
  const seen = new Set<string>();

  for (const observation of observations) {
    if (
      observation.review_status !== "approved" ||
      observation.seat_area !== "arena" ||
      !observation.block ||
      observation.row_min == null ||
      observation.row_max == null ||
      observation.seat_min == null ||
      observation.seat_max == null
    ) {
      continue;
    }

    const rowMin = Math.max(1, Math.min(observation.row_min, observation.row_max));
    const rowMax = Math.max(rowMin, Math.max(observation.row_min, observation.row_max));
    const seatMin = Math.max(1, Math.min(observation.seat_min, observation.seat_max));
    const seatMax = Math.max(seatMin, Math.max(observation.seat_min, observation.seat_max));
    const totalCells = (rowMax - rowMin + 1) * (seatMax - seatMin + 1);
    if (totalCells > MAX_EXPANDED_CELLS_PER_OBSERVATION) continue;

    for (let row = rowMin; row <= rowMax; row += 1) {
      for (let seat = seatMin; seat <= seatMax; seat += 1) {
        const key = `${observation.block}:${row}:${seat}`;
        if (seen.has(key)) continue;
        seen.add(key);
        result.push({
          block: observation.block,
          row_num: row,
          seat_num: seat,
          lottery_type: "general",
          fc_history: null,
          payment_method: null,
          sourceKind: "external",
          externalConfidence: observation.confidence,
        });
      }
    }
  }

  return result;
}

