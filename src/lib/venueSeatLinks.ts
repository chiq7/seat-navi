export type VenueSeatLinkTarget = { mode: string; section: string };

export function parseVenueSeatLink(params: Record<string, string | string[] | undefined>): VenueSeatLinkTarget | null {
  const { seatMode = "fixed", seatSection } = params;
  if (typeof seatMode !== "string" || !/^[a-z0-9-]{1,40}$/.test(seatMode)) return null;
  if (typeof seatSection !== "string" || !seatSection || seatSection.length > 120) return null;
  return { mode: seatMode, section: seatSection };
}

export function venueSeatSectionHref(venue: string, target: VenueSeatLinkTarget): string {
  const query = new URLSearchParams({ seatMode: target.mode, seatSection: target.section });
  return `/venues/${encodeURIComponent(venue)}?${query}#venue-seat-guide`;
}

export const ZOZO_LOWER_THIRD_PAGE = "/venues/zozo-marine/seats/lower-third-base";
export const ZOZO_LOWER_THIRD_TARGET: VenueSeatLinkTarget = { mode: "fixed", section: "zozo-zone-lower-3塁側" };
