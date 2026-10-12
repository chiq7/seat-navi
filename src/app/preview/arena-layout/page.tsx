import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArenaLayoutPreview } from "./ArenaLayoutPreview";

export const metadata: Metadata = { title: "ステージと自分の席 | ちけレポ試作", robots: { index: false, follow: false } };

export default function ArenaLayoutPreviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <ArenaLayoutPreview />;
}
