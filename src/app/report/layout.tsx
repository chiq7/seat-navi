import { buildFileImageMetadata } from "@/lib/fileImageMetadata";
import type { ReactNode } from "react";

export const metadata = buildFileImageMetadata({
  path: "/report",
  title: "報告する｜ちけレポ",
  description: "公演を選んで、当落・座席・現地レポを投稿できます。",
  robots: { index: false, follow: true },
});

export default function ReportLayout({ children }: { children: ReactNode }) {
  return children;
}
