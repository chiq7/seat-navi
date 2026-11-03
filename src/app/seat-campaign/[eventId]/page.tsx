import { notFound } from "next/navigation";
import SeatCampaign from "@/components/seat-campaign/SeatCampaign";
import { publishedCampaign, productionContributionRepository } from "@/lib/seat-campaign/productionStore";
import { campaignState } from "@/lib/seat-campaign/contribution";
export const dynamic="force-dynamic";
export const metadata={title:"公演別の座席報告・途中集計｜ちけレポ",robots:{index:false,follow:true}};
export default async function Page({params,searchParams}:{params:Promise<{eventId:string}>;searchParams:Promise<{view?:string}>}) {
  const [{eventId},query]=await Promise.all([params,searchParams]);
  const event=await publishedCampaign(eventId); if(!event)notFound();
  const initial=await campaignState(productionContributionRepository(),event,false);
  return <SeatCampaign initial={initial} initialView={query.view==="summary"?"summary":"report"} />;
}
