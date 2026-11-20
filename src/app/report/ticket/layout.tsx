import { buildFileImageMetadata } from "@/lib/fileImageMetadata";
import type { ReactNode } from "react";

export const metadata = buildFileImageMetadata({
  path: "/report/ticket",
  title: "当落・座席を投稿｜ちけレポ",
  description: "参加する公演を選んで、チケットの当落結果や座席を報告できます。",
  robots: { index: false, follow: true },
});

export default function TicketReportLayout({ children }: { children: ReactNode }) {
  return children;
}
