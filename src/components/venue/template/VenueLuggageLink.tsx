"use client";
import type { ReactNode } from "react";

export default function VenueLuggageLink({ href, children }: { href: string; children: ReactNode }) {
  return <a href={href} onClick={() => window.dispatchEvent(new Event("venue-open-luggage"))}>{children}</a>;
}
