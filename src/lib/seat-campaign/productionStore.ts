import "server-only";
import { createClient } from "@supabase/supabase-js";
import { CampaignError, type ContributionRepository, type SavedContribution } from "./contribution";
import type { CampaignEvent, CampaignReport } from "./model";

export function productionCampaignEnabled() { return process.env.SEAT_CAMPAIGN_ENABLED === "true"; }
export function campaignDb() {
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL, key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!productionCampaignEnabled() || !url || !key)throw new CampaignError("unavailable","座席報告の準備中です。");
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
}
export function dbError(error: {message:string}) {
  if(error.message.includes("campaign_closed"))throw new CampaignError("conflict","この公演の募集期間外です。保存済みの投稿は撤回できます。");
  if(error.message.includes("campaign_invalid"))throw new CampaignError("invalid","入力内容を確認してください。");
  if(error.message.includes("campaign_conflict"))throw new CampaignError("conflict","同じ投稿IDの内容が一致しません。");
  if(error.message.includes("campaign_rate"))throw new CampaignError("rate_limited","短時間の投稿が多いため、時間を空けてお試しください。");
  if(error.message.includes("campaign_not_found"))throw new CampaignError("not_found","公演または管理できる投稿が見つかりません。");
  throw new CampaignError("unavailable","保存先に接続できません。入力は保持しています。");
}
export async function publishedCampaign(id: string): Promise<CampaignEvent|null> {
  if(!productionCampaignEnabled() || !/^[a-zA-Z0-9_-]{1,80}$/.test(id))return null;
  const {data,error}=await campaignDb().from("seat_campaigns").select("event_id,title,venue,venue_id,event_date,session_label,source_url,opens_at,closes_at").eq("event_id",id).eq("enabled",true).maybeSingle();
  if(error)dbError(error); if(!data)return null;
  return {id:data.event_id,venueId:data.venue_id,title:data.title,venue:data.venue,date:data.event_date,session:data.session_label,sourceUrl:data.source_url,accepting:Date.now()>=Date.parse(data.opens_at??"") && Date.now()<Date.parse(data.closes_at??"")};
}
export function productionContributionRepository(): ContributionRepository {
  const db=campaignDb();
  return {
    async read(event) {
      const {data,error}=await db.rpc("seat_campaign_read",{p_event_id:event.id}); if(error)dbError(error);
      if(!data || !Array.isArray(data.reports) || typeof data.updatedAt!=="string")throw new CampaignError("unavailable","集計を読み取れませんでした。");
      return data as {reports:CampaignReport[];updatedAt:string;version:string};
    },
    async submit(event,value) {
      const {data,error}=await db.rpc("seat_campaign_submit",{p_event_id:event.id,p_id:value.id,p_input:value.input,p_owner_hash:value.ownerHash,p_rate_hash:value.rateHash,p_acquisition:value.acquisition??{},p_participant_hash:value.participantHash??value.rateHash}); if(error)dbError(error);
      if(!data || data.id!==value.id)throw new CampaignError("unavailable","保存結果を確認できません。"); return data as SavedContribution;
    },
    async withdraw(event,id,hash) {
      const {data,error}=await db.rpc("seat_campaign_withdraw",{p_event_id:event.id,p_id:id,p_owner_hash:hash}); if(error)dbError(error);
      if(!data || data.id!==id || !data.withdrawn)throw new CampaignError("unavailable","撤回結果を確認できません。"); return data as SavedContribution;
    },
  };
}
