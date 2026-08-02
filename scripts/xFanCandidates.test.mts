import assert from "node:assert/strict";
import test from "node:test";
import {
  buildRecentSearchQuery,
  candidateFromSearch,
  isLikelyNonFanProfile,
  isWithinHours,
  matchingKeywords,
  reviewCandidate,
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
  assert.equal(JSON.stringify(reviewed).includes("ライブが楽しみ"), false);
});

test("キーワード照合は全角英数にも対応する", () => {
  assert.deepEqual(matchingKeywords("ＮｉｚｉＵが好き", ["NiziU", "マユカ"]), ["NiziU"]);
});

test("48時間より前の候補と公式・転売用プロフィールを除外できる", () => {
  const now = new Date("2026-08-02T12:00:00.000Z");
  assert.equal(isWithinHours("2026-07-31T12:00:00.000Z", 48, now), true);
  assert.equal(isWithinHours("2026-07-31T11:59:59.000Z", 48, now), false);
  assert.equal(isLikelyNonFanProfile({ name: "NiziU公式", description: "公式アカウント" }), true);
  assert.equal(isLikelyNonFanProfile({ name: "WithU", description: "マユカ推し" }), false);
});
