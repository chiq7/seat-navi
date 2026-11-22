/** Section anchors on a venue page, for the section nav and the phone bottom bar. Tokyo Dome kept its older ids. */
export type GuideSectionIds = { seats: string; photos: string; spots: string; access: string; prepare: string; faq: string };

const TOKYO: GuideSectionIds = { seats: "dome-seats", photos: "dome-photos", spots: "dome-spots", access: "dome-access", prepare: "dome-prepare", faq: "dome-faq" };
const TEMPLATE: GuideSectionIds = { seats: "venue-seats", photos: "dome-photos", spots: "venue-facilities", access: "venue-access", prepare: "venue-prep", faq: "venue-faq" };

export function guideSectionIds(venueId: string): GuideSectionIds {
  return venueId === "tokyo-dome" ? TOKYO : TEMPLATE;
}
