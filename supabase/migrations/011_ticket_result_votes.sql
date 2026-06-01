-- ========================================
-- 011: ticket_result_votes
-- アーティスト別チケット・アプグレ当選率投票
-- ========================================

CREATE TABLE IF NOT EXISTS ticket_result_votes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_slug TEXT        NOT NULL,
  vote_type   TEXT        NOT NULL CHECK (vote_type   IN ('ticket', 'upgrade')),
  result      TEXT        NOT NULL CHECK (result       IN ('won', 'lost', 'not_applied')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ticket_result_votes_slug ON ticket_result_votes(artist_slug);
CREATE INDEX IF NOT EXISTS idx_ticket_result_votes_slug_type ON ticket_result_votes(artist_slug, vote_type);

ALTER TABLE ticket_result_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ticket_result_votes_read"   ON ticket_result_votes FOR SELECT USING (true);
CREATE POLICY "ticket_result_votes_insert" ON ticket_result_votes FOR INSERT WITH CHECK (true);
