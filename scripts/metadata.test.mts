import assert from "node:assert/strict";
import test from "node:test";
import { buildMeta, DEFAULT_OG_IMAGE, SITE_NAME, SITE_URL } from "@/lib/metadata";

test("buildMeta keeps canonical, OG and Twitter descriptions aligned", () => {
  const metadata = buildMeta({
    path: "/events/demo",
    title: "公演タイトル｜ちけレポ",
    description: "公演の説明",
    image: "/api/og/event/demo",
  });

  assert.equal(metadata.alternates?.canonical, `${SITE_URL}/events/demo`);
  assert.equal(metadata.openGraph?.description, "公演の説明");
  assert.equal(metadata.twitter?.description, "公演の説明");
  assert.equal(metadata.openGraph?.siteName, SITE_NAME);
  assert.equal(metadata.openGraph?.locale, "ja_JP");
  assert.deepEqual(metadata.robots, { index: true, follow: true });
});

test("buildMeta forces account, search and report routes to noindex", () => {
  for (const path of ["/search", "/report", "/report/live", "/login", "/mypage", "/password-reset"]) {
    const metadata = buildMeta({ path, title: "非公開ページ", index: true });
    assert.deepEqual(metadata.robots, { index: false, follow: false }, path);
  }
});

test("buildMeta supports public noindex pages that should still be followed", () => {
  const metadata = buildMeta({
    path: "/artists/test/setlist",
    title: "テスト",
    index: false,
    follow: true,
  });
  assert.deepEqual(metadata.robots, { index: false, follow: true });
});

test("buildMeta can point a duplicate page canonical at its representative", () => {
  const metadata = buildMeta({
    path: "/events/duplicate",
    canonicalPath: "/events/representative",
    title: "代表公演",
  });
  assert.equal(metadata.alternates?.canonical, `${SITE_URL}/events/representative`);
  assert.deepEqual(metadata.openGraph?.images, [
    { url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: `${SITE_NAME}｜当落・座席・現地レポ共有` },
  ]);
});
