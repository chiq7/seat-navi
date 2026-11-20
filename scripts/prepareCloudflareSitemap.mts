import { access, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";

const root = new URL("../", import.meta.url);
const assets = new URL(".cloudflare/output/v0/workers/default/assets/", root);
await access(assets);

const env = loadEnv("production", fileURLToPath(root), "NEXT_PUBLIC_SUPABASE_");
for (const key of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]) {
  if (!env[key]) throw new Error(`Missing ${key} for sitemap generation`);
  process.env[key] = env[key];
}

const { getCachedSeoEvent } = await import("../src/lib/seoData.ts");
const { getSitemapEntries } = await import("../src/lib/sitemap.ts");
const { serializeSitemap } = await import("../src/lib/sitemapSnapshot.ts");
const entries = await getSitemapEntries(getCachedSeoEvent);

await writeFile(new URL("sitemap.xml", assets), serializeSitemap(entries), "utf8");
console.log(`Prepared sitemap.xml with ${entries.length} canonical URLs`);
