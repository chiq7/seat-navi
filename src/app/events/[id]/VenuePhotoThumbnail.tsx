"use client";

import { useState } from "react";

export function VenuePhotoThumbnail({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);

  return (
    <span className="grid aspect-[3/2] w-full place-items-center overflow-hidden rounded-md bg-[#f3edf0]">
      {failed ? <span className="px-2 text-center text-xs text-[#665761]">写真を読み込めません</span> : (
        // The reviewed photo source supplies a thumbnail; show it directly without referrer data.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} width={240} height={160} loading="lazy" decoding="async" referrerPolicy="no-referrer" alt=""
          onError={() => setFailed(true)} className="h-full w-full object-cover" />
      )}
    </span>
  );
}
