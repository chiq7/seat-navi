export type CrawlerArgs = {
  artist?: string;
  group?: string;
  dryRun: boolean;
  execute: boolean;
  classify: boolean;
  help: boolean;
};

export const CRAWLER_USAGE = `Usage:
  node --experimental-strip-types --import ./scripts/ts-loader.mjs ./scripts/crawlOfficialNews.mts [options]

Options:
  --dry-run          Dry-run (default). Never connect to Supabase or write data.
  --execute          Enable the database path. Also requires
                     OFFICIAL_NEWS_ALLOW_PRODUCTION_WRITE=true.
  --classify         Explicitly enable Gemini API classification. This uses Gemini API
                     quota/usage and may incur charges. Independent of DB writes.
  --artist=<slug>    Process one artist slug.
  --group=<name>     Process one specialParserName or cmsGroup.
  --help             Show this help and exit.

Safety rules:
  No arguments means --dry-run without Gemini or Supabase. --dry-run --classify is allowed
  for a Gemini classification preview and never connects to Supabase.
  --dry-run and --execute cannot be combined. --execute requires --classify and
  OFFICIAL_NEWS_ALLOW_PRODUCTION_WRITE=true before any database connection.`;

export class CliArgumentError extends Error {}

const FILTER_VALUE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

export function parseCrawlerArgs(argv: string[]): CrawlerArgs {
  let explicitDryRun = false;
  let execute = false;
  let classify = false;
  let help = false;
  let artist: string | undefined;
  let group: string | undefined;

  for (const arg of argv) {
    if (arg === "--dry-run") explicitDryRun = true;
    else if (arg === "--execute") execute = true;
    else if (arg === "--classify") classify = true;
    else if (arg === "--help") help = true;
    else if (arg.startsWith("--artist=")) artist = requireFilterValue(arg, "--artist=");
    else if (arg.startsWith("--group=")) group = requireFilterValue(arg, "--group=");
    else throw new CliArgumentError(`Unknown argument: ${arg}`);
  }

  if (explicitDryRun && execute) {
    throw new CliArgumentError("--dry-run and --execute cannot be used together.");
  }

  return {
    artist,
    group,
    dryRun: !execute,
    execute,
    classify,
    help,
  };
}

export function validateExecutionSafety(
  args: CrawlerArgs,
  env: NodeJS.ProcessEnv,
): void {
  if (!args.execute) return;
  if (!args.classify) {
    throw new Error(
      "--execute requires --classify because only successfully classified articles may be persisted.",
    );
  }
  if (env.OFFICIAL_NEWS_ALLOW_PRODUCTION_WRITE !== "true") {
    throw new Error(
      "--execute requires OFFICIAL_NEWS_ALLOW_PRODUCTION_WRITE=true. Database access was not started.",
    );
  }
}

function requireFilterValue(argument: string, prefix: string): string {
  const value = argument.slice(prefix.length);
  if (!value) throw new CliArgumentError(`${prefix.slice(0, -1)} requires a value.`);
  if (!FILTER_VALUE_PATTERN.test(value)) {
    throw new CliArgumentError(
      `${prefix.slice(0, -1)} contains invalid characters (allowed: ASCII letters, digits, underscore, hyphen; 1-64 chars).`,
    );
  }
  return value;
}
