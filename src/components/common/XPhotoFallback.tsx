"use client";

import { useEffect } from "react";

// X does not keep every size of every picture: for some newly posted photos the smallest copies ("thumb",
// "120x120", now and then "240x240") answer 404, while "small" is always there. A picture that fails to load in one
// of those sizes is asked for once more in "small", so no seat photo shows as a broken image.
const SMALL_SIZES = /([?&]name=)(?:thumb|tiny|\d+x\d+)\b/;

function retry(image: HTMLImageElement) {
  const source = image.currentSrc || image.src;
  if (!source.includes("pbs.twimg.com/") || !SMALL_SIZES.test(source) || image.dataset.sizeRetried) return;
  image.dataset.sizeRetried = "1";
  image.removeAttribute("srcset");
  image.src = source.replace(SMALL_SIZES, "$1small");
}

export default function XPhotoFallback() {
  useEffect(() => {
    const failed = (event: Event) => { if (event.target instanceof HTMLImageElement) retry(event.target); };
    // `error` does not bubble: it is caught on its way down
    document.addEventListener("error", failed, true);
    // pictures that had already failed before this ran
    for (const image of document.images) if (image.complete && image.naturalWidth === 0 && image.getAttribute("src")) retry(image);
    return () => document.removeEventListener("error", failed, true);
  }, []);
  return null;
}
