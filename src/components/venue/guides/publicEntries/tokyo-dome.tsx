"use client";
import type { ReactNode } from "react";
import { TokyoDomeSeatLocator } from "../../TokyoDomeSeatLocator";
import { TokyoDomeVisitorGuide } from "../../TokyoDomeVisitorGuide";

export default function TokyoDomePublicGuide({ afterSeats }: { afterSeats?: ReactNode }) {
  return <><div id="dome-seats" className="scroll-mt-28"><TokyoDomeSeatLocator /></div>{afterSeats}<TokyoDomeVisitorGuide /></>;
}
