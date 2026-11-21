"use client";

import type { ReactNode } from "react";

/** Jumps to a <details> section and opens it, so long lists can stay closed by default. */
export default function OpenDetailsLink({ targetId, className, children }: { targetId: string; className?: string; children: ReactNode }) {
  return <a href={`#${targetId}`} className={className} onClick={() => {
    const details = document.getElementById(targetId)?.closest("details");
    if (details) details.open = true;
  }}>{children}</a>;
}
