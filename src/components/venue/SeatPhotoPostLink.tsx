"use client";

import { ImagePlus } from "lucide-react";
import { venueSeatSectionHref } from "@/lib/venueSeatLinks";
import { trackVenueSeatPhotoPostClick } from "@/lib/venueAnalytics";
import styles from "./SeatPhotoPostLink.module.css";

type Props = {
  venueId: string;
  venueName: string;
  /** Block the visitor has chosen, if any; it is written into the post so the photo can be placed on the map. */
  section?: string | null;
  row?: number | null;
  placement: "empty_block" | "photo_row";
  variant?: "wide" | "pill" | "tile";
};

/**
 * Opens X with a post already written ("東京ドーム C20 5列からの見え方 #ちけレポ" and the block's link).
 * The visitor only adds the photo. Photos on this site are X posts, so this is how a new one arrives.
 */
export function seatPhotoPostIntent({ venueId, venueName, section, row }: Pick<Props, "venueId" | "venueName" | "section" | "row">) {
  const page = new URL(section ? venueSeatSectionHref(venueId, { mode: "fixed", section }) : `/venues/${encodeURIComponent(venueId)}`, "https://tixrepo.com");
  page.hash = "";
  page.searchParams.set("utm_source", "x");
  page.searchParams.set("utm_medium", "social");
  page.searchParams.set("utm_campaign", "seat_photo_post");
  const seat = section ? `${section}${row ? ` ${row}列` : ""}` : "◯◯区画 ◯列";
  const intent = new URL("https://x.com/intent/tweet");
  intent.searchParams.set("text", `${venueName} ${seat}からの見え方 #ちけレポ`);
  intent.searchParams.set("url", page.toString());
  return intent.toString();
}

export default function SeatPhotoPostLink({ venueId, venueName, section, row, placement, variant = "wide" }: Props) {
  const label = variant === "wide" ? `${section ?? "この席"}の写真をXで投稿` : variant === "tile" ? "写真を投稿" : "投稿";
  return <a href={seatPhotoPostIntent({ venueId, venueName, section, row })} target="_blank" rel="noopener noreferrer"
    className={`${styles.link} ${styles[variant]}`} data-seat-photo-post={placement}
    aria-label={`${section ? `${section}からの` : "席からの"}写真をXで投稿（Xが開きます）`}
    onClick={() => trackVenueSeatPhotoPostClick(venueId, placement)}>
    <ImagePlus size={variant === "tile" ? 24 : 16} aria-hidden="true" />
    <span>{label}</span>
    {variant === "wide" && <small>Xが開きます・写真を付けるだけ</small>}
    {variant === "tile" && <small>Xで</small>}
  </a>;
}
