-- 現地レポート: 席種・エリアカラムを追加
alter table after_reports
  add column if not exists seat_area_type text
    check (seat_area_type in ('arena', 'stand_1f', 'stand_2f', 'stand_3f_or_higher', 'other_unknown'));
