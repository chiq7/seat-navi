-- setlists テーブル: event_id 単位でセトリ items を jsonb 保存
create table if not exists setlists (
  id         uuid        primary key default gen_random_uuid(),
  event_id   text        not null references events(id) on delete cascade,
  items      jsonb       not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(event_id)
);

create index if not exists setlists_event_id_idx on setlists (event_id);

alter table setlists enable row level security;

create policy "public read setlists"
  on setlists for select using (true);

create policy "anon insert setlists"
  on setlists for insert with check (true);

-- upsert は insert + update に分解されるため update ポリシーも必要
create policy "anon update setlists"
  on setlists for update using (true) with check (true);
