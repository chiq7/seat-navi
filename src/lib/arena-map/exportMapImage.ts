const XLINK_NS = "http://www.w3.org/1999/xlink";

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("画像のdata URL変換に失敗しました"));
    reader.readAsDataURL(blob);
  });
}

/**
 * clone内の<image>要素が参照する外部画像(同一オリジン)をfetchし、
 * data URL化してhref/xlink:hrefにインライン埋め込みする。
 * WebKit系ブラウザではBlob化したSVG内の外部画像参照が解決されないことがあるための対策。
 */
async function inlineSvgImages(clone: SVGSVGElement): Promise<void> {
  const imageEls = Array.from(clone.querySelectorAll("image"));
  await Promise.all(
    imageEls.map(async (imageEl) => {
      const href = imageEl.getAttribute("href") || imageEl.getAttributeNS(XLINK_NS, "href");
      if (!href || href.startsWith("data:")) return;

      const absoluteUrl = new URL(href, window.location.origin).href;
      const res = await fetch(absoluteUrl);
      if (!res.ok) throw new Error(`画像の取得に失敗しました: ${absoluteUrl}`);
      const blob = await res.blob();
      const dataUrl = await blobToDataUrl(blob);

      imageEl.setAttribute("href", dataUrl);
      imageEl.setAttributeNS(XLINK_NS, "xlink:href", dataUrl);
    }),
  );
}

/**
 * 座席報告マップのSVGをPNG画像として書き出し、ダウンロードする。
 * SVGは presentation属性のみで描画されているため外部CSSに依存せず、
 * Canvas経由でそのままラスタライズできる。
 */
export async function renderMapImageAsPngBlob(
  svgEl: SVGSVGElement,
  opts?: { scale?: number; filename?: string },
): Promise<Blob> {
  const scale = opts?.scale ?? 2;

  const viewBox = svgEl.viewBox.baseVal;
  const width = viewBox && viewBox.width > 0 ? viewBox.width : svgEl.clientWidth;
  const height = viewBox && viewBox.height > 0 ? viewBox.height : svgEl.clientHeight;

  const clone = svgEl.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));

  // WebKit対策：外部画像参照(<image href="...">)を先にdata URL化してインライン埋め込みする
  await inlineSvgImages(clone);

  const svgString = new XMLSerializer().serializeToString(clone);
  const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("SVGの画像読み込みに失敗しました"));
      img.src = svgUrl;
    });
    // Safari対策：onload後もデコード未完了のことがあるため明示的に待つ
    if (typeof img.decode === "function") {
      try {
        await img.decode();
      } catch {
        // decode()非対応/失敗時はonloadの結果をそのまま使う
      }
    }

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvasコンテキストの取得に失敗しました");

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const pngBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!pngBlob) throw new Error("PNG生成に失敗しました");

    return pngBlob;
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

export function downloadPngBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Allow slower browsers to start the download before releasing the URL.
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/** Backward-compatible download wrapper used by existing arena maps. */
export async function exportMapImageAsPng(
  svgEl: SVGSVGElement,
  opts?: { scale?: number; filename?: string },
): Promise<void> {
  downloadPngBlob(await renderMapImageAsPngBlob(svgEl, opts), opts?.filename ?? "seat-map.png");
}
