/** A seat link: the block, and from a "この席を送る" link also the ticket's row / number and opening the full-screen map. */
export type VenueSeatLinkTarget = { mode: string; section: string; row?: string; number?: string; open?: boolean };
const seatPart = (value: unknown) => typeof value === "string" && /^[0-9A-Za-z]{1,6}$/.test(value.normalize("NFKC").trim()) ? value.normalize("NFKC").trim() : undefined;

export function parseVenueSeatLink(params: Record<string, string | string[] | undefined>): VenueSeatLinkTarget | null {
  const { seatMode = "fixed", seatSection } = params;
  if (typeof seatMode !== "string" || !/^[a-z0-9-]{1,40}$/.test(seatMode)) return null;
  if (typeof seatSection !== "string" || !seatSection || seatSection.length > 120) return null;
  const row = seatPart(params.seatRow), number = seatPart(params.seatNumber);
  return { mode: seatMode, section: seatSection, ...(row ? { row } : {}), ...(number ? { number } : {}), ...(params.seatOpen === "1" ? { open: true } : {}) };
}

export function venueSeatSectionHref(venue: string, target: VenueSeatLinkTarget): string {
  const query = new URLSearchParams({ seatMode: target.mode, seatSection: target.section });
  return `/venues/${encodeURIComponent(venue)}?${query}#venue-seat-guide`;
}

export const ZOZO_LOWER_THIRD_PAGE = "/venues/zozo-marine/seats/lower-third-base";
export const ZOZO_LOWER_THIRD_TARGET: VenueSeatLinkTarget = { mode: "fixed", section: "zozo-zone-lower-3塁側" };
