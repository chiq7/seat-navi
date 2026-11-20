"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { trackEvent } from "@/lib/analytics";
import { PRODUCTION_ORIGIN } from "@/lib/analyticsTraffic";
import { isPublicNavigationPath } from "@/lib/navigationLog";

/**
 * GA4の初回page_viewはgtag configへ任せ、App Routerでの画面遷移だけを追加送信する。
 */
export function AnalyticsNavigationTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const previousUrl = useRef<string | null>(null);
  const query = searchParams.toString();
  const currentUrl = `${pathname}${query ? `?${query}` : ""}`;

  useEffect(() => {
    const previous = previousUrl.current;
    previousUrl.current = currentUrl;
    if (!previous || previous === currentUrl || window.location.origin !== PRODUCTION_ORIGIN) return;
    const previousPath = previous.split("?", 1)[0];

    trackEvent("page_view", {
      page_location: `${PRODUCTION_ORIGIN}${pathname}`,
      page_path: pathname,
      page_referrer: isPublicNavigationPath(previousPath) ? `${PRODUCTION_ORIGIN}${previousPath}` : "",
      page_title: document.title,
    });
  }, [currentUrl, pathname]);

  return null;
}

