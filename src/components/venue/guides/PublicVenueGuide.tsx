"use client";
import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";
import { isPublicArenaGuideVenue } from "@/lib/publicVenueGuides";
import ArenaGuide from "./ArenaGuide";
import GuideLoadBoundary, { GuideLoading } from "./GuideLoadBoundary";
import { VenueSeatTarget } from "../VenueSeatTarget";
import { parseVenueSeatLink, type VenueSeatLinkTarget } from "@/lib/venueSeatLinks";

const dedicated = {
  "tokyo-dome": dynamic(() => import("./publicEntries/tokyo-dome"), { loading: GuideLoading }),
  "kyocera-dome": dynamic(() => import("./publicEntries/kyocera-dome"), { loading: GuideLoading }),
  "k-arena": dynamic(() => import("./publicEntries/k-arena"), { loading: GuideLoading }),
};

function subscribeToLocation(callback: () => void) {
  window.addEventListener("popstate", callback);
  return () => window.removeEventListener("popstate", callback);
}

function KyoceraGuide({ target }: { target: VenueSeatLinkTarget | null }) {
  // The prerendered document is shared by seat links. Read their target after hydration.
  const query = useSyncExternalStore(subscribeToLocation, () => window.location.search, () => "");
  const params = new URLSearchParams(query);
  const modes = params.getAll("seatMode");
  const sections = params.getAll("seatSection");
  const activeTarget = target ?? (modes.length <= 1 && sections.length === 1
    ? parseVenueSeatLink({ seatMode: modes[0], seatSection: sections[0] })
    : null);
  const key = JSON.stringify([activeTarget?.mode, activeTarget?.section]);
  const Entry = dedicated["kyocera-dome"];
  return <VenueSeatTarget key={key} value={activeTarget}><GuideLoadBoundary><Entry /></GuideLoadBoundary></VenueSeatTarget>;
}

export default function PublicVenueGuide({ venue, target = null }: { venue: string; target?: VenueSeatLinkTarget | null }) {
  const key = JSON.stringify([venue, target?.mode, target?.section]);
  if (isPublicArenaGuideVenue(venue)) {
    return <VenueSeatTarget key={key} value={target}><ArenaGuide venue={venue} embedded /></VenueSeatTarget>;
  }
  if (venue === "kyocera-dome") return <KyoceraGuide target={target} />;
  if (venue !== "tokyo-dome" && venue !== "k-arena") return null;
  const Entry = dedicated[venue];
  return <VenueSeatTarget key={key} value={target}><GuideLoadBoundary key={venue}><Entry /></GuideLoadBoundary></VenueSeatTarget>;
}
