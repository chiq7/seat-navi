import { access, mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
import { FILTERED_SITEMAP_ASSET, sitemapXml } from "../src/lib/sitemapXml.ts";

const root = new URL("../", import.meta.url);
const assets = new URL(".cloudflare/output/v0/workers/default/assets/", root);
await access(assets);
const env = loadEnv("production", fileURLToPath(root), "NEXT_PUBLIC_SUPABASE_");
for (const key of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]) {
  if (!env[key]) throw new Error(`Missing ${key} for sitemap generation`);
  process.env[key] = env[key];
}
const { getCachedSeoEvent, SITE_URL } = await import("../src/lib/seoData.ts");
const { getSitemapEntries } = await import("../src/lib/sitemap.ts");
const entries = await getSitemapEntries(getCachedSeoEvent);
const urls = entries.map(entry => new URL(entry.url));
if (!urls.some(url => url.href === SITE_URL + "/") || urls.some(url => url.origin !== SITE_URL)
  || new Set(urls.map(url => url.href)).size !== urls.length) throw new Error("Invalid canonical sitemap");
const xml = sitemapXml(entries);
await mkdir(new URL("_tixrepo/", assets), { recursive: true });
await writeFile(new URL(FILTERED_SITEMAP_ASSET.slice(1), assets), xml, "utf8");
await writeFile(new URL("sitemap.xml", assets), xml, "utf8");
console.log(`Prepared sitemap.xml with ${entries.length} canonical URLs`);
