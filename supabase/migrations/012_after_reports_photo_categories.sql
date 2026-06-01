-- 現地レポートフォーム改修: 写真カテゴリカラム + 客降りルートメモ
alter table after_reports
  add column if not exists seat_view_photo_paths     text[] not null default '{}',
  add column if not exists trolley_photo_paths       text[] not null default '{}',
  add column if not exists audience_walk_photo_paths text[] not null default '{}',
  add column if not exists kyakukudari_route         text;
