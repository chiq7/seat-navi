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
  const currentUrl = `${pathname}${query ? `?${query}` : ""}`;

  useEffect(() => {
    if (firstUrl.current === null) {
      firstUrl.current = currentUrl;
      return;
    }
    if (firstUrl.current === currentUrl) return;
    firstUrl.current = currentUrl;

    trackEvent("page_view", {
      page_location: window.location.href,
      page_path: currentUrl,
      page_title: document.title,
    });
  }, [currentUrl]);

  return null;
}

