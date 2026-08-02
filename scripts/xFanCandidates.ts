export type XApiUser = {
  id: string;
  name: string;
  username: string;
  description?: string;
  protected?: boolean;
  verified?: boolean;
};

export type XApiPost = {
  id: string;
  author_id?: string;
  created_at?: string;
  text?: string;
};

export type CandidateSourcePost = {
  id: string;
  createdAt: string;
  url: string;
};

export type FanCandidate = {
  handle: string;
  displayName: string;
  verified: boolean;
  sourcePost: CandidateSourcePost;
  profileKeywordMatches: string[];
  matchReason: "profile_and_recent_artist_post" | "recent_artist_post_only";
};

export type CandidateReview = FanCandidate & {
  latestOriginalPostAt: string | null;
  recentOriginalPostUrls: string[];
  artistKeywordPostCount: number;
  status: "needs_manual_review" | "profile_context_missing";
};

export function normalizeText(value: string | null | undefined): string {
  return (value ?? "").normalize("NFKC").toLocaleLowerCase("ja-JP");
}

export function uniqueKeywords(raw: readonly string[]): string[] {
  const seen = new Set<string>();
  return raw
    .map((keyword) => keyword.trim())
    .filter(Boolean)
    .filter((keyword) => {
      const key = normalizeText(keyword);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function matchingKeywords(text: string | null | undefined, keywords: readonly string[]): string[] {
  const normalized = normalizeText(text);
  return uniqueKeywords(keywords).filter((keyword) => normalized.includes(normalizeText(keyword)));
}

export function isWithinHours(value: string | null | undefined, hours: number, now = new Date()): boolean {
  if (!value || !Number.isFinite(hours) || hours < 0) return false;
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return false;
  const elapsed = now.getTime() - time;
  return elapsed >= 0 && elapsed <= hours * 60 * 60 * 1000;
}

export function isLikelyNonFanProfile(user: Pick<XApiUser, "name" | "description">): boolean {
  const text = normalizeText(`${user.name}\n${user.description ?? ""}`);
  return ["公式", "official", "スタッフ", "staff", "運営", "チケット譲", "チケット交換", "チケット買取", "ticket sale"].some((term) => text.includes(term));
}

export function toPostUrl(username: string, postId: string): string {
  return `https://x.com/${encodeURIComponent(username)}/status/${encodeURIComponent(postId)}`;
}

export function buildRecentSearchQuery(query: string): string {
  const trimmed = query.trim();
  if (!trimmed) throw new Error("--query は必須です。");

  const exclusions = ["-is:retweet", "-is:reply"];
  const missing = exclusions.filter((term) => !trimmed.includes(term));
  const grouped = /\sOR\s/i.test(trimmed) && !trimmed.startsWith("(") ? `(${trimmed})` : trimmed;
  return [grouped, ...missing].join(" ");
}

export function candidateFromSearch(
  user: XApiUser,
  post: XApiPost,
  keywords: readonly string[],
): FanCandidate | null {
  if (user.protected || !post.created_at || !post.id) return null;

  const profileKeywordMatches = matchingKeywords(`${user.name}\n${user.description ?? ""}`, keywords);
  return {
    handle: user.username,
    displayName: user.name,
    verified: user.verified === true,
    sourcePost: {
      id: post.id,
      createdAt: post.created_at,
      url: toPostUrl(user.username, post.id),
    },
    profileKeywordMatches,
    matchReason: profileKeywordMatches.length > 0 ? "profile_and_recent_artist_post" : "recent_artist_post_only",
  };
}

export function reviewCandidate(
  candidate: FanCandidate,
  posts: readonly XApiPost[],
  keywords: readonly string[],
): CandidateReview {
  const chronological = [...posts]
    .filter((post) => post.id && post.created_at)
    .sort((a, b) => Date.parse(b.created_at!) - Date.parse(a.created_at!));

  return {
    ...candidate,
    latestOriginalPostAt: chronological[0]?.created_at ?? null,
    recentOriginalPostUrls: chronological.map((post) => toPostUrl(candidate.handle, post.id)),
    artistKeywordPostCount: chronological.filter((post) => matchingKeywords(post.text, keywords).length > 0).length,
    status: candidate.profileKeywordMatches.length > 0 ? "needs_manual_review" : "profile_context_missing",
  };
}
