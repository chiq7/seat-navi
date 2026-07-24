import assert from "node:assert/strict";
import test from "node:test";
import {
  analyzeFeedDocument,
  detectEmbeddedJsonNames,
  discoverEmbeddedJsonArrays,
  extractArticleLinkCandidates,
  extractRssLinks,
  extractScriptEndpointCandidates,
  extractScriptRouteFragments,
} from "../discoverOfficialNewsSite.mjs";
import { getByPath } from "./strategies/embeddedJson.ts";
import { selectAllOuter, selectAttr, selectText } from "./htmlSelect.ts";

test("Discovery finds RSS alternate links regardless of attribute order and quote style", () => {
  const html = `
    <link href='/news/feed.xml' rel='alternate' type='application/rss+xml'>
    <link type="application/atom+xml" title="Atom" href="https://example.com/atom.xml">
    <link rel="stylesheet" href="/styles.css">
  `;
  assert.deepEqual(extractRssLinks(html), ["/news/feed.xml", "https://example.com/atom.xml"]);
});

test("Discovery rejects HTML pages that merely mention RSS markup", () => {
  assert.deepEqual(analyzeFeedDocument("<html><script>const text = '<rss><item>'</script></html>"), {
    valid: false,
    itemCount: 0,
    sampleTitles: [],
  });
  const feed = analyzeFeedDocument(`<?xml version="1.0"?><rss><channel><title>News</title><item><title>Article A</title></item></channel></rss>`);
  assert.equal(feed.valid, true);
  assert.equal(feed.itemCount, 1);
  assert.deepEqual(feed.sampleTitles, ["Article A"]);
});

test("Discovery recognizes modern and legacy embedded JSON markers", () => {
  const html = `
    <script id="__NEXT_DATA__" type="application/json">{}</script>
    <script id='__NUXT_DATA__' type='application/json'>[]</script>
    <script>window.__NUXT__ = {};</script>
  `;
  assert.deepEqual(detectEmbeddedJsonNames(html), ["__NEXT_DATA__", "__NUXT_DATA__", "__NUXT__"]);
});

test("Discovery reports news-like array paths from JSON state without evaluating scripts", () => {
  const payload = {
    props: {
      pageProps: {
        news: [{ title: "Article", url: "/news/1", publishedAt: "2026-07-24" }],
      },
    },
  };
  const html = `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify(payload)}</script>`;
  const candidates = discoverEmbeddedJsonArrays(html);
  assert.equal(candidates[0].source, "__NEXT_DATA__");
  assert.equal(candidates[0].path, "props.pageProps.news");
  assert.deepEqual(candidates[0].keys, ["title", "url", "publishedAt"]);
});

test("embedded JSON field mapping supports nested object and array paths", () => {
  const value = { meta: { title: "Article" }, links: [{ href: "/news/1" }] };
  assert.equal(getByPath(value, "meta.title"), "Article");
  assert.equal(getByPath(value, "links.0.href"), "/news/1");
  assert.equal(getByPath(value, "missing.path"), undefined);
});

test("static HTML selectors can read an onclick URL from the item root", () => {
  const html = `<div class="news_list"><dl onclick="location.href='/posts/information/abc'"><dt>2026.7.24</dt><dd>記事タイトル</dd></dl></div>`;
  const blocks = selectAllOuter(html, ".news_list dl");
  assert.equal(blocks.length, 1);
  const onclick = selectAttr(blocks[0], "dl", "onclick");
  assert.equal(onclick, "location.href='/posts/information/abc'");
  assert.equal(selectText(blocks[0], "dd"), "記事タイトル");
  assert.equal(/location\.href=['\"]([^'\"]+)/i.exec(onclick)[1], "/posts/information/abc");
});

test("Discovery extracts only news-like public endpoint strings from site scripts", () => {
  const script = `const api="/api/news?limit=20"; const image="/img/logo.svg"; const external="https:\\/\\/cms.example.com\\/contents\\/posts";`;
  assert.deepEqual(extractScriptEndpointCandidates(script, "https://example.com/assets/app.js"), [
    "https://cms.example.com/contents/posts",
    "https://example.com/api/news?limit=20",
  ]);
});

test("Discovery keeps concatenated news route fragments for manual API confirmation", () => {
  const script = `const base="artists/"; const route="/news/"; const image="/contents/logo.svg";`;
  assert.deepEqual(extractScriptRouteFragments(script), ["artists/", "/news/"]);
});

test("Discovery article candidates require article signals and remain same-site", () => {
  const html = `
    <nav><a href="/profile">プロフィール</a></nav>
    <article><time>2026.07.24</time><a href="/posts/information/123">ライブ開催のお知らせ</a></article>
    <article><time>2026-07-23</time><a href="https://external.example/news/9">外部ニュース</a></article>
  `;
  const items = extractArticleLinkCandidates(html, "https://example.com/news");
  assert.equal(items.length, 1);
  assert.equal(items[0].url, "https://example.com/posts/information/123");
  assert.equal(items[0].published_date, "2026-07-24");
});
