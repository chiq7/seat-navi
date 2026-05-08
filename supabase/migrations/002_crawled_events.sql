-- ========================================
-- 座席ナビ: 会場クロールで収集したイベントテーブル
-- ========================================

CREATE TABLE IF NOT EXISTS events (
  id        TEXT        PRIMARY KEY,                 -- sha256(venue_id::date::title)[:20]
  title     TEXT        NOT NULL,
  venue     TEXT        NOT NULL,                    -- 会場名（表示用）
  venue_id  TEXT        NOT NULL,                    -- 会場スラッグ（例: tokyo-dome）
  date      DATE,                                    -- 公演日（不明な場合は NULL）
  genre     TEXT        NOT NULL DEFAULT 'other'
              CHECK (genre IN ('kpop', 'johnnys', 'female_idol', 'male_idol', 'other')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 検索・フィルタ用インデックス
CREATE INDEX IF NOT EXISTS idx_events_venue_id ON events (venue_id);
CREATE INDEX IF NOT EXISTS idx_events_date     ON events (date);
CREATE INDEX IF NOT EXISTS idx_events_genre    ON events (genre);

-- RLS: 読み取りは全員可。書き込みはサービスロールキーのみ（RLSでブロック）
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "events_read"   ON events FOR SELECT USING (true);
-- INSERT/UPDATE は service_role（バイパス）のみ可。anon/authenticated ロールは不可。
