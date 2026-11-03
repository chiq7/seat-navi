import { notFound } from "next/navigation";
import CampaignOperations from "@/components/seat-campaign/CampaignOperations";
import { publishedCampaign } from "@/lib/seat-campaign/productionStore";
export const dynamic="force-dynamic";
export const metadata={title:"座席募集の運営確認",robots:{index:false,follow:false}};
export default async function Page({params}:{params:Promise<{eventId:string}>}){const event=await publishedCampaign((await params).eventId);if(!event)notFound();return <CampaignOperations event={event} localOnly={false}/>;}
