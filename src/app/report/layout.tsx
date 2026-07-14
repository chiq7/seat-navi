import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "報告する｜ちけレポ",
  alternates: { canonical: "https://tixrepo.com/report" },
  robots: { index: false, follow: true },
};

export default function ReportLayout({ children }: { children: ReactNode }) {
  return children;
}
