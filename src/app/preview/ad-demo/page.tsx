import type { Metadata } from "next";
import AdDemoClient from "./AdDemoClient";

export const metadata: Metadata = {
  title: "広告素材用テスト画面｜ちけレポ",
  robots: { index: false, follow: false },
};

export default async function AdDemoPage({
  searchParams,
}: {
  searchParams: Promise<{ card?: string }>;
}) {
  const { card } = await searchParams;
  return <AdDemoClient initialCard={card === "map" ? "map" : "trend"} />;
}
