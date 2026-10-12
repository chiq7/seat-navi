import { ShoppingBag, Disc3, Ticket, Gift, MapPin, Smartphone, CircleHelp } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { EventDayActionKind } from "@/lib/eventDaySummary";

/** The action kind, never its position in an array, defines its icon. */
export const EVENT_DAY_ACTION_ICONS: Record<EventDayActionKind, LucideIcon> = {
  goods: ShoppingBag,
  cd: Disc3,
  "fc-lottery": Ticket,
  "fc-benefits": Gift,
  "check-in": MapPin,
  "member-lottery": Smartphone,
  other: CircleHelp,
};
