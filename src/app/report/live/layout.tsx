import { buildFileImageMetadata } from "@/lib/fileImageMetadata";
import type { ReactNode } from "react";

export const metadata = buildFileImageMetadata({
  path: "/report/live",
  title: "現地レポを投稿｜ちけレポ",
  description: "参加した公演の座席からの見え方や会場の様子を現地レポとして投稿できます。",
  robots: { index: false, follow: true },
});

export default function LiveReportLayout({ children }: { children: ReactNode }) {
  return children;
}
