import type { SeatPredictionLayoutHints } from "@/components/SeatPredictionImage";

type SeatPredictionLayoutHintParams = {
  eventId: string;
  venueId?: string | null;
};

const EVENT_LAYOUT_HINTS: Record<string, SeatPredictionLayoutHints> = {
  "svtn-tokyo-dome-20260614": {
    B3: { candidate: "centerStage" },
  },
};
const EVENT_EXPECTED_BLOCKS: Record<string, string[]> = {
  "svtn-tokyo-dome-20260614": [
    "A1",
    "A2",
    "A3",
    "A4",
    "A5",
    "B1",
    "B2",
    "B3",
    "B4",
    "B5",
    "C1",
    "C2",
    "C3",
    "C4",
    "C5",
    "SS1",
    "SS2",
    "SS3",
    "SS4",
  ],
};

export function getSeatPredictionLayoutHints({
  eventId,
  venueId,
}: SeatPredictionLayoutHintParams): SeatPredictionLayoutHints | undefined {
  void venueId;
  return EVENT_LAYOUT_HINTS[eventId];
}

export function getSeatPredictionExpectedBlocks({
  eventId,
  venueId,
}: SeatPredictionLayoutHintParams): string[] | undefined {
  void venueId;
  return EVENT_EXPECTED_BLOCKS[eventId];
}
