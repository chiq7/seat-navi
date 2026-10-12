import type { Metadata } from "next";

/**
 * 検索語ごとのURLを検索結果に量産しない。検索ページはサイト内の発見導線として使い、
 * Googleには会場・アーティスト・公演の正規ページを評価してもらう。
 */
export const metadata: Metadata = {
  title: "ライブ・会場検索｜ちけレポ",
  description: "アーティスト、公演、ライブ会場を検索できます。",
  alternates: { canonical: "https://tixrepo.com/search" },
  robots: { index: false, follow: true },
};

export default function SearchLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
