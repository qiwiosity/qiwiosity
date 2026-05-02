-- ============================================================
-- Qiwiosity — User Lists (Bucket Lists / Saved Collections)
-- Migration 003: User-created POI lists
-- Target: Supabase (PostgreSQL 15+)
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- USER LISTS
-- ──────────────────────────────────────────────────────────

CREATE TABLE user_lists (
  id              TEXT PRIMARY KEY DEFAULT 'list-' || extract(epoch from now())::bigint::text,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  icon            TEXT NOT NULL DEFAULT 'bookmark',
  color           TEXT NOT NULL DEFAULT '#15888A',
  sort_order      INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE user_lists IS 'User-created POI lists (bucket lists, trip ideas, etc.)';

CREATE INDEX idx_user_lists_user ON user_lists(user_id);

-- ────────────────────────────────────────────────────────��─
-- USER LIST ITEMS (POIs saved to a list)
-- ──────────────────────────────────────────────────────────

CREATE TABLE user_list_items (
  id              SERIAL PRIMARY KEY,
  list_id         TEXT NOT NULL REFERENCES user_lists(id) ON DELETE CASCADE,
  poi_id          TEXT NOT NULL REFERENCES pois(id) ON DELETE CASCADE,
  notes           TEXT,
  added_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(list_id, poi_id)
);

COMMENT ON TABLE user_list_items IS 'POIs saved within a user list';

CREATE INDEX idx_user_list_items_list ON user_list_items(list_id);
CREATE INDEX idx_user_list_items_poi ON user_list_items(poi_id);

-- ──────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ──────────────────────────────────────────────────────────

ALTER TABLE user_lists      ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_list_items ENABLE ROW LEVEL SECURITY;

-- Users can only see/modify their own lists
CREATE POLICY "Users read own lists"
  ON user_lists FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own lists"
  ON user_lists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own lists"
  ON user_lists FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own lists"
  ON user_lists FOR DELETE
  USING (auth.uid() = user_id);

-- List items: users can manage items in lists they own
CREATE POLICY "Users read own list items"
  ON user_list_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_lists
    WHERE user_lists.id = user_list_items.list_id
      AND user_lists.user_id = auth.uid()
  ));

CREATE POLICY "Users insert own list items"
  ON user_list_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_lists
    WHERE user_lists.id = user_list_items.list_id
      AND user_lists.user_id = auth.uid()
  ));

CREATE POLICY "Users delete own list items"
  ON user_list_items FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM user_lists
    WHERE user_lists.id = user_list_items.list_id
      AND user_lists.user_id = auth.uid()
  ));

-- ──────────────────────────────────────────────────────────
-- TRIGGERS: Auto-update updated_at
-- ──────────────────────────────────────────────────────────

CREATE TRIGGER trg_user_lists_updated_at
  BEFORE UPDATE ON user_lists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ──────────────────────────────────────────────────────────
-- USEFUL VIEW: Lists with item counts
-- ──────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW user_lists_full AS
SELECT
  l.*,
  COUNT(li.id) AS item_count
FROM user_lists l
LEFT JOIN user_list_items li ON li.list_id = l.id
GROUP BY l.id;

-- ──────────────────────────────────────────────────────────
-- USEFUL VIEW: List items with POI details
-- ──────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW user_list_items_full AS
SELECT
  li.*,
  p.name AS poi_name,
  p.lat,
  p.lng,
  p.short,
  p.category_id,
  p.region_id,
  c.label AS category_label,
  c.icon AS category_icon,
  c.color AS category_color,
  r.name AS region_name
FROM user_list_items li
JOIN pois p ON p.id = li.poi_id
JOIN categories c ON c.id = p.category_id
JOIN regions r ON r.id = p.region_id;
