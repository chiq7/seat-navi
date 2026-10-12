import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ResultCardPreview from "@/components/report/ResultCardPreview";

export const metadata: Metadata = {
  title: "結果カードのローカル試作 | ちけレポ",
  robots: { index: false, follow: false },
};

export default function ResultCardPreviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <ResultCardPreview />;
}
