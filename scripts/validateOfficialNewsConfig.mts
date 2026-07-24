/**
 * 新規サイト設定(SiteConfig)を本番投入前に検証するCLI。
 *
 * 実行方法:
 *   node --experimental-strip-types --import ./scripts/ts-loader.mjs \
 *     ./scripts/validateOfficialNewsConfig.mts <config.jsonへのパス>
 *
 * <config.json> は SiteConfig 1件分のJSON(discoverOfficialNewsSite.mjsの出力を参考に
 * 人間が作成する想定)。
 *
 * 検証項目: 記事の最低/最大件数、タイトル非空、URL妥当性、ドメイン一致、日付妥当性、
 * 重複率、詳細本文の最小文字数、サムネイルURL妥当性、ナビ/フッター混入の疑い。
 *
 * 重要: このツールはスコア化して合格/要確認/不合格を出すだけで、設定を自動的に有効化しない。
 * artists.tsへの追加は、この結果を見た人間が判断して手動で行う。
 */
import fs from "node:fs";
import { fetchListForConfig, fetchDetailForConfig } from "./officialNews/runStrategy";
import type { SiteConfig, CrawledArticle } from "./officialNews/types";

const MIN_ARTICLE_COUNT = 3;
const MAX_ARTICLE_COUNT = 200;
const MAX_DUPLICATE_RATE = 0.1;
const MIN_BODY_CHARS = 50;
const DETAIL_SAMPLE_SIZE = 3; // 詳細ページ検証は全件でなくサンプルのみ(crawl-delay等を考慮)
const NAV_FOOTER_KEYWORDS = ["プライバシーポリシー", "利用規約", "お問い合わせ", "サイトマップ", "COPYRIGHT", "All Rights Reserved"];

type CheckResult = { name: string; passed: boolean; critical: boolean; detail: string };

function isValidUrl(s: string): boolean {
  try {
    new URL(s);
    return true;
  } catch {
    return false;
  }
}

function isPlausibleDate(dateStr: string): boolean {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return false;
  const now = Date.now();
  const minTime = new Date("2000-01-01").getTime();
  const maxTime = now + 30 * 24 * 60 * 60 * 1000; // 30日先まで許容
  return d.getTime() >= minTime && d.getTime() <= maxTime;
}

async function main() {
  const configPath = process.argv[2];
  if (!configPath) {
    console.error("使い方: node ... ./scripts/validateOfficialNewsConfig.mts <config.jsonへのパス>");
    process.exit(1);
  }
  const config: SiteConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  console.log(`検証対象: ${config.artistSlug} (${config.strategy})`);

  const checks: CheckResult[] = [];
  let articles: CrawledArticle[] = [];

  try {
    const result = await fetchListForConfig(config);
    articles = result.articles;

    checks.push({
      name: "min_article_count",
      passed: articles.length >= MIN_ARTICLE_COUNT,
      critical: true,
      detail: `${articles.length}件 (最低${MIN_ARTICLE_COUNT}件必要)`,
    });
    checks.push({
      name: "max_article_count",
      passed: articles.length <= MAX_ARTICLE_COUNT,
      critical: false,
      detail: `${articles.length}件 (上限${MAX_ARTICLE_COUNT}件、超過はセレクタが広すぎる可能性)`,
    });

    const emptyTitleCount = articles.filter((a) => !a.title || !a.title.trim()).length;
    checks.push({
      name: "titles_non_empty",
      passed: emptyTitleCount === 0,
      critical: true,
      detail: `タイトル空: ${emptyTitleCount}/${articles.length}件`,
    });

    const invalidUrlCount = articles.filter((a) => !isValidUrl(a.article_url)).length;
    checks.push({
      name: "urls_valid",
      passed: invalidUrlCount === 0,
      critical: true,
      detail: `不正URL: ${invalidUrlCount}/${articles.length}件`,
    });

    const officialHost = new URL(config.officialUrl).hostname;
    const allowHosts = config.urlRules?.allow;
    const offDomainCount = articles.filter((a) => {
      if (!isValidUrl(a.article_url)) return false;
      const host = new URL(a.article_url).hostname;
      if (host === officialHost) return false;
      if (allowHosts?.some((p) => new RegExp(p).test(a.article_url))) return false;
      return true;
    }).length;
    checks.push({
      name: "domain_match",
      passed: offDomainCount === 0,
      critical: false,
      detail: `公式ドメイン(${officialHost})外のURL: ${offDomainCount}/${articles.length}件`,
    });

    const datedArticles = articles.filter((a) => a.published_date);
    const badDateCount = datedArticles.filter((a) => !isPlausibleDate(a.published_date!)).length;
    checks.push({
      name: "dates_plausible",
      passed: badDateCount === 0,
      critical: false,
      detail: `日付あり${datedArticles.length}件中、妥当性NG: ${badDateCount}件`,
    });

    const urls = articles.map((a) => a.article_url);
    const uniqueUrls = new Set(urls);
    const duplicateRate = urls.length > 0 ? 1 - uniqueUrls.size / urls.length : 0;
    checks.push({
      name: "duplicate_rate",
      passed: duplicateRate <= MAX_DUPLICATE_RATE,
      critical: false,
      detail: `重複率 ${(duplicateRate * 100).toFixed(1)}% (許容${MAX_DUPLICATE_RATE * 100}%)`,
    });

    // 詳細本文の検証(サンプルのみ。crawl-delay等を考慮し全件は取得しない)
    if (result.needsDetailFetch && articles.length > 0) {
      const sample = articles.slice(0, DETAIL_SAMPLE_SIZE);
      let shortBodyCount = 0;
      let navContaminatedCount = 0;
      let thumbnailInvalidCount = 0;
      for (const a of sample) {
        const detail = await fetchDetailForConfig(config, a.article_url);
        if (detail.success) {
          if (detail.body.length < MIN_BODY_CHARS) shortBodyCount++;
          if (NAV_FOOTER_KEYWORDS.some((kw) => detail.body.includes(kw))) navContaminatedCount++;
          if (detail.thumbnail && !isValidUrl(detail.thumbnail)) thumbnailInvalidCount++;
        } else {
          shortBodyCount++; // 取得失敗も「本文不十分」として扱う
        }
      }
      checks.push({
        name: "detail_body_length",
        passed: shortBodyCount === 0,
        critical: false,
        detail: `サンプル${sample.length}件中、本文${MIN_BODY_CHARS}文字未満/取得失敗: ${shortBodyCount}件`,
      });
      checks.push({
        name: "no_nav_footer_contamination",
        passed: navContaminatedCount === 0,
        critical: false,
        detail: `ナビ/フッター混入の疑い: ${navContaminatedCount}/${sample.length}件`,
      });
      checks.push({
        name: "thumbnail_valid",
        passed: thumbnailInvalidCount === 0,
        critical: false,
        detail: `不正なサムネイルURL: ${thumbnailInvalidCount}/${sample.length}件`,
      });
    }
  } catch (e) {
    checks.push({
      name: "fetch_succeeded",
      passed: false,
      critical: true,
      detail: `一覧取得自体が失敗: ${e instanceof Error ? e.message : String(e)}`,
    });
  }

  const failedCritical = checks.filter((c) => !c.passed && c.critical).length;
  const failedNonCritical = checks.filter((c) => !c.passed && !c.critical).length;

  let verdict: "合格" | "要確認" | "不合格";
  if (failedCritical > 0) verdict = "不合格";
  else if (failedNonCritical === 0) verdict = "合格";
  else if (failedNonCritical <= 2) verdict = "要確認";
  else verdict = "不合格";

  const report = {
    artist_slug: config.artistSlug,
    strategy: config.strategy,
    generated_at: new Date().toISOString(),
    verdict,
    checks,
    article_count: articles.length,
    note: "この結果は検証のみ。artists.tsへの反映(enabled:trueへの変更)は行っていない。人間が確認のうえ手動で反映すること。",
  };

  console.log(JSON.stringify(report, null, 2));
  console.log(`\n判定: ${verdict}`);

  const outPath = configPath.replace(/\.json$/, "") + `.validation-${Date.now()}.json`;
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), "utf-8");
  console.log(`検証レポート保存先: ${outPath}`);

  process.exitCode = verdict === "不合格" ? 1 : 0;
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exitCode = 1;
});
