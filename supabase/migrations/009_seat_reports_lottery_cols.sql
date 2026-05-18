-- seat_reports に抽選情報カラムを追加
-- 本番DBには手動追加済みのため IF NOT EXISTS で冪等に実行
alter table seat_reports
  add column if not exists lottery_round text,
  add column if not exists lottery_name  text;
