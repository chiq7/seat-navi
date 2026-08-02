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
  sourcePost: CandidateSourcePost | null;
  profileKeywordMatches: string[];
  matchReason: "profile_search" | "profile_and_recent_artist_post" | "recent_artist_post_only";
};

export type CandidateReview = FanCandidate & {
  latestOriginalPostAt: string | null;
  recentOriginalPostUrls: string[];
  artistKeywordPostCount: number;
  distinctArtistKeywords: string[];
  status: "eligible_for_manual_review" | "insufficient_fandom_context";
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function renderCandidateReviewHtml(input: {
  artist: string;
  generatedAt: string;
  reviewed: readonly CandidateReview[];
}): string {
  const cards = input.reviewed.map((candidate, index) => {
    const profileTerms = candidate.profileKeywordMatches.length > 0
      ? candidate.profileKeywordMatches.map(escapeHtml).join(" / ")
      : "プロフィール文脈なし";
    const postLinks = candidate.recentOriginalPostUrls.length > 0
      ? candidate.recentOriginalPostUrls.map((url, postIndex) =>
        `<a class=\"post-link\" href=\"${escapeHtml(url)}\" target=\"_blank\" rel=\"noreferrer\">投稿 ${postIndex + 1} をXで開く</a>`,
      ).join("")
      : "<span class=\"muted\">直近のオリジナル投稿は取得できませんでした</span>";
    const status = candidate.status === "eligible_for_manual_review"
      ? "紹介文作成候補"
      : "ルセラの公開投稿が不足";
    const sourcePost = candidate.sourcePost
      ? `<dt>検索で見つけた投稿</dt><dd><a href=\"${escapeHtml(candidate.sourcePost.url)}\" target=\"_blank\" rel=\"noreferrer\">Xで開く</a>（${escapeHtml(candidate.sourcePost.createdAt)}）</dd>`
      : "<dt>候補化の根拠</dt><dd>公開プロフィールの推し関連語</dd>";
    return `<article class=\"card\">
      <div class=\"number\">候補 ${index + 1}</div>
      <h2>${escapeHtml(candidate.displayName)} <span>@${escapeHtml(candidate.handle)}</span></h2>
      <dl>
        <dt>判定</dt><dd><strong>${status}</strong></dd>
        <dt>プロフィールで確認できた語</dt><dd>${profileTerms}</dd>
        ${sourcePost}
        <dt>直近投稿内の関連投稿数</dt><dd>${candidate.artistKeywordPostCount}件</dd>
        <dt>確認できたルセラ関連語</dt><dd>${candidate.distinctArtistKeywords.map(escapeHtml).join(" / ") || "なし"}</dd>
      </dl>
      <div class=\"links\">${postLinks}</div>
    </article>`;
  }).join("\n");

  return `<!doctype html>
<html lang=\"ja\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>${escapeHtml(input.artist)} ファン候補確認</title>
<style>
body{margin:0;background:#f7f8fc;color:#17233b;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}main{max-width:760px;margin:auto;padding:28px 16px 56px}h1{font-size:24px;margin:0 0 8px}.notice,.muted{color:#64748b}.card{margin-top:16px;padding:20px;background:#fff;border:1px solid #e4e8f0;border-radius:16px;box-shadow:0 2px 8px #17233b0d}.number{color:#f35c97;font-size:13px;font-weight:700}h2{font-size:18px;margin:8px 0 16px}h2 span{font-size:14px;font-weight:500;color:#64748b}dl{margin:0;display:grid;gap:5px}dt{font-size:12px;color:#64748b}dd{margin:0 0 8px;font-size:14px;line-height:1.5}.links{display:grid;gap:8px;margin-top:8px}.post-link,a{color:#1669c8}.post-link{padding:9px 10px;border-radius:8px;background:#f2f7fe;text-decoration:none;font-size:14px}
</style></head><body><main><h1>${escapeHtml(input.artist)}｜紹介候補の確認</h1><p class=\"notice\">公開情報から絞った候補です。本文は保存していません。各リンクを開き、紹介してよい内容かを確認してください。</p><p class=\"notice\">作成日時：${escapeHtml(input.generatedAt)}</p>${cards || "<p class=\"notice\">確認対象はありません。</p>"}</main></body></html>`;
}

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

/** プロフィールの推し関連語が複数一致する、公開アカウントだけを候補化する。 */
export function candidateFromProfile(user: XApiUser, keywords: readonly string[], minimumMatches = 2): FanCandidate | null {
  if (user.protected || isLikelyNonFanProfile(user)) return null;
  const profileKeywordMatches = matchingKeywords(`${user.name}\n${user.description ?? ""}`, keywords);
  if (profileKeywordMatches.length < minimumMatches) return null;

  return {
    handle: user.username,
    displayName: user.name,
    verified: user.verified === true,
    sourcePost: null,
    profileKeywordMatches,
    matchReason: "profile_search",
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

  const keywordMatches = chronological.map((post) => matchingKeywords(post.text, keywords));
  const artistKeywordPostCount = keywordMatches.filter((matches) => matches.length > 0).length;
  const distinctArtistKeywords = uniqueKeywords(keywordMatches.flat());
  const minimumRelevantPosts = chronological.length >= 10 ? 6 : 3;
  const status = candidate.profileKeywordMatches.length >= 2
    && artistKeywordPostCount >= minimumRelevantPosts
    && distinctArtistKeywords.length >= 3
    ? "eligible_for_manual_review"
    : "insufficient_fandom_context";

  return {
    ...candidate,
    latestOriginalPostAt: chronological[0]?.created_at ?? null,
    recentOriginalPostUrls: chronological.map((post) => toPostUrl(candidate.handle, post.id)),
    artistKeywordPostCount,
    distinctArtistKeywords,
    status,
  };
}
