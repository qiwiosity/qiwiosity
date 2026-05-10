-- ============================================================
-- Qiwiosity — User Profiles
-- Migration 006: Profiles table linked to Supabase Auth
-- Target: Supabase (PostgreSQL 15+)
-- Run in: Supabase dashboard → SQL Editor
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- PROFILES (one row per auth.users account)
-- ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  handle      TEXT NOT NULL,
  bio         TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE profiles IS 'Public user profiles, one per Supabase Auth user';

-- Case-insensitive unique handles
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_handle_lower ON profiles(lower(handle));
CREATE INDEX IF NOT EXISTS idx_profiles_created ON profiles(created_at DESC);

-- ──────────────────────────────────────────────────────────
-- AUTO-CREATE PROFILE ON SIGNUP
-- The handle is passed via options.data.handle at signUp()
-- time; fallback to user_<first8ofuuid> if absent.
-- ──────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION create_profile_for_new_user()
RETURNS TRIGGER AS $$
DECLARE
  desired_handle TEXT;
  final_handle   TEXT;
  suffix         INT := 0;
BEGIN
  desired_handle := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data->>'handle'), ''),
    'user_' || substring(replace(NEW.id::text, '-', ''), 1, 8)
  );

  -- Ensure handle is unique (append _N if collision)
  final_handle := desired_handle;
  LOOP
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE lower(handle) = lower(final_handle));
    suffix := suffix + 1;
    final_handle := desired_handle || '_' || suffix;
  END LOOP;

  INSERT INTO public.profiles (id, handle)
  VALUES (NEW.id, final_handle)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_profile_for_new_user();

-- ──────────────────────────────────────────────────────────
-- UPDATED_AT TRIGGER
-- ──────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ──────────────────────────────────────────────────────────
-- LINK qw_users TO AUTH (backward-compatible, nullable)
-- New accounts use their auth UUID to derive their qw_users id.
-- Legacy accounts (u_<random>) keep their existing id.
-- ──────────────────────────────────────────────────────────

ALTER TABLE qw_users
  ADD COLUMN IF NOT EXISTS auth_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_qw_users_auth_id
  ON qw_users(auth_id) WHERE auth_id IS NOT NULL;

-- ──────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ──────────────────────────────────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Anyone can read profiles
CREATE POLICY "Public can read profiles"
  ON profiles FOR SELECT USING (true);

-- Users can only update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);
