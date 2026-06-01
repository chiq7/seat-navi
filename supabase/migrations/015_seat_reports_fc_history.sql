-- 座席報告にFC歴カラムを追加
alter table seat_reports
  add column if not exists fc_history text
    check (fc_history in ('under_1_year', 'one_to_three_years', 'over_3_years', 'unknown'));
