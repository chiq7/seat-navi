import app from "vinext/server/fetch-handler";

export * from "vinext/server/fetch-handler";

export const schedulePaths: Readonly<Record<string, string>> = {
  "0 2 * * 1": "/api/cron/fetch-events",
  "5 0 * * *": "/api/cron/fetch-external-seats",
};

type TixrepoEnv = Env & { CRON_SECRET?: string };

export default {
  async fetch(request, env, ctx) {
    const response: Response = await app.fetch(request, env, ctx);
    if (!new URL(request.url).hostname.endsWith(".workers.dev")) return response;
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
    // Consume the result so the invocation waits for all work.
    await response.arrayBuffer();
  },
} satisfies ExportedHandler<TixrepoEnv>;
