"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  STAGE_TOP,
  STAGE_H,
  STAGE_GAP,
  BRAND_NAME,
  BRAND_DOMAIN,
  BLOCK_W,
  BLOCK_H,
  BLOCK_GAP_X,
  BLOCK_GAP_Y,
  GRID_STEP_X,
  GRID_STEP_Y,
  GRID_START_X,
  COL_HEADER_H,
  DEFAULT_BLOCK_SEATS,
  DEFAULT_BLOCK_ROWS,
  GRID_STROKE_W,
  FIXED_PREFIXES,
  FIXED_NUMS,
  buildFixedArenaGrid,
} from "@/lib/arena-map/arenaMapLayout";

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
  const scrollRef = useRef<HTMLDivElement>(null);
  void eventId;
  const isCompact = variant === "compact";

  useEffect(() => {
    if (isCompact || !scrollRef.current) return;
    const el = scrollRef.current;
    el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
  }, [isCompact]);
  const compactHeaderH = isCompact && (compactVenueName || compactDateLabel) ? 20 : 0;
  const stageTop = STAGE_TOP + compactHeaderH;

  // ─── レイアウト計算 ─────────────────────────────────────────────────────────

  const layout = useMemo(() => {
    const { gridBlocks, overflowBlocks } = buildFixedArenaGrid(reports);
    const bandTop = stageTop + STAGE_H + STAGE_GAP;

    const positioned = gridBlocks.map((b) => ({
      ...b,
      svgX: GRID_START_X + b.position.col * GRID_STEP_X,
      svgY: bandTop + COL_HEADER_H + b.position.row * GRID_STEP_Y,
    }));

    const gridH = FIXED_PREFIXES.length * BLOCK_H + (FIXED_PREFIXES.length - 1) * BLOCK_GAP_Y;
    const overflowY = bandTop + COL_HEADER_H + gridH + 16;
    const overflowH = overflowBlocks.length > 0 ? BLOCK_H + 16 : 0;
    const svgH = bandTop + COL_HEADER_H + gridH + 10 + overflowH;

    return { positioned, overflowBlocks, svgH, overflowY, bandTop };
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

  const { positioned, overflowBlocks, svgH, overflowY, bandTop } = layout;
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

      {/* SVGマップ — full: 横スクロール(初期位置中央), compact: 中央固定・スクロールなし */}
      <div ref={isCompact ? undefined : scrollRef} className={isCompact ? "overflow-hidden" : "overflow-x-auto"}>
      <svg
        viewBox={`0 0 ${SVG_W} ${svgH}`}
        style={{
          width: `${SVG_W}px`,
          display: "block",
          overflow: "visible",
          ...(isCompact ? { marginLeft: "50%", transform: "translateX(-50%)" } : {}),
        }}
        aria-label="座席報告マップ（参考・模式図）"
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

        {/* 列ヘッダー (1〜8) */}
        {FIXED_NUMS.map((num, ci) => (
          <text
            key={num}
            x={GRID_START_X + ci * GRID_STEP_X + BLOCK_W / 2}
            y={bandTop + COL_HEADER_H - 1}
            textAnchor="middle"
            fill="#9CA3AF"
            fontSize={5}
            fontWeight="600"
          >
            {num}
          </text>
        ))}

        {/* 行ヘッダー (A〜H) */}
        {FIXED_PREFIXES.map((prefix, ri) => (
          <text
            key={prefix}
            x={GRID_START_X - 3}
            y={bandTop + COL_HEADER_H + ri * GRID_STEP_Y + BLOCK_H / 2 + 2}
            textAnchor="end"
            fill="#9CA3AF"
            fontSize={5}
            fontWeight="600"
          >
            {prefix}
          </text>
        ))}

        {/* A〜H × 1〜8 固定ブロックグリッド（座席セル表示） */}
        {positioned.map((pb) => {
          const bRows  = Math.max(DEFAULT_BLOCK_ROWS,  pb.maxRow);
          const bSeats = Math.max(DEFAULT_BLOCK_SEATS, pb.maxSeat);
          const cellW  = BLOCK_W / bSeats;
          const cellH  = BLOCK_H / bRows;

          const hPath = Array.from({ length: bRows - 1 }, (_, i) => {
            const ly = pb.svgY + (i + 1) * cellH;
            return `M${pb.svgX},${ly}H${pb.svgX + BLOCK_W}`;
          }).join("");
          const vPath = Array.from({ length: bSeats - 1 }, (_, i) => {
            const lx = pb.svgX + (i + 1) * cellW;
            return `M${lx},${pb.svgY}V${pb.svgY + BLOCK_H}`;
          }).join("");

          return (
            <g key={pb.blockName}>
              {/* 背景 */}
              <rect x={pb.svgX} y={pb.svgY} width={BLOCK_W} height={BLOCK_H} fill={UNREPORTED_FILL} />
              {/* グリッド線 */}
              {hPath && (
                <path d={hPath} stroke={GRID_STROKE} strokeWidth={GRID_STROKE_W} fill="none" />
              )}
              {vPath && (
                <path d={vPath} stroke={GRID_STROKE} strokeWidth={GRID_STROKE_W} fill="none" />
              )}
              {/* 報告済み座席セル */}
              {pb.cells.map((c) => (
                <rect
                  key={`${c.row}:${c.seat}`}
                  x={pb.svgX + (c.seat - 1) * cellW}
                  y={pb.svgY + (c.row - 1) * cellH}
                  width={cellW}
                  height={cellH}
                  fill={isCompact ? REPORTED_FILL : cellFillColor(c, colorMode)}
                />
              ))}
            </g>
          );
        })}

        {/* その他（グリッド外）ブロック */}
        {overflowBlocks.length > 0 && (
          <g>
            <text x={GRID_START_X} y={overflowY - 5} fill="#9CA3AF" fontSize={7} fontWeight="bold">
              その他ブロック
            </text>
            {overflowBlocks.map((ob, i) => {
              const ox = GRID_START_X + i * (BLOCK_W + BLOCK_GAP_X);
              const bRows  = Math.max(DEFAULT_BLOCK_ROWS,  ob.maxRow);
              const bSeats = Math.max(DEFAULT_BLOCK_SEATS, ob.maxSeat);
              const cellW  = BLOCK_W / bSeats;
              const cellH  = BLOCK_H / bRows;
              const hPath = Array.from({ length: bRows - 1 }, (_, i2) => {
                const ly = overflowY + (i2 + 1) * cellH;
                return `M${ox},${ly}H${ox + BLOCK_W}`;
              }).join("");
              const vPath = Array.from({ length: bSeats - 1 }, (_, i2) => {
                const lx = ox + (i2 + 1) * cellW;
                return `M${lx},${overflowY}V${overflowY + BLOCK_H}`;
              }).join("");
              return (
                <g key={ob.blockName}>
                  <rect x={ox} y={overflowY} width={BLOCK_W} height={BLOCK_H} fill={UNREPORTED_FILL} />
                  {hPath && (
                    <path d={hPath} stroke={GRID_STROKE} strokeWidth={GRID_STROKE_W} fill="none" />
                  )}
                  {vPath && (
                    <path d={vPath} stroke={GRID_STROKE} strokeWidth={GRID_STROKE_W} fill="none" />
                  )}
                  {ob.cells.map((c) => (
                    <rect
                      key={`${c.row}:${c.seat}`}
                      x={ox + (c.seat - 1) * cellW}
                      y={overflowY + (c.row - 1) * cellH}
                      width={cellW}
                      height={cellH}
                      fill={isCompact ? REPORTED_FILL : cellFillColor(c, colorMode)}
                    />
                  ))}
                  <text
                    x={ox + BLOCK_W / 2}
                    y={overflowY + BLOCK_H + 6}
                    textAnchor="middle"
                    fill="#9CA3AF"
                    fontSize={5}
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
      </div>

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
