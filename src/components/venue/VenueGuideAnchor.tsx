"use client";

import { useEffect } from "react";

/** Resolve incoming guide links after the lazy map and facilities have mounted. */
export default function VenueGuideAnchor({ venue }: { venue: string }) {
  useEffect(() => {
    let stop = () => {};
    const navigate = () => {
      stop();
      const id = window.location.hash.slice(1);
      if (!/^(?:(?:venue|dome)-(?:seat-guide|seats|spots|facilities|access|prep|prepare|faq)|(?:upcoming|past)-events-title)$/.test(id)) return;
      let frame = 0;
      let settledAt = 0;
      let previousTop = -1;
      let stableFrames = 0;
      let done = false;
      const cleanup = () => {
        done = true;
        cancelAnimationFrame(frame);
        clearTimeout(deadline);
        observer.disconnect();
        resize.disconnect();
        window.removeEventListener("wheel", cleanup);
        window.removeEventListener("touchstart", cleanup);
        window.removeEventListener("keydown", cleanup);
      };
      const locate = () => {
        if (done) return;
        const target = document.getElementById(id);
        if (!target) return;
        const top = Math.max(0, target.getBoundingClientRect().top + window.scrollY - 90);
        stableFrames = Math.abs(top - previousTop) < 1 ? stableFrames + 1 : 0;
        previousTop = top;
        if (stableFrames >= 3) {
          window.scrollTo({ top, behavior: "instant" });
          if (!settledAt) settledAt = performance.now();
          if (performance.now() - settledAt > 500) return cleanup();
        }
        frame = requestAnimationFrame(locate);
      };
      const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(locate); };
      const observer = new MutationObserver(schedule);
      const resize = new ResizeObserver(schedule);
      const deadline = setTimeout(cleanup, 15_000);
      observer.observe(document.body, { childList: true, subtree: true });
      resize.observe(document.body);
      window.addEventListener("wheel", cleanup, { passive: true });
      window.addEventListener("touchstart", cleanup, { passive: true });
      window.addEventListener("keydown", cleanup);
      stop = cleanup;
      schedule();
    };
    navigate();
    window.addEventListener("hashchange", navigate);
    return () => { stop(); window.removeEventListener("hashchange", navigate); };
  }, [venue]);
  return null;
}
