"use client";
import dynamic from "next/dynamic";
import { isPublicArenaGuideVenue } from "@/lib/publicVenueGuides";
import ArenaGuide from "./ArenaGuide";
import GuideLoadBoundary, { GuideLoading } from "./GuideLoadBoundary";
import { VenueSeatTarget } from "../VenueSeatTarget";
import type { VenueSeatLinkTarget } from "@/lib/venueSeatLinks";

const dedicated = {
  "tokyo-dome": dynamic(() => import("./publicEntries/tokyo-dome"), { loading: GuideLoading }),
  "kyocera-dome": dynamic(() => import("./publicEntries/kyocera-dome"), { loading: GuideLoading }),
  "k-arena": dynamic(() => import("./publicEntries/k-arena"), { loading: GuideLoading }),
};

export default function PublicVenueGuide({ venue, target = null }: { venue: string; target?: VenueSeatLinkTarget | null }) {
  const key = JSON.stringify([venue, target?.mode, target?.section]);
  if (isPublicArenaGuideVenue(venue)) {
    return <VenueSeatTarget key={key} value={target}><ArenaGuide venue={venue} embedded /></VenueSeatTarget>;
  }
  if (venue !== "tokyo-dome" && venue !== "kyocera-dome" && venue !== "k-arena") return null;
  const Entry = dedicated[venue];
  return <VenueSeatTarget key={key} value={target}><GuideLoadBoundary key={venue}><Entry /></GuideLoadBoundary></VenueSeatTarget>;
}
