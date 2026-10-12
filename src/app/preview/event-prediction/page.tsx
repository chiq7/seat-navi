import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventPredictionPreviewClient } from "./EventPredictionPreviewClient";

export const metadata: Metadata = {
  title: "座席予想の更新検証 | ちけレポ",
  robots: { index: false, follow: false },
};

export default function EventPredictionPreviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <EventPredictionPreviewClient />;
}
