"use client";

import Link from "next/link";
import type { Section } from "@/lib/types";
import { formatPercent } from "@/lib/utils";

type SectionCardProps = {
  section: Section;
  eventId: string;
  highlight?: boolean;
};

function LotteryBar({ label, value, color }: { label: string; value: number; color: string }) {
  const percent = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2">
      <span className="w-[56px] truncate text-[11px] text-gray-600">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
        <div
          className={`progress-animated h-full rounded-full ${color}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="w-8 text-right text-[11px] font-semibold text-gray-700">
        {percent}%
      </span>
    </div>
  );
}

export function SectionCard({ section, eventId, highlight = false }: SectionCardProps) {
  return (
    <Link href={`/venue/${eventId}/section/${section.id}`}>
      <div className={`card-hover overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-1000 ${
        highlight
          ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/30 shadow-md scale-[1.01]"
          : "border-gray-100"
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-pink-50 to-purple-50 px-4 py-3">
          <div className="text-base font-bold text-gray-900">{section.name}</div>
          {section.fc_rate >= 0.5 && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">
              FC多め
            </span>
          )}
          {section.upgrade_rate >= 0.15 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
              アプグレ報告あり
            </span>
          )}
        </div>

        {/* Lottery distribution bars */}
        <div className="space-y-1.5 px-4 py-3">
          <LotteryBar label="FC" value={section.fc_rate} color="bg-gradient-to-r from-blue-300 to-blue-500" />
          <LotteryBar label="一般" value={section.general_rate} color="bg-gradient-to-r from-green-300 to-green-500" />
          <LotteryBar label="アプグレ" value={section.upgrade_rate} color="bg-gradient-to-r from-amber-300 to-amber-500" />
          <LotteryBar label="復活" value={section.revival_rate} color="bg-gradient-to-r from-purple-300 to-purple-400" />
          <LotteryBar label="制作開放" value={section.production_rate} color="bg-gradient-to-r from-gray-300 to-gray-400" />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-50 px-4 py-2">
          <span className="text-[10px] text-gray-400">
            {section.description}
          </span>
          <span className="text-[10px] font-medium text-[var(--accent)]">
            詳細を見る →
          </span>
        </div>
      </div>
    </Link>
  );
}
