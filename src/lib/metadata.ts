import type { Metadata } from "next";

export const SITE_URL = "https://tixrepo.com";
export const SITE_NAME = "ちけレポ";
export const SITE_ALTERNATE_NAMES = ["チケレポ", "ちけれぽ", "tixrepo", "TixRepo"] as const;
export const SITE_DISPLAY_NAME = `${SITE_NAME}（チケレポ / TixRepo）`;
export const HOME_TITLE = `${SITE_DISPLAY_NAME}｜ライブの座席表・見え方写真・セトリ`;
export const HOME_DESCRIPTION = `${SITE_DISPLAY_NAME}で、ライブ会場の座席表と席からの見え方写真を確認できます。アーティストや公演日から、チケットの当落、セットリスト、現地レポも探せます。`;
export const DEFAULT_OG_IMAGE = "/opengraph-image";
export const DEFAULT_DESCRIPTION =
  "ライブの当落結果、座席報告、現地レポ、セトリをファン同士で共有できるライブ情報コミュニティです。";

const NOINDEX_PATH_PREFIXES = [
  "/search",
  "/report",
  "/login",
  "/mypage",
  "/password-reset",
  "/preview",
  "/dev",
] as const;

type BuildMetaInput = {
  path: string;
  title: string;
  description?: string;
  /** 重複公演など、表示URLとは異なる正規URLを指定する場合に使う。 */
  canonicalPath?: string;
  index?: boolean;
  follow?: boolean;
  image?: string;
  imageAlt?: string;
  twitterCard?: "summary" | "summary_large_image";
  ogType?: "website" | "article";
};

export function withSiteTitle(text: string): string {
  const subject = text.trim().replace(/(?:\s*[｜|-]\s*ちけレポ)+$/u, "").trim();
  return subject && subject !== SITE_NAME ? `${subject} - ${SITE_NAME}` : SITE_NAME;
}

export const MIN_PHOTO_COUNT_FOR_TITLE = 5;

export function seatPhotoTitle(subject: string, count: number): string {
  const prefix = Number.isInteger(count) && count >= MIN_PHOTO_COUNT_FOR_TITLE ? `【写真${count}枚】` : "";
  return withSiteTitle(prefix + subject);
}

type SocialInput = Pick<BuildMetaInput, "title" | "imageAlt" | "twitterCard" | "ogType"> & {
  description: string;
  url: string;
  /** null lets Next.js provide the route's file-based sharing image. */
  image?: string | null;
};

export function buildSocialMetadata({
  title, description, url, image = DEFAULT_OG_IMAGE, imageAlt = `${SITE_NAME}｜当落・座席・現地レポ共有`,
  twitterCard = "summary_large_image", ogType = "website",
}: SocialInput): Pick<Metadata, "openGraph" | "twitter"> {
  return {
    openGraph: {
      title, description, url, type: ogType, siteName: SITE_NAME, locale: "ja_JP",
      ...(image && { images: [{ url: image, width: 1200, height: 630, alt: imageAlt }] }),
    },
    twitter: { card: twitterCard, title, description, ...(image && { images: [image] }) },
  };
}

function normalizePath(path: string): string {
  if (!path || path === "/") return "";
  return `/${path.replace(/^\/+|\/+$/g, "")}`;
}

export function isNoindexPath(path: string): boolean {
  const normalized = normalizePath(path);
  return NOINDEX_PATH_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`),
  );
}

/** canonical・robots・OG・Twitterの共通規則だけを固定する。文言は各ページで決める。 */
export function buildMeta({
  path,
  title,
  description = DEFAULT_DESCRIPTION,
  canonicalPath,
  index = true,
  follow,
  image,
  imageAlt,
  twitterCard,
  ogType,
}: BuildMetaInput): Metadata {
  const normalizedPath = normalizePath(path);
  const canonical = `${SITE_URL}${normalizePath(canonicalPath ?? normalizedPath)}`;
  const policyNoindex = isNoindexPath(normalizedPath);
  const shouldIndex = index && !policyNoindex;
  const shouldFollow = follow ?? (policyNoindex ? false : true);

  return {
    title,
    description,
    alternates: { canonical },
    robots: { index: shouldIndex, follow: shouldFollow },
    ...buildSocialMetadata({ title, description, url: canonical, image, imageAlt, twitterCard, ogType }),
  };
}
