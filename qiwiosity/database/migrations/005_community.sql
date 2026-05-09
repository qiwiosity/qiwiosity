-- ============================================================
-- Qiwiosity — Community / EchoVerse Tables
-- Migration 005: Community contributions, voting, flagging
-- Target: Supabase (PostgreSQL 15+)
-- Run this in: Supabase dashboard → SQL Editor
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- USERS (lightweight community identity, not Supabase Auth)
-- ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS qw_users (
  id          TEXT PRIMARY KEY,           -- format: u_<random>
  handle      TEXT NOT NULL,              -- display name, 2-20 chars
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE qw_users IS 'Lightweight community user profiles (not Supabase Auth users)';

-- ──────────────────────────────────────────────────────────
-- CONTRIBUTIONS (issues, suggestions, tips, photos)
-- ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS qw_contribs (
  id              TEXT PRIMARY KEY,       -- format: c_<timestamp36><random>
  type            TEXT NOT NULL CHECK (type IN ('issue', 'suggestion', 'tip', 'photo')),
  poi_id          TEXT,                   -- nullable: global contributions have no POI
  title           TEXT NOT NULL,
  body            TEXT,
  media_data_url  TEXT,                   -- base64 image, max ~1MB stored
  author_id       TEXT NOT NULL REFERENCES qw_users(id) ON DELETE CASCADE,
  author_handle   TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'live'
                  CHECK (status IN ('live', 'open', 'resolved')),
  resolved_by     TEXT,
  resolved_at     TIMESTAMPTZ,
  hidden_by_admin BOOLEAN NOT NULL DEFAULT FALSE,
  flag_count      INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE qw_contribs IS 'Community contributions: issues, suggestions, tips, photos per POI';

CREATE INDEX IF NOT EXISTS idx_qw_contribs_poi     ON qw_contribs(poi_id);
CREATE INDEX IF NOT EXISTS idx_qw_contribs_author  ON qw_contribs(author_id);
CREATE INDEX IF NOT EXISTS idx_qw_contribs_created ON qw_contribs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_qw_contribs_hidden  ON qw_contribs(hidden_by_admin);

-- ──────────────────────────────────────────────────────────
-- VOTES (upvote / downvote per contribution)
-- ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS qw_votes (
  contrib_id  TEXT NOT NULL REFERENCES qw_contribs(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL REFERENCES qw_users(id) ON DELETE CASCADE,
  dir         INT NOT NULL CHECK (dir IN (1, -1)),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (contrib_id, user_id)
);

COMMENT ON TABLE qw_votes IS 'Community upvotes/downvotes on contributions';

CREATE INDEX IF NOT EXISTS idx_qw_votes_contrib ON qw_votes(contrib_id);
CREATE INDEX IF NOT EXISTS idx_qw_votes_user    ON qw_votes(user_id);

-- ──────────────────────────────────────────────────────────
-- FLAGS (moderation flags; 5 flags auto-hides a contribution)
-- ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS qw_flags (
  contrib_id  TEXT NOT NULL REFERENCES qw_contribs(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL REFERENCES qw_users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (contrib_id, user_id)
);

COMMENT ON TABLE qw_flags IS 'Moderation flags; 5 flags triggers auto-hide';

CREATE INDEX IF NOT EXISTS idx_qw_flags_contrib ON qw_flags(contrib_id);

-- ──────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ──────────────────────────────────────────────────────────

ALTER TABLE qw_users    ENABLE ROW LEVEL SECURITY;
ALTER TABLE qw_contribs ENABLE ROW LEVEL SECURITY;
ALTER TABLE qw_votes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE qw_flags    ENABLE ROW LEVEL SECURITY;

-- Public read (anon can read visible contributions)
CREATE POLICY "Public read qw_users"
  ON qw_users FOR SELECT USING (true);

CREATE POLICY "Public read visible contribs"
  ON qw_contribs FOR SELECT USING (hidden_by_admin = FALSE);

CREATE POLICY "Public read qw_votes"
  ON qw_votes FOR SELECT USING (true);

-- All writes go through the server (service_role key bypasses RLS)
-- The Node.js server uses DATABASE_URL which connects as service_role
