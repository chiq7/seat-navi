import type { NextRequest } from "next/server";
import { ImageResponse } from "next/og";
import { supabase } from "@/lib/supabase/client";
import {
  getEventWithArtist,
  getGroupedEventIds,
  getSeatReportRows,
  getValidPrediction,
  type MiniSeatRow,
} from "@/lib/og/eventOgData";
import { SIZE, OG_IMAGE_OPTIONS, fallbackImage, getLogoDataUrl, Logo, TestDataBadge } from "@/lib/og/ogShared";
import {
  BLOCK_W,
  BLOCK_H,
  BLOCK_GAP_Y,
  STAGE_W,
  GRID_STEP_X,
  GRID_STEP_Y,
  GRID_START_X,
  ROW_HEADER_W,
  COL_HEADER_H,
  STAGE_TOP,
  STAGE_GAP,
  BRAND_DOMAIN,
  DEFAULT_BLOCK_ROWS,
  DEFAULT_BLOCK_SEATS,
  buildFixedArenaGrid,
  computeDynamicSvgWidth,
  computeGridCenterX,
  computeWatermarkPositions,
} from "@/lib/arena-map/arenaMapLayout";
import { cellFillColor, UNREPORTED_FILL } from "@/lib/arena-map/arenaMapColors";
import type { SeatReport } from "@/lib/types";

export const runtime = "nodejs";

/** ArenaReportMap.tsx内のローカル定数(STAGE_H_DISPLAY=40)と同値。OGP専用に複製している */
const STAGE_H_DISPLAY = 40;
const MAP_SCALE = 1.35;
/** 座席報告ドットの最小表示直径(px)。マス目(cellW/cellH)からはみ出さないよう、セルサイズ基準の比率で計算する */
const DOT_MIN_SIZE = 4;
const DOT_CELL_RATIO = 0.6;
/** 行(A〜)・列(1〜)ラベルの文字サイズ。OGPの表示サイズで読める程度に、他の座標と同様MAP_SCALE基準で決める */
const ROW_LABEL_FONT_SIZE = 11;
const COL_LABEL_FONT_SIZE = 10;
/** 透かし。ArenaReportMap側(SVG fontSize=22, fillOpacity=0.14)と同じ濃さ・相対サイズになるようMAP_SCALEを掛ける */
const WATERMARK_FONT_SIZE = Math.round(22 * MAP_SCALE);
const WATERMARK_OPACITY = 0.14;
// Satoriは%指定のtransformに対応しないため、"tixrepo.com"のおおよその表示サイズを見積もってleft/topを事前補正する
const WATERMARK_BOX_W = Math.round(WATERMARK_FONT_SIZE * BRAND_DOMAIN.length * 0.56);
const WATERMARK_BOX_H = Math.round(WATERMARK_FONT_SIZE * 1.2);

/** OGP専用の簡易静的マップ描画。既存ArenaReportMap/EventArenaMapは呼ばず、座標・色分けロジックのみ再利用する */
function MiniMap({ reports }: { reports: MiniSeatRow[] }) {
  const { gridBlocks, gridRowPrefixes, gridColNums } = buildFixedArenaGrid(reports as unknown as SeatReport[]);
  const gridRowsCount = gridRowPrefixes.length;
  const gridColsCount = gridColNums.length;
  const bandTop = STAGE_TOP + STAGE_H_DISPLAY + STAGE_GAP;
  const gridTop = bandTop + COL_HEADER_H;
  const gridH = gridRowsCount * BLOCK_H + (gridRowsCount - 1) * BLOCK_GAP_Y;
  const svgW = computeDynamicSvgWidth(gridColsCount);
  const stageX = computeGridCenterX(gridColsCount) - STAGE_W / 2;
  const mapW = svgW * MAP_SCALE;
  const mapH = (gridTop + gridH + 10) * MAP_SCALE;

  return (
    <div style={{ position: "relative", width: mapW, height: mapH, display: "flex" }}>
      {/* ステージ（列数の中央に自動配置） */}
      <div
        style={{
          position: "absolute",
          left: stageX * MAP_SCALE,
          top: STAGE_TOP * MAP_SCALE,
          width: STAGE_W * MAP_SCALE,
          height: STAGE_H_DISPLAY * MAP_SCALE,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#1F2937",
          borderRadius: 10,
          color: "#ffffff",
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: 3,
        }}
      >
        STAGE
      </div>

      {/* 列ラベル(1〜最終列・上部) */}
      {gridColNums.map((num, ci) => (
        <div
          key={`col-${num}`}
          style={{
            position: "absolute",
            left: (GRID_START_X + ci * GRID_STEP_X) * MAP_SCALE,
            top: bandTop * MAP_SCALE,
            width: BLOCK_W * MAP_SCALE,
            height: COL_HEADER_H * MAP_SCALE,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: COL_LABEL_FONT_SIZE,
            fontWeight: 700,
            color: "#6B7280",
          }}
        >
          {num}
        </div>
      ))}

      {/* 行ラベル(A〜最終行・左側) */}
      {gridRowPrefixes.map((prefix, ri) => (
        <div
          key={`row-${prefix}`}
          style={{
            position: "absolute",
            left: 0,
            top: (gridTop + ri * GRID_STEP_Y) * MAP_SCALE,
            width: ROW_HEADER_W * MAP_SCALE,
            height: BLOCK_H * MAP_SCALE,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: ROW_LABEL_FONT_SIZE,
            fontWeight: 700,
            color: "#E85F91",
          }}
        >
          {prefix}
        </div>
      ))}

      {/* 動的グリッド（最小A〜H×1〜8、報告状況に応じて拡張） + 報告済み座席ドット */}
      {gridBlocks.map((b) => {
        const x = (GRID_START_X + b.position.col * GRID_STEP_X) * MAP_SCALE;
        const y = (gridTop + b.position.row * GRID_STEP_Y) * MAP_SCALE;
        const bRows = Math.max(DEFAULT_BLOCK_ROWS, b.maxRow);
        const bSeats = Math.max(DEFAULT_BLOCK_SEATS, b.maxSeat);
        const cellW = (BLOCK_W / bSeats) * MAP_SCALE;
        const cellH = (BLOCK_H / bRows) * MAP_SCALE;
        return (
          <div
            key={b.blockName}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: BLOCK_W * MAP_SCALE,
              height: BLOCK_H * MAP_SCALE,
              backgroundColor: UNREPORTED_FILL,
              borderRadius: 2,
              display: "flex",
            }}
          >
            {b.cells.map((c, i) => {
              // ドットはマス目(cellW/cellH)の一定比率のサイズで、セル内に収まる丸として表示する
              // （座標計算=cellW/cellH/left/topの求め方自体は変更していない）
              const dotW = Math.max(cellW * DOT_CELL_RATIO, DOT_MIN_SIZE);
              const dotH = Math.max(cellH * DOT_CELL_RATIO, DOT_MIN_SIZE);
              return (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: (c.seat - 1) * cellW + (cellW - dotW) / 2,
                    top: (c.row - 1) * cellH + (cellH - dotH) / 2,
                    width: dotW,
                    height: dotH,
                    borderRadius: "50%",
                    backgroundColor: cellFillColor(c, "lottery"),
                    display: "flex",
                  }}
                />
              );
            })}
          </div>
        );
      })}

      {/* 透かし（グリッド内3箇所に分散配置。濃さ・サイズはArenaReportMap側のSVG版と同等） */}
      {computeWatermarkPositions(gridColsCount, gridRowsCount, bandTop).map((pos, i) => (
        <div
          key={`watermark-${i}`}
          style={{
            position: "absolute",
            left: pos.x * MAP_SCALE - WATERMARK_BOX_W / 2,
            top: pos.y * MAP_SCALE - WATERMARK_BOX_H / 2,
            width: WATERMARK_BOX_W,
            height: WATERMARK_BOX_H,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: WATERMARK_FONT_SIZE,
            fontWeight: 700,
            color: "#111827",
            opacity: WATERMARK_OPACITY,
            transform: "rotate(-18deg)",
          }}
        >
          {BRAND_DOMAIN}
        </div>
      ))}
    </div>
  );
}

function renderEventImage(input: {
  artistName: string | null;
  venue: string;
  dateLabel: string;
  reports: MiniSeatRow[];
  isTestData: boolean;
  logoDataUrl: string | null;
}) {
  const { artistName, venue, dateLabel, reports, isTestData, logoDataUrl } = input;
  // スマホでは縮小表示されるため、文字は最小限にしてマップ表示領域を優先的に広げる（右65%程度）
  const RIGHT_W = Math.round(SIZE.width * 0.65);
  const LEFT_W = SIZE.width - RIGHT_W;
  const PANEL_PAD = 24;
  const cardW = RIGHT_W - PANEL_PAD * 2;
  const cardH = SIZE.height - PANEL_PAD * 2;

  return new ImageResponse(
    (
      <div
        style={{
          position: "relative",
          width: SIZE.width,
          height: SIZE.height,
          display: "flex",
          background: "linear-gradient(135deg, #FFF1F6 0%, #FFFFFF 60%)",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            width: LEFT_W,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "0 40px",
          }}
        >
          <Logo logoDataUrl={logoDataUrl} />
          {artistName && (
            <div
              style={{
                display: "flex",
                marginTop: 22,
                fontSize: 34,
                fontWeight: 800,
                color: "#111827",
                lineHeight: 1.2,
              }}
            >
              {artistName}
            </div>
          )}
          <div style={{ display: "flex", marginTop: 16, fontSize: 26, fontWeight: 700, color: "#374151" }}>
            {venue} {dateLabel}
          </div>
          <div style={{ display: "flex", marginTop: 24, fontSize: 20, fontWeight: 600, color: "#9CA3AF" }}>
            座席予想・当落・レポ
          </div>
        </div>

        <div
          style={{
            width: RIGHT_W,
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: PANEL_PAD,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: cardW,
              height: cardH,
              backgroundColor: "#ffffff",
              borderRadius: 28,
              boxShadow: "0 20px 60px rgba(0,0,0,0.08)",
            }}
          >
            <MiniMap reports={reports} />
          </div>
        </div>
        {isTestData && <TestDataBadge />}
      </div>
    ),
    OG_IMAGE_OPTIONS,
  );
}

function renderPredictionImage(input: {
  artistName: string | null;
  venue: string;
  dateLabel: string;
  imageUrl: string;
  isTestData: boolean;
  logoDataUrl: string | null;
}) {
  const { artistName, venue, dateLabel, imageUrl, isTestData, logoDataUrl } = input;
  const LEFT_W = 440;
  const RIGHT_W = SIZE.width - LEFT_W;
  const PANEL_PAD = 32;
  const boxW = RIGHT_W - PANEL_PAD * 2;
  const boxH = SIZE.height - PANEL_PAD * 2;

  return new ImageResponse(
    (
      <div
        style={{
          position: "relative",
          width: SIZE.width,
          height: SIZE.height,
          display: "flex",
          background: "linear-gradient(135deg, #FFF1F6 0%, #FFFFFF 60%)",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            width: LEFT_W,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "0 44px",
          }}
        >
          <Logo logoDataUrl={logoDataUrl} />
          {artistName && (
            <div style={{ display: "flex", marginTop: 26, fontSize: 24, fontWeight: 700, color: "#FF6B9D" }}>
              {artistName}
            </div>
          )}
          <div style={{ display: "flex", marginTop: 6, fontSize: 38, fontWeight: 800, color: "#111827" }}>
            座席予想
          </div>
          <div style={{ display: "flex", marginTop: 20, fontSize: 24, fontWeight: 600, color: "#374151" }}>
            {venue} {dateLabel}
          </div>
          <div style={{ display: "flex", marginTop: 24, fontSize: 20, fontWeight: 600, color: "#9CA3AF" }}>
            座席予想・当落・レポ
          </div>
        </div>

        <div
          style={{
            width: RIGHT_W,
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: PANEL_PAD,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: boxW,
              height: boxH,
              borderRadius: 28,
              overflow: "hidden",
              backgroundColor: "#F9FAFB",
              boxShadow: "0 20px 60px rgba(0,0,0,0.12)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              width={boxW}
              height={boxH}
              style={{ width: boxW, height: boxH, objectFit: "contain" }}
            />
          </div>
        </div>
        {isTestData && <TestDataBadge />}
      </div>
    ),
    OG_IMAGE_OPTIONS,
  );
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: eventId } = await params;
    const predictionId = req.nextUrl.searchParams.get("prediction");

    const info = await getEventWithArtist(eventId);
    if (!info) return fallbackImage();
    const { event, artist, isTestData, dateLabel } = info;
    const logoDataUrl = getLogoDataUrl();

    // テストデータの公演も見た目確認のため通常OGPを生成する（検索非露出はgenerateMetadataのrobots.noindexで担保）
    if (predictionId) {
      const pred = await getValidPrediction(eventId, predictionId);
      if (pred?.image_path) {
        const { data: urlData } = supabase.storage.from("fan-seat-predictions").getPublicUrl(pred.image_path);
        if (urlData?.publicUrl) {
          return renderPredictionImage({
            artistName: artist?.name ?? null,
            venue: event.venue,
            dateLabel,
            imageUrl: urlData.publicUrl,
            isTestData,
            logoDataUrl,
          });
        }
      }
      // 不正/存在しない/画像URL取得不可 → 通常公演OGPへフォールスルー（エラーにしない）
    }

    const groupedIds = await getGroupedEventIds(event, event.artist_slug ?? artist?.slug ?? null);
    const reportRows = await getSeatReportRows(groupedIds, 300);

    return renderEventImage({
      artistName: artist?.name ?? null,
      venue: event.venue,
      dateLabel,
      reports: reportRows,
      isTestData,
      logoDataUrl,
    });
  } catch {
    return fallbackImage();
  }
}
