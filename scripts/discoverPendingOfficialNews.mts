/**
 * verificationStatus=candidate の公式NEWSを一括Discoveryする。
 *
 * - 同じURLは1回だけ調査し、共有サイトの結果を再利用する。
 * - robots.txtで禁止されたパスは既存Discoveryと同様にprobeしない。
 * - 設定やDBは変更せず、discovery-reportsへ集約JSONを保存するだけ。
 *
 * 実行:
 *   npm.cmd run discover:official-news:pending
 */
import fs from "node:fs";
import path from "node:path";
import { ARTISTS } from "@/lib/artists";
import { discoverOfficialNewsSite } from "./discoverOfficialNewsSite.mjs";

type ArticleCandidate = {
  title: string;
  url: string;
  published_date: string | null;
};

type DiscoveryReport = {
  target_url: string;
  classification?: string;
  recommended_strategy?: string;
  aborted_reason?: string;
  probes?: {
    article_link_candidates?: { count: number; items: ArticleCandidate[] };
    rss_atom?: { found: string[] };
    wordpress_api?: { found: boolean; url: string };
    embedded_json?: {
      found: string[];
      arrayCandidates?: Array<{ source: string; path: string; count: number; keys: string[]; newsishScore: number }>;
    };
    no_articles?: { detected: boolean };
    script_api_candidates?: Array<{ scriptUrl: string; endpoints: string[] }>;
  };
};

type PendingTarget = {
  artistSlug: string;
  artistName: string;
  newsUrl: string;
  includeAny: string[];
};

function getPendingTargets(): PendingTarget[] {
  return ARTISTS.flatMap((artist) => {
    const news = artist.officialNews;
    if (!news || news.enabled || !("verificationStatus" in news) || news.verificationStatus !== "candidate") return [];
    const includeAny = "articleRules" in news ? news.articleRules?.includeAny ?? [] : [];
    return [{
      artistSlug: artist.slug,
      artistName: news.artistName ?? artist.name,
      newsUrl: news.newsUrl,
      includeAny,
    }];
  });
}

async function mapWithConcurrency<T, R>(items: T[], concurrency: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  async function worker() {
    while (true) {
      const index = nextIndex++;
      if (index >= items.length) return;
      results[index] = await fn(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

function includesAny(text: string, terms: string[]): boolean {
  const normalized = text.toLocaleLowerCase("ja");
  return terms.some((term) => normalized.includes(term.toLocaleLowerCase("ja")));
}

function recommendationFor(report: DiscoveryReport, filterTerms: string[], filterMatchCount: number): string {
  if (report.aborted_reason) return "robots_blocked";
  if (report.classification === "no_articles" || report.probes?.no_articles?.detected) return "hold_no_articles";
  if (filterTerms.length > 0 && filterMatchCount === 0) return "hold_shared_site_no_current_match";
  const candidates = report.probes?.article_link_candidates?.items ?? [];
  if (report.recommended_strategy === "static_html" && candidates.filter((candidate) => candidate.published_date).length === 0) {
    return "inspect_public_api_or_custom_markup";
  }
  if (report.recommended_strategy === "embedded_json" && !(report.probes?.embedded_json?.arrayCandidates ?? []).some((candidate) => candidate.newsishScore > 0)) {
    return "inspect_public_api_or_custom_markup";
  }
  return "ready_for_config_validation";
}

async function main() {
  const targets = getPendingTargets();
  if (targets.length === 0) {
    console.log("candidate状態の公式NEWSはありません。");
    return;
  }

  const uniqueUrls = [...new Set(targets.map((target) => target.newsUrl))];
  const reports = await mapWithConcurrency(uniqueUrls, 3, async (url) => {
    console.log(`Discovery: ${url}`);
    try {
      return await discoverOfficialNewsSite(url, { writeReport: false, quiet: true }) as DiscoveryReport;
    } catch (error) {
      return {
        target_url: url,
        classification: "fetch_error",
        aborted_reason: error instanceof Error ? error.message : String(error),
      } satisfies DiscoveryReport;
    }
  });
  const byUrl = new Map(reports.map((report) => [report.target_url, report]));

  const sites = targets.map((target) => {
    const report = byUrl.get(target.newsUrl)!;
    const candidates = report.probes?.article_link_candidates?.items ?? [];
    const filterMatchCount = target.includeAny.length === 0
      ? candidates.length
      : candidates.filter((candidate) => includesAny(`${candidate.title}\n${candidate.url}`, target.includeAny)).length;
    return {
      artist_slug: target.artistSlug,
      artist_name: target.artistName,
      news_url: target.newsUrl,
      classification: report.classification ?? report.recommended_strategy ?? "unknown",
      recommended_strategy: report.recommended_strategy ?? null,
      recommendation: recommendationFor(report, target.includeAny, filterMatchCount),
      article_candidate_count: candidates.length,
      article_filter_terms: target.includeAny,
      article_filter_match_count: filterMatchCount,
      rss_urls: report.probes?.rss_atom?.found ?? [],
      wordpress_api: report.probes?.wordpress_api?.found ? report.probes.wordpress_api.url : null,
      embedded_json: report.probes?.embedded_json?.found ?? [],
      embedded_array_candidates: report.probes?.embedded_json?.arrayCandidates ?? [],
      script_api_candidates: report.probes?.script_api_candidates ?? [],
      error: report.aborted_reason ?? null,
    };
  });

  const counts = sites.reduce<Record<string, number>>((acc, site) => {
    acc[site.recommendation] = (acc[site.recommendation] ?? 0) + 1;
    return acc;
  }, {});
  const output = {
    generated_at: new Date().toISOString(),
    target_count: targets.length,
    unique_url_count: uniqueUrls.length,
    counts,
    sites,
    note: "Discovery only. No registry, database, push, or deployment changes were made.",
  };

  const outputDir = path.resolve(process.cwd(), "discovery-reports");
  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `pending-official-news-${Date.now()}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), "utf8");

  console.log(JSON.stringify({ target_count: output.target_count, unique_url_count: output.unique_url_count, counts }, null, 2));
  console.log(`集約レポート: ${outputPath}`);
}

main().catch((error) => {
  console.error("FATAL:", error);
  process.exitCode = 1;
});
