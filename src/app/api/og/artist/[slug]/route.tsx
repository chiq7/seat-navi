import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { getArtistOgInfo, type ArtistOgNextEvent } from "@/lib/og/artistOgData";
import { SIZE, OG_IMAGE_OPTIONS, fallbackImage, getLogoDataUrl, Logo, TestDataBadge, readPublicImageDataUrl } from "@/lib/og/ogShared";
import { DEFAULT_ARTIST_HERO_IMAGE, resolveArtistHeroImage } from "@/lib/artistPageData";

export const runtime = "nodejs";

/** 当落指標カード。中央揃えの行に固定幅で横並びさせるため、幅を明示指定する（flex:1で全幅に伸ばさない） */
function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        display: "flex",
        width: 340,
        flexDirection: "column",
        alignItems: "center",
        backgroundColor: "rgba(18,18,22,0.68)",
        borderRadius: 22,
        padding: "28px 14px",
      }}
    >
      <div style={{ display: "flex", fontSize: 20, fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>{label}</div>
      <div style={{ display: "flex", marginTop: 8, fontSize: 98, fontWeight: 800, color: "#FF6B9D" }}>
        {Math.round(value)}%
      </div>
    </div>
  );
}

function renderArtistImage(input: {
  artistName: string;
  tourTitle: string;
  ticketRate: number | null;
  normalArenaRate: number | null;
  upgradeRate: number | null;
  nextEvent: ArtistOgNextEvent | null;
  isTestData: boolean;
  heroDataUrl: string | null;
  logoDataUrl: string | null;
}) {
  const {
    artistName,
    tourTitle,
    ticketRate,
    normalArenaRate,
    upgradeRate,
    nextEvent,
    isTestData,
    heroDataUrl,
    logoDataUrl,
  } = input;
  const hasAnyRate = ticketRate !== null || normalArenaRate !== null || upgradeRate !== null;

  return new ImageResponse(
    (
      <div
        style={{
          position: "relative",
          width: SIZE.width,
          height: SIZE.height,
          display: "flex",
          fontFamily: "sans-serif",
        }}
      >
        {/* 背景: ヒーロー画像（無ければ単色背景にフォールバック。CSSグラデーションは使わない） */}
        {heroDataUrl ? (
          // ImageResponse内ではnext/imageを利用できない。
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={heroDataUrl}
            alt=""
            width={SIZE.width}
            height={SIZE.height}
            style={{ position: "absolute", left: 0, top: 0, width: SIZE.width, height: SIZE.height, objectFit: "cover" }}
          />
        ) : (
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: SIZE.width,
              height: SIZE.height,
              backgroundColor: "#1F1230",
            }}
          />
        )}

        {/* 暗いオーバーレイ（1: 全体を均一に暗くする単色半透明） */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: SIZE.width,
            height: SIZE.height,
            backgroundColor: "rgba(0,0,0,0.55)",
          }}
        />
        {/* 暗いオーバーレイ（2: 文字が乗る上下をさらに暗くする縦グラデーション。写真の雰囲気は中央に残す） */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: SIZE.width,
            height: SIZE.height,
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0) 38%, rgba(0,0,0,0) 62%, rgba(0,0,0,0.3) 100%)",
          }}
        />

        {/* コンテンツ（背景・オーバーレイより後にDOMへ置くことで前面に描画する。全体を中央揃えに統一） */}
        <div
          style={{
            position: "relative",
            width: SIZE.width,
            height: SIZE.height,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* 上段: ロゴ / アーティスト名 / ツアー名 / 次の公演情報を縦に中央揃え */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "22px 40px 0" }}>
            <Logo logoDataUrl={logoDataUrl} align="center" />

            <div style={{ display: "flex", marginTop: 20, fontSize: 26, fontWeight: 700, color: "rgba(255,255,255,0.88)" }}>
              {artistName}
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 8,
                maxWidth: 900,
                fontSize: 48,
                fontWeight: 800,
                color: "#ffffff",
                lineHeight: 1.12,
                textAlign: "center",
                justifyContent: "center",
              }}
            >
              {tourTitle}
            </div>

            {/* 次の公演（日数・日付・会場）も中央にまとめる（無ければ表示しない） */}
            {nextEvent && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 18 }}>
                <div style={{ display: "flex", fontSize: 20, fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>
                  次の公演まで
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 2 }}>
                  <div style={{ display: "flex", fontSize: 64, fontWeight: 800, color: "#ff4fa3" }}>
                    {nextEvent.countdownDays}
                  </div>
                  <div style={{ display: "flex", fontSize: 22, fontWeight: 700, color: "#ff8ac5" }}>DAYS</div>
                </div>
                <div style={{ display: "flex", marginTop: 2, fontSize: 26, fontWeight: 700, color: "#ffffff" }}>
                  {nextEvent.dateLabel} {nextEvent.venue}
                </div>
              </div>
            )}
          </div>

          {/* 下段: 当落指標カード（中央で横並び）+ 詳細データ誘導も中央揃え */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "0 22px 18px" }}>
            {hasAnyRate ? (
              <div style={{ display: "flex", justifyContent: "center", gap: 14 }}>
                {ticketRate !== null && <MetricCard label="チケット当選率" value={ticketRate} />}
                {normalArenaRate !== null && <MetricCard label="通常アリーナ率" value={normalArenaRate} />}
                {upgradeRate !== null && <MetricCard label="アプグレ当選率" value={upgradeRate} />}
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  width: 360,
                  justifyContent: "center",
                  backgroundColor: "rgba(18,18,22,0.68)",
                  borderRadius: 22,
                  padding: "28px 0",
                }}
              >
                <div style={{ display: "flex", fontSize: 28, fontWeight: 700, color: "#ffffff" }}>
                  当落データを見る
                </div>
              </div>
            )}

            {/* 詳細データはサイトで誘導（1行にまとめ、中央揃え） */}
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 10, marginTop: 14 }}>
              <div style={{ display: "flex", fontSize: 25, fontWeight: 800, color: "#ffffff" }}>
                詳細データはサイトで
              </div>
              <div style={{ display: "flex", fontSize: 25, fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>
                /FC歴・申込枚数・抽選回・決済方法など
              </div>
            </div>
          </div>
        </div>

        {/* テストデータバッジのみ右上固定（他OGPルートと同じ共通コンポーネント。DOM順で最後＝最前面に描画） */}
        {isTestData && <TestDataBadge />}
      </div>
    ),
    OG_IMAGE_OPTIONS,
  );
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const info = await getArtistOgInfo(slug);
    if (!info) return fallbackImage();

    const logoDataUrl = getLogoDataUrl();
    const heroPath = resolveArtistHeroImage(info.artist.heroImage).replace(/^\/+/, "");
    const fallbackHeroPath = DEFAULT_ARTIST_HERO_IMAGE.replace(/^\/+/, "");
    const heroDataUrl = readPublicImageDataUrl(heroPath) ?? readPublicImageDataUrl(fallbackHeroPath);

    return renderArtistImage({
      artistName: info.artist.name,
      tourTitle: info.tourTitle,
      ticketRate: info.ticketRate,
      normalArenaRate: info.normalArenaRate,
      upgradeRate: info.upgradeRate,
      nextEvent: info.nextEvent,
      isTestData: info.isTestData,
      heroDataUrl,
      logoDataUrl,
    });
  } catch {
    return fallbackImage();
  }
}
