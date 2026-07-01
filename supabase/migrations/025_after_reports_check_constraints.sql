-- Fix CHECK constraints on after_reports to match form values
-- Form sends: 'なし','1','2','3','4','5' but old constraints only allowed 'yes','no','unknown'

alter table after_reports drop constraint if exists after_reports_center_stage_check;
alter table after_reports add constraint after_reports_center_stage_check
  check (center_stage in ('なし','1','2','3','4','5'));

alter table after_reports drop constraint if exists after_reports_torokko_check;
alter table after_reports add constraint after_reports_torokko_check
  check (torokko in ('なし','1','2','3','4','5'));

alter table after_reports drop constraint if exists after_reports_kyakukudari_check;
alter table after_reports add constraint after_reports_kyakukudari_check
  check (kyakukudari in ('なし','1','2','3','4','5'));
