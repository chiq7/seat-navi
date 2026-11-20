"use client";

import { useEffect, useRef } from "react";

/** The framework can append its own noindex tag after the HTTP 404 has hydrated. */
export function NotFoundDocumentHead() {
  const marker = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const url = location.href;
    const head = document.head;
    let robots = head.querySelector<HTMLMetaElement>("meta[data-site-not-found-robots]");
    if (!robots) {
      robots = document.createElement("meta");
      robots.name = "robots";
      robots.content = "noindex, follow";
      robots.dataset.siteNotFoundRobots = "";
      head.appendChild(robots);
    }
    const managed = robots;
    function reconcile() {
      if (!marker.current?.isConnected || location.href !== url) return;
      for (const tag of head.querySelectorAll('meta[name="robots"]')) {
        // React removes its own head nodes when navigating away; keep them attached.
        if (tag !== managed) tag.removeAttribute("name");
      }
      for (const tag of head.querySelectorAll('link[rel~="canonical"]')) tag.removeAttribute("rel");
      const heading = "ページが見つかりません｜ちけレポ";
      if (document.title !== heading) document.title = heading;
      if (!managed.isConnected) head.appendChild(managed);
    }
    reconcile();
    const observer = new MutationObserver(reconcile);
    observer.observe(head, { childList: true });
    return () => {
      observer.disconnect();
      managed.removeAttribute("name");
      managed.removeAttribute("data-site-not-found-robots");
    };
  }, []);
  return <span ref={marker} hidden />;
}
