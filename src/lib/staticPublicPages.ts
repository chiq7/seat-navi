import { PUBLIC_VENUE_GUIDE_IDS } from "./publicVenueGuides";
import { ZOZO_LOWER_THIRD_PAGE } from "./venueSeatLinks";
import { ARTISTS } from "./artists";

export const staticPublicPages = [
  "/", "/search", "/venues", ZOZO_LOWER_THIRD_PAGE,
  ...PUBLIC_VENUE_GUIDE_IDS.map(id => `/venues/${id}`),
];

export const staticPageAssetPrefix = "/_tixrepo/pages";

// Artist snapshots are a last-known-good fallback; normal artist requests use the current catalog.
export const staticArtistPages = ARTISTS.filter(artist => artist.slug !== "test").map(artist => `/artists/${artist.slug}`);

export function staticPageAsset(path: string, flight: boolean) {
  return `${staticPageAssetPrefix}${path === "/" ? "/index" : path}.${flight ? "rsc" : "html"}`;
}
