"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { setAnalyticsPage, trackEvent } from "@/lib/analytics";

/**
 * GA4の初回page_viewはgtag configへ任せ、App Routerでの画面遷移だけを追加送信する。
 */
export function AnalyticsNavigationTracker({ measurementId }: { measurementId: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const firstPath = useRef<string | null>(null);
  const query = searchParams.toString();

  useEffect(() => {
    // A new page is a new path. A query change on the same page (choosing a seat
    // block, a search term, a show in a form) is a choice on that page, not a page view.
    if (firstPath.current === null) {
      firstPath.current = pathname;
      return;
    }
    if (firstPath.current === pathname) return;
    firstPath.current = pathname;

    // Send the URL once, as page_location only. Sending page_path as well
    // recorded the query twice ("?a=b?a=b") in GA4.
    // The fragment is left out: an in-page jump is not a new page.
    // Campaign tags are read once, at landing (readLandingSignals). Left in the URL here,
    // going back to the landing page would hand them to GA again, unchecked, mid-visit.
    const kept = new URLSearchParams(query);
    for (const key of [...kept.keys()]) if (key.startsWith("utm_")) kept.delete(key);
    const keptQuery = kept.toString();
    const pageLocation = `${window.location.origin}${pathname}${keptQuery ? `?${keptQuery}` : ""}`;
    trackEvent("page_view", {
      page_location: pageLocation,
      page_title: document.title,
    });
    // Without this, every later event, scroll and engagement time on this page
    // was recorded under the page the visit started on.
    setAnalyticsPage(measurementId, pageLocation);
    // The query is read for the new page only; its own changes are not page views.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, measurementId]);

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
