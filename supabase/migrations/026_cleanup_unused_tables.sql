-- 026: コード参照ゼロのテーブルを削除、テスト投稿データをクリア
-- ⚠️ TRUNCATE はすべての行を削除します。本番データがある場合は実行前に確認してください。

-- -------------------------------------------------------
-- 1. 未使用テーブルを DROP（コードから一切参照されていない）
-- -------------------------------------------------------
DROP TABLE IF EXISTS ticket_result_votes  CASCADE;
DROP TABLE IF EXISTS x_seat_posts         CASCADE;
DROP TABLE IF EXISTS historical_patterns  CASCADE;
DROP TABLE IF EXISTS event_layouts        CASCADE;
DROP TABLE IF EXISTS ai_conversations     CASCADE;
DROP TABLE IF EXISTS posts                CASCADE;
DROP TABLE IF EXISTS sections             CASCADE;
DROP TABLE IF EXISTS venues               CASCADE;

-- -------------------------------------------------------
-- 2. 実稼働テーブルのデータをクリア（テーブル構造は保持）
--    events は除く（公演マスターデータを保持するため）
-- -------------------------------------------------------
TRUNCATE TABLE
  fan_seat_prediction_votes,
  fan_seat_predictions,
  after_reports,
  seat_reports,
  event_ticket_results,
  setlists;
