/*
  Multi-Tenant Isolation Migration

  This migration implements complete user isolation (multi-tenancy) for the uRequest Songs application.

  Changes:
  1. Add user_id columns to tables that don't have them
  2. Add 'slug' column to auth.users for custom subdomain URLs (e.g., /request/bandname)
  3. Create profiles table to store user settings including slug
  4. Enable Row Level Security (RLS) on all tables
  5. Create RLS policies for complete data isolation per user
  6. Update stored procedures to be RLS-aware
  7. Create indexes for efficient user-scoped queries
*/

-- =====================================================
-- PART 1: Create profiles table for user metadata
-- =====================================================

-- Create profiles table to extend auth.users with app-specific data
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  slug TEXT UNIQUE, -- Custom URL slug (e.g., 'myband' -> /request/myband)
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add slug column if it doesn't exist (in case table was created without it)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'slug'
  ) THEN
    ALTER TABLE profiles ADD COLUMN slug TEXT UNIQUE;
  END IF;
END $$;

-- Create unique index on slug for fast lookups (only if column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'slug'
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_slug ON profiles(slug) WHERE slug IS NOT NULL;
  END IF;
END $$;

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing profile policies first
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Anyone can view profiles by slug" ON profiles;

-- Profile policies
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Allow public read of profiles by slug (for public request pages)
CREATE POLICY "Anyone can view profiles by slug"
  ON profiles FOR SELECT
  USING (slug IS NOT NULL);

-- =====================================================
-- PART 2: Add user_id columns to tables that need them
-- =====================================================

-- Add user_id to requests table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'requests' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE requests ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    CREATE INDEX idx_requests_user_id ON requests(user_id);
  END IF;
END $$;

-- Add user_id to requesters table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'requesters' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE requesters ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    CREATE INDEX idx_requesters_user_id ON requesters(user_id);
  END IF;
END $$;

-- Add user_id to user_votes table (for tracking which dashboard the vote belongs to)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_votes' AND column_name = 'owner_id'
  ) THEN
    ALTER TABLE user_votes ADD COLUMN owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    CREATE INDEX idx_user_votes_owner_id ON user_votes(owner_id);
  END IF;
END $$;

-- Add user_id to set_lists table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'set_lists' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE set_lists ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    CREATE INDEX idx_set_lists_user_id ON set_lists(user_id);
  END IF;
END $$;

-- Add user_id to set_list_songs table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'set_list_songs' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE set_list_songs ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    CREATE INDEX idx_set_list_songs_user_id ON set_list_songs(user_id);
  END IF;
END $$;

-- Add user_id to ui_settings table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ui_settings' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE ui_settings ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    CREATE UNIQUE INDEX idx_ui_settings_user_id ON ui_settings(user_id);
  END IF;
END $$;

-- Ensure songs table has user_id (it should from seed but verify)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'songs' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE songs ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add index on songs.user_id if not exists
CREATE INDEX IF NOT EXISTS idx_songs_user_id ON songs(user_id);

-- =====================================================
-- PART 3: Enable RLS on all tables
-- =====================================================

ALTER TABLE songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE requesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE set_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE set_list_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ui_settings ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PART 4: Create RLS policies for data isolation
-- =====================================================

-- Drop existing policies first (if any)
DROP POLICY IF EXISTS "Users can view their own songs" ON songs;
DROP POLICY IF EXISTS "Users can insert their own songs" ON songs;
DROP POLICY IF EXISTS "Users can update their own songs" ON songs;
DROP POLICY IF EXISTS "Users can delete their own songs" ON songs;

DROP POLICY IF EXISTS "Users can view their own requests" ON requests;
DROP POLICY IF EXISTS "Users can insert requests" ON requests;
DROP POLICY IF EXISTS "Users can insert their own requests" ON requests;
DROP POLICY IF EXISTS "Users can update their own requests" ON requests;
DROP POLICY IF EXISTS "Users can delete their own requests" ON requests;
DROP POLICY IF EXISTS "Anyone can view requests by user_id" ON requests;
DROP POLICY IF EXISTS "Anyone can insert requests with user_id" ON requests;

DROP POLICY IF EXISTS "Users can view their own requesters" ON requesters;
DROP POLICY IF EXISTS "Anyone can insert requesters" ON requesters;
DROP POLICY IF EXISTS "Anyone can view requesters by user_id" ON requesters;

DROP POLICY IF EXISTS "Users can view their own votes" ON user_votes;
DROP POLICY IF EXISTS "Anyone can insert votes" ON user_votes;
DROP POLICY IF EXISTS "Anyone can view votes by owner_id" ON user_votes;

DROP POLICY IF EXISTS "Users can view their own set_lists" ON set_lists;
DROP POLICY IF EXISTS "Users can insert their own set_lists" ON set_lists;
DROP POLICY IF EXISTS "Users can update their own set_lists" ON set_lists;
DROP POLICY IF EXISTS "Users can delete their own set_lists" ON set_lists;
DROP POLICY IF EXISTS "Anyone can view active set_lists by user_id" ON set_lists;

DROP POLICY IF EXISTS "Users can view their own set_list_songs" ON set_list_songs;
DROP POLICY IF EXISTS "Users can insert their own set_list_songs" ON set_list_songs;
DROP POLICY IF EXISTS "Users can update their own set_list_songs" ON set_list_songs;
DROP POLICY IF EXISTS "Users can delete their own set_list_songs" ON set_list_songs;
DROP POLICY IF EXISTS "Anyone can view set_list_songs by user_id" ON set_list_songs;

DROP POLICY IF EXISTS "Users can view their own ui_settings" ON ui_settings;
DROP POLICY IF EXISTS "Users can insert their own ui_settings" ON ui_settings;
DROP POLICY IF EXISTS "Users can update their own ui_settings" ON ui_settings;
DROP POLICY IF EXISTS "Anyone can view ui_settings by user_id" ON ui_settings;

-- =====================================================
-- SONGS POLICIES (Backend only - authenticated users)
-- =====================================================

CREATE POLICY "Users can view their own songs"
  ON songs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own songs"
  ON songs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own songs"
  ON songs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own songs"
  ON songs FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- REQUESTS POLICIES (Public can insert/view for specific user)
-- =====================================================

-- Authenticated users can see their own requests
CREATE POLICY "Users can view their own requests"
  ON requests FOR SELECT
  USING (auth.uid() = user_id);

-- Public/anonymous users can view requests for a specific user (needed for public frontend)
CREATE POLICY "Anyone can view requests by user_id"
  ON requests FOR SELECT
  USING (user_id IS NOT NULL);

-- Authenticated users can insert requests (for their own dashboard)
CREATE POLICY "Users can insert their own requests"
  ON requests FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NOT NULL);

-- Public/anonymous users can insert requests with a user_id specified
CREATE POLICY "Anyone can insert requests with user_id"
  ON requests FOR INSERT
  WITH CHECK (user_id IS NOT NULL);

-- Only authenticated owners can update their requests
CREATE POLICY "Users can update their own requests"
  ON requests FOR UPDATE
  USING (auth.uid() = user_id);

-- Only authenticated owners can delete their requests
CREATE POLICY "Users can delete their own requests"
  ON requests FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- REQUESTERS POLICIES (Public can insert for any request)
-- =====================================================

-- View requesters (for both authenticated and public)
CREATE POLICY "Anyone can view requesters by user_id"
  ON requesters FOR SELECT
  USING (user_id IS NOT NULL OR auth.uid() = user_id);

-- Anyone can insert requesters (public request form)
CREATE POLICY "Anyone can insert requesters"
  ON requesters FOR INSERT
  WITH CHECK (user_id IS NOT NULL);

-- =====================================================
-- USER_VOTES POLICIES (Public can vote)
-- =====================================================

-- View votes
CREATE POLICY "Anyone can view votes by owner_id"
  ON user_votes FOR SELECT
  USING (owner_id IS NOT NULL OR auth.uid() = owner_id);

-- Anyone can insert votes (public voting)
CREATE POLICY "Anyone can insert votes"
  ON user_votes FOR INSERT
  WITH CHECK (owner_id IS NOT NULL);

-- =====================================================
-- SET_LISTS POLICIES (Backend only)
-- =====================================================

CREATE POLICY "Users can view their own set_lists"
  ON set_lists FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own set_lists"
  ON set_lists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own set_lists"
  ON set_lists FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own set_lists"
  ON set_lists FOR DELETE
  USING (auth.uid() = user_id);

-- Public can view active setlists for song selection
CREATE POLICY "Anyone can view active set_lists by user_id"
  ON set_lists FOR SELECT
  USING (user_id IS NOT NULL AND is_active = true);

-- =====================================================
-- SET_LIST_SONGS POLICIES (Backend only)
-- =====================================================

CREATE POLICY "Users can view their own set_list_songs"
  ON set_list_songs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own set_list_songs"
  ON set_list_songs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own set_list_songs"
  ON set_list_songs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own set_list_songs"
  ON set_list_songs FOR DELETE
  USING (auth.uid() = user_id);

-- Public can view set_list_songs for active setlists
CREATE POLICY "Anyone can view set_list_songs by user_id"
  ON set_list_songs FOR SELECT
  USING (user_id IS NOT NULL);

-- =====================================================
-- UI_SETTINGS POLICIES
-- =====================================================

CREATE POLICY "Users can view their own ui_settings"
  ON ui_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ui_settings"
  ON ui_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ui_settings"
  ON ui_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- Public can view ui_settings for theming the public page
CREATE POLICY "Anyone can view ui_settings by user_id"
  ON ui_settings FOR SELECT
  USING (user_id IS NOT NULL);

-- =====================================================
-- PART 5: Update stored procedures for multi-tenancy
-- =====================================================

-- Update add_vote function to include owner_id
CREATE OR REPLACE FUNCTION add_vote(p_request_id UUID, p_user_id TEXT, p_owner_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  vote_exists BOOLEAN;
  is_played BOOLEAN;
  actual_owner_id UUID;
BEGIN
  -- Get the owner_id from the request if not provided
  IF p_owner_id IS NULL THEN
    SELECT requests.user_id INTO actual_owner_id
    FROM requests
    WHERE id = p_request_id;
  ELSE
    actual_owner_id := p_owner_id;
  END IF;

  -- Check if request is already played
  SELECT requests.is_played INTO is_played
  FROM requests
  WHERE id = p_request_id;

  -- Don't allow voting on played requests
  IF is_played THEN
    RETURN FALSE;
  END IF;

  -- Check if vote already exists (fast lookup with index)
  SELECT EXISTS(
    SELECT 1 FROM user_votes
    WHERE request_id = p_request_id AND user_id = p_user_id
  ) INTO vote_exists;

  IF vote_exists THEN
    RETURN FALSE; -- Already voted
  END IF;

  -- Insert vote and increment counter atomically
  BEGIN
    INSERT INTO user_votes (request_id, user_id, owner_id, created_at)
    VALUES (p_request_id, p_user_id, actual_owner_id, NOW());

    UPDATE requests
    SET votes = COALESCE(votes, 0) + 1
    WHERE id = p_request_id;

    RETURN TRUE; -- Success
  EXCEPTION WHEN OTHERS THEN
    -- Handle any constraint violations or errors
    RETURN FALSE;
  END;
END;
$$;

-- Update lock_request function to be user-scoped
CREATE OR REPLACE FUNCTION lock_request(request_id UUID, p_user_id UUID DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actual_user_id UUID;
BEGIN
  -- Get user_id from the request if not provided
  IF p_user_id IS NULL THEN
    SELECT requests.user_id INTO actual_user_id
    FROM requests
    WHERE id = request_id;
  ELSE
    actual_user_id := p_user_id;
  END IF;

  -- First unlock all requests FOR THIS USER only
  UPDATE requests
  SET is_locked = false
  WHERE is_locked = true AND user_id = actual_user_id;

  -- Then lock the specified request
  UPDATE requests
  SET is_locked = true
  WHERE id = request_id;
END;
$$;

-- Update unlock_request function
CREATE OR REPLACE FUNCTION unlock_request(request_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Simply unlock the specified request
  UPDATE requests
  SET is_locked = false
  WHERE id = request_id;
END;
$$;

-- =====================================================
-- PART 6: Helper functions for slug-based lookups
-- =====================================================

-- Function to get user_id from slug
CREATE OR REPLACE FUNCTION get_user_id_from_slug(p_slug TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_id UUID;
BEGIN
  SELECT id INTO result_id
  FROM profiles
  WHERE slug = p_slug;

  RETURN result_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION add_vote(UUID, TEXT, UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION lock_request(UUID, UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION unlock_request(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_user_id_from_slug(TEXT) TO authenticated, anon;

-- =====================================================
-- PART 7: Trigger to auto-create profile on user signup
-- =====================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, display_name, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =====================================================
-- PART 8: Analyze tables for query optimization
-- =====================================================

ANALYZE profiles;
ANALYZE songs;
ANALYZE requests;
ANALYZE requesters;
ANALYZE user_votes;
ANALYZE set_lists;
ANALYZE set_list_songs;
ANALYZE ui_settings;
