"use client";
import { ArenaReportMap } from "@/components/arena-map/ArenaReportMap";
import { campaignPredictionReports } from "@/lib/seat-campaign/predictionAdapter";
import { VERIFIED_CAMPAIGN_LAYOUTS } from "@/lib/seat-campaign/verifiedLayouts";
import type { CampaignSummary } from "@/lib/seat-campaign/model";

export function CampaignPredictionLayer({summary}:{summary:CampaignSummary}) {
  const binding=VERIFIED_CAMPAIGN_LAYOUTS[summary.event.id];
  if(!binding)return <p>この公演の配置資料は未確認です。報告は上の一覧に反映し、ブロックの位置や方向は追加しません。</p>;
  const points=campaignPredictionReports(summary,summary.event.id,new Set(binding.blocks));
  return <div><p>位置の根拠がある区画のアリーナ報告を青緑で表示します。番号範囲・英字列・スタンド・未対応区画は一覧で確認できます。</p>
    <a href={binding.sourceUrl} target="_blank" rel="noopener noreferrer">配置の確認に使った資料</a>
    <ArenaReportMap eventId={summary.event.id} reports={[]} seatOnlyReports={points} hideShareSection explorePreview seatDetailPreview />
  </div>;
}
