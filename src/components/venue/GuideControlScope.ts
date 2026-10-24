"use client";

import { createContext, createElement, useContext, useId, type ReactNode } from "react";

const GuideIdContext = createContext<string | null>(null);

/** One seat map and one facility finder per guide; separate guides keep unique IDs. */
export function GuideControlScope({ children }: { children: ReactNode }) {
  const id = useId();
  return createElement(GuideIdContext.Provider, { value: id }, children);
}

export function useGuideControlId(control: "seat-keys" | "facility-landmark" | "seat-art" | "seat-texture") {
  const scope = useContext(GuideIdContext);
  const fallback = useId();
  return `${scope ?? fallback}-${control}`;
}
