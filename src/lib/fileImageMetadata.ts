import type { Metadata } from "next";
import { buildSocialMetadata, DEFAULT_OG_IMAGE, SITE_URL } from "./metadata";

type PageMetadata = {
  path: string;
  title: string;
  description: string;
  robots?: Metadata["robots"];
  ogType?: "website" | "article";
  twitterCard?: "summary" | "summary_large_image";
  fileTwitterImage?: boolean;
};

/** Keep Next's versioned opengraph-image and the route's existing Twitter image policy. */
export function buildFileImageMetadata({
  path, title, description, robots, ogType, twitterCard, fileTwitterImage,
}: PageMetadata): Metadata {
  const url = new URL(path, SITE_URL).href;
  const social = buildSocialMetadata({ title, description, url, ogType, twitterCard, image: null });
  return {
    title,
    description,
    alternates: { canonical: url },
    ...(robots ? { robots } : {}),
    ...social,
    twitter: fileTwitterImage ? social.twitter : { ...social.twitter, images: [DEFAULT_OG_IMAGE] },
  };
}
