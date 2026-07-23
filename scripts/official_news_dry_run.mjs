// 公式NEWS取得 試験実装（ローカルdry-runのみ）
//
// 目的: artists.ts登録アーティストの公式サイトNEWSを取得し、記事を分類・保存できる形にする検証。
// 重要な制約:
//   - 本番クローラ（src/lib/eventCrawler.ts / cron）には一切統合しない。既存コードは読み書きしない。
//   - DBへは保存しない。出力は下記JSONファイルのみ。
//   - CAPTCHA回避・ログイン回避・アクセス制限の迂回は行わない。
//   - 各サイトのrobots.txtを都度取得し、ワイルドカード(*)および主要AIクローラ名(ClaudeBot等)への
//     Disallowを確認したうえで、許可されている場合のみ取得する。取得直前に毎回チェックする
//     (静的なホワイトリストに頼らない)。
//   - 1サイトの失敗が全体を止めないよう、サイトごとに独立してtry/catchする。
//
// 実行方法: node scripts/official_news_dry_run.mjs
// 出力先: C:\Users\tcgea\Documents\tixrepo-data\official_news_dry_run.json

import fs from "fs";

const OUTPUT_PATH = "C:\\Users\\tcgea\\Documents\\tixrepo-data\\official_news_dry_run.json";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const FETCH_TIMEOUT_MS = 15000;

// robots.txtで確認する対象。ワイルドカード(*)に加え、Claude/Anthropic自身を指す可能性のある
// エージェント名のみを明示的にチェックする(他社ボット名(GPTBot等)単独の言及はClaudeへの
// 拒否表明とはみなさない。robots.txtはエージェントごとの個別指定が前提のため、
// 「Claude/Anthropicを指す名称」または「*」でのDisallowのみを取得停止の根拠とする)。
const CLAUDE_RELATED_BOT_NAMES = ["claudebot", "claude-web", "claude-searchbot", "anthropic-ai"];

async function fetchWithTimeout(url, opts = {}) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, ...(opts.headers || {}) },
      redirect: "follow",
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(t);
  }
}

/** robots.txtをその場で取得し、指定パスがワイルドカード/主要AIクローラに対して許可されているか判定する。 */
async function checkRobotsAllowed(origin, path) {
  let robotsText;
  try {
    const res = await fetchWithTimeout(new URL("/robots.txt", origin).toString());
    if (!res.ok) {
      // robots.txtが無い(404等) = 制限記述なしとみなす(標準的な解釈)
      return { allowed: true, reason: `robots.txt HTTP ${res.status} (no explicit restriction found)` };
    }
    robotsText = await res.text();
  } catch (e) {
    return { allowed: true, reason: `robots.txt fetch failed (${e.message}); treated as no restriction` };
  }

  const groups = [];
  let current = null;
  let ruleSeenSinceUA = false;
  for (const raw of robotsText.split(/\r?\n/)) {
    const line = raw.split("#")[0].trim();
    if (!line) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    if (key === "user-agent") {
      if (!current || ruleSeenSinceUA) {
        current = { agents: [], rules: [] };
        groups.push(current);
        ruleSeenSinceUA = false;
      }
      current.agents.push(value.toLowerCase());
    } else if (key === "disallow" || key === "allow") {
      if (current) {
        current.rules.push({ type: key, path: value });
        ruleSeenSinceUA = true;
      }
    }
  }

  const agentsToCheck = ["*", ...CLAUDE_RELATED_BOT_NAMES];
  for (const agent of agentsToCheck) {
    for (const g of groups) {
      if (!g.agents.includes(agent)) continue;
      let matched = null;
      for (const r of g.rules) {
        if (r.path === "") continue;
        if (path.startsWith(r.path)) {
          if (!matched || r.path.length > matched.path.length) matched = r;
        }
      }
      if (matched && matched.type === "disallow") {
        return {
          allowed: false,
          reason: `robots.txt disallows agent "${agent}" for path prefix "${matched.path}"`,
        };
      }
    }
  }
  return { allowed: true, reason: "no matching Disallow rule for * or known AI crawler names" };
}

function stripHtml(html) {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ---------------------------------------------------------------------------
// 分類ロジック (live / ticket / release / media / goods / fanclub / other)
// 優先順位: live > ticket > release > goods > fanclub > media > other
// ---------------------------------------------------------------------------
const CATEGORY_KEYWORDS = {
  live: ["ライブ", "LIVE", "コンサート", "CONCERT", "ツアー", "TOUR", "公演", "出演決定", "ワンマン", "単独公演", "フェス", "追加公演"],
  ticket: ["チケット", "TICKET", "先行", "抽選", "受付開始", "受付中", "一般発売", "最速先行", "申込", "販売スケジュール"],
  release: ["リリース", "RELEASE", "発売", "配信開始", "新曲", "アルバム", "シングル", "ミュージックビデオ", "MV公開", "楽曲配信"],
  goods: ["グッズ", "GOODS", "物販", "受注販売", "商品化"],
  fanclub: ["ファンクラブ", "FC限定", "会員限定", "継続手続き", "入会"],
  media: ["出演情報", "番組出演", "テレビ", "TV", "ラジオ", "RADIO", "雑誌", "インタビュー", "特集"],
};

function classify(title, body) {
  const text = `${title}\n${body}`;
  for (const cat of ["live", "ticket", "release", "goods", "fanclub", "media"]) {
    if (CATEGORY_KEYWORDS[cat].some((kw) => text.includes(kw))) {
      return cat;
    }
  }
  return "other";
}

// ---------------------------------------------------------------------------
// live/ticket記事から公演名・日付・会場を抽出するヒューリスティック
// ---------------------------------------------------------------------------
const VENUE_RE = /[一-龠ぁ-んァ-ヶーA-Za-z0-9 ]{2,24}(?:ドーム|アリーナ|ホール|会館|スタジアム|センター|劇場|体育館|arena|dome|hall|stadium)/i;
const DATE_WITH_YEAR_RE = /(\d{4})[年./](\d{1,2})[月./](\d{1,2})日?/;
const DATE_WITHOUT_YEAR_RE = /(\d{1,2})月(\d{1,2})日/;
const EVENT_NAME_RE = /[『"「]([^』"」]{2,60})[』"」]/;

function extractLiveInfo(title, body, publishedDate) {
  const text = `${title}\n${body}`;
  const venueMatch = text.match(VENUE_RE);
  const eventMatch = title.match(EVENT_NAME_RE) || text.match(EVENT_NAME_RE);

  let date = null;
  const withYear = text.match(DATE_WITH_YEAR_RE);
  if (withYear) {
    date = `${withYear[1]}-${String(withYear[2]).padStart(2, "0")}-${String(withYear[3]).padStart(2, "0")}`;
  } else {
    const withoutYear = text.match(DATE_WITHOUT_YEAR_RE);
    if (withoutYear) {
      // 年の記載が無い場合、記事の公開年を暫定的に採用する(年またぎの可能性は考慮していない簡易ヒューリスティック)
      const fallbackYear = publishedDate ? publishedDate.slice(0, 4) : String(new Date().getFullYear());
      date = `${fallbackYear}-${String(withoutYear[1]).padStart(2, "0")}-${String(withoutYear[2]).padStart(2, "0")} (年は公開日から推定)`;
    }
  }

  return {
    event_name: eventMatch ? eventMatch[1] : null,
    date,
    venue: venueMatch ? venueMatch[0].trim() : null,
  };
}

// ---------------------------------------------------------------------------
// サイト別フェッチャ
// ---------------------------------------------------------------------------

async function fetchExo() {
  const artist = { name: "EXO", slug: "exo" };
  const origin = "https://exo-jp.net";
  const listPath = "/news/index.php";
  const robots = await checkRobotsAllowed(origin, listPath);
  if (!robots.allowed) throw new Error(`robots.txt disallow: ${robots.reason}`);

  const res = await fetchWithTimeout(origin + listPath);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();

  const itemRe = /<time class="date"><span class="m">(\d{2})<\/span><span class="dot"><\/span><span class="d">(\d{2})<\/span><\/time>[\s\S]*?<a href="(detail\.php\?id=\d+)" class="link">([\s\S]*?)<\/a>/g;
  const year = new Date().getFullYear();
  const articles = [];
  let m;
  while ((m = itemRe.exec(html)) !== null) {
    const [, mm, dd, href, rawTitleHtml] = m;
    const title = stripHtml(rawTitleHtml).replace(/\s+/g, " ").replace(/\bNEW\b\s*$/, "").trim();
    const detailUrl = new URL(href, origin + "/news/").toString();
    articles.push({
      title,
      published_date: `${year}-${mm}-${dd}`,
      article_url: detailUrl,
      body: null, // 詳細ページ別途取得(下で1件だけ試験取得)
      thumbnail_url: null,
    });
  }

  // 詳細本文取得の実証として先頭1件だけ試験取得する(全件詳細取得はdry-runの範囲を超えるため)
  if (articles.length > 0) {
    try {
      const detailRes = await fetchWithTimeout(articles[0].article_url);
      if (detailRes.ok) {
        const detailHtml = await detailRes.text();
        const bodyMatch = detailHtml.match(/<div class="detail-body"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/);
        articles[0].body = bodyMatch ? stripHtml(bodyMatch[1]) : stripHtml(detailHtml.slice(0, 2000));
      }
    } catch {
      // 詳細取得失敗はこの1件のbodyをnullのままにし、リスト全体は失敗にしない
    }
  }

  return { artist, method: "static_html", robots, articles };
}

async function fetchGenerations() {
  const artist = { name: "GENERATIONS", slug: "generations" };
  const origin = "https://www.generations-ldh.com";
  const apiPath = "/sys_inc/newsdat.php";
  const robots = await checkRobotsAllowed(origin, apiPath);
  if (!robots.allowed) throw new Error(`robots.txt disallow: ${robots.reason}`);

  const res = await fetchWithTimeout(`${origin}${apiPath}?p=0&y=`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const text = json.text || "";

  const boxRe = /<div id="(t\d+)" class="newsBox"><p class="day">([^<]+)<\/p><p class="title">([^<]*)<\/p><p class="txt">([\s\S]*?)<\/p><\/div>/g;
  const articles = [];
  let m;
  while ((m = boxRe.exec(text)) !== null) {
    const [, id, day, title, bodyHtml] = m;
    const dm = day.match(/(\d{4})\s*(\d{1,2})\.(\d{1,2})/);
    articles.push({
      title: title.trim(),
      published_date: dm ? `${dm[1]}-${String(dm[2]).padStart(2, "0")}-${String(dm[3]).padStart(2, "0")}` : null,
      article_url: `${origin}/news.php#${id}`,
      body: stripHtml(bodyHtml),
      thumbnail_url: null,
    });
  }
  return { artist, method: "json_api", robots, articles };
}

async function fetchAsobisystem(name, slug, subdomain) {
  const artist = { name, slug };
  const origin = `https://${subdomain}.asobisystem.com`;
  const listPath = "/news/1/";
  const robots = await checkRobotsAllowed(origin, listPath);
  if (!robots.allowed) throw new Error(`robots.txt disallow: ${robots.reason}`);

  const res = await fetchWithTimeout(origin + listPath);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();

  const itemRe = /<a href="(\/news\/detail\/\d+)">\s*<div class="block--txt">\s*<p class="date">([^<]+)<\/p>\s*<p class="tit">([\s\S]*?)<\/p>/g;
  const articles = [];
  let m;
  while ((m = itemRe.exec(html)) !== null) {
    const [, href, dateStr, rawTitle] = m;
    const d = dateStr.trim().replace(/\./g, "-");
    articles.push({
      title: rawTitle.replace(/\s+/g, " ").trim(),
      published_date: d,
      article_url: new URL(href, origin).toString(),
      body: null,
      thumbnail_url: null,
    });
  }
  return { artist, method: "static_html", robots, articles };
}

async function fetchLapone(name, slug, domain, listPath) {
  const artist = { name, slug };
  const origin = `https://${domain}`;
  const robots = await checkRobotsAllowed(origin, listPath);
  if (!robots.allowed) throw new Error(`robots.txt disallow: ${robots.reason}`);

  const res = await fetchWithTimeout(origin + listPath);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();

  const itemRe = /<a href="(\/news\/detail\/\d+)"[^>]*>\s*<p class="date">([^<]+)<\/p>\s*<p class="tit">([\s\S]*?)<\/p>/g;
  const articles = [];
  let m;
  while ((m = itemRe.exec(html)) !== null) {
    const [, href, dateStr, rawTitle] = m;
    const d = dateStr.trim().replace(/\./g, "-");
    const title = rawTitle.replace(/&#039;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
    articles.push({
      title,
      published_date: d,
      article_url: new URL(href, origin).toString(),
      body: null,
      thumbnail_url: null,
    });
  }
  return { artist, method: "static_html", robots, articles };
}

async function fetchWordPressRestApi(name, slug, origin, basePath) {
  const artist = { name, slug };
  const apiPath = `${basePath}/wp-json/wp/v2/posts`;
  const robots = await checkRobotsAllowed(origin, apiPath);
  if (!robots.allowed) throw new Error(`robots.txt disallow: ${robots.reason}`);

  const res = await fetchWithTimeout(`${origin}${apiPath}?per_page=10`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const posts = await res.json();
  if (!Array.isArray(posts)) throw new Error("unexpected response shape (not an array)");

  const articles = posts.map((p) => {
    const ogImage = p.yoast_head_json?.og_image?.[0]?.url ?? null;
    return {
      title: stripHtml(p.title?.rendered ?? ""),
      published_date: (p.date || "").slice(0, 10) || null,
      article_url: p.link,
      body: stripHtml(p.content?.rendered ?? ""),
      thumbnail_url: ogImage,
    };
  });
  return { artist, method: "json_api", robots, articles };
}

async function fetchBefirst() {
  const artist = { name: "BE:FIRST", slug: "be-first" };
  const origin = "https://befirst.tokyo";
  const listPath = "/news/";
  const robots = await checkRobotsAllowed(origin, listPath);
  if (!robots.allowed) throw new Error(`robots.txt disallow: ${robots.reason}`);

  const res = await fetchWithTimeout(origin + listPath, {});
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();

  const itemRe = /<article class="entry" id="(\d+)">\s*<header class="entry-head">\s*<div class="news_category">([^<]*)<\/div>\s*<div class="date">([^<:]+)[^<]*<\/div>\s*<h1 class="entry-title">([\s\S]*?)<\/h1>\s*<\/header>\s*<div class="entry-body">([\s\S]*?)<\/div>\s*(?=<article|<\/div>\s*<\/div>)/g;
  const articles = [];
  let m;
  while ((m = itemRe.exec(html)) !== null && articles.length < 15) {
    const [, id, , dateStr, rawTitle, bodyHtml] = m;
    const d = dateStr.trim().replace(/\./g, "-");
    articles.push({
      title: stripHtml(rawTitle),
      published_date: d,
      article_url: `${origin}/?p=${id}`,
      body: stripHtml(bodyHtml),
      thumbnail_url: null,
    });
  }
  return { artist, method: "static_html", robots, articles };
}

// ---------------------------------------------------------------------------
// メイン処理
// ---------------------------------------------------------------------------
const TARGETS = [
  { key: "exo", run: fetchExo },
  { key: "generations", run: fetchGenerations },
  { key: "fruits-zipper", run: () => fetchAsobisystem("FRUITS ZIPPER", "fruits-zipper", "fruitszipper") },
  { key: "jo1", run: () => fetchLapone("JO1", "jo1", "jo1.jp", "/news/list/1/3/") },
  { key: "shigure-ui", run: () => fetchWordPressRestApi("時雨羽衣", "shigure-ui", "https://www.universal-music.co.jp", "/shigureui") },
  { key: "ado", run: () => fetchWordPressRestApi("Ado", "ado", "https://www.universal-music.co.jp", "/ado") },
  { key: "be-first", run: fetchBefirst },
  { key: "fujii-kaze", run: () => fetchWordPressRestApi("藤井風", "fujii-kaze", "https://fujiikaze.com", "") },
];

async function main() {
  const results = [];
  const failures = [];
  const seenUrls = new Set();
  const summary = [];

  for (const target of TARGETS) {
    process.stdout.write(`Fetching ${target.key}... `);
    try {
      const { artist, method, robots, articles } = await target.run();

      let dedupedCount = 0;
      const classified = [];
      for (const a of articles) {
        if (!a.article_url || seenUrls.has(a.article_url)) continue;
        seenUrls.add(a.article_url);
        dedupedCount++;

        const category = classify(a.title, a.body || "");
        const entry = {
          artist_name: artist.name,
          artist_slug: artist.slug,
          title: a.title,
          published_date: a.published_date,
          article_url: a.article_url,
          body: a.body,
          thumbnail_url: a.thumbnail_url,
          category,
        };
        if (category === "live" || category === "ticket") {
          entry.event_info = extractLiveInfo(a.title, a.body || "", a.published_date);
        }
        classified.push(entry);
      }

      results.push(...classified);
      summary.push({
        artist: artist.name,
        slug: artist.slug,
        method,
        status: "success",
        robots_check: robots,
        article_count_raw: articles.length,
        article_count_deduped: dedupedCount,
      });
      console.log(`OK (${dedupedCount} articles)`);
    } catch (e) {
      failures.push({ site: target.key, reason: e.message });
      summary.push({
        artist: target.key,
        status: "failed",
        reason: e.message,
      });
      console.log(`FAILED: ${e.message}`);
    }
  }

  const categoryCounts = {};
  for (const r of results) categoryCounts[r.category] = (categoryCounts[r.category] || 0) + 1;

  const output = {
    generated_at: new Date().toISOString(),
    mode: "local_dry_run_only",
    note: "本番クローラ/DB/Cronには未統合。ローカル検証用JSON出力のみ。",
    site_summary: summary,
    category_counts: categoryCounts,
    failures,
    articles: results,
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), "utf-8");
  console.log(`\nWrote ${results.length} articles (deduped) to ${OUTPUT_PATH}`);
  console.log(`Failures: ${failures.length}`);
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
