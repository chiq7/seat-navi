"use client";

import { useState, useRef } from "react";
import type { SeatReport, HistoricalPattern } from "@/lib/types";

export const LOTTERY_COLOR: Record<string, string> = {
  fc1:        "bg-blue-500",
  fc2:        "bg-cyan-400",
  general:    "bg-emerald-500",
  upgrade:    "bg-orange-400",
  revival:    "bg-red-500",
  production: "bg-purple-500",
};

export const LOTTERY_LABEL: Record<string, string> = {
  fc1:        "FC1次",
  fc2:        "FC2次",
  general:    "一般",
  upgrade:    "アプグレ",
  revival:    "復活当選",
  production: "制作開放",
};

type TooltipState = { text: string; x: number; y: number } | null;

function parseBlock(name: string): { prefix: string; num: number } | null {
  const m = name.match(/^(.*?)(\d+)$/);
  if (!m) return null;
  return { prefix: m[1], num: parseInt(m[2], 10) };
}

export function AllBlocksOverview({
  blockMap,
  patterns,
}: {
  blockMap: Map<string, SeatReport[]>;
  patterns: HistoricalPattern[];
}) {
  const [tooltip, setTooltip] = useState<TooltipState>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showTip(e: React.MouseEvent | React.TouchEvent, text: string) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTooltip({ text, x: rect.left + rect.width / 2, y: rect.top - 6 });
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setTooltip(null), 1800);
  }
  function hideTip() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setTooltip(null);
  }

  const dimLookup = new Map<string, { maxRow: number; maxSeat: number }>();
  for (const p of patterns) {
    if (!p.max_row || !p.max_seat) continue;
    const ex = dimLookup.get(p.block);
    dimLookup.set(p.block, {
      maxRow:  Math.max(p.max_row,  ex?.maxRow  ?? 0),
      maxSeat: Math.max(p.max_seat, ex?.maxSeat ?? 0),
    });
  }

  const reportedSet = new Set(
    [...blockMap.entries()].filter(([, r]) => r.length > 0).map(([k]) => k)
  );
  const allBlocks = new Set([...reportedSet, ...dimLookup.keys()]);
  if (allBlocks.size === 0) return null;

  function renderBlock(block: string) {
    const reports    = blockMap.get(block) ?? [];
    const hasReports = reports.length > 0;

    let maxRow: number;
    let maxSeat: number;
    if (!hasReports) {
      maxRow = 5; maxSeat = 8;
    } else if (reports.length <= 3) {
      maxRow  = Math.min(Math.max(...reports.map((r) => r.row_num))  + 2, 6);
      maxSeat = Math.min(Math.max(...reports.map((r) => r.seat_num)) + 3, 10);
    } else {
      maxRow  = Math.min(Math.max(...reports.map((r) => r.row_num))  + 2, 20);
      maxSeat = Math.min(Math.max(...reports.map((r) => r.seat_num)) + 3, 30);
    }

    const reportedMap = new Map<string, string>();
    for (const r of reports) reportedMap.set(`${r.row_num}-${r.seat_num}`, r.lottery_type);

    return (
      <div className="flex flex-col items-center gap-[2px]">
        <span className={`text-[7px] font-bold leading-none ${!hasReports ? "text-gray-400" : "text-gray-600"}`}>
          {block}
        </span>
        {!hasReports ? (
          <div
            className="flex items-center justify-center rounded-sm"
            style={{
              width:  `${maxSeat * 5 + maxSeat - 1 + 2}px`,
              height: `${maxRow  * 5 + maxRow  - 1 + 2}px`,
              backgroundImage: "repeating-linear-gradient(45deg,#e5e7eb,#e5e7eb 3px,#d1d5db 3px,#d1d5db 6px)",
            }}
          >
            <span className="text-center text-[5px] font-bold leading-tight text-gray-400/80">
              花道/<br />候補
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-[1px] rounded-sm bg-gray-300" style={{ padding: "1px" }}>
            {Array.from({ length: maxRow }, (_, i) => i + 1).map((row) => (
              <div key={row} className="flex gap-[1px]">
                {Array.from({ length: maxSeat }, (_, i) => i + 1).map((seat) => {
                  const lt  = reportedMap.get(`${row}-${seat}`);
                  const tip = lt ? `[${block}] ${row}列 ${seat}番・${LOTTERY_LABEL[lt] ?? lt}` : undefined;
                  return (
                    <div
                      key={seat}
                      className={`h-[5px] w-[5px] shrink-0 ${
                        lt ? (LOTTERY_COLOR[lt] ?? "bg-pink-400") : "bg-white"
                      } ${lt ? "cursor-pointer" : ""}`}
                      onMouseEnter={(e) => tip && showTip(e, tip)}
                      onMouseLeave={hideTip}
                      onTouchStart={(e) => { if (tip) { e.preventDefault(); showTip(e, tip); } }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ブロック名 → prefix / num に分解して2Dグリッド配置
  const positions = new Map<string, { prefix: string; num: number }>();
  for (const block of allBlocks) {
    const p = parseBlock(block);
    if (p) positions.set(block, p);
  }

  const prefixes = [...new Set([...positions.values()].map((p) => p.prefix))]
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const nums = [...new Set([...positions.values()].map((p) => p.num))]
    .sort((a, b) => a - b);

  const cellLookup = new Map<string, string>();
  for (const [block, { prefix, num }] of positions) {
    cellLookup.set(`${prefix}__${num}`, block);
  }

  return (
    <>
      <div className="overflow-x-auto">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${nums.length}, auto)`,
            gap: "6px",
          }}
        >
          {prefixes.flatMap((prefix) =>
            nums.map((num) => {
              const block = cellLookup.get(`${prefix}__${num}`);
              return (
                <div key={`${prefix}__${num}`}>
                  {block ? renderBlock(block) : null}
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-gray-100 pt-2.5">
        {[
          { key: "fc1",        label: "FC1次",   cls: "bg-blue-500" },
          { key: "fc2",        label: "FC2次",   cls: "bg-cyan-400" },
          { key: "general",    label: "一般",     cls: "bg-emerald-500" },
          { key: "upgrade",    label: "アプグレ", cls: "bg-orange-400" },
          { key: "revival",    label: "復活",     cls: "bg-red-500" },
          { key: "production", label: "制作",     cls: "bg-purple-500" },
        ].map(({ key, label, cls }) => (
          <div key={key} className="flex items-center gap-1">
            <div className={`h-2 w-2 shrink-0 rounded-sm ${cls}`} />
            <span className="text-[10px] text-gray-500">{label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1">
          <div
            className="h-2 w-2 shrink-0 rounded-sm"
            style={{ backgroundImage: "repeating-linear-gradient(45deg,#e5e7eb,#e5e7eb 1px,#d1d5db 1px,#d1d5db 2px)" }}
          />
          <span className="text-[10px] text-gray-500">花道/候補</span>
        </div>
      </div>

      {tooltip && (
        <div
          className="pointer-events-none fixed z-[200] -translate-x-1/2 -translate-y-full rounded-lg bg-gray-900 px-2.5 py-1 text-[10px] font-semibold text-white shadow-lg"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.text}
          <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </>
  );
}
