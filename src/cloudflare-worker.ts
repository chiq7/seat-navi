import app from "vinext/server/fetch-handler";

export * from "vinext/server/fetch-handler";

export const schedulePaths: Readonly<Record<string, string>> = {
  "0 2 * * 1": "/api/cron/fetch-events",
  "5 0 * * *": "/api/cron/fetch-external-seats",
};

type TixrepoEnv = Env & { CRON_SECRET?: string };

const kyoceraPath = "/venues/kyocera-dome";
const kyoceraAsset = "/_tixrepo/kyocera-dome.html";

function isDocumentRequest(request: Request, url: URL) {
  return (request.method === "GET" || request.method === "HEAD")
    && !url.searchParams.has("_rsc")
    && !request.headers.has("rsc")
    && !request.headers.has("next-router-prefetch")
    && !request.headers.has("next-router-segment-prefetch")
    && !request.headers.has("next-router-state-tree")
    && !request.headers.get("accept")?.includes("text/x-component");
}

async function kyoceraSnapshot(request: Request, url: URL, assets: Env["ASSETS"]) {
  const snapshot = await assets.fetch(new Request(new URL(kyoceraAsset, url), {
    method: request.method,
  })).catch(() => null);
  if (!snapshot) return null;
  const expires = Date.parse(snapshot.headers.get("X-Tixrepo-Snapshot-Until") ?? "");
  if (!snapshot.ok || !(expires > Date.now())) {
    await snapshot.body?.cancel();
    return null;
  }
  const response = new Response(snapshot.body, snapshot);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("X-Tixrepo-Venue-Delivery", "snapshot");
  return response;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === kyoceraAsset) return new Response(null, { status: 404 });
    const previewHost = url.hostname.endsWith(".workers.dev");
    const snapshot = url.pathname === kyoceraPath && previewHost && isDocumentRequest(request, url)
      ? await kyoceraSnapshot(request, url, env.ASSETS)
      : null;
    let response: Response;
    if (snapshot) {
      response = snapshot;
    } else if (url.pathname === "/opengraph-image" && (request.method === "GET" || request.method === "HEAD")) {
      const asset = new Request(new URL("/images/tixrepo-opengraph.png", url), request);
      const image = await env.ASSETS.fetch(asset);
      if (image.ok || image.status === 304) {
        response = new Response(image.body, image);
        response.headers.set("Cache-Control", "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800");
      } else {
        await image.body?.cancel();
        response = await app.fetch(request, env, ctx);
      }
    } else {
      response = await app.fetch(request, env, ctx);
    }
    if (!previewHost) return response;
    const preview = new Response(response.body, response);
    preview.headers.set("X-Robots-Tag", "noindex");
    return preview;
  },
  async scheduled(controller, env, ctx) {
    const path = schedulePaths[controller.cron];
    if (!path || !env.CRON_SECRET) {
      throw new Error("The scheduled job or its authentication is missing");
    }
    const request = new Request(`https://tixrepo.com${path}`, {
      headers: { Authorization: `Bearer ${env.CRON_SECRET}` },
    });
    const response: Response = await app.fetch(request, env, ctx);
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error(`${path} returned HTTP ${response.status}`);
    }
    const result = await response.json() as {
      failed?: string[];
      results?: Array<{ status?: string }>;
    };
    const failed = result.failed?.length ?? result.results?.filter(row => row.status === "error").length ?? 0;
    console.log(JSON.stringify({ job: path, failed }));
    if (failed > 0) throw new Error(`${path} reported ${failed} failed sources`);
  },
} satisfies ExportedHandler<TixrepoEnv>;
