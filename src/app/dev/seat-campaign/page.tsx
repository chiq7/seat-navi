import path from "node:path";
import { notFound } from "next/navigation";
import SeatCampaign from "@/components/seat-campaign/SeatCampaign";
import { PILOT_EVENT } from "@/lib/seat-campaign/pilot";
import { localContributionRepository } from "@/lib/seat-campaign/managedLocalStore";
import { campaignState } from "@/lib/seat-campaign/contribution";

export const dynamic = "force-dynamic";
export const metadata = { title: "1公演の座席募集・集計｜ローカル確認", robots: { index: false, follow: false } };
export default async function Page({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  if (process.env.NODE_ENV !== "development") notFound();
  const query = await searchParams;
  let initial: Awaited<ReturnType<typeof campaignState>>;
  try {
    initial = await campaignState(localContributionRepository(path.join(process.cwd(), "research/seat-campaign-production-2026-11-01/local-only", PILOT_EVENT.id)), PILOT_EVENT, true);
  } catch { return <main className="mx-auto max-w-xl p-6"><h1 className="text-xl font-bold">集計を読み取れませんでした</h1><p role="alert">保存済みの情報は保持しています。0件の集計としては表示しません。</p><a className="my-4 inline-block underline" href="/dev/seat-campaign">読み直す</a></main>; }
  return <SeatCampaign initial={initial} initialView={query.view === "summary" ? "summary" : "report"} />;
}
