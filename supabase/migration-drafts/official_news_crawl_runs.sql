-- Draft only: 公式NEWS取得の実行ログ・監視用テーブル案。
--
-- このファイルは通常のpending migration対象外であり、現時点ではmigration番号を持たない。
-- 監視処理を正式実装するときに内容とRLSを再監査し、その時点の次番号を付けて
-- supabase/migrations/へ移すこと。
--
-- scripts/crawlOfficialNews.mts の各サイト実行結果を1行ずつ記録する想定。
-- 異常検知(連続0件・急増・セレクタヒット0・本文抽出失敗・日付異常・全体失敗率)は
-- 未実装であり、このdraftの適用も行わない。

create table if not exists official_news_crawl_runs (
  id                       uuid        primary key default gen_random_uuid(),
  artist_slug              text        not null,
  executed_at              timestamptz not null default now(),
  strategy_used            text        not null,
  list_item_count          integer,
  new_article_count        integer,
  success                  boolean     not null,
  error_message            text,
  selector_hit_count       integer,
  body_extract_fail_count  integer,
  duration_ms              integer,
  created_at               timestamptz not null default now()
);

create index if not exists official_news_crawl_runs_artist_slug_idx
  on official_news_crawl_runs (artist_slug, executed_at desc);
create index if not exists official_news_crawl_runs_success_idx
  on official_news_crawl_runs (success);

alter table official_news_crawl_runs enable row level security;

create policy "official_news_crawl_runs_read"
  on official_news_crawl_runs for select using (true);

-- 将来の異常検知候補: 連続0件、過去平均からの急増、セレクタヒット0、
-- 本文抽出失敗の増加、実行群全体の失敗率。今回はクエリ・ビュー・関数を実装しない。
