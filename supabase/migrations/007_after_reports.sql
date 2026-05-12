-- 答え合わせ報告テーブル
create table if not exists after_reports (
  id           text        primary key,
  event_id     text        not null,

  -- 写真 (Supabase Storage パス)
  photo_paths  text[]      not null default '{}',

  -- 構造物レポート
  hanamichi          text check (hanamichi         in ('yes','no','unknown')),
  hanamichi_blocks   text[],
  torokko            text check (torokko            in ('yes','no','unknown')),
  torokko_route      text,
  center_stage       text check (center_stage       in ('yes','no','unknown')),
  center_stage_pos   text,
  kyakukudari        text check (kyakukudari        in ('yes','no','unknown')),
  kyakukudari_blocks text[],

  -- 体験評価
  silver_tape_rows   int,
  visibility         int  check (visibility   between 1 and 5),
  fansa              boolean,
  satisfaction       int  check (satisfaction between 1 and 5),
  memo               text,

  created_at   timestamptz not null default now(),

  constraint fk_after_reports_event
    foreign key (event_id)
    references public.events (id)
    on delete cascade
);

create index if not exists after_reports_event_id_idx on after_reports (event_id);

alter table after_reports enable row level security;

create policy "public read after_reports"
  on after_reports for select using (true);

create policy "anon insert after_reports"
  on after_reports for insert with check (true);

-- 写真保存用 Storage バケット（SQL では作れないので README 参照）
-- supabase storage create after-report-photos --public
