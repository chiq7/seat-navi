-- seat_reports テーブル
create table if not exists seat_reports (
  id           text        primary key,
  event_id     text        not null,
  block        text        not null,
  row_num      int         not null check (row_num  >= 1),
  seat_num     int         not null check (seat_num >= 1),
  lottery_type text        not null check (
    lottery_type in ('fc1','fc2','general','upgrade','revival','production')
  ),
  comment      text,
  created_at   timestamptz not null default now(),

  constraint fk_seat_reports_event
    foreign key (event_id)
    references public.events (id)
    on delete cascade
);

create index if not exists seat_reports_event_id_idx on seat_reports (event_id);
create index if not exists seat_reports_block_idx    on seat_reports (event_id, block);

alter table seat_reports enable row level security;

create policy "public read seat_reports"
  on seat_reports for select using (true);

create policy "anon insert seat_reports"
  on seat_reports for insert with check (true);
