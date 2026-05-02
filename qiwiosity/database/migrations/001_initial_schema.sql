-- ============================================================
-- Qiwiosity — Unified Database Schema
-- Migration 001: Initial schema
-- Target: Supabase (PostgreSQL 15+ with PostGIS)
-- ============================================================

-- Enable PostGIS for geospatial queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- ──────────────────────────────────────────────────────────
-- REGIONS
-- ──────────────────────────────────────────────────────────

CREATE TABLE regions (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  island          TEXT NOT NULL CHECK (island IN ('North', 'South')),
  lat             DOUBLE PRECISION NOT NULL,
  lng             DOUBLE PRECISION NOT NULL,
  location        GEOGRAPHY(POINT, 4326),
  description     TEXT,
  bounds_north    DOUBLE PRECISION,
  bounds_south    DOUBLE PRECISION,
  bounds_east     DOUBLE PRECISION,
  bounds_west     DOUBLE PRECISION,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE regions IS 'New Zealand tourism regions (19 total)';

-- ──────────────────────────────────────────────────────────
-- CATEGORIES
-- ──────────────────────────────────────────────────────────

CREATE TABLE categories (
  id              TEXT PRIMARY KEY,
  label           TEXT NOT NULL,
  icon            TEXT NOT NULL,
  color           TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE categories IS 'POI categories (8 types: adventure, culture, etc.)';

-- ──────────────────────────────────────────────────────────
-- POINTS OF INTEREST
-- ──────────────────────────────────────────────────────────

CREATE TABLE pois (
  id                      TEXT PRIMARY KEY,
  name                    TEXT NOT NULL,
  region_id               TEXT NOT NULL REFERENCES regions(id) ON DELETE RESTRICT,
  category_id             TEXT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  lat                     DOUBLE PRECISION NOT NULL,
  lng                     DOUBLE PRECISION NOT NULL,
  location                GEOGRAPHY(POINT, 4326),
  tags                    TEXT[] NOT NULL DEFAULT '{}',
  trigger_radius_m        INT NOT NULL DEFAULT 250,
  duration_hours          DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  short                   TEXT NOT NULL DEFAULT '',
  commentary              TEXT NOT NULL DEFAULT '',
  audio_story             TEXT,
  suggested_voice_tone    TEXT,
  approach_bearing_deg    DOUBLE PRECISION,
  content_status          TEXT NOT NULL DEFAULT 'draft'
                          CHECK (content_status IN ('draft', 'pending_scripts', 'draft_pending_review', 'draft_access_check_required', 'approved', 'published')),
  cultural_review_required BOOLEAN NOT NULL DEFAULT FALSE,
  sources_to_check        TEXT,
  review_rating           DOUBLE PRECISION,
  review_summary          TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE pois IS 'Points of interest across New Zealand (1100+)';

-- Indexes for common query patterns
CREATE INDEX idx_pois_region ON pois(region_id);
CREATE INDEX idx_pois_category ON pois(category_id);
CREATE INDEX idx_pois_content_status ON pois(content_status);
CREATE INDEX idx_pois_location ON pois USING GIST(location);
CREATE INDEX idx_pois_tags ON pois USING GIN(tags);

-- ──────────────────────────────────────────────────────────
-- POI SCRIPTS (narration texts)
-- ──────────────────────────────────────────────────────────

CREATE TABLE poi_scripts (
  id              SERIAL PRIMARY KEY,
  poi_id          TEXT NOT NULL REFERENCES pois(id) ON DELETE CASCADE,
  length          TEXT NOT NULL CHECK (length IN ('headline', 'standard')),
  target_seconds  INT,
  narration_text  TEXT NOT NULL,
  voice_direction TEXT,
  fact_check      TEXT,
  status          TEXT NOT NULL DEFAULT 'draft_v1',
  author          TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(poi_id, length)
);

COMMENT ON TABLE poi_scripts IS 'Narration scripts for POIs (headline ~24s, standard ~90s)';
CREATE INDEX idx_poi_scripts_poi ON poi_scripts(poi_id);
CREATE INDEX idx_poi_scripts_status ON poi_scripts(status);

-- ──────────────────────────────────────────────────────────
-- POI AUDIO (generated MP3 files)
-- ──────────────────────────────────────────────────────────

CREATE TABLE poi_audio (
  id              SERIAL PRIMARY KEY,
  poi_id          TEXT NOT NULL REFERENCES pois(id) ON DELETE CASCADE,
  length          TEXT NOT NULL CHECK (length IN ('headline', 'standard')),
  file_url        TEXT NOT NULL,
  voice_name      TEXT DEFAULT 'rachel',
  duration_secs   DOUBLE PRECISION,
  generated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(poi_id, length, voice_name)
);

COMMENT ON TABLE poi_audio IS 'Generated audio narrations (ElevenLabs TTS)';
CREATE INDEX idx_poi_audio_poi ON poi_audio(poi_id);

-- ──────────────────────────────────────────────────────────
-- POI IMAGES
-- ──────────────────────────────────────────────────────────

CREATE TABLE poi_images (
  id              SERIAL PRIMARY KEY,
  poi_id          TEXT NOT NULL REFERENCES pois(id) ON DELETE CASCADE,
  image_url       TEXT NOT NULL,
  source          TEXT NOT NULL DEFAULT 'wikimedia',
  display_order   INT NOT NULL DEFAULT 1,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE poi_images IS 'Image URLs for POIs (typically 5 per POI from Wikimedia)';
CREATE INDEX idx_poi_images_poi ON poi_images(poi_id);

-- ──────────────────────────────────────────────────────────
-- REGION IMAGES
-- ──────────────────────────────────────────────────────────

CREATE TABLE region_images (
  id              SERIAL PRIMARY KEY,
  region_id       TEXT NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
  image_url       TEXT NOT NULL,
  display_order   INT NOT NULL DEFAULT 1,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_region_images_region ON region_images(region_id);

-- ──────────────────────────────────────────────────────────
-- CATEGORY IMAGES
-- ──────────────────────────────────────────────────────────

CREATE TABLE category_images (
  id              SERIAL PRIMARY KEY,
  category_id     TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  image_url       TEXT NOT NULL,
  display_order   INT NOT NULL DEFAULT 1,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_category_images_category ON category_images(category_id);

-- ──────────────────────────────────────────────────────────
-- ACCOMMODATIONS
-- ──────────────────────────────────────────────────────────

CREATE TABLE accommodations (
  id                    TEXT PRIMARY KEY,
  name                  TEXT NOT NULL,
  region_id             TEXT NOT NULL REFERENCES regions(id) ON DELETE RESTRICT,
  lat                   DOUBLE PRECISION NOT NULL,
  lng                   DOUBLE PRECISION NOT NULL,
  location              GEOGRAPHY(POINT, 4326),
  type                  TEXT NOT NULL CHECK (type IN ('hotel', 'motel', 'holiday-park', 'lodge', 'backpacker', 'glamping')),
  price_nzd_per_night   INT NOT NULL,
  rating                DOUBLE PRECISION,
  short                 TEXT NOT NULL DEFAULT '',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE accommodations IS 'Accommodation listings across NZ (382+)';
CREATE INDEX idx_accommodations_region ON accommodations(region_id);
CREATE INDEX idx_accommodations_type ON accommodations(type);
CREATE INDEX idx_accommodations_location ON accommodations USING GIST(location);

-- ──────────────────────────────────────────────────────────
-- FUTURE: User tables (uncomment when ready)
-- ──────────────────────────────────────────────────────────

-- CREATE TABLE user_favourites (
--   id          SERIAL PRIMARY KEY,
--   user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
--   poi_id      TEXT NOT NULL REFERENCES pois(id) ON DELETE CASCADE,
--   created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
--   UNIQUE(user_id, poi_id)
-- );

-- CREATE TABLE user_reviews (
--   id          SERIAL PRIMARY KEY,
--   user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
--   poi_id      TEXT NOT NULL REFERENCES pois(id) ON DELETE CASCADE,
--   rating      INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
--   body        TEXT,
--   created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
--   updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
--   UNIQUE(user_id, poi_id)
-- );

-- CREATE TABLE itineraries (
--   id          SERIAL PRIMARY KEY,
--   user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
--   name        TEXT NOT NULL,
--   start_date  DATE,
--   end_date    DATE,
--   created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
--   updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
-- );

-- CREATE TABLE itinerary_stops (
--   id            SERIAL PRIMARY KEY,
--   itinerary_id  INT NOT NULL REFERENCES itineraries(id) ON DELETE CASCADE,
--   poi_id        TEXT NOT NULL REFERENCES pois(id) ON DELETE CASCADE,
--   day_number    INT NOT NULL DEFAULT 1,
--   stop_order    INT NOT NULL DEFAULT 1,
--   notes         TEXT,
--   UNIQUE(itinerary_id, day_number, stop_order)
-- );

-- ──────────────────────────────────────────────────────────
-- TRIGGERS: Auto-compute location from lat/lng
-- ──────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION compute_location()
RETURNS TRIGGER AS $$
BEGIN
  NEW.location := ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326)::GEOGRAPHY;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_regions_location
  BEFORE INSERT OR UPDATE OF lat, lng ON regions
  FOR EACH ROW EXECUTE FUNCTION compute_location();

CREATE TRIGGER trg_pois_location
  BEFORE INSERT OR UPDATE OF lat, lng ON pois
  FOR EACH ROW EXECUTE FUNCTION compute_location();

CREATE TRIGGER trg_accommodations_location
  BEFORE INSERT OR UPDATE OF lat, lng ON accommodations
  FOR EACH ROW EXECUTE FUNCTION compute_location();

-- ──────────────────────────────────────────────────────────
-- TRIGGERS: Auto-update updated_at
-- ──────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_regions_updated_at
  BEFORE UPDATE ON regions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_pois_updated_at
  BEFORE UPDATE ON pois
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_poi_scripts_updated_at
  BEFORE UPDATE ON poi_scripts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_accommodations_updated_at
  BEFORE UPDATE ON accommodations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ──────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ──────────────────────────────────────────────────────────

-- Enable RLS on all tables
ALTER TABLE regions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories         ENABLE ROW LEVEL SECURITY;
ALTER TABLE pois               ENABLE ROW LEVEL SECURITY;
ALTER TABLE poi_scripts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE poi_audio          ENABLE ROW LEVEL SECURITY;
ALTER TABLE poi_images         ENABLE ROW LEVEL SECURITY;
ALTER TABLE region_images      ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_images    ENABLE ROW LEVEL SECURITY;
ALTER TABLE accommodations     ENABLE ROW LEVEL SECURITY;

-- Public read access (anon + authenticated)
CREATE POLICY "Public read regions"       ON regions          FOR SELECT USING (true);
CREATE POLICY "Public read categories"    ON categories       FOR SELECT USING (true);
CREATE POLICY "Public read pois"          ON pois             FOR SELECT USING (true);
CREATE POLICY "Public read poi_scripts"   ON poi_scripts      FOR SELECT USING (true);
CREATE POLICY "Public read poi_audio"     ON poi_audio        FOR SELECT USING (true);
CREATE POLICY "Public read poi_images"    ON poi_images       FOR SELECT USING (true);
CREATE POLICY "Public read region_imgs"   ON region_images    FOR SELECT USING (true);
CREATE POLICY "Public read category_imgs" ON category_images  FOR SELECT USING (true);
CREATE POLICY "Public read accommodations" ON accommodations  FOR SELECT USING (true);

-- Admin write access (service_role key bypasses RLS, so these are
-- for authenticated admin users if you set up roles later)
-- For now, all writes go through the service_role key (import script).

-- ──────────────────────────────────────────────────────────
-- USEFUL VIEWS
-- ──────────────────────────────────────────────────────────

-- POIs with their region and category names (common query)
CREATE OR REPLACE VIEW pois_full AS
SELECT
  p.*,
  r.name AS region_name,
  r.island,
  c.label AS category_label,
  c.icon AS category_icon,
  c.color AS category_color
FROM pois p
JOIN regions r ON r.id = p.region_id
JOIN categories c ON c.id = p.category_id;

-- Accommodation with region name
CREATE OR REPLACE VIEW accommodations_full AS
SELECT
  a.*,
  r.name AS region_name,
  r.island
FROM accommodations a
JOIN regions r ON r.id = a.region_id;

-- Content pipeline status overview
CREATE OR REPLACE VIEW content_pipeline AS
SELECT
  p.id,
  p.name,
  p.region_id,
  p.content_status,
  p.cultural_review_required,
  EXISTS(SELECT 1 FROM poi_scripts s WHERE s.poi_id = p.id AND s.length = 'headline') AS has_headline_script,
  EXISTS(SELECT 1 FROM poi_scripts s WHERE s.poi_id = p.id AND s.length = 'standard') AS has_standard_script,
  EXISTS(SELECT 1 FROM poi_audio a WHERE a.poi_id = p.id AND a.length = 'headline') AS has_headline_audio,
  EXISTS(SELECT 1 FROM poi_audio a WHERE a.poi_id = p.id AND a.length = 'standard') AS has_standard_audio,
  (SELECT COUNT(*) FROM poi_images i WHERE i.poi_id = p.id) AS image_count
FROM pois p
ORDER BY p.region_id, p.name;

-- ──────────────────────────────────────────────────────────
-- HELPER FUNCTIONS
-- ──────────────────────────────────────────────────────────

-- Find POIs within a radius (meters) of a point
CREATE OR REPLACE FUNCTION nearby_pois(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  radius_m INT DEFAULT 5000
)
RETURNS TABLE (
  id TEXT,
  name TEXT,
  region_id TEXT,
  category_id TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  short TEXT,
  distance_m DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id, p.name, p.region_id, p.category_id, p.lat, p.lng, p.short,
    ST_Distance(
      p.location,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::GEOGRAPHY
    ) AS distance_m
  FROM pois p
  WHERE ST_DWithin(
    p.location,
    ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::GEOGRAPHY,
    radius_m
  )
  ORDER BY distance_m ASC;
END;
$$ LANGUAGE plpgsql;

-- Find accommodations within a radius
CREATE OR REPLACE FUNCTION nearby_accommodations(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  radius_m INT DEFAULT 10000
)
RETURNS TABLE (
  id TEXT,
  name TEXT,
  type TEXT,
  price_nzd_per_night INT,
  rating DOUBLE PRECISION,
  short TEXT,
  distance_m DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id, a.name, a.type, a.price_nzd_per_night, a.rating, a.short,
    ST_Distance(
      a.location,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::GEOGRAPHY
    ) AS distance_m
  FROM accommodations a
  WHERE ST_DWithin(
    a.location,
    ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::GEOGRAPHY,
    radius_m
  )
  ORDER BY distance_m ASC;
END;
$$ LANGUAGE plpgsql;
