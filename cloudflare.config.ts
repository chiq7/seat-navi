import { bindings, defineConfig, defineWorker, triggers } from "cf/config";
import { createWorkersCacheConfig } from "@vinext/cloudflare/cache/config";
import * as tixrepo from "./src/cloudflare-worker.ts" with { type: "cf-worker" };
import { PUBLIC_CATALOG_SCHEDULE } from "./src/lib/publicEventCatalog.ts";

const cache = await createWorkersCacheConfig();
const production = process.env.TIXREPO_CLOUDFLARE_MODE === "production";
const freePreview = process.env.TIXREPO_CLOUDFLARE_MODE === "free-preview";
const enableSchedules = production && process.env.TIXREPO_SCHEDULED_UPDATES === "1";
const sitemapNamespaceId = production ? process.env.TIXREPO_SITEMAP_KV_ID : undefined;
const publicCatalogBucket = process.env.TIXREPO_PUBLIC_R2_BUCKET;

export default defineConfig({
  worker: defineWorker({
    ...cache,
    name: freePreview ? "tixrepo-free-check" : "tixrepo",
    workersDev: true,
    previewUrls: false,
    domains: production ? ["tixrepo.com"] : [],
    entrypoint: tixrepo,
    compatibilityDate: "2026-11-08",
    compatibilityFlags: ["nodejs_compat"],
    ...(production ? { limits: { cpuMs: 30_000 } } : {}),
    assets: {
      htmlHandling: "none",
      notFoundHandling: "none",
      runWorkerFirst: ["/*", "!/_next/static/*", "!/images/*", "!/ads/*", "!/social/*", ...(!sitemapNamespaceId ? ["!/sitemap.xml"] : [])],
    },
    triggers: [
      ...(enableSchedules ? [
          triggers.scheduled({ schedule: "0 2 * * 1" }),
          triggers.scheduled({ schedule: "5 0 * * *" }),
        ] : []),
      ...(production && publicCatalogBucket ? [triggers.scheduled({ schedule: PUBLIC_CATALOG_SCHEDULE })] : []),
    ],
    observability: {
      enabled: true,
      redactQueryString: true,
      logs: { enabled: true, invocationLogs: true, headSamplingRate: production || freePreview ? 1 : 0.2 },
      traces: { enabled: true, headSamplingRate: 0.05 },
    },
    env: {
      ...cache.env,
      ASSETS: bindings.assets(),
      CF_VERSION_METADATA: bindings.versionMetadata(),
      ...(publicCatalogBucket ? { TIXREPO_PUBLIC_CATALOG: bindings.r2({ name: publicCatalogBucket }) } : {}),
      ...(sitemapNamespaceId ? { TIXREPO_SITEMAP: bindings.kv({ id: sitemapNamespaceId }) } : {}),
    },
  }),
});
