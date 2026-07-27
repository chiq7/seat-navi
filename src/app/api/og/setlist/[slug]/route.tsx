import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { getSetlistOgInfo } from "@/lib/og/setlistOgData";
import { SIZE, OG_IMAGE_OPTIONS, fallbackImage, getLogoDataUrl, Logo, TestDataBadge } from "@/lib/og/ogShared";

export const runtime = "nodejs";

function renderSetlistImage(input: {
  artistName: string;
  tourName: string | null;
  songCount: number;
  venue: string | null;
  dateLabel: string | null;
  isTestData: boolean;
  logoDataUrl: string | null;
}) {
  const { artistName, tourName, songCount, venue, dateLabel, isTestData, logoDataUrl } = input;
  // 長いツアー名は文字サイズを落として1200px幅・中央寄せに収める（曲名一覧などは表示しない）
  const tourFontSize = tourName && tourName.length > 22 ? 22 : tourName && tourName.length > 14 ? 26 : 30;
  const hasEventInfo = Boolean(venue && dateLabel);

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
          padding: "0 90px 70px",
        }}
      >
        <Logo logoDataUrl={logoDataUrl} align="center" heightPx={96} />
        <div style={{ display: "flex", marginTop: 24, fontSize: 30, fontWeight: 700, color: "#FF6B9D" }}>
          {artistName}
        </div>
        {tourName && (
          <div
            style={{
              display: "flex",
              marginTop: 6,
              fontSize: tourFontSize,
              fontWeight: 700,
              color: "#374151",
              textAlign: "center",
              maxWidth: 940,
            }}
          >
            {tourName}
          </div>
        )}

        {/* セトリOGPで最重要の情報（曲数 / 投稿促し）を最も大きく表示する */}
        {songCount > 0 ? (
          <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginTop: 28 }}>
            <div style={{ display: "flex", fontSize: 46, fontWeight: 800, color: "#111827" }}>セットリスト</div>
            <div style={{ display: "flex", fontSize: 66, fontWeight: 800, color: "#FF6B9D" }}>全{songCount}曲</div>
          </div>
        ) : (
          <div style={{ display: "flex", marginTop: 28, fontSize: 58, fontWeight: 800, color: "#111827" }}>
            セットリストを投稿しよう
          </div>
        )}

        {hasEventInfo && (
          <div style={{ display: "flex", marginTop: 14, fontSize: 32, fontWeight: 700, color: "#374151" }}>
            {`${dateLabel} ${venue}`}
          </div>
        )}

        <div style={{ display: "flex", marginTop: 28, fontSize: 24, fontWeight: 600, color: "#9CA3AF" }}>
          座席予想・当落・レポ
        </div>
        {isTestData && <TestDataBadge />}
      </div>
    ),
    OG_IMAGE_OPTIONS,
  );
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const info = await getSetlistOgInfo(slug);
    if (!info) return fallbackImage();

    const logoDataUrl = getLogoDataUrl();

    return renderSetlistImage({
      artistName: info.artist.name,
      tourName: info.tourName,
      songCount: info.songCount,
      venue: info.event?.venue ?? null,
      dateLabel: info.dateLabel,
      isTestData: info.isTestData,
      logoDataUrl,
    });
  } catch {
    return fallbackImage();
  }
}
