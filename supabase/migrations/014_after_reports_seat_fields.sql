-- 現地レポート: 席情報を構造化カラムに分割
alter table after_reports
  add column if not exists seat_block  text,
  add column if not exists seat_row    text,
  add column if not exists seat_number text;
