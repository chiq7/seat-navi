// "この席を送る": the link a fan sends to friends, and the share images behind it.
// The link goes through /s/<venue>/<section> so LINE / X show that block's own picture and name,
// then opens the venue page on that block (and row / number) in the full-screen seat map.
import ogImages from "@/data/ogImages.json";

export const SITE_ORIGIN = "https://tixrepo.com";
/** Changes whenever the pictures are redrawn, so LINE / X fetch them again instead of a cached copy. */
export const SHARE_IMAGE_VERSION = ogImages.version;
/** Venues whose seat map can send a single block, each with the seat map (diagram) the link opens on. */
export const SEAT_SHARE_DIAGRAMS: Readonly<Record<string, string>> = ogImages.shareDiagrams;
export const SEAT_SHARE_VENUES = Object.keys(SEAT_SHARE_DIAGRAMS);

const VENUE_IMAGES = new Set<string>(ogImages.venues);
const SEAT_IMAGES: Readonly<Record<string, readonly string[]>> = ogImages.seats;

export function venueShareImage(venue: string): string | null {
  return VENUE_IMAGES.has(venue) ? `/og/venues/${venue}.jpg?v=${SHARE_IMAGE_VERSION}` : null;
}
export function seatShareImage(venue: string, section: string): string | null {
  return SEAT_IMAGES[venue]?.includes(section) ? `/og/seats/${venue}/${encodeURIComponent(section)}.jpg?v=${SHARE_IMAGE_VERSION}` : venueShareImage(venue);
}

/** Row and number as printed on a ticket: short, letters and digits only (anything else is dropped). */
export function cleanSeatPart(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const text = value.normalize("NFKC").trim();
  return /^[0-9A-Za-z]{1,6}$/.test(text) ? text : undefined;
}

/** mode: which of the venue's seat maps (only the share page fills it in; the default is "fixed"). */
export type SeatShare = { venue: string; section: string; row?: string; number?: string; mode?: string };

export function seatSharePath({ venue, section, row, number }: SeatShare): string {
  const query = new URLSearchParams();
  if (row) query.set("r", row);
  if (number) query.set("n", number);
  const search = query.toString();
  return `/s/${encodeURIComponent(venue)}/${encodeURIComponent(section)}${search ? `?${search}` : ""}`;
}

/** Where the share link lands: the venue page, opened full screen on that block. */
export function seatShareTarget({ venue, section, row, number, mode = "fixed" }: SeatShare): string {
  const query = new URLSearchParams({ seatMode: mode, seatSection: section, seatOpen: "1" });
  if (row) query.set("seatRow", row);
  if (number) query.set("seatNumber", number);
  return `/venues/${encodeURIComponent(venue)}?${query}#venue-seat-guide`;
}

/** "LEVEL5・212番〜 10列212番" — the block, then the ticket's own row and number when known. */
export function seatShareLabel(blockName: string, row?: string, number?: string): string {
  const seat = `${row ? `${row}列` : ""}${number ? `${number}番` : ""}`;
  // With the ticket's own row, the block's row range ("・12〜29列") only repeats it.
  return seat ? `${row ? blockName.replace(/・[^・]*列$/, "") : blockName} ${seat}` : blockName;
}

export function seatShareText(venueName: string, blockName: string, row?: string, number?: string): string {
  return `${venueName} ${seatShareLabel(blockName, row, number)}の席はここ｜ちけレポ`;
}
