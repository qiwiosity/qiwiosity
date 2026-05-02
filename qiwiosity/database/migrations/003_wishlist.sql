-- ============================================================
-- Qiwiosity — Wishlist Schema
-- Migration 003: User wishlist (Chrome extension + mobile app)
-- Target: Supabase (PostgreSQL 15+)
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- USER PROFILES (lightweight, linked to Supabase Auth)
-- ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name    TEXT,
  avatar_url      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE user_profiles IS 'Lightweight user profiles synced from Supabase Auth';

CREATE TRIGGER trg_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ──────────────────────────────────────────────────────────
-- WISHLIST ITEMS
-- ──────────────────────────────────────────────────────────

CREATE TABLE wishlist_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Core fields (always present)
  title           TEXT NOT NULL,
  url             TEXT NOT NULL,
  source_site     TEXT NOT NULL DEFAULT 'unknown',   -- 'youtube', 'instagram', 'facebook', 'google-maps', 'tripadvisor', 'blog', etc.
  thumbnail_url   TEXT,
  description     TEXT,

  -- Location (auto-detected or user-entered)
  place_name      TEXT,                              -- e.g. "Milford Sound"
  country         TEXT DEFAULT 'New Zealand',
  region          TEXT,                              -- e.g. "Fiordland"
  lat             DOUBLE PRECISION,
  lng             DOUBLE PRECISION,

  -- Link to existing Qiwiosity POI (if matched)
  poi_id          TEXT REFERENCES pois(id) ON DELETE SET NULL,

  -- Organisation
  tags            TEXT[] NOT NULL DEFAULT '{}',
  notes           TEXT,
  is_visited      BOOLEAN NOT NULL DEFAULT FALSE,
  visited_at      TIMESTAMPTZ,

  -- Metadata
  saved_from      TEXT NOT NULL DEFAULT 'extension', -- 'extension', 'mobile', 'web', 'share-sheet'
  raw_meta        JSONB DEFAULT '{}',                -- store any extra scraped data
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE wishlist_items IS 'User wishlist — places saved from Chrome extension, mobile app, or share sheet';

CREATE INDEX idx_wishlist_user       ON wishlist_items(user_id);
CREATE INDEX idx_wishlist_source     ON wishlist_items(source_site);
CREATE INDEX idx_wishlist_poi        ON wishlist_items(poi_id);
CREATE INDEX idx_wishlist_visited    ON wishlist_items(user_id, is_visited);
CREATE INDEX idx_wishlist_tags       ON wishlist_items USING GIN(tags);
CREATE INDEX idx_wishlist_created    ON wishlist_items(user_id, created_at DESC);

CREATE TRIGGER trg_wishlist_items_updated_at
  BEFORE UPDATE ON wishlist_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ──────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ──────────────────────────────────────────────────────────

ALTER TABLE user_profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;

-- Users can read/write only their own profile
CREATE POLICY "Users read own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

-- Users can CRUD only their own wishlist items
CREATE POLICY "Users read own wishlist"
  ON wishlist_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own wishlist"
  ON wishlist_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own wishlist"
  ON wishlist_items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own wishlist"
  ON wishlist_items FOR DELETE
  USING (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────
-- HELPER: Try to match a wishlist item to an existing POI
-- ──────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION match_wishlist_to_poi()
RETURNS TRIGGER AS $$
BEGIN
  -- If lat/lng provided, try to find closest POI within 500m
  IF NEW.lat IS NOT NULL AND NEW.lng IS NOT NULL AND NEW.poi_id IS NULL THEN
    SELECT p.id INTO NEW.poi_id
    FROM pois p
    WHERE ST_DWithin(
      p.location,
      ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326)::GEOGRAPHY,
      500
    )
    ORDER BY ST_Distance(
      p.location,
      ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326)::GEOGRAPHY
    ) ASC
    LIMIT 1;
  END IF;

  -- Fallback: try name matching if no geo match
  IF NEW.poi_id IS NULL AND NEW.place_name IS NOT NULL THEN
    SELECT p.id INTO NEW.poi_id
    FROM pois p
    WHERE LOWER(p.name) = LOWER(NEW.place_name)
    LIMIT 1;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_wishlist_match_poi
  BEFORE INSERT ON wishlist_items
  FOR EACH ROW EXECUTE FUNCTION match_wishlist_to_poi();

-- ──────────────────────────────────────────────────────────
-- VIEW: Wishlist with POI details
-- ──────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW wishlist_full AS
SELECT
  w.*,
  p.name            AS poi_name,
  p.region_id       AS poi_region_id,
  p.category_id     AS poi_category_id,
  p.short           AS poi_short,
  r.name            AS poi_region_name,
  c.label           AS poi_category_label,
  c.icon            AS poi_category_icon,
  c.color           AS poi_category_color,
  (SELECT image_url FROM poi_images pi WHERE pi.poi_id = p.id ORDER BY display_order LIMIT 1) AS poi_image_url
FROM wishlist_items w
LEFT JOIN pois p        ON p.id = w.poi_id
LEFT JOIN regions r     ON r.id = p.region_id
LEFT JOIN categories c  ON c.id = p.category_id;
