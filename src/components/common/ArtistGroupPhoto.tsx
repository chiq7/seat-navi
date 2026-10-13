"use client";

import Image from "next/image";
import { useState } from "react";
import { getArtistGroupImage } from "@/lib/artistGroupImages";

type Props = { slug: string; name: string; variant?: "thumbnail" | "hero" | "tile"; priority?: boolean };

/** Keep the complete group visible, including wide and portrait photographs. */
export default function ArtistGroupPhoto({ slug, name, variant = "thumbnail", priority = false }: Props) {
  const photo = getArtistGroupImage(slug);
  const [failed, setFailed] = useState(false);
  if (!photo) return null;
  const hero = variant === "hero";
  return (
    <span data-artist-group-photo={slug} className={hero
      ? "relative mx-auto block h-[240px] w-full max-w-[1080px] bg-[#ffeaf2] sm:h-[400px] lg:h-[480px]"
      : variant === "tile" ? "relative block h-[88px] w-full overflow-hidden rounded-lg bg-[#fff1f6]" : "relative block h-12 w-[76px] shrink-0 overflow-hidden rounded-lg bg-[#fff1f6]"}>
      {failed ? <span aria-hidden="true" className="flex h-full items-center justify-center text-sm font-bold text-[#aa376b]">{name.slice(0, 2)}</span> : <Image
        src={hero ? photo.src : photo.thumbnail}
        alt={hero ? name + "の集合写真" : ""}
        fill
        sizes={hero ? "(max-width: 1080px) 100vw, 1080px" : variant === "tile" ? "(max-width: 640px) 44vw, 240px" : "76px"}
        priority={priority}
        className="object-contain"
        onError={() => setFailed(true)}
      />}
    </span>
  );
}
