"use client";
import { TokyoDomeSeatLocator } from "../../TokyoDomeSeatLocator";
import { TokyoDomeGuideNav, TokyoDomeVisitorGuide } from "../../TokyoDomeVisitorGuide";

export default function TokyoDomePublicGuide() {
  return <><TokyoDomeGuideNav /><div id="dome-seats" className="scroll-mt-20"><TokyoDomeSeatLocator /></div><TokyoDomeVisitorGuide /></>;
}
