"use client";

import Link from "next/link";
import type { Section } from "@/lib/types";

type MissingDataBannerProps = {
  sections: Section[];
  eventId: string;
};

/** どのカテゴリが足りないか判定（件数は絶対出さない） */
function detectMissing(sections: Section[]): string[] {
  if (sections.length === 0) return ["全体的に報告"];

  // 平均を計算して低いカテゴリを「不足」とみなす
  const avgFc = sections.reduce((s, sec) => s + sec.fc_rate, 0) / sections.length;
  const avgGeneral = sections.reduce((s, sec) => s + sec.general_rate, 0) / sections.length;
  const avgUpgrade = sections.reduce((s, sec) => s + sec.upgrade_rate, 0) / sections.length;
  const avgRevival = sections.reduce((s, sec) => s + sec.revival_rate, 0) / sections.length;
  const avgProduction = sections.reduce((s, sec) => s + sec.production_rate, 0) / sections.length;

  const missing: string[] = [];
  // 足りないカテゴリを雰囲気で判定
  if (avgGeneral < 0.25) missing.push("一般");
  if (avgUpgrade < 0.08) missing.push("アプグレ");
  if (avgRevival < 0.08) missing.push("復活当選");
  if (avgProduction < 0.08) missing.push("制作開放");
  if (missing.length === 0 && avgFc > 0.6) missing.push("FC以外");

  return missing;
}

export function MissingDataBanner({ sections, eventId }: MissingDataBannerProps) {
  const missing = detectMissing(sections);

  if (missing.length === 0) return null;

  return (
    <div className="rounded-2xl border border-amber-100 bg-gradient-to-r from-amber-50/80 to-orange-50/80 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-base">
          📢
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold text-amber-900">
            {missing.join("・")}の報告が少なめ
          </div>
          <p className="mt-0.5 text-[10px] text-amber-700/80">
            あなたの報告で予想精度がグッと上がるよ
          </p>
        </div>
      </div>
      <Link
        href={`/venue/${eventId}/section/new/post`}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:shadow-md active:scale-[0.98]"
      >
        <span>🤝</span>
        <span>協力する（報告する）</span>
      </Link>
    </div>
  );
}
