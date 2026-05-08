-- ========================================
-- 座席ナビ: Initial Database Schema
-- ========================================

-- Venues (会場)
CREATE TABLE IF NOT EXISTS venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  prefecture TEXT NOT NULL DEFAULT '',
  genre TEXT NOT NULL DEFAULT 'other'
    CHECK (genre IN ('kpop', 'johnnys', 'female_idol', 'male_idol', 'other')),
  total_posts INTEGER NOT NULL DEFAULT 0,
  avg_kamiseki_score REAL NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sections (セクション / ブロック)
CREATE TABLE IF NOT EXISTS sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  post_count INTEGER NOT NULL DEFAULT 0,
  hanamichi_rate REAL NOT NULL DEFAULT 0,
  torokko_rate REAL NOT NULL DEFAULT 0,
  binoculars_rate REAL NOT NULL DEFAULT 0,
  avg_distance REAL NOT NULL DEFAULT 0,
  fanservice_rate REAL NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Posts (投稿 / 体験データ)
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL DEFAULT '',
  event_date DATE,
  hanamichi BOOLEAN NOT NULL DEFAULT false,
  torokko BOOLEAN NOT NULL DEFAULT false,
  binoculars_needed BOOLEAN NOT NULL DEFAULT false,
  distance_score INTEGER NOT NULL DEFAULT 3 CHECK (distance_score BETWEEN 1 AND 5),
  fanservice BOOLEAN NOT NULL DEFAULT false,
  comment TEXT,
  has_spoiler BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- AI Conversations
CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  related_section_id UUID REFERENCES sections(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sections_venue ON sections(venue_id);
CREATE INDEX IF NOT EXISTS idx_posts_section ON posts(section_id);
CREATE INDEX IF NOT EXISTS idx_posts_venue ON posts(venue_id);
CREATE INDEX IF NOT EXISTS idx_venues_genre ON venues(genre);
CREATE INDEX IF NOT EXISTS idx_venues_total_posts ON venues(total_posts DESC);
CREATE INDEX IF NOT EXISTS idx_ai_conv_session ON ai_conversations(session_id);

-- Enable RLS (Row Level Security)
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "venues_read" ON venues FOR SELECT USING (true);
CREATE POLICY "sections_read" ON sections FOR SELECT USING (true);
CREATE POLICY "posts_read" ON posts FOR SELECT USING (true);
CREATE POLICY "ai_conv_read" ON ai_conversations FOR SELECT USING (true);

-- Public insert policies (MVP: anonymous posting)
CREATE POLICY "posts_insert" ON posts FOR INSERT WITH CHECK (true);
CREATE POLICY "ai_conv_insert" ON ai_conversations FOR INSERT WITH CHECK (true);
