import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AdDemoClient from "./AdDemoClient";

export const metadata: Metadata = {
  title: "広告素材用テスト画面｜ちけレポ",
  robots: { index: false, follow: false },
};

export default async function AdDemoPage({
  searchParams,
}: {
  searchParams: Promise<{ card?: string; capture?: string }>;
}) {
  const { card, capture } = await searchParams;
  if (card === "report") redirect("/report/live/detail?demo=ad");
  const initialCard = card === "map" || card === "prediction" ? card : "trend";
  return <AdDemoClient initialCard={initialCard} captureMode={capture === "highres"} />;
}
