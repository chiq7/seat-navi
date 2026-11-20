"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { trackEvent } from "@/lib/analytics";

/**
 * GA4の初回page_viewはgtag configへ任せ、App Routerでの画面遷移だけを追加送信する。
 */
export function AnalyticsNavigationTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const firstUrl = useRef<string | null>(null);
  const query = searchParams.toString();
  // The search box can preserve a chosen result in the current history entry.
  // A change of search terms on this screen is recorded by the search event.
  const currentUrl = pathname === "/search" ? pathname : `${pathname}${query ? `?${query}` : ""}`;

  useEffect(() => {
    if (firstUrl.current === null) {
      firstUrl.current = currentUrl;
      return;
    }
    if (firstUrl.current === currentUrl) return;
    firstUrl.current = currentUrl;

    trackEvent("page_view", {
      page_location: currentUrl === "/search" ? window.location.origin + currentUrl : window.location.href,
      page_path: currentUrl,
      page_title: document.title,
    });
  }, [currentUrl]);

  return null;
}

