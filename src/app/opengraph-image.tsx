import { ImageResponse } from "next/og";

export const alt = "Tix Repo（ちけレポ）";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 86400;

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#FF6B9D",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 104, fontWeight: 700, letterSpacing: -2 }}>Tix Repo</div>
        <div style={{ fontSize: 60, fontWeight: 700, marginTop: 4 }}>ちけレポ</div>
        <div style={{ fontSize: 32, marginTop: 36, opacity: 0.92 }}>
          当落・座席・現地レポ・セトリをみんなで共有
        </div>
      </div>
    ),
    {
      ...size,
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      },
    }
  );
}
