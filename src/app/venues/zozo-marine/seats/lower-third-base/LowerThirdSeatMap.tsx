"use client";

import StandSeatMap from "@/components/venue/template/StandSeatMap";
import { zozoAreas, zozoLevels, zozoSeats } from "@/data/venueGuides/zozo-marine/config";
import { ZOZO_LOWER_THIRD_TARGET } from "@/lib/venueSeatLinks";

export default function LowerThirdSeatMap() {
  return <StandSeatMap
    data={zozoSeats}
    levels={zozoLevels}
    areas={zozoAreas}
    initialSection={ZOZO_LOWER_THIRD_TARGET.section}
    onEquipment={() => window.location.assign("/venues/zozo-marine#venue-facilities")}
  />;
}
