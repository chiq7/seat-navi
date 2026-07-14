import fs from "node:fs";
import path from "node:path";
import { ImageResponse } from "next/og";

/** 4つのOGPルート（event/report/setlist/artist）共通のキャンバスサイズ */
export const SIZE = { width: 1200, height: 630 };

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

/**
 * public/ 配下の画像をファイルシステムから直接読み込みdata URL化する。
 * 本番ドメイン(https://tixrepo.com)へのfetchだと、未デプロイのローカル開発環境では404になり
 * テキストバッジへ常にフォールバックしてしまうため、環境に依存せず動くようfsで直接読む。
 * 読み込み失敗時はnullを返す（呼び出し側でフォールバック表示に切り替える）。
 */
export function readPublicImageDataUrl(relativePath: string): string | null {
  try {
    const absPath = path.join(process.cwd(), "public", relativePath);
    const buf = fs.readFileSync(absPath);
    const ext = path.extname(relativePath).toLowerCase();
    const contentType = CONTENT_TYPE_BY_EXT[ext] ?? "image/png";
    return `data:${contentType};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

// ロゴ画像(public/images/logo.png, 2508×627, 約4:1)。幅は高さから比率計算する
const LOGO_H = 72;
const LOGO_ASPECT = 2508 / 627;
const LOGO_W = Math.round(LOGO_H * LOGO_ASPECT);

let cachedLogoDataUrl: string | null | undefined;

/** ロゴ画像(public/images/logo.png)をdata URL化して返す（同一サーバープロセス内ではキャッシュする）。失敗時はnull */
export function getLogoDataUrl(): string | null {
  if (cachedLogoDataUrl === undefined) {
    cachedLogoDataUrl = readPublicImageDataUrl("images/logo.png");
  }
  return cachedLogoDataUrl;
}

/** 「ちけレポ」ロゴ。画像が読み込めていれば画像、失敗時は従来のピンクテキストバッジを表示する。
 * heightPx省略時はLOGO_H(共通デフォルトサイズ)のまま。呼び出し側で明示的に指定した画面のみ別サイズになる。 */
export function Logo({
  logoDataUrl,
  align = "flex-start",
  heightPx = LOGO_H,
}: {
  logoDataUrl: string | null;
  align?: "flex-start" | "center";
  heightPx?: number;
}) {
  const scale = heightPx / LOGO_H;
  const w = Math.round(LOGO_W * scale);

  if (logoDataUrl) {
    return (
      <img
        src={logoDataUrl}
        width={w}
        height={heightPx}
        style={{ alignSelf: align, width: w, height: heightPx, objectFit: "contain" }}
      />
    );
  }
  return (
    <div
      style={{
        display: "flex",
        alignSelf: align,
        backgroundColor: "#FF6B9D",
        color: "#ffffff",
        fontSize: Math.round(20 * scale),
        fontWeight: 700,
        padding: `${Math.round(6 * scale)}px ${Math.round(18 * scale)}px`,
        borderRadius: 999,
      }}
    >
      ちけレポ
    </div>
  );
}

const TEST_BADGE_W = 200;
const TEST_BADGE_H = 44;
const TEST_BADGE_MARGIN = 24;

/**
 * テストデータ公演であることを示すバッジ。isTestData時のみ、position:relativeな親に重ねて表示する。
 * next/og(Satori)はposition:absoluteでもDOM順で描画されるため、他要素より後（JSXツリーの最後）に
 * 置かないと隠れることがある。呼び出し側で必ず最後の子要素として配置すること。
 */
export function TestDataBadge() {
  return (
    <div
      style={{
        position: "absolute",
        top: TEST_BADGE_MARGIN,
        left: SIZE.width - TEST_BADGE_W - TEST_BADGE_MARGIN,
        width: TEST_BADGE_W,
        height: TEST_BADGE_H,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#111827",
        color: "#FBBF24",
        fontSize: 20,
        fontWeight: 700,
        borderRadius: 999,
        letterSpacing: 2,
      }}
    >
      テストデータ
    </div>
  );
}

/** 各OGPルート共通のフォールバック画像（対象データなし・DB取得失敗・ImageResponse生成失敗など） */
export function fallbackImage(label?: string) {
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
        <div style={{ display: "flex", fontSize: 104, fontWeight: 700, letterSpacing: -2 }}>Tix Repo</div>
        <div style={{ display: "flex", fontSize: 60, fontWeight: 700, marginTop: 4 }}>ちけレポ</div>
        {label && <div style={{ display: "flex", fontSize: 28, marginTop: 32, opacity: 0.9 }}>{label}</div>}
      </div>
    ),
    SIZE,
  );
}
