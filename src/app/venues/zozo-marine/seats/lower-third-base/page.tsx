import { permanentRedirect } from "next/navigation";
import { venueSeatSectionHref, ZOZO_LOWER_THIRD_TARGET } from "@/lib/venueSeatLinks";

/** This one-section page was folded back into the venue page; the address opens that section there. */
export default function ZozoLowerThirdBase() {
  permanentRedirect(venueSeatSectionHref("zozo-marine", ZOZO_LOWER_THIRD_TARGET));
}
