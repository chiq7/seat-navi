import { NextRequest, NextResponse } from "next/server";
import { campaignDb,productionCampaignEnabled } from "@/lib/seat-campaign/productionStore";
export const dynamic="force-dynamic";
export async function GET(request:NextRequest) {
  const headers={"Cache-Control":"no-store"};
  if(!productionCampaignEnabled())return NextResponse.json({events:[]},{headers});
  const venue=request.nextUrl.searchParams.get("venue");
  if(!venue || !/^[a-z0-9-]{1,64}$/.test(venue))return NextResponse.json({error:"会場を確認してください"},{status:400,headers});
  const now=new Date().toISOString();
  const {data,error}=await campaignDb().from("seat_campaigns").select("event_id,title,venue,venue_id,event_date,session_label,source_url").eq("venue_id",venue).eq("enabled",true).lte("opens_at",now).gt("closes_at",now).order("event_date").limit(201);
  if(error || (data?.length??0)>200)return NextResponse.json({error:"募集公演を読み取れませんでした"},{status:503,headers});
  return NextResponse.json({events:(data??[]).map(v=>({id:v.event_id,title:v.title,venue:v.venue,venueId:v.venue_id,date:v.event_date,session:v.session_label,sourceUrl:v.source_url}))},{headers});
}
