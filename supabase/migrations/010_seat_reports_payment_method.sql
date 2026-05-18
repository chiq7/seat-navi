-- seat_reports に支払い方法カラムを追加
alter table seat_reports
  add column if not exists payment_method text;
