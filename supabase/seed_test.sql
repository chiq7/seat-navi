-- ============================================================
-- テスト用シードデータ  (Supabase SQL エディタで実行)
-- ============================================================
-- 事前確認: event_id に使う文字列は自由テキスト
-- 実行後 /events/svtn-tokyo-dome-20260405 でページ確認

-- ① テストイベント -------------------------------------------
INSERT INTO events (id, title, venue, venue_id, date, genre)
VALUES (
  'svtn-tokyo-dome-20260405',
  'SEVENTEEN FOLLOW AGAIN TOUR 東京ドーム',
  '東京ドーム',
  'tokyo-dome',
  '2026-04-05',
  'kpop'
) ON CONFLICT (id) DO NOTHING;

-- ② seat_reports -------------------------------------------
-- A1 ブロック (fc1 メイン)
INSERT INTO seat_reports (id, event_id, block, row_num, seat_num, lottery_type) VALUES
  ('r-a1-01','svtn-tokyo-dome-20260405','A1', 1,  3,'fc1'),
  ('r-a1-02','svtn-tokyo-dome-20260405','A1', 1,  4,'fc1'),
  ('r-a1-03','svtn-tokyo-dome-20260405','A1', 2,  2,'fc1'),
  ('r-a1-04','svtn-tokyo-dome-20260405','A1', 2,  5,'fc2'),
  ('r-a1-05','svtn-tokyo-dome-20260405','A1', 3,  1,'fc1'),
  ('r-a1-06','svtn-tokyo-dome-20260405','A1', 3,  6,'fc2'),
  ('r-a1-07','svtn-tokyo-dome-20260405','A1', 4,  3,'fc1'),
  ('r-a1-08','svtn-tokyo-dome-20260405','A1', 5,  4,'fc1'),
  ('r-a1-09','svtn-tokyo-dome-20260405','A1', 6,  2,'general'),
  ('r-a1-10','svtn-tokyo-dome-20260405','A1', 7,  5,'fc1')
ON CONFLICT (id) DO NOTHING;

-- A2 ブロック (fc1/fc2 混在)
INSERT INTO seat_reports (id, event_id, block, row_num, seat_num, lottery_type) VALUES
  ('r-a2-01','svtn-tokyo-dome-20260405','A2', 1,  2,'fc1'),
  ('r-a2-02','svtn-tokyo-dome-20260405','A2', 1,  7,'fc2'),
  ('r-a2-03','svtn-tokyo-dome-20260405','A2', 2,  4,'fc1'),
  ('r-a2-04','svtn-tokyo-dome-20260405','A2', 3,  1,'fc2'),
  ('r-a2-05','svtn-tokyo-dome-20260405','A2', 3,  8,'fc1'),
  ('r-a2-06','svtn-tokyo-dome-20260405','A2', 4,  5,'fc2'),
  ('r-a2-07','svtn-tokyo-dome-20260405','A2', 5,  3,'fc1'),
  ('r-a2-08','svtn-tokyo-dome-20260405','A2', 6,  6,'general'),
  ('r-a2-09','svtn-tokyo-dome-20260405','A2', 7,  4,'fc1'),
  ('r-a2-10','svtn-tokyo-dome-20260405','A2', 8,  2,'upgrade')
ON CONFLICT (id) DO NOTHING;

-- A3 ブロック — 同一行で席番号に大きな隙間 → 花道検出テスト
INSERT INTO seat_reports (id, event_id, block, row_num, seat_num, lottery_type) VALUES
  ('r-a3-01','svtn-tokyo-dome-20260405','A3', 1,  1,'fc1'),
  ('r-a3-02','svtn-tokyo-dome-20260405','A3', 1,  2,'fc1'),
  ('r-a3-03','svtn-tokyo-dome-20260405','A3', 1,  9,'fc2'),  -- gap: 2→9 (7 > 3)
  ('r-a3-04','svtn-tokyo-dome-20260405','A3', 2,  1,'fc1'),
  ('r-a3-05','svtn-tokyo-dome-20260405','A3', 2, 10,'fc2'),  -- gap: 1→10 (9 > 3)
  ('r-a3-06','svtn-tokyo-dome-20260405','A3', 3,  2,'general'),
  ('r-a3-07','svtn-tokyo-dome-20260405','A3', 3,  8,'general'),
  ('r-a3-08','svtn-tokyo-dome-20260405','A3', 4,  1,'fc1'),
  ('r-a3-09','svtn-tokyo-dome-20260405','A3', 5,  3,'fc2'),
  ('r-a3-10','svtn-tokyo-dome-20260405','A3', 6,  9,'fc1')
ON CONFLICT (id) DO NOTHING;

-- A4 ブロック (general 多め)
INSERT INTO seat_reports (id, event_id, block, row_num, seat_num, lottery_type) VALUES
  ('r-a4-01','svtn-tokyo-dome-20260405','A4', 1,  4,'general'),
  ('r-a4-02','svtn-tokyo-dome-20260405','A4', 2,  3,'general'),
  ('r-a4-03','svtn-tokyo-dome-20260405','A4', 2,  7,'fc2'),
  ('r-a4-04','svtn-tokyo-dome-20260405','A4', 3,  5,'general'),
  ('r-a4-05','svtn-tokyo-dome-20260405','A4', 4,  2,'fc1'),
  ('r-a4-06','svtn-tokyo-dome-20260405','A4', 4,  8,'general'),
  ('r-a4-07','svtn-tokyo-dome-20260405','A4', 5,  4,'general'),
  ('r-a4-08','svtn-tokyo-dome-20260405','A4', 6,  6,'fc2'),
  ('r-a4-09','svtn-tokyo-dome-20260405','A4', 7,  3,'general'),
  ('r-a4-10','svtn-tokyo-dome-20260405','A4', 8,  5,'upgrade')
ON CONFLICT (id) DO NOTHING;

-- A5 ブロック (fc1/upgrade)
INSERT INTO seat_reports (id, event_id, block, row_num, seat_num, lottery_type) VALUES
  ('r-a5-01','svtn-tokyo-dome-20260405','A5', 1,  2,'fc1'),
  ('r-a5-02','svtn-tokyo-dome-20260405','A5', 2,  5,'fc1'),
  ('r-a5-03','svtn-tokyo-dome-20260405','A5', 3,  1,'upgrade'),
  ('r-a5-04','svtn-tokyo-dome-20260405','A5', 3,  7,'fc1'),
  ('r-a5-05','svtn-tokyo-dome-20260405','A5', 4,  3,'fc2'),
  ('r-a5-06','svtn-tokyo-dome-20260405','A5', 5,  6,'fc1'),
  ('r-a5-07','svtn-tokyo-dome-20260405','A5', 6,  4,'upgrade'),
  ('r-a5-08','svtn-tokyo-dome-20260405','A5', 7,  2,'fc1'),
  ('r-a5-09','svtn-tokyo-dome-20260405','A5', 8,  5,'fc2'),
  ('r-a5-10','svtn-tokyo-dome-20260405','A5', 9,  3,'fc1')
ON CONFLICT (id) DO NOTHING;

-- B2 ブロック (スタンド前方)
INSERT INTO seat_reports (id, event_id, block, row_num, seat_num, lottery_type) VALUES
  ('r-b2-01','svtn-tokyo-dome-20260405','B2', 3,  5,'general'),
  ('r-b2-02','svtn-tokyo-dome-20260405','B2', 4,  8,'fc2'),
  ('r-b2-03','svtn-tokyo-dome-20260405','B2', 5,  3,'general'),
  ('r-b2-04','svtn-tokyo-dome-20260405','B2', 6, 10,'general'),
  ('r-b2-05','svtn-tokyo-dome-20260405','B2', 7,  6,'fc1'),
  ('r-b2-06','svtn-tokyo-dome-20260405','B2', 8,  4,'general'),
  ('r-b2-07','svtn-tokyo-dome-20260405','B2', 9,  9,'fc2'),
  ('r-b2-08','svtn-tokyo-dome-20260405','B2',10,  7,'general')
ON CONFLICT (id) DO NOTHING;

-- B4 ブロック
INSERT INTO seat_reports (id, event_id, block, row_num, seat_num, lottery_type) VALUES
  ('r-b4-01','svtn-tokyo-dome-20260405','B4', 4,  6,'general'),
  ('r-b4-02','svtn-tokyo-dome-20260405','B4', 5,  4,'general'),
  ('r-b4-03','svtn-tokyo-dome-20260405','B4', 6,  9,'fc2'),
  ('r-b4-04','svtn-tokyo-dome-20260405','B4', 7,  2,'general'),
  ('r-b4-05','svtn-tokyo-dome-20260405','B4', 8,  7,'general'),
  ('r-b4-06','svtn-tokyo-dome-20260405','B4', 9,  5,'fc1'),
  ('r-b4-07','svtn-tokyo-dome-20260405','B4',10,  3,'general'),
  ('r-b4-08','svtn-tokyo-dome-20260405','B4',11,  8,'general')
ON CONFLICT (id) DO NOTHING;

-- B5 ブロック
INSERT INTO seat_reports (id, event_id, block, row_num, seat_num, lottery_type) VALUES
  ('r-b5-01','svtn-tokyo-dome-20260405','B5', 3,  4,'fc1'),
  ('r-b5-02','svtn-tokyo-dome-20260405','B5', 4,  7,'general'),
  ('r-b5-03','svtn-tokyo-dome-20260405','B5', 5,  2,'general'),
  ('r-b5-04','svtn-tokyo-dome-20260405','B5', 6,  9,'fc2'),
  ('r-b5-05','svtn-tokyo-dome-20260405','B5', 7,  5,'general'),
  ('r-b5-06','svtn-tokyo-dome-20260405','B5', 8,  3,'general'),
  ('r-b5-07','svtn-tokyo-dome-20260405','B5', 9,  8,'fc1'),
  ('r-b5-08','svtn-tokyo-dome-20260405','B5',10,  6,'general')
ON CONFLICT (id) DO NOTHING;

-- C1 ブロック (スタンド後方・general 中心)
INSERT INTO seat_reports (id, event_id, block, row_num, seat_num, lottery_type) VALUES
  ('r-c1-01','svtn-tokyo-dome-20260405','C1', 5,  6,'general'),
  ('r-c1-02','svtn-tokyo-dome-20260405','C1', 7,  4,'general'),
  ('r-c1-03','svtn-tokyo-dome-20260405','C1', 8,  9,'general'),
  ('r-c1-04','svtn-tokyo-dome-20260405','C1',10,  2,'general'),
  ('r-c1-05','svtn-tokyo-dome-20260405','C1',11, 11,'general'),
  ('r-c1-06','svtn-tokyo-dome-20260405','C1',13,  5,'fc2'),
  ('r-c1-07','svtn-tokyo-dome-20260405','C1',15,  8,'general'),
  ('r-c1-08','svtn-tokyo-dome-20260405','C1',17,  3,'general')
ON CONFLICT (id) DO NOTHING;

-- C2 ブロック
INSERT INTO seat_reports (id, event_id, block, row_num, seat_num, lottery_type) VALUES
  ('r-c2-01','svtn-tokyo-dome-20260405','C2', 6,  5,'general'),
  ('r-c2-02','svtn-tokyo-dome-20260405','C2', 8,  8,'fc2'),
  ('r-c2-03','svtn-tokyo-dome-20260405','C2',10,  3,'general'),
  ('r-c2-04','svtn-tokyo-dome-20260405','C2',12, 10,'general'),
  ('r-c2-05','svtn-tokyo-dome-20260405','C2',14,  6,'general'),
  ('r-c2-06','svtn-tokyo-dome-20260405','C2',16,  4,'general'),
  ('r-c2-07','svtn-tokyo-dome-20260405','C2',18,  7,'fc2'),
  ('r-c2-08','svtn-tokyo-dome-20260405','C2',20,  2,'general')
ON CONFLICT (id) DO NOTHING;

-- C4 ブロック
INSERT INTO seat_reports (id, event_id, block, row_num, seat_num, lottery_type) VALUES
  ('r-c4-01','svtn-tokyo-dome-20260405','C4', 5,  7,'general'),
  ('r-c4-02','svtn-tokyo-dome-20260405','C4', 7,  5,'general'),
  ('r-c4-03','svtn-tokyo-dome-20260405','C4', 9,  9,'general'),
  ('r-c4-04','svtn-tokyo-dome-20260405','C4',11,  3,'general'),
  ('r-c4-05','svtn-tokyo-dome-20260405','C4',13,  8,'fc2'),
  ('r-c4-06','svtn-tokyo-dome-20260405','C4',15,  4,'general'),
  ('r-c4-07','svtn-tokyo-dome-20260405','C4',17,  6,'general'),
  ('r-c4-08','svtn-tokyo-dome-20260405','C4',19, 10,'general')
ON CONFLICT (id) DO NOTHING;

-- C5 ブロック
INSERT INTO seat_reports (id, event_id, block, row_num, seat_num, lottery_type) VALUES
  ('r-c5-01','svtn-tokyo-dome-20260405','C5', 6,  4,'general'),
  ('r-c5-02','svtn-tokyo-dome-20260405','C5', 8,  7,'upgrade'),
  ('r-c5-03','svtn-tokyo-dome-20260405','C5',10,  2,'general'),
  ('r-c5-04','svtn-tokyo-dome-20260405','C5',12,  9,'general'),
  ('r-c5-05','svtn-tokyo-dome-20260405','C5',14,  5,'fc2'),
  ('r-c5-06','svtn-tokyo-dome-20260405','C5',16,  3,'general'),
  ('r-c5-07','svtn-tokyo-dome-20260405','C5',18,  8,'general'),
  ('r-c5-08','svtn-tokyo-dome-20260405','C5',20,  6,'upgrade')
ON CONFLICT (id) DO NOTHING;

-- SS1〜SS4 — 報告少ない → 疎ブロック「花道/候補」表示テスト
INSERT INTO seat_reports (id, event_id, block, row_num, seat_num, lottery_type) VALUES
  ('r-ss1-01','svtn-tokyo-dome-20260405','SS1', 1,  8,'fc1'),
  ('r-ss1-02','svtn-tokyo-dome-20260405','SS1', 2, 12,'fc2'),
  ('r-ss2-01','svtn-tokyo-dome-20260405','SS2', 1,  5,'general'),
  ('r-ss3-01','svtn-tokyo-dome-20260405','SS3', 1, 10,'fc1'),
  ('r-ss3-02','svtn-tokyo-dome-20260405','SS3', 1, 15,'fc2'),
  ('r-ss4-01','svtn-tokyo-dome-20260405','SS4', 2,  7,'general')
ON CONFLICT (id) DO NOTHING;
