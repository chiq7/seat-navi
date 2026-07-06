-- event_ticket_results をフォーム投稿の本体として扱うため、
-- これまで seat_reports にしか保存されていなかった/どこにも保存されていなかった
-- フォーム入力値（コメント・座席詳細）を保存できるようにする。
-- 既存行は対象外のため null のまま。

alter table event_ticket_results
  add column if not exists comment text,
  add column if not exists seat_block text,
  add column if not exists seat_row text,
  add column if not exists seat_number text,
  add column if not exists stand_direction text,
  add column if not exists stand_floor text,
  add column if not exists other_seat_info text;
