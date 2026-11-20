import { bindings, defineConfig, defineWorker, triggers } from "cf/config";
import { createWorkersCacheConfig } from "@vinext/cloudflare/cache/config";
import * as tixrepo from "./src/cloudflare-worker.ts" with { type: "cf-worker" };
import { PUBLIC_CATALOG_SCHEDULE } from "./src/lib/publicCatalogSchedule.ts";
import { SEAT_RESALE_OPENING_SCHEDULE } from "./src/lib/external-seats/sourcePolicy.ts";
import { OFFICIAL_EVENT_SCHEDULE } from "./src/lib/workersAiEvents.ts";

const cache = await createWorkersCacheConfig();
const production = process.env.TIXREPO_CLOUDFLARE_MODE === "production";
const freePreview = process.env.TIXREPO_CLOUDFLARE_MODE === "free-preview";
const enableSchedules = production && process.env.TIXREPO_SCHEDULED_UPDATES === "1";
const enableSeatSchedule = production && process.env.TIXREPO_SEAT_SCHEDULE === "1";
const enableEventSchedule = enableSchedules || (production && process.env.TIXREPO_EVENT_SCHEDULE === "1");
const enableOpeningFollowup = production && process.env.TIXREPO_SEAT_OPENING_FOLLOWUP === "1";
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
    assets: {
      htmlHandling: "none",
      notFoundHandling: "none",
      runWorkerFirst: ["/*", "!/_next/static/*", "!/images/*", "!/ads/*", "!/social/*"],
    },
    triggers: [
      ...(enableEventSchedule ? [triggers.scheduled({ schedule: OFFICIAL_EVENT_SCHEDULE })] : []),
      ...(enableSchedules || enableSeatSchedule ? [triggers.scheduled({ schedule: "5 0 * * *" })] : []),
      ...(enableOpeningFollowup ? [triggers.scheduled({ schedule: SEAT_RESALE_OPENING_SCHEDULE })] : []),
      ...(production && publicCatalogBucket ? [triggers.scheduled({ schedule: PUBLIC_CATALOG_SCHEDULE })] : []),
    ],
    observability: {
      enabled: true,
      redactQueryString: true,
      logs: { enabled: true, invocationLogs: true, headSamplingRate: freePreview ? 1 : 0.2 },
      traces: { enabled: true, headSamplingRate: 0.05 },
    },
    env: {
      ...cache.env,
      ASSETS: bindings.assets(),
      CF_VERSION_METADATA: bindings.versionMetadata(),
      ...(enableEventSchedule || process.env.TIXREPO_EVENT_AI === "1" ? { AI: bindings.ai() } : {}),
      ...(publicCatalogBucket ? { TIXREPO_PUBLIC_CATALOG: bindings.r2({ name: publicCatalogBucket }) } : {}),
    },
  }),
});
