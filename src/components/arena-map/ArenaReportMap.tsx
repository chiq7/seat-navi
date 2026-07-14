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
  STAGE_TOP,
  STAGE_GAP,
  STAGE_W,
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
  buildFixedArenaGrid,
  computeDynamicSvgWidth,
  computeGridCenterX,
  computeWatermarkPositions,
} from "@/lib/arena-map/arenaMapLayout";

const STAGE_H_DISPLAY = 40;

// その他ブロックの初期表示件数・超過時は「もっと見る」で全件表示に切り替える
const OVERFLOW_VISIBLE_LIMIT = 5;
// その他ブロックを複数行に折り返す際の行ピッチ（ブロック高さ+ラベル分の余白）
const OVERFLOW_ROW_STEP = BLOCK_H + 16;

// ドラッグ操作の判定用: この距離未満の移動はタップ扱い（将来の座席タップ詳細機能向けに区別できるようにしておく）
const DRAG_AXIS_THRESHOLD_PX = 6;

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  startScrollLeft: number;
  axis: "x" | "y" | null;
};

// ─── コンポーネント ───────────────────────────────────────────────────────────

export function ArenaReportMap({
  eventId,
  reports,
  variant = "full",
  compactVenueName,
  compactDateLabel,
  submitPredictionHref,
  colorModeExternal,
  hideShareSection = false,
  mapFullBleed = false,
  svgRef,
}: ArenaReportMapProps) {
  const [colorMode, setColorMode] = useState<ColorMode>("lottery");
  const [shareStatus, setShareStatus] = useState("");
  const [showAllOverflow, setShowAllOverflow] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<DragState | null>(null);
  void eventId;
  const isCompact = variant === "compact";
  const isControlled = colorModeExternal !== undefined;
  const activeColorMode = colorModeExternal ?? colorMode;

  useEffect(() => {
    if (isCompact || !scrollRef.current) return;
    const el = scrollRef.current;
    el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
  }, [isCompact]);
  const compactHeaderH = isCompact && (compactVenueName || compactDateLabel) ? 20 : 0;
  const stageTop = STAGE_TOP + compactHeaderH;

  // ─── ドラッグ・スワイプでの横移動（scrollLeftを直接操作。ページの縦スクロールとは競合しない） ──

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (isCompact) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const el = scrollRef.current;
    if (!el) return;
    dragStateRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startScrollLeft: el.scrollLeft,
      axis: null,
    };
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const state = dragStateRef.current;
    const el = scrollRef.current;
    if (!state || !el || state.pointerId !== e.pointerId) return;

    const dx = e.clientX - state.startX;
    const dy = e.clientY - state.startY;

    if (state.axis === null) {
      if (Math.abs(dx) < DRAG_AXIS_THRESHOLD_PX && Math.abs(dy) < DRAG_AXIS_THRESHOLD_PX) return;
      state.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      if (state.axis === "x") el.setPointerCapture(state.pointerId);
    }

    // 縦方向優位のドラッグはページの通常スクロールに委ね、こちらでは何もしない
    if (state.axis !== "x") return;

    e.preventDefault();
    const maxScrollLeft = el.scrollWidth - el.clientWidth;
    el.scrollLeft = Math.max(0, Math.min(state.startScrollLeft - dx, maxScrollLeft));
  }

  function endDrag(e: React.PointerEvent<HTMLDivElement>) {
    const state = dragStateRef.current;
    const el = scrollRef.current;
    if (state && el && state.axis === "x" && el.hasPointerCapture(state.pointerId)) {
      el.releasePointerCapture(state.pointerId);
    }
    dragStateRef.current = null;
  }

  // ─── レイアウト計算 ─────────────────────────────────────────────────────────

  const layout = useMemo(() => {
    const { gridBlocks, overflowBlocks, gridRowPrefixes, gridColNums } = buildFixedArenaGrid(reports);
    const gridCols = gridColNums.length;
    const gridRows = gridRowPrefixes.length;
    const svgW = computeDynamicSvgWidth(gridCols);
    const gridCenterX = computeGridCenterX(gridCols);
    const stageX = gridCenterX - STAGE_W / 2;

    const bandTop = stageTop + STAGE_H_DISPLAY + STAGE_GAP;

    const positioned = gridBlocks.map((b) => {
      const bRows  = Math.max(DEFAULT_BLOCK_ROWS,  b.maxRow);
      const bSeats = Math.max(DEFAULT_BLOCK_SEATS, b.maxSeat);
      return {
        ...b,
        svgX: GRID_START_X + b.position.col * GRID_STEP_X,
        svgY: bandTop + COL_HEADER_H + b.position.row * GRID_STEP_Y,
        bRows,
        bSeats,
        cellW: BLOCK_W / bSeats,
        cellH: BLOCK_H / bRows,
      };
    });

    const gridH = gridRows * BLOCK_H + (gridRows - 1) * BLOCK_GAP_Y;
    const overflowY = bandTop + COL_HEADER_H + gridH + 16;

    const visibleOverflowBlocks = showAllOverflow ? overflowBlocks : overflowBlocks.slice(0, OVERFLOW_VISIBLE_LIMIT);
    const hasMoreOverflow = overflowBlocks.length > OVERFLOW_VISIBLE_LIMIT;
    const overflowBlocksPerRow = Math.max(1, Math.floor((svgW - GRID_START_X * 2) / GRID_STEP_X));
    const overflowRowCount =
      visibleOverflowBlocks.length > 0 ? Math.ceil(visibleOverflowBlocks.length / overflowBlocksPerRow) : 0;
    const overflowH =
      overflowBlocks.length > 0 ? overflowRowCount * OVERFLOW_ROW_STEP + (hasMoreOverflow ? OVERFLOW_ROW_STEP : 0) : 0;

    const svgH = bandTop + COL_HEADER_H + gridH + 10 + overflowH;
    const watermarkPositions = computeWatermarkPositions(gridCols, gridRows, bandTop);

    return {
      positioned,
      watermarkPositions,
      overflowBlocks,
      visibleOverflowBlocks,
      hasMoreOverflow,
      overflowBlocksPerRow,
      overflowRowCount,
      gridRowPrefixes,
      gridColNums,
      gridCols,
      svgW,
      stageX,
      gridCenterX,
      svgH,
      overflowY,
      bandTop,
    };
  }, [reports, stageTop, showAllOverflow]);

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

  const {
    positioned,
    watermarkPositions,
    overflowBlocks,
    visibleOverflowBlocks,
    hasMoreOverflow,
    overflowBlocksPerRow,
    overflowRowCount,
    gridRowPrefixes,
    gridColNums,
    svgW,
    stageX,
    gridCenterX,
    svgH,
    overflowY,
    bandTop,
  } = layout;
  const activeLegend = COLOR_MODE_LEGENDS[activeColorMode];

  // ─── JSX ────────────────────────────────────────────────────────────────────

  return (
    <div
      className={
        isCompact
          ? "overflow-visible bg-white"
          : mapFullBleed
            ? "overflow-hidden pb-4 pt-1.5"
            : "mb-4 overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
      }
    >
      {!isCompact && (
        <>
          {/* 色分け切替（外部制御時は非表示） */}
          {!isControlled && (
            <div className={`mb-1 flex flex-wrap items-center justify-center gap-1${mapFullBleed ? " mx-4" : ""}`}>
              {COLOR_MODE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  disabled={option.disabled}
                  onClick={() => setColorMode(option.value)}
                  className={`rounded-full border px-2 py-0.5 text-[9px] font-bold shadow-sm transition-all active:scale-95 ${
                    activeColorMode === option.value
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-200 bg-white text-gray-600"
                  } disabled:cursor-not-allowed disabled:opacity-45`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
          {/* 凡例 */}
          <div className={`mb-1.5 overflow-hidden rounded-lg border border-gray-200 bg-gray-50${mapFullBleed ? " mx-4" : ""}`}>
            <div className="flex divide-x divide-gray-200">
              {activeLegend.map((item) => (
                <div key={item.label} className="flex flex-1 items-center justify-center gap-1 py-1">
                  <span
                    className="inline-block h-2 w-2 shrink-0 rounded-full ring-1 ring-black/5"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-[9px] font-semibold text-gray-600">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
          {/* 区切り線: ボタン・ナビ段 / ステージ段 */}
          <div className="mt-2 mb-2 border-t-2 border-gray-200" />
        </>
      )}

      {/* SVGマップ — full: ドラッグ/スワイプで横移動(初期位置中央、スクロールバー非表示), compact: 中央固定・移動なし */}
      {/* ドラッグ操作でラベル・透かしのテキストが選択されないよう、マップ全体でテキスト選択を無効化する */}
      <div
        ref={isCompact ? undefined : scrollRef}
        className={isCompact ? "overflow-hidden" : "overflow-x-auto hide-scrollbar cursor-grab touch-pan-y active:cursor-grabbing"}
        style={{
          userSelect: "none",
          WebkitUserSelect: "none",
          WebkitTouchCallout: "none",
        }}
        onPointerDown={isCompact ? undefined : handlePointerDown}
        onPointerMove={isCompact ? undefined : handlePointerMove}
        onPointerUp={isCompact ? undefined : endDrag}
        onPointerCancel={isCompact ? undefined : endDrag}
      >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${svgW} ${svgH}`}
        style={{
          width: `${svgW}px`,
          display: "block",
          overflow: "visible",
          userSelect: "none",
          WebkitUserSelect: "none",
          WebkitTouchCallout: "none",
          ...(isCompact ? { marginLeft: "50%", transform: "translateX(-50%)" } : {}),
        }}
        aria-label="座席報告マップ（参考・模式図）"
      >
        {/* コンパクト見出し */}
        {isCompact && (compactVenueName || compactDateLabel) && (
          <text x={svgW / 2} y={11} textAnchor="middle" fill="#374151">
            {compactVenueName && (
              <tspan fontSize={8.5} fontWeight="bold">{compactVenueName}</tspan>
            )}
            {compactVenueName && compactDateLabel && <tspan dx={7}> </tspan>}
            {compactDateLabel && (
              <tspan fontSize={7.2} fontWeight="600" fill="#6B7280">{compactDateLabel}</tspan>
            )}
          </text>
        )}

        {/* 1. ステージ（列数の中央に自動配置） */}
        <image
          href="/images/arena-prediction/main-stag7.png"
          x={stageX}
          y={4}
          width={STAGE_W}
          height={40}
          preserveAspectRatio="xMidYMid meet"
        />
        <text
          x={gridCenterX}
          y={4 + 40 / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          pointerEvents="none"
          fontSize={17}
          fontWeight="bold"
          fill="#1F2937"
          style={{ letterSpacing: "0.05em", filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.12))" }}
        >
          STAGE
        </text>

        {/* 2. グリッドのセル（背景・グリッド線のみ。報告ドットはまだ描かない） */}
        {positioned.map((pb) => {
          const hPath = Array.from({ length: pb.bRows - 1 }, (_, i) => {
            const ly = pb.svgY + (i + 1) * pb.cellH;
            return `M${pb.svgX},${ly}H${pb.svgX + BLOCK_W}`;
          }).join("");
          const vPath = Array.from({ length: pb.bSeats - 1 }, (_, i) => {
            const lx = pb.svgX + (i + 1) * pb.cellW;
            return `M${lx},${pb.svgY}V${pb.svgY + BLOCK_H}`;
          }).join("");

          return (
            <g key={pb.blockName}>
              <rect x={pb.svgX} y={pb.svgY} width={BLOCK_W} height={BLOCK_H} fill={UNREPORTED_FILL} />
              {hPath && (
                <path d={hPath} stroke={GRID_STROKE} strokeWidth={GRID_STROKE_W} fill="none" />
              )}
              {vPath && (
                <path d={vPath} stroke={GRID_STROKE} strokeWidth={GRID_STROKE_W} fill="none" />
              )}
            </g>
          );
        })}

        {/* 3. ウォーターマーク（fullのみ。グリッドの上に薄く乗せるが、ドット・ラベルより背面にする。対角線上2箇所） */}
        {!isCompact &&
          watermarkPositions.map((pos, i) => (
            <text
              key={i}
              x={pos.x}
              y={pos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#111827"
              fillOpacity={0.08}
              fontSize={22}
              fontWeight="bold"
              transform={`rotate(-18 ${pos.x} ${pos.y})`}
              pointerEvents="none"
            >
              {BRAND_DOMAIN}
            </text>
          ))}

        {/* 4. ドット（報告済み座席セル） */}
        {positioned.map((pb) => (
          <g key={pb.blockName}>
            {pb.cells.map((c) => (
              <rect
                key={`${c.row}:${c.seat}`}
                x={pb.svgX + (c.seat - 1) * pb.cellW}
                y={pb.svgY + (c.row - 1) * pb.cellH}
                width={pb.cellW}
                height={pb.cellH}
                fill={isCompact ? REPORTED_FILL : cellFillColor(c, activeColorMode)}
              />
            ))}
          </g>
        ))}

        {/* 5. 列ヘッダー (1〜最終列) */}
        {gridColNums.map((num, ci) => (
          <text
            key={num}
            x={GRID_START_X + ci * GRID_STEP_X + BLOCK_W / 2}
            y={bandTop + COL_HEADER_H - 1}
            textAnchor="middle"
            fill="#6B7280"
            fontSize={7}
            fontWeight="600"
          >
            {num}
          </text>
        ))}

        {/* 5. 行ヘッダー (A〜最終行) 左右 */}
        {gridRowPrefixes.map((prefix, ri) => {
          const cy = bandTop + COL_HEADER_H + ri * GRID_STEP_Y + BLOCK_H / 2;
          const textY = cy + 2.5;
          const lx = GRID_START_X - 9;
          const rx = GRID_START_X + (gridColNums.length - 1) * GRID_STEP_X + BLOCK_W + 9;
          return (
            <g key={prefix}>
              {/* 左 */}
              <circle cx={lx} cy={cy} r={5} fill="rgba(232,95,145,0.12)" />
              <text x={lx} y={textY} textAnchor="middle" fill="#E85F91" fontSize={6} fontWeight="700">
                {prefix}
              </text>
              {/* 右 */}
              <circle cx={Math.min(rx, svgW - 6)} cy={cy} r={5} fill="rgba(232,95,145,0.12)" />
              <text x={Math.min(rx, svgW - 6)} y={textY} textAnchor="middle" fill="#E85F91" fontSize={6} fontWeight="700">
                {prefix}
              </text>
            </g>
          );
        })}

        {/* その他（グリッド外）ブロック — 報告件数の多い順、同数はブロック名昇順。6種類以上は先頭5件+もっと見る */}
        {overflowBlocks.length > 0 && (
          <g>
            <text x={GRID_START_X} y={overflowY - 5} fill="#9CA3AF" fontSize={7} fontWeight="bold">
              その他ブロック
            </text>
            {visibleOverflowBlocks.map((ob, i) => {
              const rowIdx = Math.floor(i / overflowBlocksPerRow);
              const colIdx = i % overflowBlocksPerRow;
              const ox = GRID_START_X + colIdx * (BLOCK_W + BLOCK_GAP_X);
              const oy = overflowY + rowIdx * OVERFLOW_ROW_STEP;
              const bRows  = Math.max(DEFAULT_BLOCK_ROWS,  ob.maxRow);
              const bSeats = Math.max(DEFAULT_BLOCK_SEATS, ob.maxSeat);
              const cellW  = BLOCK_W / bSeats;
              const cellH  = BLOCK_H / bRows;
              const hPath = Array.from({ length: bRows - 1 }, (_, i2) => {
                const ly = oy + (i2 + 1) * cellH;
                return `M${ox},${ly}H${ox + BLOCK_W}`;
              }).join("");
              const vPath = Array.from({ length: bSeats - 1 }, (_, i2) => {
                const lx = ox + (i2 + 1) * cellW;
                return `M${lx},${oy}V${oy + BLOCK_H}`;
              }).join("");
              return (
                <g key={ob.blockName}>
                  <rect x={ox} y={oy} width={BLOCK_W} height={BLOCK_H} fill={UNREPORTED_FILL} />
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
                      y={oy + (c.row - 1) * cellH}
                      width={cellW}
                      height={cellH}
                      fill={isCompact ? REPORTED_FILL : cellFillColor(c, activeColorMode)}
                    />
                  ))}
                  <text
                    x={ox + BLOCK_W / 2}
                    y={oy + BLOCK_H + 6}
                    textAnchor="middle"
                    fill="#9CA3AF"
                    fontSize={6}
                    fontWeight="bold"
                  >
                    {ob.blockName} ({ob.cells.length})
                  </text>
                </g>
              );
            })}
            {hasMoreOverflow && (
              <text
                x={GRID_START_X}
                y={overflowY + overflowRowCount * OVERFLOW_ROW_STEP + 6}
                fill="#6B7280"
                fontSize={7}
                fontWeight="bold"
                style={{ cursor: "pointer" }}
                onClick={() => setShowAllOverflow((v) => !v)}
              >
                {showAllOverflow ? "閉じる" : `もっと見る（他${overflowBlocks.length - OVERFLOW_VISIBLE_LIMIT}件）`}
              </text>
            )}
          </g>
        )}
      </svg>
      </div>

      {/* 共有・投稿ボタン（fullのみ・hideShareSection時は非表示） */}
      {!isCompact && !hideShareSection && (
        <div className={`mt-3 rounded-xl border border-purple-100 bg-purple-50/60 p-3${mapFullBleed ? " mx-4" : ""}`}>
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
