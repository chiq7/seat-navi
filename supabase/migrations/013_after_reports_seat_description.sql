-- 現地レポートに席情報カラムを追加
alter table after_reports
  add column if not exists seat_description text;
