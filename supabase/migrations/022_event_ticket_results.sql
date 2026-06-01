-- event_id 単位の当落結果。座席マップ用の seat_reports には落選データを混ぜない。
create table if not exists event_ticket_results (
  id uuid primary key default gen_random_uuid(),
  event_id text not null,
  result text not null check (result in ('won', 'lost')),
  lost_application_count integer not null default 0 check (lost_application_count >= 0),
  ticket_count integer check (ticket_count is null or ticket_count >= 1),
  lottery_type text check (lottery_type is null or lottery_type in ('1次抽選', '2次抽選', 'その他')),
  fc_history text check (fc_history is null or fc_history in ('1年未満', '1〜3年', '3年以上')),
  payment_method text check (payment_method is null or payment_method in ('クレカ', 'その他')),
  created_at timestamptz not null default now(),
  constraint fk_event_ticket_results_event
    foreign key (event_id) references events(id) on delete cascade
);

create index if not exists event_ticket_results_event_id_idx
  on event_ticket_results (event_id);

create index if not exists event_ticket_results_result_idx
  on event_ticket_results (event_id, result);

alter table event_ticket_results enable row level security;

create policy "public read event_ticket_results"
  on event_ticket_results for select using (true);

create policy "anon insert event_ticket_results"
  on event_ticket_results for insert with check (true);
