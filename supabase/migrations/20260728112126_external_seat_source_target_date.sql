-- 同一ツアー内の別日公演を、元イベントの登録日と混同せず巡回するための実公演日。
alter table public.external_seat_sources
  add column target_date date;

create index external_seat_sources_target_date_idx
  on public.external_seat_sources (active, target_date, last_fetched_at asc nulls first);
