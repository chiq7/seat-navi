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
    const result = await response.json() as {
      failed?: string[];
      results?: Array<{ status?: string }>;
    };
    const failed = result.failed?.length ?? result.results?.filter(row => row.status === "error").length ?? 0;
    console.log(JSON.stringify({ job: path, failed }));
    if (failed > 0) throw new Error(`${path} reported ${failed} failed sources`);
  },
} satisfies ExportedHandler<TixrepoEnv>;
