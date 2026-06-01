-- ========================================
-- 017: ticket_result_votes — 申込枚数・支払方法・抽選枠・FC歴
-- 内訳集計表示（申込枚数別・支払方法別・抽選回別・FC歴別）に使用
-- ========================================

ALTER TABLE ticket_result_votes
  ADD COLUMN IF NOT EXISTS ticket_count   INTEGER,
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS lottery_type   TEXT,
  ADD COLUMN IF NOT EXISTS fc_history     TEXT;
