import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "当落・座席を投稿｜ちけレポ",
  alternates: { canonical: "https://tixrepo.com/report/ticket" },
  robots: { index: false, follow: true },
};

export default function TicketReportLayout({ children }: { children: ReactNode }) {
  return children;
}
