import { PUBLIC_VENUE_GUIDE_IDS } from "./publicVenueGuides";
import { ZOZO_LOWER_THIRD_PAGE } from "./venueSeatLinks";

export const staticPublicPages = [
  "/", "/search", "/venues", ZOZO_LOWER_THIRD_PAGE,
  ...PUBLIC_VENUE_GUIDE_IDS.map(id => `/venues/${id}`),
];

export const staticPageAssetPrefix = "/_tixrepo/pages";

export function staticPageAsset(path: string, flight: boolean) {
  return `${staticPageAssetPrefix}${path === "/" ? "/index" : path}.${flight ? "rsc" : "html"}`;
}
