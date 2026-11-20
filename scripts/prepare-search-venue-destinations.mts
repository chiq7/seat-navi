import { writeFile } from "node:fs/promises";
import { dedicatedVenueGuides } from "../src/data/venueGuides/index.ts";
import { DOME_GUIDE_SPOTS } from "../src/data/tokyoDomeVisitorGuide.ts";
import { matchesDomeGuidePurpose } from "../src/lib/domeGuideDisplay.ts";
import { getSeatPhotoVenues } from "../src/lib/serverSeatPhotoVenues.ts";
import { getVenueArenaPhotoArchives, venueArenaPhotoArchives } from "../src/data/venueArenaPhotoArchives.ts";
import { BABY_FACILITY_SEARCH, matchesBabyFacilitySearch, matchesGuideBabyFacility, type BabyFacilitySearch } from "../src/lib/venueFacilitySearch.ts";

const photos=getSeatPhotoVenues().map(venue=>venue.id).sort();
const arenaPhotos=Object.keys(venueArenaPhotoArchives).filter(id=>getVenueArenaPhotoArchives(id).length > 0).sort();
const luggage=Object.values(dedicatedVenueGuides).filter(guide=>guide.facilities.some(f=>f.purpose==="荷物"&&f.kind!=="no-storage"&&f.sourceIds.length)).map(guide=>guide.venueId);
const baby=Object.values(dedicatedVenueGuides).filter(guide=>guide.facilities.some(f=>f.purpose==="赤ちゃん"&&f.sourceIds.length)).map(guide=>guide.venueId);
if(DOME_GUIDE_SPOTS.some(spot=>matchesDomeGuidePurpose(spot,"locker"))) luggage.push("tokyo-dome");
if(DOME_GUIDE_SPOTS.some(spot=>matchesDomeGuidePurpose(spot,"baby"))) baby.push("tokyo-dome");
const babyFacilities = Object.fromEntries((Object.keys(BABY_FACILITY_SEARCH) as BabyFacilitySearch[]).map(target => {
  const venues = Object.values(dedicatedVenueGuides)
    .filter(guide => guide.facilities.some(f => matchesGuideBabyFacility(target, f))).map(guide => guide.venueId);
  if (DOME_GUIDE_SPOTS.some(spot => spot.sources.length > 0 && matchesDomeGuidePurpose(spot, "baby")
    && matchesBabyFacilitySearch(target, spot.name, spot.description))) venues.push("tokyo-dome");
  return [target, venues.sort()];
}));
await writeFile(new URL("../src/data/searchVenueDestinations.json",import.meta.url),JSON.stringify({ photos,arenaPhotos,luggage:luggage.sort(),baby:baby.sort(),babyFacilities },null,2)+"\n");
console.log(JSON.stringify({photos:photos.length,arenaPhotos:arenaPhotos.length,luggage:luggage.length,baby:baby.length,babyFacilities:Object.fromEntries(Object.entries(babyFacilities).map(([id, venues]) => [id, venues.length]))}));

