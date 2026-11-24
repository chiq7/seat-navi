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

    // Send the URL once, as page_location only. Sending page_path as well
    // recorded the query twice ("?a=b?a=b") in GA4.
    // The fragment is left out: an in-page jump is not a new page.
    trackEvent("page_view", {
      page_location: window.location.origin + currentUrl,
      page_title: document.title,
    });
  }, [currentUrl]);

  // Report funnel: which screen of the posting flow was reached (entry / live / ticket / ...).
  useEffect(() => {
    if (!pathname.startsWith("/report")) return;
    trackEvent("report_form_view", { report_step: pathname.split("/")[2] || "entry" });
  }, [pathname]);

  // Report funnel: a link into the posting flow was tapped, and from which page and placement.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!link || window.location.pathname.startsWith("/report")) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin || !url.pathname.startsWith("/report")) return;
      trackEvent("report_cta_click", {
        placement: link.dataset.reportCta ?? "link",
        page_type: window.location.pathname.split("/")[1] || "home",
        report_step: url.pathname.split("/")[2] || "entry",
      });
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  return null;
}

