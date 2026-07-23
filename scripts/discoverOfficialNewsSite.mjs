// 新規アーティストの公式NEWS URLを渡すと、取得方式の候補を自動調査するCLI。
//
// 実行方法:
//   node scripts/discoverOfficialNewsSite.mjs <公式NEWS一覧ページのURL>
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
//     (scripts/validateOfficialNewsConfig.mjs で検証してから、手動でsites/index.tsへ追加する)。

import fs from "fs";
import path from "path";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

async function fetchSafe(url, timeoutMs = 10000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow", signal: controller.signal });
    return { ok: res.ok, status: res.status, text: res.ok ? await res.text() : null, headers: res.headers };
  } catch (e) {
    return { ok: false, status: null, text: null, error: String(e && e.message ? e.message : e) };
  } finally {
    clearTimeout(t);
  }
}

async function checkRobots(origin) {
  const res = await fetchSafe(new URL("/robots.txt", origin).toString());
  if (!res.ok) return { exists: false, disallowAll: false, crawlDelay: 0, sitemaps: [] };

  const lines = (res.text || "").split(/\r?\n/);
  let collecting = false;
  const disallow = [];
  const sitemaps = [];
  let crawlDelay = 0;
  for (const raw of lines) {
    const line = raw.split("#")[0].trim();
    if (!line) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    if (key === "user-agent") {
      collecting = value === "*";
    } else if (key === "disallow" && collecting) {
      if (value) disallow.push(value);
    } else if (key === "crawl-delay" && collecting) {
      const n = parseFloat(value);
      if (!Number.isNaN(n)) crawlDelay = Math.max(crawlDelay, n);
    } else if (key === "sitemap") {
      sitemaps.push(value);
    }
  }
  return { exists: true, disallowAll: disallow.includes("/"), disallow, crawlDelay, sitemaps };
}

function isPathAllowed(disallowList, pathname) {
  return !disallowList.some((d) => d && pathname.startsWith(d));
}

function extractRssLinks(html) {
  const links = [];
  const re = /<link[^>]+type="application\/(rss|atom)\+xml"[^>]*>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const hrefM = /href="([^"]*)"/.exec(m[0]);
    if (hrefM) links.push(hrefM[1]);
  }
  return links;
}

function detectEmbeddedJsonNames(html) {
  const found = [];
  if (/<script id="__NEXT_DATA__"/.test(html)) found.push("__NEXT_DATA__");
  if (/window\.__NUXT__\s*=/.test(html)) found.push("__NUXT__");
  if (/window\.__INITIAL_STATE__\s*=/.test(html)) found.push("window.__INITIAL_STATE__");
  return found;
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

async function main() {
  const targetUrl = process.argv[2];
  if (!targetUrl) {
    console.error("使い方: node scripts/discoverOfficialNewsSite.mjs <公式NEWS一覧ページのURL>");
    process.exit(1);
  }

  const u = new URL(targetUrl);
  const origin = u.origin;

  console.log(`調査対象: ${targetUrl}`);
  const robots = await checkRobots(origin);
  console.log(`robots.txt: ${robots.exists ? "あり" : "なし(制限なしとみなす)"} / crawl-delay=${robots.crawlDelay}s / disallowAll=${robots.disallowAll}`);

  if (robots.disallowAll) {
    console.log("robots.txtが全体を禁止しているため、これ以上のprobeを行わず終了します。");
    const report = {
      target_url: targetUrl,
      generated_at: new Date().toISOString(),
      robots,
      aborted_reason: "robots.txt disallows all paths for User-agent: *",
    };
    writeReport(u, report);
    return;
  }

  const probes = {};
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  async function delayIfNeeded() {
    if (robots.crawlDelay > 0) await sleep(robots.crawlDelay * 1000);
  }

  // 1. 対象ページ本体を取得(RSS link tag / JSON-LD / OGP / embedded JSON / 一覧候補推定に使う)。
  let mainHtml = null;
  if (isPathAllowed(robots.disallow || [], u.pathname)) {
    const res = await fetchSafe(targetUrl);
    if (res.ok) mainHtml = res.text;
    probes.main_page = { url: targetUrl, ok: res.ok, status: res.status };
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

  // 2. よくあるRSS/Atomパスをprobe
  const rssCandidatePaths = ["/feed", "/feed/", "/rss", "/rss.xml", "/atom.xml", "/news/feed"];
  const rssFound = [...rssLinksFromHtml];
  for (const p of rssCandidatePaths) {
    if (!isPathAllowed(robots.disallow || [], p)) continue;
    await delayIfNeeded();
    const res = await fetchSafe(new URL(p, origin).toString());
    if (res.ok && res.text && /<rss|<feed/i.test(res.text)) rssFound.push(new URL(p, origin).toString());
  }
  probes.rss_atom = { found: [...new Set(rssFound)] };

  // 3. WordPress REST API probe
  const wpPath = "/wp-json/wp/v2/posts";
  let wpFound = false;
  if (isPathAllowed(robots.disallow || [], wpPath)) {
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
    if (!isPathAllowed(robots.disallow || [], smPath)) continue;
    await delayIfNeeded();
    const res = await fetchSafe(smUrl);
    if (res.ok && res.text && /<urlset|<sitemapindex/i.test(res.text)) {
      sitemapsFound.push({ url: smUrl, isNewsSitemap: /<news:/i.test(res.text) });
    }
  }
  probes.sitemap = { found: sitemapsFound };

  probes.embedded_json = { found: embeddedJson };
  probes.json_ld = { types: [...new Set(jsonLdTypes)] };
  probes.ogp = ogp;
  probes.html_list_candidates = { classNameCandidates: listItemCandidates, dateNearLinks };
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

  const report = {
    target_url: targetUrl,
    generated_at: new Date().toISOString(),
    robots,
    probes,
    recommended_strategy: recommendedStrategy,
    recommendation_reasons: reasons,
    css_selector_candidates: listItemCandidates.map((c) => ({ item: `.${c.className}`, occurrences: c.occurrences })),
    note: "この結果は候補提示のみ。sites/index.tsへの自動反映は行っていない。scripts/validateOfficialNewsConfig.mjsで検証してから手動で追加すること。",
  };

  writeReport(u, report);
  console.log(`推奨strategy: ${recommendedStrategy}`);
  console.log(`理由: ${reasons.join(" / ")}`);
}

function writeReport(u, report) {
  const dir = path.resolve(process.cwd(), "discovery-reports");
  fs.mkdirSync(dir, { recursive: true });
  const slug = u.hostname.replace(/[^a-zA-Z0-9.-]/g, "_");
  const filePath = path.join(dir, `${slug}-${Date.now()}.json`);
  fs.writeFileSync(filePath, JSON.stringify(report, null, 2), "utf-8");
  console.log(`レポート保存先: ${filePath}`);
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
