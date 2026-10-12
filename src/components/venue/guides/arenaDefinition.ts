import type { ComponentProps } from "react";
import type { DedicatedVenueGuide } from "@/data/venueGuides/types";
import type StandSeatMap from "../template/StandSeatMap";
import type { StandMapData } from "../template/standMap";
import type { FacilityConfig } from "../template/facilityFinderState";

export type ArenaVenueData = {
  guide: DedicatedVenueGuide;
  seats: StandMapData;
  levels: ComponentProps<typeof StandSeatMap>["levels"];
  areas: ComponentProps<typeof StandSeatMap>["areas"];
  facilities: FacilityConfig;
  seatNote: string;
  facilityNote?: string;
  access: string[][];
  accessNote?: string;
  accessUrl: string;
  officialRouteUrl?: string;
  routeLabel?: string;
  luggage: string;
  preparationTitle: string;
  preparation: string;
  eventsUrl: string;
  faq: string[][];
};
export type ArenaView = Pick<ArenaVenueData, "guide" | "seats" | "levels" | "areas" | "facilities" | "seatNote">;
export type ArenaGuideDefinition = {
  venueId: string;
  data: ArenaVenueData;
  initialMode?: string;
  modes?: { ariaLabel: string; caption: string; options: { id: string; label: string }[] };
  resolveMode?: (mode: string) => ArenaView;
  closureNote?: string;
  primeMode?: string;
  preserveFacilitiesAcrossModes?: boolean;
};

export function resolveArenaView(definition: ArenaGuideDefinition, mode: string): ArenaView {
  if (definition.resolveMode) return definition.resolveMode(mode);
  const { guide, seats, levels, areas, facilities, seatNote } = definition.data;
  return { guide, seats, levels, areas, facilities, seatNote };
}
