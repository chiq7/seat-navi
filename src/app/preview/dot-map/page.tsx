import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadSeatDiscovery } from "@/lib/serverSeatDiscovery";
import type { SeatReport } from "@/lib/types";
import type { ExternalSeatObservation } from "@/lib/external-seats/types";
import { DotMapPreviewClient } from "./DotMapPreviewClient";

export const metadata: Metadata = {
  title: "座席ドット図の比較試作 | ちけレポ",
  robots: { index: false, follow: false },
};

const samplePositions: { block: string; seats: [number, number][] }[] = [
  { block: "A1", seats: [[2, 3], [4, 8], [7, 15]] },
  { block: "A2", seats: [[1, 4], [2, 5], [5, 7]] },
  { block: "B3", seats: [[3, 10], [3, 11], [5, 8], [6, 13]] },
  { block: "C5", seats: [[2, 4], [4, 6], [6, 18]] },
  { block: "D1", seats: [[1, 3], [1, 4], [2, 8], [2, 9], [3, 12], [4, 16], [5, 20], [7, 2], [8, 23]] },
  { block: "D2", seats: [[2, 2], [5, 5], [8, 7]] },
  { block: "E5", seats: [[1, 2], [3, 7], [5, 14], [8, 18]] },
  { block: "F6", seats: [[1, 2], [2, 10], [5, 20]] },
  { block: "G7", seats: [[2, 12], [4, 15], [9, 20]] },
];

const sampleReports: SeatReport[] = samplePositions.flatMap(({ block, seats }) =>
  seats.map(([row, seat], index) => ({
    id: `preview-${block}-${row}-${seat}`,
    event_id: "dot-map-local-sample",
    block,
    row_num: row,
    seat_num: seat,
    lottery_type: (index % 3 === 0 ? "fc1" : index % 3 === 1 ? "fc2" : "general") as SeatReport["lottery_type"],
    lottery_round: null,
    lottery_name: null,
    payment_method: null,
    fc_history: null,
    comment: null,
    created_at: "2026-09-20T00:00:00.000Z",
  })),
);
sampleReports.push({ ...sampleReports.find(report => report.block === "D1" && report.row_num === 1 && report.seat_num === 3)!, id: "preview-same-seat-day2", event_id: "dot-map-local-sample-day2", lottery_type: "fc2" });
const sampleExternal: ExternalSeatObservation[] = [
  { id: "external-range-sample", event_id: "dot-map-local-sample", source_type: "other", source_url: null, observed_at: "2026-09-19T00:00:00Z", seat_area: "arena", block: "E5", row_min: 2, row_max: 2, seat_min: 10, seat_max: 12, gate: null, level: null, confidence: "range", evidence_summary: "架空の範囲テスト", review_status: "approved" },
  { id: "external-overflow-sample", event_id: "dot-map-local-sample-day2", source_type: "other", source_url: null, observed_at: "2026-09-20T00:00:00Z", seat_area: "arena", block: "テスト外", row_min: 1, row_max: 1, seat_min: 2, seat_max: 2, gate: null, level: null, confidence: "exact", evidence_summary: "架空のグリッド外テスト", review_status: "approved" },
];

export default async function DotMapPreviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  const realData = await loadSeatDiscovery();

  return (
    <main className="mx-auto max-w-[760px] bg-[#fcfafb] px-3 py-5 text-[#332b31] sm:px-6">
      <DotMapPreviewClient realData={realData} sampleReports={sampleReports} sampleExternal={sampleExternal} />
    </main>
  );
}
