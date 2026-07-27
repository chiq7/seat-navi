import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "検索｜ちけレポ",
  description: "ちけレポのアーティスト・公演検索ページです。",
  alternates: { canonical: "https://tixrepo.com/search" },
  robots: { index: false, follow: true },
};

export default function SearchLayout({ children }: { children: ReactNode }) {
  return children;
}
