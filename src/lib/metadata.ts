import type { Metadata } from "next";

export const SITE_URL = "https://tixrepo.com";
export const SITE_NAME = "ちけレポ";
export const DEFAULT_OG_IMAGE = "/opengraph-image";
export const DEFAULT_DESCRIPTION =
  "ライブの当落結果、座席報告、現地レポ、セトリをファン同士で共有できるライブ情報コミュニティです。";

const NOINDEX_PATH_PREFIXES = [
  "/search",
  "/report",
  "/login",
  "/mypage",
  "/password-reset",
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
};

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
  image = DEFAULT_OG_IMAGE,
  imageAlt = `${SITE_NAME}｜当落・座席・現地レポ共有`,
  twitterCard,
}: BuildMetaInput): Metadata {
  const normalizedPath = normalizePath(path);
  const canonical = `${SITE_URL}${normalizePath(canonicalPath ?? normalizedPath)}`;
  const policyNoindex = isNoindexPath(normalizedPath);
  const shouldIndex = index && !policyNoindex;
  const shouldFollow = follow ?? (policyNoindex ? false : true);
  const card = twitterCard ?? "summary_large_image";

  return {
    title,
    description,
    alternates: { canonical },
    robots: { index: shouldIndex, follow: shouldFollow },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      siteName: SITE_NAME,
      locale: "ja_JP",
      images: [{ url: image, width: 1200, height: 630, alt: imageAlt }],
    },
    twitter: {
      card,
      title,
      description,
      images: [image],
    },
  };
}
