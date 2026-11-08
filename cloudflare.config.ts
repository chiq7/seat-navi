import { bindings, defineConfig, defineWorker, triggers } from "cf/config";
import { createWorkersCacheConfig } from "@vinext/cloudflare/cache/config";
import * as tixrepo from "./src/cloudflare-worker.ts" with { type: "cf-worker" };

const cache = await createWorkersCacheConfig();
const production = process.env.TIXREPO_CLOUDFLARE_MODE === "production";
const freePreview = process.env.TIXREPO_CLOUDFLARE_MODE === "free-preview";
const enableSchedules = production && process.env.TIXREPO_SCHEDULED_UPDATES === "1";

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
    assets: {
      htmlHandling: "none",
      notFoundHandling: "none",
      runWorkerFirst: ["/*", "!/_next/static/*", "!/images/*", "!/ads/*", "!/social/*", "!/sitemap.xml"],
    },
    triggers: enableSchedules
      ? [
          triggers.scheduled({ schedule: "0 2 * * 1" }),
          triggers.scheduled({ schedule: "5 0 * * *" }),
        ]
      : [],
    observability: {
      enabled: true,
      redactQueryString: true,
      logs: { enabled: true, invocationLogs: true, headSamplingRate: 0.2 },
      traces: { enabled: true, headSamplingRate: 0.05 },
    },
    env: {
      ...cache.env,
      ASSETS: bindings.assets(),
    },
  }),
});
