"use client";
import { createContext, useContext, type ReactNode } from "react";
import styles from "./GuidePageSlots.module.css";

type Slots = { afterSeats?: ReactNode; pageNav: boolean };
const GuidePageSlotsContext = createContext<Slots>({ pageNav: false });

/**
 * What the venue page hands to whichever guide it renders: content to show right after the seat map (photo row,
 * past arena maps), and whether the page already shows the section nav (then the guide leaves its own out).
 */
export function GuidePageSlots({ afterSeats, pageNav, children }: Slots & { children: ReactNode }) {
  return <GuidePageSlotsContext value={{ afterSeats, pageNav }}>{children}</GuidePageSlotsContext>;
}

export function useGuidePageSlots() {
  return useContext(GuidePageSlotsContext);
}

/** The page's after-seats content. `nested`: the guide draws it inside its own container, so it takes that width. */
export function AfterSeats({ nested = false }: { nested?: boolean }) {
  const { afterSeats } = useContext(GuidePageSlotsContext);
  if (!afterSeats) return null;
  return nested ? <div className={styles.afterSeats}>{afterSeats}</div> : <>{afterSeats}</>;
}
