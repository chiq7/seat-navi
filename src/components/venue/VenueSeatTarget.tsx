"use client";

import { createContext, useContext } from "react";
import type { VenueSeatLinkTarget } from "@/lib/venueSeatLinks";

export const VenueSeatTarget = createContext<VenueSeatLinkTarget | null>(null);
export const useVenueSeatTarget = () => useContext(VenueSeatTarget);
