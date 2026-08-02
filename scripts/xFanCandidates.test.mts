import assert from "node:assert/strict";
import test from "node:test";
import {
  buildRecentSearchQuery,
  candidateFromSearch,
  candidateFromProfile,
  hasPositiveFanSignal,
  hasTradingSignals,
  isLikelyNonFanProfile,
  isWithinHours,
  matchingKeywords,
  reviewCandidate,
  renderCandidateReviewHtml,
} from "./xFanCandidates.ts";

test("検索式はリポストと返信を除外する", () => {
  assert.equal(buildRecentSearchQuery("NiziU"), "NiziU -is:retweet -is:reply");
  assert.equal(buildRecentSearchQuery("#NiziU -is:retweet"), "#NiziU -is:retweet -is:reply");
  assert.equal(buildRecentSearchQuery("NiziU OR #NiziU"), "(NiziU OR #NiziU) -is:retweet -is:reply");
});

test("候補出力にプロフィール本文を保存せず、キーワード一致だけを残す", () => {
  const candidate = candidateFromSearch({
    id: "1",
    name: "マユカ推し",
    username: "withu_example",
    description: "NiziUとマユカが大好きです",
  }, {
    id: "post-1",
    author_id: "1",
    created_at: "2026-08-02T10:00:00.000Z",
  }, ["NiziU", "マユカ"]);

  assert.ok(candidate);
  assert.deepEqual(candidate.profileKeywordMatches, ["NiziU", "マユカ"]);
  assert.equal(JSON.stringify(candidate).includes("大好きです"), false);
});

test("プロフィール検索は推し関連語が複数ある公開アカウントだけを候補にする", () => {
  const candidate = candidateFromProfile({
    id: "1", name: "FEARNOT", username: "fearnot_example", description: "LE SSERAFIMとCHAEWONをずっと応援中",
  }, ["LE SSERAFIM", "FEARNOT", "CHAEWON"]);
  assert.ok(candidate);
  assert.equal(candidate.matchReason, "profile_search");
  assert.equal(candidate.sourcePost, null);
  assert.equal(candidateFromProfile({ id: "2", name: "ファン", username: "fan", description: "LE SSERAFIMが好き" }, ["LE SSERAFIM", "FEARNOT", "CHAEWON"]), null);
});

test("詳細確認は投稿URL・日時・一致数だけを残す", () => {
  const candidate = candidateFromSearch({
    id: "1",
    name: "WithU",
    username: "withu_example",
    description: "NiziUが好き",
  }, {
    id: "post-1",
    author_id: "1",
    created_at: "2026-08-02T10:00:00.000Z",
  }, ["NiziU"]);
  assert.ok(candidate);
  const reviewed = reviewCandidate(candidate, [{
    id: "post-2",
    created_at: "2026-08-02T12:00:00.000Z",
    text: "NiziUのライブが楽しみ",
  }], ["NiziU"]);

  assert.equal(reviewed.latestOriginalPostAt, "2026-08-02T12:00:00.000Z");
  assert.deepEqual(reviewed.recentOriginalPostUrls, ["https://x.com/withu_example/status/post-2"]);
  assert.equal(reviewed.artistKeywordPostCount, 1);
  assert.equal(reviewed.status, "insufficient_fandom_context");
  assert.equal(JSON.stringify(reviewed).includes("ライブが楽しみ"), false);
});

test("キーワード照合は全角英数にも対応する", () => {
  assert.deepEqual(matchingKeywords("ＮｉｚｉＵが好き", ["NiziU", "マユカ"]), ["NiziU"]);
});

test("紹介候補はプロフィールと直近投稿の両方に十分な推し文脈を要する", () => {
  const candidate = candidateFromProfile({
    id: "1", name: "FEARNOT", username: "fearnot_example", description: "LE SSERAFIM CHAEWON FEARNOT",
  }, ["LE SSERAFIM", "FEARNOT", "CHAEWON", "PUREFLOW"]);
  assert.ok(candidate);
  const posts = Array.from({ length: 10 }, (_, index) => ({
    id: `post-${index}`,
    created_at: `2026-08-02T${String(index).padStart(2, "0")}:00:00.000Z`,
    text: index < 6 ? `${["LE SSERAFIM", "FEARNOT", "CHAEWON", "PUREFLOW", "LE SSERAFIM", "FEARNOT"][index]}が最高` : "別の話題",
  }));
  const review = reviewCandidate(candidate, posts, ["LE SSERAFIM", "FEARNOT", "CHAEWON", "PUREFLOW"]);
  assert.equal(review.status, "eligible_for_manual_review");
  assert.deepEqual([...review.distinctArtistKeywords].sort(), ["LE SSERAFIM", "FEARNOT", "CHAEWON", "PUREFLOW"].sort());
});

test("48時間より前の候補と公式・転売用プロフィールを除外できる", () => {
  const now = new Date("2026-08-02T12:00:00.000Z");
  assert.equal(isWithinHours("2026-07-31T12:00:00.000Z", 48, now), true);
  assert.equal(isWithinHours("2026-07-31T11:59:59.000Z", 48, now), false);
  assert.equal(isLikelyNonFanProfile({ name: "NiziU公式", description: "公式アカウント" }), true);
  assert.equal(isLikelyNonFanProfile({ name: "WithU", description: "グッズ交換・郵送希望" }), true);
  assert.equal(isLikelyNonFanProfile({ name: "WithU", description: "マユカ推し" }), false);
  assert.equal(hasTradingSignals("チケットの譲渡先を探しています"), true);
  assert.equal(hasTradingSignals("ライブチケットが当たって楽しみ"), false);
  assert.equal(hasPositiveFanSignal("ウンチェが世界一かわいい"), true);
  assert.equal(hasPositiveFanSignal("会場に着きました"), false);
});

test("20件のうち推し関連が少ない、または前向きな本人の言葉が少ない候補は紹介しない", () => {
  const candidate = candidateFromProfile({
    id: "1", name: "FEARNOT", username: "fearnot_example", description: "LE SSERAFIM CHAEWON FEARNOT",
  }, ["LE SSERAFIM", "FEARNOT", "CHAEWON", "PUREFLOW"]);
  assert.ok(candidate);
  const weakPosts = Array.from({ length: 20 }, (_, index) => ({
    id: `post-${index}`,
    created_at: `2026-08-02T${String(index).padStart(2, "0")}:00:00.000Z`,
    text: index < 6 ? "LE SSERAFIM CHAEWON" : "別の話題",
  }));
  assert.equal(reviewCandidate(candidate, weakPosts, ["LE SSERAFIM", "FEARNOT", "CHAEWON", "PUREFLOW"]).status, "insufficient_fandom_context");
});

test("取引・交換の投稿が一つでもある候補は紹介対象から除外する", () => {
  const candidate = candidateFromProfile({
    id: "1", name: "FEARNOT", username: "fearnot_example", description: "LE SSERAFIM CHAEWON FEARNOT",
  }, ["LE SSERAFIM", "FEARNOT", "CHAEWON", "PUREFLOW"]);
  assert.ok(candidate);
  const review = reviewCandidate(candidate, [
    { id: "post-1", created_at: "2026-08-02T12:00:00.000Z", text: "LE SSERAFIM PUREFLOW CHAEWON" },
    { id: "post-2", created_at: "2026-08-02T11:00:00.000Z", text: "グッズ交換を探しています" },
  ], ["LE SSERAFIM", "FEARNOT", "CHAEWON", "PUREFLOW"]);
  assert.equal(review.status, "excluded_trading_activity");
});

test("確認ページは投稿本文を含めず、Xへのリンクだけを表示する", () => {
  const candidate = candidateFromSearch({ id: "1", name: "WithU", username: "withu_example", description: "NiziUが好き" }, {
    id: "post-1", author_id: "1", created_at: "2026-08-02T10:00:00.000Z",
  }, ["NiziU"]);
  assert.ok(candidate);
  const review = reviewCandidate(candidate, [{ id: "post-2", created_at: "2026-08-02T12:00:00.000Z", text: "NiziUのライブが楽しみ" }], ["NiziU"]);
  const html = renderCandidateReviewHtml({ artist: "NiziU", generatedAt: "2026-08-02T13:00:00.000Z", reviewed: [review] });
  assert.match(html, /https:\/\/x\.com\/withu_example\/status\/post-2/);
  assert.doesNotMatch(html, /ライブが楽しみ/);
});
