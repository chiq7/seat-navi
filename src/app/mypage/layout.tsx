import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "マイページ｜ちけレポ",
  robots: { index: false, follow: false },
};

export default function MyPageLayout({ children }: { children: ReactNode }) {
  return children;
}
