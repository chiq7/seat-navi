import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  buildRecentSearchQuery,
  candidateFromSearch,
  isLikelyNonFanProfile,
  isWithinHours,
  reviewCandidate,
  uniqueKeywords,
  type XApiPost,
  type XApiUser,
} from "./xFanCandidates.ts";

type Args = {
  artist: string;
  query: string;
  keywords: string[];
  limit: number;
  detailLimit: number;
  dryRun: boolean;
};

type SearchResponse = {
  data?: XApiPost[];
  includes?: { users?: XApiUser[] };
};

type UserPostsResponse = { data?: XApiPost[] };

const PROJECT_ROOT = path.resolve(import.meta.dirname, "..");

function readDotEnvValue(name: string): string | undefined {
  const envPath = path.join(PROJECT_ROOT, ".env.local");
  if (!fs.existsSync(envPath)) return undefined;

  const line = fs.readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .find((entry) => entry.startsWith(`${name}=`));
  if (!line) return undefined;

  const raw = line.slice(name.length + 1).trim();
  return raw.replace(/^(?:"|')|(?:"|')$/g, "");
}

function parseArgs(argv: string[]): Args {
  const values = new Map<string, string>();
  const flags = new Set<string>();
  for (const arg of argv) {
    if (arg === "--dry-run") {
      flags.add(arg);
      continue;
    }
    const match = /^--([^=]+)=(.*)$/.exec(arg);
    if (match) values.set(match[1], match[2]);
  }

  const artist = values.get("artist")?.trim() ?? "";
  const query = values.get("query")?.trim() ?? "";
  const keywords = uniqueKeywords((values.get("keywords") ?? artist).split(","));
  const limit = Math.max(10, Math.min(100, Number(values.get("limit") ?? "30")));
  const detailLimit = Math.max(0, Math.min(25, Number(values.get("detail-limit") ?? "10")));

  if (!artist || !query) {
    throw new Error("使い方: --artist=アーティスト名 --query=検索式 [--keywords=語句1,語句2] [--limit=30] [--detail-limit=10] [--dry-run]");
  }
  if (!Number.isFinite(limit) || !Number.isFinite(detailLimit)) throw new Error("limit は数値で指定してください。");

  return { artist, query, keywords, limit, detailLimit, dryRun: flags.has("--dry-run") };
}

async function xGet<T>(token: string, pathname: string, params: Record<string, string>): Promise<T> {
  const url = new URL(pathname, "https://api.x.com");
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`X API request failed (${response.status}): ${text.slice(0, 300)}`);
  }
  return response.json() as Promise<T>;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const query = buildRecentSearchQuery(args.query);
  const outputDir = path.join(PROJECT_ROOT, "x-fan-candidates");
  const generatedAt = new Date().toISOString();

  if (args.dryRun) {
    console.log(JSON.stringify({
      mode: "dry-run",
      artist: args.artist,
      query,
      keywords: args.keywords,
      searchResultLimit: args.limit,
      detailCandidateLimit: args.detailLimit,
      writes: "ローカル候補JSONのみ。Xへの投稿・フォロー・いいね・DM・Supabase書き込みは行いません。",
    }, null, 2));
    return;
  }

  const token = process.env.X_API_BEARER_TOKEN ?? readDotEnvValue("X_API_BEARER_TOKEN");
  if (!token) throw new Error("X_API_BEARER_TOKEN が .env.local に設定されていません。");

  const search = await xGet<SearchResponse>(token, "/2/tweets/search/recent", {
    query,
    max_results: String(args.limit),
    "tweet.fields": "author_id,created_at",
    expansions: "author_id",
    "user.fields": "id,name,username,description,protected,verified",
  });
  const users = new Map((search.includes?.users ?? []).map((user) => [user.id, user]));
  const seen = new Set<string>();
  const candidates = (search.data ?? [])
    .filter((post) => isWithinHours(post.created_at, 48))
    .map((post) => {
      const user = post.author_id ? users.get(post.author_id) : undefined;
      return user && !isLikelyNonFanProfile(user) ? candidateFromSearch(user, post, args.keywords) : null;
    })
    .filter((candidate): candidate is NonNullable<typeof candidate> => candidate !== null)
    .filter((candidate) => {
      if (seen.has(candidate.handle)) return false;
      seen.add(candidate.handle);
      return true;
    });

  const detailTargets = candidates
    .filter((candidate) => candidate.profileKeywordMatches.length > 0)
    .slice(0, args.detailLimit);

  const reviewed = [];
  for (const candidate of detailTargets) {
    const user = [...users.values()].find((entry) => entry.username === candidate.handle);
    if (!user) continue;
    const posts = await xGet<UserPostsResponse>(token, `/2/users/${encodeURIComponent(user.id)}/tweets`, {
      max_results: "5",
      exclude: "retweets,replies",
      "tweet.fields": "created_at",
    });
    reviewed.push(reviewCandidate(candidate, posts.data ?? [], args.keywords));
  }

  const output = {
    generatedAt,
    artist: args.artist,
    query,
    keywords: args.keywords,
    collectionPolicy: {
      collected: ["48時間以内の公開ポストURLと日時", "公開プロフィールの表示名・ID・キーワード一致", "候補者だけの最新オリジナル投稿5件のURLと日時"],
      notCollected: ["DM", "フォロー・フォロワー一覧", "位置情報", "連絡先", "投稿本文の永続保存", "私生活・交際の詳細"],
      actions: "Xへの投稿・フォロー・いいね・DM・Supabase書き込みは行いません。",
    },
    candidates,
    reviewed,
  };
  fs.mkdirSync(outputDir, { recursive: true });
  const safeArtist = args.artist.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "artist";
  const filename = `${safeArtist}-${generatedAt.slice(0, 10)}.json`;
  fs.writeFileSync(path.join(outputDir, filename), `${JSON.stringify(output, null, 2)}\n`, "utf8");
  console.log(`候補 ${candidates.length}件、詳細確認 ${reviewed.length}件を x-fan-candidates/${filename} に保存しました。`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
