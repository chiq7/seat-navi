// 新規アーティストの公式NEWS URLを渡すと、取得方式の候補を自動調査するCLI。
//
// 実行方法:
//   node scripts/discoverOfficialNewsSite.mjs <公式NEWS一覧ページのURL> [--standard-robots]
//
// 調査内容: robots.txt / RSS・Atom / WordPress REST API / sitemap(news sitemap含む) /
// JSON-LD / OGP / __NEXT_DATA__・__NUXT__・window初期データ / HTML内ニュース一覧候補 /
// JS描画の可能性 / 推奨取得方式 / CSSセレクタ候補。
//
// 重要な制約:
//   - robots.txtを必ず確認し、Disallowされたパスへはprobeしない。Crawl-delayがあれば
//     複数回のprobe fetch間で待機する。
//   - ブラウザ実行・Playwrightは使わない(HTMLの静的取得のみ)。
//   - 本番設定(sites/index.ts)への自動反映は一切行わない。結果はJSONレポートに保存するのみ。
//   - このツールは候補を提示するだけで、有効化の判断は人間が行う
//     (scripts/validateOfficialNewsConfig.mts で検証してから、手動でartists.tsへ追加する)。

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const RELEVANT_ROBOTS_AGENTS = new Set(["*", "claudebot", "claude-web", "claude-searchbot", "anthropic-ai"]);

async function fetchSafe(url, timeoutMs = 10000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow", signal: controller.signal });
    return { ok: res.ok, status: res.status, url: res.url, text: res.ok ? await res.text() : null, headers: res.headers };
  } catch (e) {
    return { ok: false, status: null, text: null, error: String(e && e.message ? e.message : e) };
  } finally {
    clearTimeout(t);
  }
}

async function checkRobots(origin, policy = "strict_ai") {
  const res = await fetchSafe(new URL("/robots.txt", origin).toString());
  if (!res.ok) return { exists: false, ruleGroups: [], crawlDelay: 0, sitemaps: [] };

  const lines = (res.text || "").split(/\r?\n/);
  const groups = [];
  let current = null;
  let ruleSeenSinceAgent = false;
  const sitemaps = [];
  for (const raw of lines) {
    const line = raw.split("#")[0].trim();
    if (!line) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    if (key === "user-agent") {
      if (!current || ruleSeenSinceAgent) {
        current = { agents: [], rules: [], crawlDelay: 0 };
        groups.push(current);
        ruleSeenSinceAgent = false;
      }
      current.agents.push(value.toLowerCase());
    } else if ((key === "disallow" || key === "allow") && current) {
      if (value) current.rules.push({ type: key, path: value });
      ruleSeenSinceAgent = true;
    } else if (key === "crawl-delay" && current) {
      const n = parseFloat(value);
      if (!Number.isNaN(n)) current.crawlDelay = Math.max(current.crawlDelay, n);
      ruleSeenSinceAgent = true;
    } else if (key === "sitemap") {
      sitemaps.push(value);
    }
  }
  const relevantAgents = policy === "standard" ? new Set(["*"]) : RELEVANT_ROBOTS_AGENTS;
  const ruleGroups = groups.filter((group) => group.agents.some((agent) => relevantAgents.has(agent)));
  const crawlDelay = ruleGroups.reduce((max, group) => Math.max(max, group.crawlDelay), 0);
  return { exists: true, ruleGroups, crawlDelay, sitemaps };
}

function isPathAllowed(ruleGroups, pathname) {
  for (const group of ruleGroups) {
    let matched = null;
    for (const rule of group.rules) {
      if (!rule.path || !pathname.startsWith(rule.path)) continue;
      if (!matched || rule.path.length > matched.path.length ||
        (rule.path.length === matched.path.length && rule.type === "allow")) {
        matched = rule;
      }
    }
    if (matched?.type === "disallow") return false;
  }
  return true;
}

export function extractRssLinks(html) {
  const links = [];
  const re = /<link\b[^>]*>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    if (!/\btype\s*=\s*["']application\/(?:rss|atom)\+xml["']/i.test(m[0])) continue;
    const hrefM = /\bhref\s*=\s*["']([^"']*)["']/i.exec(m[0]);
    if (hrefM) links.push(hrefM[1]);
  }
  return links;
}

export function analyzeFeedDocument(xml) {
  const trimmed = xml.replace(/^\uFEFF/, "").trimStart();
  const withoutDeclaration = trimmed.replace(/^<\?xml[\s\S]*?\?>\s*/i, "");
  const valid = /^(?:<!--[^]*?-->\s*)*(?:<rss\b|<feed\b|<rdf:RDF\b)/i.test(withoutDeclaration);
  if (!valid) return { valid: false, itemCount: 0, sampleTitles: [] };
  const itemCount = (xml.match(/<(?:item|entry)\b/gi) ?? []).length;
  const sampleTitles = [...xml.matchAll(/<title[^>]*>([\s\S]*?)<\/title>/gi)]
    .slice(1, 6)
    .map((match) => decodeHtmlText(match[1]).slice(0, 160))
    .filter(Boolean);
  return { valid: itemCount > 0, itemCount, sampleTitles };
}

export function detectEmbeddedJsonNames(html) {
  const found = [];
  if (/<script id="__NEXT_DATA__"/.test(html)) found.push("__NEXT_DATA__");
  if (/<script[^>]+id=["']__NUXT_DATA__["']/.test(html)) found.push("__NUXT_DATA__");
  if (/window\.__NUXT__\s*=/.test(html)) found.push("__NUXT__");
  if (/window\.__INITIAL_STATE__\s*=/.test(html)) found.push("window.__INITIAL_STATE__");
  return found;
}

function walkArrayCandidates(value, source, pathParts = [], depth = 0, output = []) {
  if (depth > 12 || output.length >= 30 || value == null) return output;
  if (Array.isArray(value)) {
    const objectItems = value.filter((item) => item && typeof item === "object" && !Array.isArray(item));
    if (objectItems.length > 0) {
      const keys = [...new Set(objectItems.slice(0, 3).flatMap((item) => Object.keys(item)))].slice(0, 30);
      const newsishScore = keys.filter((key) => /title|name|url|link|date|publish|news|post|content|body|slug/i.test(key)).length;
      const sample = Object.fromEntries(Object.entries(objectItems[0]).flatMap(([key, itemValue]) => {
        if (!["string", "number", "boolean"].includes(typeof itemValue)) return [];
        return [[key, typeof itemValue === "string" ? itemValue.slice(0, 240) : itemValue]];
      }));
      output.push({ source, path: pathParts.join("."), count: value.length, keys, newsishScore, sample });
    }
    value.slice(0, 3).forEach((item, index) => walkArrayCandidates(item, source, [...pathParts, String(index)], depth + 1, output));
    return output;
  }
  if (typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      walkArrayCandidates(child, source, [...pathParts, key], depth + 1, output);
      if (output.length >= 30) break;
    }
  }
  return output;
}

/** JSONとして安全にparseできる埋め込みstateから、記事配列らしいパスを抽出する。evalは使わない。 */
export function discoverEmbeddedJsonArrays(html) {
  const payloads = [
    { name: "__NEXT_DATA__", re: /<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i },
    { name: "__NUXT_DATA__", re: /<script[^>]+id=["']__NUXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i },
    { name: "window.__INITIAL_STATE__", re: /window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\});?\s*<\/script>/i },
  ];
  const candidates = [];
  for (const payload of payloads) {
    const match = payload.re.exec(html);
    if (!match) continue;
    try {
      const parsed = JSON.parse(match[1]);
      walkArrayCandidates(parsed, payload.name, [], 0, candidates);
    } catch {
      // JSONでないdevalue/JavaScript表現は安全のため評価しない。
    }
  }
  return candidates
    .sort((a, b) => b.newsishScore - a.newsishScore || b.count - a.count)
    .slice(0, 20);
}

function extractMarkupDiagnostics(html, effectiveUrl) {
  const dateContexts = [];
  const dateRe = /20\d{2}\s*[年./-]\s*\d{1,2}\s*[月./-]\s*\d{1,2}/g;
  let dateMatch;
  while ((dateMatch = dateRe.exec(html)) !== null && dateContexts.length < 10) {
    dateContexts.push(html.slice(Math.max(0, dateMatch.index - 180), Math.min(html.length, dateMatch.index + 260)).replace(/\s+/g, " "));
  }
  const scriptSources = [];
  const scriptRe = /<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi;
  let scriptMatch;
  while ((scriptMatch = scriptRe.exec(html)) !== null && scriptSources.length < 30) {
    try {
      const url = new URL(scriptMatch[1].replace(/&amp;/gi, "&"), effectiveUrl).toString();
      if (!scriptSources.includes(url)) scriptSources.push(url);
    } catch {
      // 壊れたsrcは無視する。
    }
  }
  return { dateContexts, scriptSources };
}

/** 公式JS内の公開GET候補を文字列として発見するだけ。認証情報やCookieは扱わない。 */
export function extractScriptEndpointCandidates(script, scriptUrl) {
  const decoded = script.replace(/\\\//g, "/");
  const raw = [
    ...decoded.matchAll(/https?:\/\/[^\s"'`<>\\]+/gi),
    ...decoded.matchAll(/["'`](\/[^\s"'`<>\\]+)["'`]/g),
  ].map((match) => match[1] ?? match[0]);
  const endpoints = [];
  for (const value of raw) {
    if (!/(?:api|news|info(?:rmation)?|posts?|contents?|json|graphql)/i.test(value)) continue;
    try {
      const normalized = new URL(value, scriptUrl).toString();
      if (!endpoints.includes(normalized)) endpoints.push(normalized);
    } catch {
      // URLでない断片は無視する。
    }
    if (endpoints.length >= 40) break;
  }
  return endpoints;
}

export function extractScriptRouteFragments(script) {
  const decoded = script.replace(/\\\//g, "/");
  const fragments = [];
  for (const match of decoded.matchAll(/["'`]([^"'`\s]{2,200})["'`]/g)) {
    const value = match[1];
    if (value.length > 160 || !/^(?:https?:\/\/|\/|[A-Za-z0-9_-]+\/)/.test(value)) continue;
    if (!/(?:news|info(?:rmation)?|posts?|artists?|contents?)/i.test(value)) continue;
    if (/\.(?:png|jpe?g|gif|svg|webp|css|woff2?)(?:[?#]|$)/i.test(value)) continue;
    if (!fragments.includes(value)) fragments.push(value);
    if (fragments.length >= 80) break;
  }
  return fragments;
}

function extractInlineScriptText(html) {
  return [...html.matchAll(/<script\b(?![^>]*\bsrc\s*=)[^>]*>([\s\S]*?)<\/script>/gi)]
    .map((match) => match[1])
    .join("\n");
}

function parseJsonOrJsonp(text) {
  const trimmed = text.trim().replace(/^\uFEFF/, "");
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = /^[^(]+\(([^]*)\)\s*;?\s*$/.exec(trimmed);
    if (!match) return null;
    try {
      return JSON.parse(match[1]);
    } catch {
      return null;
    }
  }
}

function extractJsonLdTypes(html) {
  const types = [];
  const re = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(m[1].trim());
      const list = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of list) {
        if (item && item["@type"]) types.push(item["@type"]);
        if (item && item["@graph"]) {
          for (const g of item["@graph"]) if (g["@type"]) types.push(g["@type"]);
        }
      }
    } catch {
      types.push("(invalid JSON-LD)");
    }
  }
  return types;
}

function extractOgp(html) {
  const get = (prop) => {
    const m = new RegExp(`<meta property="og:${prop}" content="([\\s\\S]*?)"`).exec(html);
    return m ? m[1] : null;
  };
  return { title: get("title"), description: get("description"), image: get("image"), type: get("type") };
}

/** 繰り返し出現するclass名パターンから、ニュース一覧項目らしき候補を推定する(ヒューリスティック)。 */
function guessListItemCandidates(html) {
  const classCounts = new Map();
  const classRe = /class="([^"]*)"/g;
  let m;
  while ((m = classRe.exec(html)) !== null) {
    for (const cls of m[1].split(/\s+/)) {
      if (!cls) continue;
      classCounts.set(cls, (classCounts.get(cls) || 0) + 1);
    }
  }
  const newsish = [...classCounts.entries()]
    .filter(([cls, count]) => count >= 3 && count <= 100 && /news|post|item|article|list|entry/i.test(cls))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([cls, count]) => ({ className: cls, occurrences: count }));
  return newsish;
}

/** リンクの近くに日付らしき文字列があるか、で「一覧らしさ」を粗く判定する。 */
function guessDateNearLinks(html) {
  const dateLikeCount = (html.match(/\d{4}[.\-/年]\d{1,2}[.\-/月]\d{1,2}/g) || []).length;
  const anchorCount = (html.match(/<a\s/g) || []).length;
  return { dateLikeCount, anchorCount };
}

function guessJsRenderingLikelihood(html) {
  const bodyMatch = /<body[^>]*>([\s\S]*)<\/body>/i.exec(html);
  const bodyHtml = bodyMatch ? bodyMatch[1] : html;
  const visibleTextLen = bodyHtml.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<[^>]+>/g, "").trim().length;
  const scriptLen = (bodyHtml.match(/<script[\s\S]*?<\/script>/gi) || []).join("").length;
  const ratio = scriptLen > 0 ? visibleTextLen / scriptLen : 0;
  // 目安: 可視テキストがscript量に比べて極端に少ない場合、CSR(クライアント側描画)の可能性を疑う。
  const likely = visibleTextLen < 500 && scriptLen > 5000;
  return { visibleTextLen, scriptLen, ratio: Number(ratio.toFixed(3)), likelyClientRendered: likely };
}

const ARTICLE_PATH_HINT = /(?:news|info(?:rmation)?|notice|topics?|posts?|contents?|article|detail)/i;
const NAV_LABEL = /^(?:news|info(?:rmation)?|お知らせ|ニュース|一覧|プロフィール|スケジュール|ディスコグラフィー|お問い合わせ|利用規約|プライバシーポリシー|サイトマップ|view\s*more|more|next|prev|次へ|前へ|schedule|discography|profile|live|media|movie|video|release|topics|goods|blog|report|ticket|archive|contents|special)$/i;

function decodeHtmlText(value) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/gi, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_entity, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_entity, decimal) => String.fromCodePoint(Number.parseInt(decimal, 10)))
    .replace(/\s+/g, " ")
    .trim();
}

function sameSite(a, b) {
  return a.hostname.replace(/^www\./i, "") === b.hostname.replace(/^www\./i, "");
}

/** 生HTMLから、実記事らしい同一サイト内リンクを候補として返す。自動有効化には使わない。 */
export function extractArticleLinkCandidates(html, effectiveUrl) {
  const base = new URL(effectiveUrl);
  const anchors = /<a\b([^>]*?)href\s*=\s*["']([^"']+)["']([^>]*)>([\s\S]*?)<\/a>/gi;
  const seen = new Set();
  const candidates = [];
  let match;
  while ((match = anchors.exec(html)) !== null) {
    const rawHref = match[2].replace(/&amp;/gi, "&").trim();
    if (!rawHref || /^(?:#|javascript:|mailto:|tel:)/i.test(rawHref)) continue;
    let resolved;
    try {
      resolved = new URL(rawHref, base);
    } catch {
      continue;
    }
    if (!/^https?:$/.test(resolved.protocol) || !sameSite(resolved, base)) continue;
    const title = decodeHtmlText(match[4]);
    if (title.length < 4 || title.length > 300 || NAV_LABEL.test(title)) continue;
    const nearby = decodeHtmlText(html.slice(Math.max(0, match.index - 220), Math.min(html.length, match.index + match[0].length + 220)));
    const dateMatch = nearby.match(/(20\d{2})\s*[年./-]\s*(\d{1,2})\s*[月./-]\s*(\d{1,2})/);
    const articlePath = ARTICLE_PATH_HINT.test(resolved.pathname);
    if (!articlePath && !dateMatch) continue;
    const normalizedUrl = resolved.toString();
    if (seen.has(normalizedUrl)) continue;
    seen.add(normalizedUrl);
    candidates.push({
      title,
      url: normalizedUrl,
      published_date: dateMatch ? `${dateMatch[1]}-${dateMatch[2].padStart(2, "0")}-${dateMatch[3].padStart(2, "0")}` : null,
      signals: [articlePath ? "article_path" : null, dateMatch ? "date_near_link" : null].filter(Boolean),
    });
  }
  return candidates.slice(0, 60);
}

function detectsNoArticles(html) {
  const text = decodeHtmlText(html);
  return /(?:お知らせ|ニュース|記事)(?:は|が)?(?:ありません|ございません|見つかりません)|no\s+(?:news|articles?|posts?)\s+(?:yet|found|available)/i.test(text);
}

export async function discoverOfficialNewsSite(targetUrl, options = {}) {
  const log = options.quiet ? () => {} : console.log;
  if (!targetUrl) throw new Error("公式NEWS一覧ページのURLが必要です");

  const u = new URL(targetUrl);
  const origin = u.origin;

  log(`調査対象: ${targetUrl}`);
  const robotsPolicy = options.robotsPolicy === "standard" ? "standard" : "strict_ai";
  const robots = await checkRobots(origin, robotsPolicy);
  const targetAllowed = isPathAllowed(robots.ruleGroups, u.pathname);
  log(`robots.txt: ${robots.exists ? "あり" : "なし(制限なしとみなす)"} / policy=${robotsPolicy} / crawl-delay=${robots.crawlDelay}s / targetAllowed=${targetAllowed}`);

  if (!targetAllowed) {
    log("robots.txtが対象パスへのcrawlerアクセスを禁止しているため、これ以上のprobeを行わず終了します。");
    const report = {
      target_url: targetUrl,
      generated_at: new Date().toISOString(),
      robots_policy: robotsPolicy,
      robots,
      classification: "robots_blocked",
      aborted_reason: robotsPolicy === "standard"
        ? "robots.txt disallows the target path for the wildcard crawler agent"
        : "robots.txt disallows the target path for * or a known AI crawler agent",
    };
    if (options.writeReport !== false) writeReport(u, report, options.outputDir, log);
    return report;
  }

  const probes = {};
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  async function delayIfNeeded() {
    if (robots.crawlDelay > 0) await sleep(robots.crawlDelay * 1000);
  }

  // 1. 対象ページ本体を取得(RSS link tag / JSON-LD / OGP / embedded JSON / 一覧候補推定に使う)。
  let mainHtml = null;
  if (isPathAllowed(robots.ruleGroups, u.pathname)) {
    const res = await fetchSafe(targetUrl);
    if (res.ok) mainHtml = res.text;
    probes.main_page = {
      url: targetUrl,
      finalUrl: res.url ?? targetUrl,
      ok: res.ok,
      status: res.status,
      contentType: res.headers?.get?.("content-type") ?? null,
      htmlBytes: res.text?.length ?? 0,
    };
  } else {
    probes.main_page = { url: targetUrl, ok: false, reason: "disallowed by robots.txt" };
  }

  const rssLinksFromHtml = mainHtml ? extractRssLinks(mainHtml) : [];
  const embeddedJson = mainHtml ? detectEmbeddedJsonNames(mainHtml) : [];
  const jsonLdTypes = mainHtml ? extractJsonLdTypes(mainHtml) : [];
  const ogp = mainHtml ? extractOgp(mainHtml) : null;
  const listItemCandidates = mainHtml ? guessListItemCandidates(mainHtml) : [];
  const dateNearLinks = mainHtml ? guessDateNearLinks(mainHtml) : null;
  const jsRendering = mainHtml ? guessJsRenderingLikelihood(mainHtml) : null;
  const articleLinkCandidates = mainHtml ? extractArticleLinkCandidates(mainHtml, targetUrl) : [];
  const noArticlesDetected = mainHtml ? detectsNoArticles(mainHtml) : false;
  const embeddedJsonArrays = mainHtml ? discoverEmbeddedJsonArrays(mainHtml) : [];
  const markupDiagnostics = mainHtml ? extractMarkupDiagnostics(mainHtml, targetUrl) : { dateContexts: [], scriptSources: [] };
  const scriptApiCandidates = [];
  const scriptRouteFragments = [];
  if (mainHtml) {
    const inlineEndpoints = extractScriptEndpointCandidates(extractInlineScriptText(mainHtml), targetUrl);
    if (inlineEndpoints.length > 0) scriptApiCandidates.push({ scriptUrl: `${targetUrl}#inline`, endpoints: inlineEndpoints });
  }
  if (articleLinkCandidates.length === 0 && markupDiagnostics.scriptSources.length > 0) {
    for (const scriptUrl of markupDiagnostics.scriptSources.slice(0, 12)) {
      const script = new URL(scriptUrl);
      if (!sameSite(script, u) || !isPathAllowed(robots.ruleGroups, script.pathname)) continue;
      await delayIfNeeded();
      const response = await fetchSafe(scriptUrl);
      if (!response.ok || !response.text) continue;
      const endpoints = extractScriptEndpointCandidates(response.text, scriptUrl);
      if (endpoints.length > 0) scriptApiCandidates.push({ scriptUrl, endpoints });
      const fragments = extractScriptRouteFragments(response.text);
      if (fragments.length > 0) scriptRouteFragments.push({ scriptUrl, fragments });
    }
  }
  const publicEndpointProbes = [];
  const endpointUrls = [...new Set(scriptApiCandidates.flatMap((candidate) => candidate.endpoints))];
  for (const endpointUrl of endpointUrls.slice(0, 8)) {
    const endpoint = new URL(endpointUrl);
    if (!sameSite(endpoint, u) || /\[[^\]]+\]|\/auth(?:\/|$)/i.test(endpoint.pathname)) continue;
    if (/^\/api\/?$/i.test(endpoint.pathname)) continue;
    if (!isPathAllowed(robots.ruleGroups, endpoint.pathname)) continue;
    await delayIfNeeded();
    const response = await fetchSafe(endpointUrl);
    if (!response.ok || !response.text) {
      publicEndpointProbes.push({ url: endpointUrl, ok: false, status: response.status });
      continue;
    }
    const parsed = parseJsonOrJsonp(response.text);
    if (parsed == null) {
      publicEndpointProbes.push({ url: endpointUrl, ok: true, status: response.status, structured: false });
      continue;
    }
    publicEndpointProbes.push({
      url: endpointUrl,
      ok: true,
      status: response.status,
      structured: true,
      topLevelKeys: parsed && typeof parsed === "object" && !Array.isArray(parsed) ? Object.keys(parsed).slice(0, 30) : [],
      arrayCandidates: walkArrayCandidates(parsed, "public_endpoint").sort((a, b) => b.newsishScore - a.newsishScore || b.count - a.count).slice(0, 20),
    });
  }

  // 2. よくあるRSS/Atomパスをprobe
  const rssCandidatePaths = ["/feed", "/feed/", "/rss", "/rss.xml", "/atom.xml", "/news/feed"];
  const rssCandidates = new Set(rssLinksFromHtml.map((href) => new URL(href, targetUrl).toString()));
  for (const p of rssCandidatePaths) rssCandidates.add(new URL(p, origin).toString());
  const rssValidated = [];
  for (const candidateUrl of rssCandidates) {
    const candidatePath = new URL(candidateUrl).pathname;
    if (!isPathAllowed(robots.ruleGroups, candidatePath)) continue;
    await delayIfNeeded();
    const res = await fetchSafe(candidateUrl);
    if (!res.ok || !res.text) continue;
    const analysis = analyzeFeedDocument(res.text);
    if (analysis.valid) {
      rssValidated.push({ url: res.url ?? candidateUrl, contentType: res.headers?.get?.("content-type") ?? null, ...analysis });
    }
  }
  probes.rss_atom = { found: [...new Set(rssValidated.map((feed) => feed.url))], validated: rssValidated };

  // 3. WordPress REST API probe
  const wpPath = "/wp-json/wp/v2/posts";
  let wpFound = false;
  if (isPathAllowed(robots.ruleGroups, wpPath)) {
    await delayIfNeeded();
    const res = await fetchSafe(new URL(wpPath, origin).toString());
    if (res.ok && res.text) {
      try {
        const json = JSON.parse(res.text);
        wpFound = Array.isArray(json) && json.length > 0;
      } catch {
        wpFound = false;
      }
    }
  }
  probes.wordpress_api = { found: wpFound, url: new URL(wpPath, origin).toString() };

  // 4. sitemap probe(robots.txt記載分 + よくあるパス)
  const sitemapCandidates = new Set([...robots.sitemaps, "/sitemap.xml", "/sitemap_index.xml", "/news-sitemap.xml"]);
  const sitemapsFound = [];
  for (const sm of sitemapCandidates) {
    const smUrl = sm.startsWith("http") ? sm : new URL(sm, origin).toString();
    const smPath = new URL(smUrl).pathname;
    if (!isPathAllowed(robots.ruleGroups, smPath)) continue;
    await delayIfNeeded();
    const res = await fetchSafe(smUrl);
    if (res.ok && res.text && /<urlset|<sitemapindex/i.test(res.text)) {
      sitemapsFound.push({ url: smUrl, isNewsSitemap: /<news:/i.test(res.text) });
    }
  }
  probes.sitemap = { found: sitemapsFound };

  probes.embedded_json = { found: embeddedJson, arrayCandidates: embeddedJsonArrays };
  probes.json_ld = { types: [...new Set(jsonLdTypes)] };
  probes.ogp = ogp;
  probes.html_list_candidates = { classNameCandidates: listItemCandidates, dateNearLinks };
  probes.article_link_candidates = { count: articleLinkCandidates.length, items: articleLinkCandidates };
  probes.no_articles = { detected: noArticlesDetected };
  probes.markup_diagnostics = markupDiagnostics;
  probes.script_api_candidates = scriptApiCandidates;
  probes.script_route_fragments = scriptRouteFragments;
  probes.public_endpoint_probes = publicEndpointProbes;
  probes.js_rendering = jsRendering;

  // 推奨strategyの決定(優先順位: RSS > WordPress > sitemap+news > embedded_json > json_ld > static_html)
  let recommendedStrategy = "static_html";
  const reasons = [];
  if (probes.rss_atom.found.length > 0) {
    recommendedStrategy = "rss";
    reasons.push("RSS/Atomフィードが見つかった");
  } else if (probes.wordpress_api.found) {
    recommendedStrategy = "wordpress";
    reasons.push("WordPress REST APIが有効");
  } else if (probes.sitemap.found.some((s) => s.isNewsSitemap)) {
    recommendedStrategy = "sitemap";
    reasons.push("news sitemap拡張が見つかった(本文は詳細ページ側のJSON-LD/OGP/セレクタで補完要)");
  } else if (embeddedJson.length > 0) {
    recommendedStrategy = "embedded_json";
    reasons.push(`埋め込みJSON(${embeddedJson.join(", ")})が見つかった`);
  } else if (jsonLdTypes.length > 0) {
    recommendedStrategy = "json_ld";
    reasons.push("JSON-LD構造化データが見つかった(詳細ページ補完向け。一覧取得は別途必要)");
  } else {
    reasons.push("上記いずれも見つからず、CSSセレクタベースのstatic_html(Tier2)が候補");
  }
  if (jsRendering?.likelyClientRendered) {
    reasons.push("警告: 可視テキストが少なくscript量が多いため、クライアント側レンダリング(JS描画)の可能性が高い。static_html戦略では取得できない可能性がある(Playwright等は今回未導入)。");
  }

  const classification = noArticlesDetected && articleLinkCandidates.length === 0
    ? "no_articles"
    : recommendedStrategy;
  const report = {
    target_url: targetUrl,
    generated_at: new Date().toISOString(),
    robots_policy: robotsPolicy,
    robots,
    probes,
    classification,
    recommended_strategy: recommendedStrategy,
    recommendation_reasons: reasons,
    css_selector_candidates: listItemCandidates.map((c) => ({ item: `.${c.className}`, occurrences: c.occurrences })),
    note: "この結果は候補提示のみ。artists.tsへの自動反映は行っていない。scripts/validateOfficialNewsConfig.mtsで検証してから手動で追加すること。",
  };

  if (options.writeReport !== false) writeReport(u, report, options.outputDir, log);
  log(`推奨strategy: ${recommendedStrategy}`);
  log(`分類: ${classification}`);
  log(`理由: ${reasons.join(" / ")}`);
  return report;
}

function writeReport(u, report, outputDir, log = console.log) {
  const dir = path.resolve(process.cwd(), outputDir ?? "discovery-reports");
  fs.mkdirSync(dir, { recursive: true });
  const slug = u.hostname.replace(/[^a-zA-Z0-9.-]/g, "_");
  const filePath = path.join(dir, `${slug}-${Date.now()}.json`);
  fs.writeFileSync(filePath, JSON.stringify(report, null, 2), "utf-8");
  log(`レポート保存先: ${filePath}`);
  return filePath;
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  const targetUrl = process.argv[2];
  const robotsPolicy = process.argv.includes("--standard-robots") ? "standard" : "strict_ai";
  if (!targetUrl) {
    console.error("使い方: node scripts/discoverOfficialNewsSite.mjs <公式NEWS一覧ページのURL> [--standard-robots]");
    process.exitCode = 1;
  } else {
    discoverOfficialNewsSite(targetUrl, { robotsPolicy }).catch((e) => {
      console.error("FATAL:", e);
      process.exitCode = 1;
    });
  }
}
