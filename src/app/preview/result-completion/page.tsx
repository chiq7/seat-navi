import type { Metadata } from "next";
import { notFound } from "next/navigation";
import TicketCompletionPreview from "@/components/report/TicketCompletionPreview";

export const metadata: Metadata = { title: "結果画像の接続テスト | ちけレポ", robots: { index: false, follow: false } };
export default function CompletionPreviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <TicketCompletionPreview />;
}
