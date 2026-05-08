"use client";

import type { Section, Event } from "@/lib/types";
import { lotteryLabel } from "@/lib/utils";

type InsightProps = {
  event: Event;
  sections: Section[];
  lotteryType: string;
  blockName: string;
};

/**
 * あなた向けの短文要約（報酬）
 * 集まり度×断定度で短文生成
 * 件数・確率の生値は出さない
 */
export function YourSeatInsight({ event, sections, lotteryType, blockName }: InsightProps) {
  const insight = generateInsight(event, sections, lotteryType, blockName);

  return (
    <div className="rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50/80 to-pink-50/80 p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm">🔮</span>
        <span className="text-xs font-bold text-purple-900">あなた向けインサイト</span>
      </div>
      <p className="text-sm leading-relaxed text-purple-800">
        {insight}
      </p>
    </div>
  );
}

/** 断定度×集まり度で短文生成 */
function generateInsight(
  event: Event,
  sections: Section[],
  lotteryType: string,
  blockName: string,
): string {
  const score = event.atsumari_score;
  const lotLabel = lotteryLabel(lotteryType);

  // 同じ抽選種別で多いブロックを検出
  const rateKey = getRateKey(lotteryType);
  const getRate = (s: Section) => (s[rateKey] as number) ?? 0;
  const sorted = [...sections]
    .sort((a, b) => getRate(b) - getRate(a))
    .slice(0, 3);
  const hotBlocks = sorted.map((s) => s.name);

  // 自分のブロックが上位にいるか
  const matchSection = sections.find(
    (s) => s.name.includes(blockName) || blockName.includes(s.name.replace("ブロック", ""))
  );
  const isHotSpot = matchSection && getRate(matchSection) >= 0.3;

  // 断定度: 高集まり度 → 強い表現
  if (score >= 4.0) {
    // 断定度強
    if (isHotSpot) {
      return `${lotLabel}で${blockName}は報告がかなり濃いエリアだよ。${hotBlocks.slice(0, 2).join("・")}あたりに集中してる傾向がはっきり出てる`;
    }
    return `${lotLabel}は${hotBlocks.slice(0, 2).join("・")}寄りがかなり濃い。${blockName}からの報告もしっかり予想に反映したよ`;
  }

  if (score >= 2.5) {
    // 断定度中
    if (isHotSpot) {
      return `今のところ${lotLabel}は${hotBlocks.slice(0, 2).join("・")}が多そう。${blockName}もそのエリアだね。まだ固まり途中！`;
    }
    return `${lotLabel}は${hotBlocks.slice(0, 2).join("・")}あたりが多い傾向。${blockName}の報告、貴重なデータになるよ`;
  }

  // 断定度弱
  return `まだ報告が集まり始めたところ。${blockName}の情報ありがとう！ ${lotLabel}の傾向はもう少し集まると見えてくるはず`;
}

function getRateKey(lotteryType: string): keyof Section {
  switch (lotteryType) {
    case "fc_first":
    case "fc_second":
      return "fc_rate";
    case "general":
      return "general_rate";
    case "upgrade":
      return "upgrade_rate";
    case "revival":
      return "revival_rate";
    case "production":
      return "production_rate";
    default:
      return "fc_rate";
  }
}
