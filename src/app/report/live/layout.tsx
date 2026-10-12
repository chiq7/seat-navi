import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "現地レポを投稿｜ちけレポ",
  alternates: { canonical: "https://tixrepo.com/report/live" },
  robots: { index: false, follow: true },
};

export default function LiveReportLayout({ children }: { children: ReactNode }) {
  return children;
}
