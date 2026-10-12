"use client";
import dynamic from "next/dynamic";
import { isPublicArenaGuideVenue } from "@/lib/publicVenueGuides";
import ArenaGuide from "./ArenaGuide";
import GuideLoadBoundary, { GuideLoading } from "./GuideLoadBoundary";

const dedicated = {
  "tokyo-dome": dynamic(() => import("./publicEntries/tokyo-dome"), { loading: GuideLoading }),
  "kyocera-dome": dynamic(() => import("./publicEntries/kyocera-dome"), { loading: GuideLoading }),
  "k-arena": dynamic(() => import("./publicEntries/k-arena"), { loading: GuideLoading }),
};

export default function PublicVenueGuide({ venue }: { venue: string }) {
  if (isPublicArenaGuideVenue(venue)) return <ArenaGuide venue={venue} embedded />;
  if (venue !== "tokyo-dome" && venue !== "kyocera-dome" && venue !== "k-arena") return null;
  const Entry = dedicated[venue];
  return <GuideLoadBoundary key={venue}><Entry /></GuideLoadBoundary>;
}
