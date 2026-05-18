-- X（Twitter）由来の座席予想図・結果図・答え合わせ投稿
-- historical_patterns（ブロック寸法参照）・after_reports（ユーザー投稿）とは分離
-- eventsテーブルへのFK不要: 過去ツアー等、未登録公演も保存可能

create table if not exists x_seat_posts (
  id            text        primary key,

  -- 公演情報
  artist_name      text        not null,
  tour_name        text,
  venue_name       text        not null,
  performance_date date,

  -- X投稿ソース情報
  post_type        text        not null
    check (post_type in ('prediction', 'result', 'after_report', 'unknown')),
  source_account   text,
  source_post_url  text,
  posted_at        timestamptz,

  -- 画像
  image_url        text,
  image_summary    text,

  -- 会場構造（予想・結果共通テキスト）
  stage_position        text,
  hanamichi_position    text,
  center_stage_position text,
  trolley_route         text,
  audience_walkway      text,
  silver_tape_area      text,

  -- ブロック情報（配列: デフォルト空配列）
  blocks_detected               text[] not null default '{}',
  stage_near_blocks             text[] not null default '{}',
  hanamichi_candidate_blocks    text[] not null default '{}',
  center_stage_candidate_blocks text[] not null default '{}',
  actual_hanamichi_blocks       text[] not null default '{}',
  actual_center_stage_blocks    text[] not null default '{}',
  upgrade_blocks                text[] not null default '{}',
  fc1_blocks                    text[] not null default '{}',
  fc2_blocks                    text[] not null default '{}',
  general_blocks                text[] not null default '{}',

  -- 予想 vs 結果の紐づけ・精度評価
  prediction_post_url          text,
  result_post_url              text,
  matched_points               text,
  missed_points                text,
  prediction_vs_result_summary text,
  source_reasoning_summary     text,

  notes      text,
  created_at timestamptz not null default now()
);

create index if not exists x_seat_posts_artist_idx on x_seat_posts (artist_name);
create index if not exists x_seat_posts_venue_idx  on x_seat_posts (venue_name);
create index if not exists x_seat_posts_type_idx   on x_seat_posts (post_type);
create index if not exists x_seat_posts_date_idx   on x_seat_posts (performance_date);

alter table x_seat_posts enable row level security;

create policy "public read x_seat_posts"
  on x_seat_posts for select using (true);
-- INSERT / UPDATE / DELETE は service_role のみ（ポリシーなし = 拒否）
