import { defineConfig } from "vite";
import vinext from "vinext";
import { cloudflare } from "@cloudflare/vite-plugin";
import { workersCacheCdnAdapter } from "@vinext/cloudflare/cache/workers-cache-cdn-adapter";
import { createHash } from "node:crypto";
import { patchCssModules } from "vite-css-modules";
import path from "node:path";
import { prepareArchiveSongIndex } from "./scripts/prepareArchiveSongIndex.mjs";

prepareArchiveSongIndex();

if (process.env.TIXREPO_CLOUDFLARE_MODE === "free-preview") {
  process.env.NEXT_PUBLIC_TIXREPO_STATIC_PAGES = "1";
}

export default defineConfig({
  build: { sourcemap: false },
  plugins: [
    patchCssModules({ exportMode: "default" }),
    vinext({
      cache: { cdn: workersCacheCdnAdapter() },
    }),
    cloudflare({
      // Public-page QA never calls Workers AI or mutates remote bindings.
      remoteBindings: process.env.TIXREPO_LOCAL_QA !== "1",
      viteEnvironment: {
        name: "rsc",
        childEnvironments: ["ssr"],
      },
    }),
  ],
  css: {
    modules: {
      generateScopedName(name: string, filename: string) {
        const relativePath = path.relative(import.meta.dirname, filename.replace(/\?.*$/, "")).replaceAll("\\", "/");
        return `_${name}_${createHash("sha256").update(relativePath).digest("hex").slice(0, 7)}`;
      },
    },
  },
});
