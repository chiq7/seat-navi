import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

type Status = "normal" | "stopped";

const STATUS_FILE = resolve(process.cwd(), "public/automation/official-news-status.csv");

function readArgument(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
}

function escapeCsv(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function readCurrentStatus(): string | undefined {
  try {
    const [, row] = readFileSync(STATUS_FILE, "utf8").trim().split(/\r?\n/);
    return row?.match(/^"([^"]+)"/)?.[1];
  } catch {
    return undefined;
  }
}

const status = readArgument("status");
const runUrl = readArgument("run-url");
const message = readArgument("message");
const onlyIfCurrent = readArgument("only-if-current");

if (status !== "normal" && status !== "stopped") {
  throw new Error("--status must be normal or stopped.");
}
if (!runUrl || !message) {
  throw new Error("--run-url and --message are required.");
}
if (onlyIfCurrent && onlyIfCurrent !== "normal" && onlyIfCurrent !== "stopped") {
  throw new Error("--only-if-current must be normal or stopped.");
}

const currentStatus = readCurrentStatus();
if (onlyIfCurrent && currentStatus !== onlyIfCurrent) {
  console.log(`Official NEWS status unchanged: current=${currentStatus ?? "missing"}`);
  process.exit(0);
}

const updatedAt = process.env.OFFICIAL_NEWS_STATUS_TIMESTAMP ?? new Date().toISOString();
const contents = [
  "status,updated_at,run_url,message",
  [status, updatedAt, runUrl, message].map(escapeCsv).join(","),
  "",
].join("\n");

mkdirSync(dirname(STATUS_FILE), { recursive: true });
writeFileSync(STATUS_FILE, contents, "utf8");
console.log(`Official NEWS status updated: ${status}`);
