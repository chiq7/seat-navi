"use client";

import { useMemo, useState } from "react";
import type { ArenaReportMapProps, ColorMode } from "@/lib/arena-map/arenaMapTypes";
import {
  COLOR_MODE_OPTIONS,
  COLOR_MODE_LEGENDS,
  cellFillColor,
  REPORTED_FILL,
  UNREPORTED_FILL,
  GRID_STROKE,
} from "@/lib/arena-map/arenaMapColors";
import {
  SVG_W,
  MX,
  STAGE_TOP,
  STAGE_H,
  STAGE_GAP,
  LABEL_H,
  BRAND_NAME,
  BRAND_DOMAIN,
  buildArenaBlocks,
  computeGridSize,
  computeCellSize,
} from "@/lib/arena-map/arenaMapLayout";

// ─── 定数 ──────────────────────────────────────────────────────────────────

const CELL_INSET_RATIO = 0.06;
const BLOCK_LABEL_OFFSET = 3; // ブロック名テキストの上オフセット

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
  void eventId; // 将来のブロッククリック遷移で使用予定
  const isCompact = variant === "compact";
  const compactHeaderH = isCompact && (compactVenueName || compactDateLabel) ? 20 : 0;
  const stageTop = STAGE_TOP + compactHeaderH;

  // ─── レイアウト計算 ─────────────────────────────────────────────────────────

  const layout = useMemo(() => {
    const blocks = buildArenaBlocks(reports);
    const { gridRows, gridCols } = computeGridSize(blocks);
    const cell = computeCellSize(gridCols);
    const cellInset = cell * CELL_INSET_RATIO;
    const cellSize  = cell - cellInset * 2;

    // ブロックの SVG 座標を計算する
    const bandTop = stageTop + STAGE_H + STAGE_GAP;

    type PositionedBlock = (typeof blocks)[number] & {
      svgX: number;
      svgY: number;
      blockW: number;
      blockH: number;
    };

    // 各ブロックの最大 row span / seat span を計算してセルサイズを決定
    // ブロック内セルグリッドは (maxSeat - minSeat + 1) × (maxRow - minRow + 1)
    const positioned: PositionedBlock[] = blocks.map((b) => {
      const wCols = b.hasReports ? b.maxSeat - b.minSeat + 1 : 1;
      const hRows = b.hasReports ? b.maxRow  - b.minRow  + 1 : 1;
      const blockW = wCols * cell;
      const blockH = hRows * cell;
      const svgX = MX + b.position.col * (cell + 3);
      const svgY = bandTop + LABEL_H + b.position.row * (blockH + LABEL_H + 4);
      return { ...b, svgX, svgY, blockW, blockH };
    });

    const svgH = positioned.length > 0
      ? Math.max(...positioned.map((b) => b.svgY + b.blockH)) + 12
      : stageTop + STAGE_H + STAGE_GAP + 60;

    return { cell, cellInset, cellSize, positioned, gridRows, gridCols, svgH };
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

  const { cell, cellInset, cellSize, positioned, svgH } = layout;
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

        {/* 報告なし時の空グリッド表示 */}
        {positioned.length === 0 && (
          <text
            x={SVG_W / 2}
            y={stageTop + STAGE_H + STAGE_GAP + 30}
            textAnchor="middle"
            fill="#9CA3AF"
            fontSize={9}
          >
            報告データがありません
          </text>
        )}

        {/* ブロック描画 */}
        {positioned.map((pb) => (
          <g key={pb.blockName}>
            {/* ブロック名ラベル */}
            <text
              x={pb.svgX}
              y={pb.svgY - BLOCK_LABEL_OFFSET}
              fill="#6B7280"
              fontSize={6.5}
              fontWeight="bold"
            >
              {pb.blockName}
            </text>

            {/* 未報告席の背景 */}
            <rect
              x={pb.svgX}
              y={pb.svgY}
              width={pb.blockW}
              height={pb.blockH}
              rx={2}
              fill={UNREPORTED_FILL}
            />

            {/* グリッド線 (縦) */}
            {Array.from({ length: pb.blockW / cell - 1 }, (_, i) => (
              <line
                key={`v${i}`}
                x1={pb.svgX + (i + 1) * cell}
                y1={pb.svgY}
                x2={pb.svgX + (i + 1) * cell}
                y2={pb.svgY + pb.blockH}
                stroke={GRID_STROKE}
                strokeWidth={0.4}
              />
            ))}

            {/* グリッド線 (横) */}
            {Array.from({ length: pb.blockH / cell - 1 }, (_, i) => (
              <line
                key={`h${i}`}
                x1={pb.svgX}
                y1={pb.svgY + (i + 1) * cell}
                x2={pb.svgX + pb.blockW}
                y2={pb.svgY + (i + 1) * cell}
                stroke={GRID_STROKE}
                strokeWidth={0.4}
              />
            ))}

            {/* 報告席セル */}
            {pb.cells.map((c, i) => {
              const colIdx = c.seat - pb.minSeat;
              const rowIdx = c.row  - pb.minRow;
              return (
                <rect
                  key={`c${i}`}
                  x={pb.svgX + colIdx * cell + cellInset}
                  y={pb.svgY + rowIdx * cell + cellInset}
                  width={cellSize}
                  height={cellSize}
                  rx={0.5}
                  fill={isCompact ? REPORTED_FILL : cellFillColor(c, colorMode)}
                  fillOpacity={0.9}
                />
              );
            })}
          </g>
        ))}

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
