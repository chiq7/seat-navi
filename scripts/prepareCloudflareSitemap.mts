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

const { getCachedSeoEvent, SITE_URL } = await import("../src/lib/seoData.ts");
const { getSitemapEntries } = await import("../src/lib/sitemap.ts");
const entries = await getSitemapEntries(getCachedSeoEvent);
const urls = entries.map(entry => new URL(entry.url));
if (urls.some(url => url.origin !== SITE_URL)
  || new Set(urls.map(url => url.href)).size !== urls.length
  || !urls.some(url => url.pathname.startsWith("/events/"))) {
  throw new Error("The sitemap must contain unique canonical URLs and published events");
}

const xmlEntities: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" };
function xmlValue(value: string | number) {
  return String(value).replace(/[&<>"']/g, character => xmlEntities[character]);
}

const urlsXml = entries.map(({ url, lastModified, changeFrequency, priority }) => [
  "<url>",
  `  <loc>${xmlValue(url)}</loc>`,
  lastModified && `  <lastmod>${xmlValue(lastModified instanceof Date ? lastModified.toISOString() : lastModified)}</lastmod>`,
  changeFrequency && `  <changefreq>${changeFrequency}</changefreq>`,
  priority !== undefined && `  <priority>${priority}</priority>`,
  "</url>",
].filter(Boolean).join("\n"));

await writeFile(
  new URL("sitemap.xml", assets),
  ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">', ...urlsXml, "</urlset>", ""].join("\n"),
  "utf8",
);
console.log(`Prepared sitemap.xml with ${entries.length} canonical URLs`);
