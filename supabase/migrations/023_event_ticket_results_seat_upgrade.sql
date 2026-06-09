-- event_ticket_results に席種・アプグレ応募状況を追加
-- 席種は seat_reports ではなく event_ticket_results に持つ（確率集計専用）
alter table event_ticket_results
  add column if not exists seat_type text
    check (seat_type is null or seat_type in (
      'arena', 'stand', 'seated', 'restricted', 'obstructed', 'unknown'
    ));

alter table event_ticket_results
  add column if not exists upgrade_result text
    check (upgrade_result is null or upgrade_result in (
      'not_applied', 'applied_lost', 'applied_won'
    ));
