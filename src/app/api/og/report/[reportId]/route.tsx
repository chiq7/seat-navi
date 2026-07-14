import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { getReportOgInfo } from "@/lib/og/reportOgData";
import { SIZE, fallbackImage, getLogoDataUrl, Logo, TestDataBadge } from "@/lib/og/ogShared";

export const runtime = "nodejs";

function renderReportImage(input: {
  artistName: string | null;
  venue: string;
  dateLabel: string;
  seatText: string | null;
  photoUrl: string | null;
  isTestData: boolean;
  logoDataUrl: string | null;
}) {
  const { artistName, venue, dateLabel, seatText, photoUrl, isTestData, logoDataUrl } = input;

  // 写真がない場合: 主画像なしの中央寄せ1カラムレイアウト
  if (!photoUrl) {
    return new ImageResponse(
      (
        <div
          style={{
            position: "relative",
            width: SIZE.width,
            height: SIZE.height,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #FFF1F6 0%, #FFFFFF 60%)",
            fontFamily: "sans-serif",
            padding: "0 90px",
          }}
        >
          <Logo logoDataUrl={logoDataUrl} align="center" />
          {artistName && (
            <div style={{ display: "flex", marginTop: 26, fontSize: 26, fontWeight: 700, color: "#FF6B9D" }}>
              {artistName}
            </div>
          )}
          <div style={{ display: "flex", marginTop: 8, fontSize: 44, fontWeight: 800, color: "#111827" }}>
            現地レポ
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 22,
              fontSize: 28,
              fontWeight: 700,
              color: "#374151",
              textAlign: "center",
            }}
          >
            {venue} {dateLabel}
          </div>
          {seatText && (
            <div style={{ display: "flex", marginTop: 14, fontSize: 24, fontWeight: 700, color: "#FF6B9D" }}>
              {seatText}
            </div>
          )}
          <div style={{ display: "flex", marginTop: 28, fontSize: 20, fontWeight: 600, color: "#9CA3AF" }}>
            座席予想・当落・レポ
          </div>
          {isTestData && <TestDataBadge />}
        </div>
      ),
      SIZE,
    );
  }

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
            現地レポ
          </div>
          <div style={{ display: "flex", marginTop: 20, fontSize: 24, fontWeight: 600, color: "#374151" }}>
            {venue} {dateLabel}
          </div>
          {seatText && (
            <div style={{ display: "flex", marginTop: 10, fontSize: 20, fontWeight: 700, color: "#FF6B9D" }}>
              {seatText}
            </div>
          )}
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
              src={photoUrl}
              width={boxW}
              height={boxH}
              style={{ width: boxW, height: boxH, objectFit: "contain" }}
            />
          </div>
        </div>
        {isTestData && <TestDataBadge />}
      </div>
    ),
    SIZE,
  );
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ reportId: string }> }) {
  try {
    const { reportId } = await params;
    const info = await getReportOgInfo(reportId);
    if (!info) return fallbackImage();

    const logoDataUrl = getLogoDataUrl();
    const photoUrl = info.photoPath
      ? supabase.storage.from("after-report-photos").getPublicUrl(info.photoPath).data.publicUrl
      : null;

    return renderReportImage({
      artistName: info.artistName,
      venue: info.event.venue,
      dateLabel: info.dateLabel,
      seatText: info.seatText,
      photoUrl: photoUrl || null,
      isTestData: info.isTestData,
      logoDataUrl,
    });
  } catch {
    return fallbackImage();
  }
}
