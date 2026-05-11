-- 会場予想レイアウト画像テーブル
create table if not exists event_layouts (
  id         text        primary key,
  event_id   text        not null,
  image_url  text        not null,
  created_at timestamptz not null default now(),

  constraint fk_event_layouts_event
    foreign key (event_id)
    references public.events (id)
    on delete cascade
);

create index if not exists event_layouts_event_id_idx on event_layouts (event_id);

alter table event_layouts enable row level security;

-- 誰でも読める
create policy "public read event_layouts"
  on event_layouts for select using (true);

-- 書き込みは service_role のみ
