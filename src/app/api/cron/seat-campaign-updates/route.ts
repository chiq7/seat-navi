import { NextRequest,NextResponse } from "next/server";
import { campaignDb,productionCampaignEnabled,publishedCampaign } from "@/lib/seat-campaign/productionStore";
import { productionOperationsRepository } from "@/lib/seat-campaign/productionOperations";
import { operatorAuthorized } from "@/lib/seat-campaign/operatorAuth";
import { VERIFIED_CAMPAIGN_LAYOUTS } from "@/lib/seat-campaign/verifiedLayouts";
export const dynamic="force-dynamic";
export async function GET(request:NextRequest) {
  if(!productionCampaignEnabled())return NextResponse.json({error:"Not found"},{status:404});
  if(!operatorAuthorized(request.headers.get("authorization"),process.env.CRON_SECRET))return NextResponse.json({error:"Unauthorized"},{status:401});
  const db=campaignDb(), results: {eventId:string;state:string}[]=[];
  // No schedule is activated by this route. Pending revisions are selected before the bounded batch.
  const {data,error}=await db.from("seat_campaigns").select("event_id").eq("enabled",true).eq("updates_pending",true).order("updated_at").limit(10);
  if(error)return NextResponse.json({error:"更新対象を取得できません"},{status:503});
  for(const row of data??[]) {try {
    const event=await publishedCampaign(row.event_id);if(!event)continue;
    const layout=VERIFIED_CAMPAIGN_LAYOUTS[event.id], known=(layout?.blocks??[]).map(block=>({seatType:"arena" as const,block,sourceUrl:layout.sourceUrl}));
    const pack=await productionOperationsRepository().prepare(event,known,false,true);
    results.push({eventId:event.id,state:pack?"prepared":"unchanged_or_coalesced"});
  }catch{results.push({eventId:row.event_id,state:"retry_pending"});}}
  return NextResponse.json({results,posted:false},{headers:{"Cache-Control":"no-store"}});
}
