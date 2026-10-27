import { seatNumberBadge } from "./seatNumberBadge";

/** Preserve the accepted Tokyo outline byte for byte at every direction. */
export function tokyoDomeNumberBadge(direction: readonly number[]) {
  return seatNumberBadge(direction);
}
