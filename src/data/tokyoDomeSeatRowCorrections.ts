import type { RowRange } from "@/lib/tokyoDomeSeatRows";

// Ordinary row ranges follow individually read official detail images when they
// differ from overall-PDF labels. P/S/T, standing and counter rows are separate.
export const TOKYO_DOME_ROW_CORRECTIONS: Record<string, RowRange> = {
  A01: [15, 39],
  B02: [27, 40],
  B03: [27, 45],
  B35: [27, 39],
  B36: [27, 38],
  B37: [27, 38],
  B38: [27, 39],
  B39: [27, 39],
  D14: [1, 7],
  D15: [1, 7],
  D16: [1, 7],
  D17: [1, 7],
  D18: [1, 7],
  D34: [1, 7],
  D35: [1, 7],
  D36: [1, 7],
  D37: [1, 7],
  D38: [1, 7],
};
