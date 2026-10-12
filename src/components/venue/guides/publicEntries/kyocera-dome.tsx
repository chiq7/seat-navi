"use client";
import VerifiedVenueGuide from "../VerifiedVenueGuide";
import { kyoceraDomeGuide } from "@/data/venueGuides/kyocera-dome";

export default function KyoceraDomePublicGuide() {
  return <VerifiedVenueGuide guide={kyoceraDomeGuide} embedded />;
}
