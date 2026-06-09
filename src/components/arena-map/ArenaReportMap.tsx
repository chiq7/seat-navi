"use client";

import { useMemo, useState } from "react";
import type { ArenaReportMapProps, ColorMode, ArenaBlock } from "@/lib/arena-map/arenaMapTypes";
import {
  COLOR_MODE_OPTIONS,
  COLOR_MODE_LEGENDS,
  cellFillColor,
  REPORTED_FILL,
  UNREPORTED_FILL,
} from "@/lib/arena-map/arenaMapColors";
import {
  SVG_W,
  STAGE_TOP,
  STAGE_H,
  STAGE_GAP,
  BRAND_NAME,
  BRAND_DOMAIN,
  BLOCK_SIZE,
  BLOCK_GAP,
  GRID_STEP,
  GRID_START_X,
  FIXED_PREFIXES,
  buildFixedArenaGrid,
} from "@/lib/arena-map/arenaMapLayout";

// ─── ブロック色決定 ──────────────────────────────────────────────────────────

function blockFill(block: ArenaBlock, colorMode: ColorMode, isCompact: boolean): string {
  if (!block.hasReports || block.cells.length === 0) return UNREPORTED_FILL;
  if (isCompact) return REPORTED_FILL;
  return cellFillColor(block.cells[0], colorMode);
}

// ─── コンポーネント ───────────────────────────────────────────────────────────

export function ArenaReportMap({
  eventId,
  reports,
  variant = "full",
  compactVenueName,
  compactDateLabel,
  submitPredictionHref,
}: ArenaReportMapProps) {
  const [colorMode, setColorMode] = useState<ColorMode>("lottery");
  const [shareStatus, setShareStatus] = useState("");
  void eventId;
  const isCompact = variant === "compact";
  const compactHeaderH = isCompact && (compactVenueName || compactDateLabel) ? 20 : 0;
  const stageTop = STAGE_TOP + compactHeaderH;

  // ─── レイアウト計算 ─────────────────────────────────────────────────────────

  const layout = useMemo(() => {
    const { gridBlocks, overflowBlocks } = buildFixedArenaGrid(reports);
    const bandTop = stageTop + STAGE_H + STAGE_GAP;

    const positioned = gridBlocks.map((b) => ({
      ...b,
      svgX: GRID_START_X + b.position.col * GRID_STEP,
      svgY: bandTop + b.position.row * GRID_STEP,
    }));

    const gridH = FIXED_PREFIXES.length * BLOCK_SIZE + (FIXED_PREFIXES.length - 1) * BLOCK_GAP;
    const overflowY = bandTop + gridH + 22;
    const overflowH = overflowBlocks.length > 0 ? BLOCK_SIZE + 20 : 0;
    const svgH = bandTop + gridH + 12 + overflowH;

    return { positioned, overflowBlocks, svgH, overflowY };
  }, [reports, stageTop]);

  // ─── 共有処理 ────────────────────────────────────────────────────────────────

  async function handleShare() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${BRAND_NAME}の座席報告マップ`,
          text: "このマップをスクショして、スマホの編集機能で花道・センステ予想を書き込んで投稿しよう",
          url,
        });
        setShareStatus("共有を開きました");
      } else {
        await navigator.clipboard.writeText(url);
        setShareStatus("URLをコピーしました");
      }
    } catch {
      setShareStatus("");
    }
  }

  const { positioned, overflowBlocks, svgH, overflowY } = layout;
  const activeLegend = COLOR_MODE_LEGENDS[colorMode];

  // ─── JSX ────────────────────────────────────────────────────────────────────

  return (
    <div
      className={
        isCompact
          ? "overflow-visible bg-white"
          : "mb-4 overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
      }
    >
      {!isCompact && (
        <>
          <div className="mb-2 text-center">
            <p className="text-xs font-bold text-gray-700">
              座席報告マップ
              <span className="ml-2 text-[11px] font-bold text-gray-600">
                {BRAND_NAME}｜{BRAND_DOMAIN}
              </span>
            </p>
          </div>

          {/* 色分け切替 */}
          <div className="mb-1 rounded-lg border border-gray-200 bg-gray-50 px-1.5 py-1">
            <div className="flex flex-wrap items-center justify-center gap-1">
              {COLOR_MODE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  disabled={option.disabled}
                  onClick={() => setColorMode(option.value)}
                  className={`rounded-full border px-2 py-0.5 text-[9px] font-bold shadow-sm transition-all active:scale-95 ${
                    colorMode === option.value
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-200 bg-white text-gray-600"
                  } disabled:cursor-not-allowed disabled:opacity-45`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {/* 凡例 */}
            <div className="mt-1 flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5">
              {activeLegend.map((item) => (
                <div key={item.label} className="flex items-center gap-0.5">
                  <span
                    className="inline-block h-2 w-2 shrink-0 rounded-[2px] shadow-sm ring-1 ring-black/5"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-[8px] font-semibold text-gray-600">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* SVGマップ */}
      <svg
        viewBox={`0 0 ${SVG_W} ${svgH}`}
        width="100%"
        aria-label="座席報告マップ（参考・模式図）"
        style={{ overflow: "visible" }}
      >
        {/* コンパクト見出し */}
        {isCompact && (compactVenueName || compactDateLabel) && (
          <text x={SVG_W / 2} y={11} textAnchor="middle" fill="#374151">
            {compactVenueName && (
              <tspan fontSize={8.5} fontWeight="bold">{compactVenueName}</tspan>
            )}
            {compactVenueName && compactDateLabel && <tspan dx={7}> </tspan>}
            {compactDateLabel && (
              <tspan fontSize={7.2} fontWeight="600" fill="#6B7280">{compactDateLabel}</tspan>
            )}
          </text>
        )}

        {/* メインステージ */}
        <rect x={SVG_W / 2 - 90} y={stageTop} width={180} height={STAGE_H} rx={5} fill="#1F2937" />
        <text
          x={SVG_W / 2}
          y={stageTop + STAGE_H / 2 + 2}
          textAnchor="middle"
          fill="white"
          fontSize={8}
          fontWeight="bold"
        >
          メインステージ
        </text>

        {/* A〜H × 1〜8 固定ブロックグリッド */}
        {positioned.map((pb) => (
          <g key={pb.blockName}>
            <rect
              x={pb.svgX}
              y={pb.svgY}
              width={BLOCK_SIZE}
              height={BLOCK_SIZE}
              rx={2}
              fill={blockFill(pb, colorMode, isCompact)}
            />
            <text
              x={pb.svgX + BLOCK_SIZE / 2}
              y={pb.svgY + BLOCK_SIZE / 2 + 3}
              textAnchor="middle"
              fill={pb.hasReports ? "#ffffff" : "#C4B5DC"}
              fontSize={7}
              fontWeight="bold"
            >
              {pb.blockName}
            </text>
            {/* 件数バッジ（2件以上の場合のみ） */}
            {pb.hasReports && pb.cells.length > 1 && (
              <text
                x={pb.svgX + BLOCK_SIZE - 2}
                y={pb.svgY + 7}
                textAnchor="end"
                fill="#ffffff"
                fillOpacity={0.85}
                fontSize={5.5}
              >
                {pb.cells.length}
              </text>
            )}
          </g>
        ))}

        {/* その他（グリッド外）ブロック */}
        {overflowBlocks.length > 0 && (
          <g>
            <text x={GRID_START_X} y={overflowY - 5} fill="#9CA3AF" fontSize={7} fontWeight="bold">
              その他ブロック
            </text>
            {overflowBlocks.map((ob, i) => {
              const ox = GRID_START_X + i * (BLOCK_SIZE + BLOCK_GAP);
              return (
                <g key={ob.blockName}>
                  <rect
                    x={ox}
                    y={overflowY}
                    width={BLOCK_SIZE}
                    height={BLOCK_SIZE}
                    rx={2}
                    fill={blockFill(ob, colorMode, isCompact)}
                  />
                  <text
                    x={ox + BLOCK_SIZE / 2}
                    y={overflowY + BLOCK_SIZE / 2 + 3}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize={6}
                    fontWeight="bold"
                  >
                    {ob.blockName}
                  </text>
                </g>
              );
            })}
          </g>
        )}

        {/* ウォーターマーク（fullのみ） */}
        {!isCompact && (
          <text
            x={SVG_W / 2}
            y={svgH / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#111827"
            fillOpacity={0.14}
            fontSize={22}
            fontWeight="bold"
            transform={`rotate(-18 ${SVG_W / 2} ${svgH / 2})`}
            pointerEvents="none"
          >
            {BRAND_DOMAIN}
          </text>
        )}
      </svg>

      {/* 共有・投稿ボタン（fullのみ） */}
      {!isCompact && (
        <div className="mt-3 rounded-xl border border-purple-100 bg-purple-50/60 p-3">
          <p className="text-[11px] font-bold text-gray-800">
            このマップをスクショして、スマホの編集機能で花道・センステ予想を書き込んで投稿しよう
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleShare}
              className="rounded-full bg-gray-900 px-3 py-2 text-[11px] font-bold text-white"
            >
              このマップを共有する
            </button>
            {submitPredictionHref ? (
              <a
                href={submitPredictionHref}
                className="rounded-full bg-purple-600 px-3 py-2 text-center text-[11px] font-bold text-white shadow-sm shadow-purple-200 active:scale-95"
              >
                予想画像を投稿する
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="rounded-full bg-gray-200 px-3 py-2 text-[11px] font-bold text-gray-500"
              >
                予想画像を投稿する（準備中）
              </button>
            )}
          </div>
          {shareStatus && <p className="mt-2 text-[10px] text-gray-500">{shareStatus}</p>}
        </div>
      )}
    </div>
  );
}
