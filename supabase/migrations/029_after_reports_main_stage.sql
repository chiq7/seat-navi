-- 029: after_reports にメインステージ評価カラムを追加
alter table after_reports
  add column if not exists main_stage text
    check (main_stage in ('なし','1','2','3','4','5'));
