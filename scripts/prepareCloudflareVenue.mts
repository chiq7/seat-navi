import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { preview } from "vite";

if (process.env.TIXREPO_CLOUDFLARE_MODE === "free-preview") {
  const root = new URL("../", import.meta.url);
  const assets = new URL(".cloudflare/output/v0/workers/default/assets/", root);
  const server = await preview({
    root: fileURLToPath(root),
    preview: { host: "127.0.0.1", port: 0, strictPort: true },
  });
  try {
    const address = server.httpServer.address();
    if (!address || typeof address === "string") throw new Error("Local venue renderer did not start");
    const renderedAt = Date.now();
    const localOrigin = `http://127.0.0.1:${address.port}`;
    const response = await fetch(`${localOrigin}/venues/kyocera-dome`, {
      headers: { Accept: "text/html" },
      signal: AbortSignal.timeout(30_000),
    });
    const html = await response.text();
    if (!response.ok || !response.headers.get("content-type")?.startsWith("text/html")
      || response.headers.has("set-cookie")
      || !html.includes('rel="canonical" href="https://tixrepo.com/venues/kyocera-dome"')
      || !html.includes('data-testid="kyocera-seat-map"')
      || !html.includes('id="upcoming-events-title"')
      || html.includes(localOrigin)
      || html.includes("公演一覧を読み込めませんでした")) {
      throw new Error("Kyocera snapshot must contain the public seat map and successfully loaded programs");
    }

    // Match the venue event cache and refresh when the upcoming/past cutoff changes.
    const jstOffset = 9 * 3_600_000;
    const nextJstMidnight = new Date(renderedAt + jstOffset);
    nextJstMidnight.setUTCHours(24, 0, 0, 0);
    const expires = new Date(Math.min(renderedAt + 3_600_000, nextJstMidnight.getTime() - jstOffset)).toISOString();
    const privateAssets = new URL("_tixrepo/", assets);
    const headers = await readFile(new URL("public/_headers", root), "utf8");
    const vary = response.headers.get("vary");
    await mkdir(privateAssets, { recursive: true });
    await writeFile(new URL("kyocera-dome.html", privateAssets), html, "utf8");
    await writeFile(new URL("_headers", assets), [
      headers.trimEnd(),
      "",
      "/_tixrepo/kyocera-dome.html",
      `  X-Tixrepo-Snapshot-Until: ${expires}`,
      ...(vary ? [`  Vary: ${vary}`] : []),
      "",
    ].join("\n"), "utf8");
    console.log(`Prepared the Kyocera document until ${expires}`);
  } finally {
    await server.close();
  }
}
