import { notFound } from "next/navigation";
import CampaignOperations from "@/components/seat-campaign/CampaignOperations";
import { PILOT_EVENT } from "@/lib/seat-campaign/pilot";
export const dynamic="force-dynamic";
export const metadata={title:"座席募集の運営確認",robots:{index:false,follow:false}};
export default function Page(){if(process.env.NODE_ENV!=="development")notFound();return <CampaignOperations event={PILOT_EVENT} localOnly/>;}
