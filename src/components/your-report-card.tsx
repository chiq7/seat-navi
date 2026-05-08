"use client";

import { lotteryLabel } from "@/lib/utils";

type ReportData = {
  lotteryType: string;
  paymentMethod: string;
  appliedCount: number;
  blockName: string;
  rowNumber?: string | null;
  isUpgrade?: boolean;
};

const PAYMENT_LABELS: Record<string, string> = {
  credit: "クレジットカード",
  convenience: "コンビニ払い",
  other: "その他",
};

/**
 * あなたの報告カード
 * 入力した内容をそのまま表示。件数なし。編集は後回し。
 */
export function YourReportCard({ data }: { data: ReportData }) {
  const items: { label: string; value: string }[] = [
    { label: "抽選種別", value: lotteryLabel(data.lotteryType) },
    { label: "支払い方法", value: PAYMENT_LABELS[data.paymentMethod] ?? data.paymentMethod },
    { label: "申込枚数", value: data.appliedCount === 3 ? "3枚以上" : `${data.appliedCount}枚` },
    { label: "ブロック", value: data.blockName },
  ];

  if (data.rowNumber) {
    items.push({ label: "列", value: `${data.rowNumber}列` });
  }

  if (data.lotteryType === "upgrade") {
    items.push({ label: "アプグレ", value: "あり" });
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm">📋</span>
        <span className="text-xs font-bold text-gray-900">あなたの報告</span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {items.map((item) => (
          <div key={item.label}>
            <div className="text-[10px] text-gray-400">{item.label}</div>
            <div className="text-sm font-medium text-gray-800">{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
