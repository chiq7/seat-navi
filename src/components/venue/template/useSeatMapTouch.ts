"use client";
import { useEffect, useRef, type RefObject } from "react";

/** Keep native single-finger page scrolling at the whole view, while both
 * SVG seats and HTML area labels participate in the same two-finger gesture. */
export function useSeatMapTouch(frame: RefObject<HTMLDivElement | null>, locked?: RefObject<boolean>) {
  const suppressClick = useRef(false);
  useEffect(() => {
    const node = frame.current;
    if (!node) return;
    const multiTouch = (event: TouchEvent) => {
      // A locked (preview) map leaves two fingers to the page itself.
      if (event.touches.length < 2 || locked?.current) return;
      suppressClick.current = true;
      if (event.cancelable) event.preventDefault();
    };
    node.addEventListener("touchstart", multiTouch, { passive: false });
    node.addEventListener("touchmove", multiTouch, { passive: false });
    return () => {
      node.removeEventListener("touchstart", multiTouch);
      node.removeEventListener("touchmove", multiTouch);
    };
  }, [frame, locked]);
  return suppressClick;
}
