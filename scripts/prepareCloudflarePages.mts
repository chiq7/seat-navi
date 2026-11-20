import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv, preview } from "vite";
import { createClient } from "@supabase/supabase-js";
import { staticPageAsset, staticPublicPages } from "../src/lib/staticPublicPages.ts";
import { STATIC_PUBLIC_PAGES, publicPageDataPaths } from "../src/lib/publicPageData.ts";
import { createPublicDataSnapshot, publicDataSnapshotAsset } from "../src/lib/publicDataSnapshot.ts";
import { PUBLIC_VENUE_GUIDE_IDS } from "../src/lib/publicVenueGuides.ts";
import { PUBLIC_CATALOG_ASSET } from "../src/lib/publicEventCatalog.ts";
import { ZOZO_LOWER_THIRD_PAGE } from "../src/lib/venueSeatLinks.ts";

if (process.env.TIXREPO_CLOUDFLARE_MODE === "free-preview" || STATIC_PUBLIC_PAGES) {
  const root = new URL("../", import.meta.url);
  const assets = new URL(".cloudflare/output/v0/workers/default/assets/", root);
  const server = await preview({
    root: fileURLToPath(root),
    preview: { host: "127.0.0.1", port: 0, strictPort: true },
  });
  try {
    const address = server.httpServer.address();
    if (!address || typeof address === "string") throw new Error("Local page renderer did not start");
    const localOrigin = `http://127.0.0.1:${address.port}`;
    const headers = await readFile(new URL("public/_headers", root), "utf8");
    const rules = [headers.trimEnd(), ""];
    const dataPaths = [
      publicPageDataPaths.feed,
      publicPageDataPaths.upcoming,
      ...PUBLIC_VENUE_GUIDE_IDS.map(id => publicPageDataPaths.venue + id),
    ];
    const snapshots = [];
    for (const path of dataPaths) {
      const response = await fetch(localOrigin + path, { signal: AbortSignal.timeout(10_000) });
      if (!response.ok || response.headers.has("X-Tixrepo-Data-Stale")) {
        await response.body?.cancel();
        throw new Error(`Could not capture fresh public data for ${path} (HTTP ${response.status})`);
      }
      const updatedAt = response.headers.get("X-Tixrepo-Data-Updated-At") ?? "";
      snapshots.push({ path, snapshot: createPublicDataSnapshot(path, await response.json(), updatedAt) });
    }
    for (const path of staticPublicPages) {
      for (const flight of [false, true]) {
        const response = await fetch(localOrigin + path, {
          headers: flight ? { RSC: "1", Accept: "text/x-component" } : { Accept: "text/html" },
          signal: AbortSignal.timeout(45_000),
        });
        const body = await response.text();
        const mime = flight ? "text/x-component" : "text/html";
        const isVenue = path.startsWith("/venues/") && path !== ZOZO_LOWER_THIRD_PAGE;
        const canonical = body.match(/rel="canonical" href="([^"]+)"/)?.[1];
        const invalid = [
          !response.ok && `HTTP ${response.status}`,
          !response.headers.get("content-type")?.startsWith(mime) && "wrong content type",
          response.headers.has("set-cookie") && "contains session headers",
          body.includes(localOrigin) && "contains local URL",
          !flight && (!canonical || new URL(canonical).href !== `https://tixrepo.com${path}`) && "canonical URL differs",
          !flight && isVenue && !body.includes('id="venue-seat-guide"') && "missing seat guide",
          !flight && isVenue && body.includes(">公演一覧を読み込めませんでした。") && "venue program read failed",
          !flight && path === "/" && !body.includes("速報を読み込み中です") && "feed is not loaded independently",
        ].filter(Boolean);
        if (invalid.length) {
          throw new Error(`Public snapshot failed validation: ${path} (${mime}): ${invalid.join(", ")}`);
        }
        const asset = staticPageAsset(path, flight);
        const file = new URL(asset.slice(1), assets);
        await mkdir(dirname(fileURLToPath(file)), { recursive: true });
        await writeFile(file, body, "utf8");
        rules.push(asset);
        for (const [name, value] of response.headers) {
          if (name === "content-type" || name === "vary" || name.startsWith("x-vinext-rsc")) {
            rules.push(`  ${name}: ${value}`);
          }
        }
        rules.push("");
      }
      console.log(`Prepared public HTML and RSC for ${path}`);
    }
    await writeFile(new URL("_headers", assets), rules.join("\n"), "utf8");
    for (const { path, snapshot } of snapshots) {
      const file = new URL(publicDataSnapshotAsset(path).slice(1), assets);
      await mkdir(dirname(fileURLToPath(file)), { recursive: true });
      await writeFile(file, JSON.stringify(snapshot), "utf8");
    }
    console.log(`Prepared ${snapshots.length} public data fallback files`);
    const { NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_ANON_KEY: key } = loadEnv("production", fileURLToPath(root), "NEXT_PUBLIC_SUPABASE_");
    if (!url || !key) throw new Error("Missing public catalog source configuration");
    const signal = AbortSignal.timeout(20_000);
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (input, init) => fetch(input, { ...init, signal }) },
    });
    const { collectPublicEventCatalog } = await import("../src/lib/collectPublicEventCatalog.ts");
    const { catalog, json } = await collectPublicEventCatalog(client, signal);
    await writeFile(new URL(PUBLIC_CATALOG_ASSET.slice(1), assets), json, "utf8");
    console.log(`Prepared fallback catalog with ${catalog.events.length} public events`);
  } finally {
    await server.close();
  }
}
