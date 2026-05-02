-- ============================================================
-- Qiwiosity — Database Migration
-- Migration 002: Add POI verification status
-- Adds fields to track manual verification of POI data
-- (location accuracy, image quality, description correctness)
-- ============================================================

-- Add verification columns to pois table
ALTER TABLE pois
  ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified', 'verified', 'flagged')),
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verification_notes TEXT;

-- Index for filtering by verification status in the admin panel
CREATE INDEX IF NOT EXISTS idx_pois_verification_status ON pois(verification_status);

-- Update the pois_full view to include verification fields
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

-- Update the content_pipeline view to include verification status
CREATE OR REPLACE VIEW content_pipeline AS
SELECT
  p.id,
  p.name,
  p.region_id,
  p.content_status,
  p.verification_status,
  p.cultural_review_required,
  EXISTS(SELECT 1 FROM poi_scripts s WHERE s.poi_id = p.id AND s.length = 'headline') AS has_headline_script,
  EXISTS(SELECT 1 FROM poi_scripts s WHERE s.poi_id = p.id AND s.length = 'standard') AS has_standard_script,
  EXISTS(SELECT 1 FROM poi_audio a WHERE a.poi_id = p.id AND a.length = 'headline') AS has_headline_audio,
  EXISTS(SELECT 1 FROM poi_audio a WHERE a.poi_id = p.id AND a.length = 'standard') AS has_standard_audio,
  (SELECT COUNT(*) FROM poi_images i WHERE i.poi_id = p.id) AS image_count
FROM pois p
ORDER BY p.region_id, p.name;

-- RLS: Allow public update of verification fields only (via service_role for now)
-- The admin panel will use the service_role key since it's a private tool.
-- If you later want anon updates, add a policy like:
-- CREATE POLICY "Admin verify pois" ON pois FOR UPDATE
--   USING (true) WITH CHECK (true);

COMMENT ON COLUMN pois.verification_status IS 'Manual verification: unverified (default for new POIs), verified, or flagged for issues';
COMMENT ON COLUMN pois.verified_at IS 'Timestamp of last verification action';
COMMENT ON COLUMN pois.verification_notes IS 'Free-text notes about issues found during verification';
