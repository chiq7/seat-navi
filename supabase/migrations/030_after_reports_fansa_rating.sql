-- 030: after_reports にファンサ5段階評価カラムを追加
-- 既存の fansa(boolean) は既存データ保護のため変更せず、新カラムに移行する
alter table after_reports
  add column if not exists fansa_rating text
    check (fansa_rating in ('なし','1','2','3','4','5'));
