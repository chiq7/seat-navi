import type { Ref } from "react";
import type { CampaignSummary } from "@/lib/seat-campaign/model";
import { campaignImageRows } from "@/lib/seat-campaign/imageRows";
import { SEAT_ONLY_PRESENTATION } from "@/lib/seat-campaign/presentation";
export function CampaignImage({ summary, page = 0, svgRef, localOnly = true }: { summary: CampaignSummary; page?: number; svgRef?: Ref<SVGSVGElement>; localOnly?: boolean }) {
  const imageRows = campaignImageRows(summary.rows);
  const pages = Math.max(1, Math.ceil(imageRows.length / 5));
  const safePage = Math.min(Math.max(page, 0), pages - 1);
  const rows = imageRows.slice(safePage * 5, safePage * 5 + 5);
  return <svg ref={svgRef} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1120" role="img" aria-label={localOnly?"動作確認用・実報告ではない座席集計画像":"本人入力・未照合を含む座席集計画像"} style={{ width: "100%", height: "auto", display: "block" }} fontFamily="Arial, 'Yu Gothic', 'Meiryo', sans-serif">
    <rect width="1200" height="1120" fill="#fffafc" />
    <rect width="1200" height="58" fill="#6d4c07" />
    <text x="44" y="38" fill="white" fontSize="25" fontWeight="700">{localOnly?"動作確認用・未公開 ／ 入力はサンプルです":"本人入力の途中集計 ／ 未照合の情報を含みます"}</text>
    <text x="44" y="116" fill="#a82558" fontSize="26" fontWeight="700">ちけレポ　座席報告の途中集計</text>
    <text x="44" y="172" fill="#302630" fontSize="39" fontWeight="700">{summary.event.title}</text>
    <text x="44" y="219" fill="#554855" fontSize="28">{summary.event.date}　{summary.event.session}　{summary.event.venue}</text>
    <text x="44" y="264" fill="#554855" fontSize="23">更新：{new Date(summary.updatedAt).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", hour12: false })} JST</text>
    <rect x="44" y="295" width="1112" height="102" rx="12" fill={SEAT_ONLY_PRESENTATION.background} />
    <text x="70" y="340" fill={SEAT_ONLY_PRESENTATION.color} fontSize="31" fontWeight="700">座席情報のみ ／ 本人入力 {summary.selfSubmissions}件・座席情報 {summary.selfLocations}組</text>
    <text x="70" y="375" fill="#554855" fontSize="22">当選枠は未入力。同じ席はまとめています。未照合を含み、回答者数ではありません。</text>
    <text x="44" y="446" fill="#302630" fontSize="28" fontWeight="700">報告された列・番号の一覧　{safePage + 1}/{pages}</text>
    {!rows.length && <text x="44" y="520" fill="#665966" fontSize="28">まだ座席報告はありません。</text>}
    {rows.map((lines, index) => {
      return <g key={index}>
        <rect x="44" y={470 + index * 87} width="1112" height="78" rx="6" fill={index % 2 ? "#f3eef1" : "#ffffff"} />
        {lines.map((line, i) => <text key={i} x="60" y={501 + index * 87 + i * 30} fill={SEAT_ONLY_PRESENTATION.color} fontSize="25">{line}</text>)}
      </g>;
    })}
    <text x="44" y="968" fill="#615761" fontSize="24">外部補助資料 {summary.externalLocations}組は別集計。配置・方向は予想していません。</text>
    <text x="44" y="1018" fill="#302630" fontSize="27" fontWeight="700">報告がない場所は未確認です。席がないことを示しません。</text>
    <text x="44" y="1064" fill="#615761" fontSize="24">列の間や番号範囲を補間せず、報告された内容だけを掲載しています。</text>
  </svg>;
}
