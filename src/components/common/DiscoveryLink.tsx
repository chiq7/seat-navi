"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { trackEvent } from "@/lib/analytics";
import { discoveryClickParams, type DiscoveryContext } from "@/lib/discoveryNavigation";

type Props = Omit<ComponentProps<typeof Link>, "onClick"> & { discovery: DiscoveryContext };

export default function DiscoveryLink({ discovery, ...props }: Props) {
  return <Link {...props} onClick={() => {
    const params = discoveryClickParams(discovery);
    if (params) trackEvent("discovery_click", params);
  }} />;
}
