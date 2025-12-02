/*
  Fix RLS Policies

  The profiles table RLS was too restrictive - users couldn't read their own profile
*/

-- =====================================================
-- Fix profiles RLS - Allow authenticated users to read their own profile
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Anyone can view profiles by slug" ON profiles;

-- Create more permissive policies

-- Authenticated users can read their own profile
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Allow reading profiles by slug (for public request pages)
CREATE POLICY "Anyone can view profiles by slug"
  ON profiles FOR SELECT
  TO anon, authenticated
  USING (slug IS NOT NULL);

-- Authenticated users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Authenticated users can insert their own profile
CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- =====================================================
-- Fix songs RLS - ensure authenticated users can access their songs
-- =====================================================

DROP POLICY IF EXISTS "Users can view their own songs" ON songs;
DROP POLICY IF EXISTS "Users can insert their own songs" ON songs;
DROP POLICY IF EXISTS "Users can update their own songs" ON songs;
DROP POLICY IF EXISTS "Users can delete their own songs" ON songs;

-- Authenticated users can see their own songs
CREATE POLICY "Users can view their own songs"
  ON songs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Authenticated users can insert their own songs
CREATE POLICY "Users can insert their own songs"
  ON songs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Authenticated users can update their own songs
CREATE POLICY "Users can update their own songs"
  ON songs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Authenticated users can delete their own songs
CREATE POLICY "Users can delete their own songs"
  ON songs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- =====================================================
-- Fix set_lists RLS
-- =====================================================

DROP POLICY IF EXISTS "Users can view their own set_lists" ON set_lists;
DROP POLICY IF EXISTS "Users can insert their own set_lists" ON set_lists;
DROP POLICY IF EXISTS "Users can update their own set_lists" ON set_lists;
DROP POLICY IF EXISTS "Users can delete their own set_lists" ON set_lists;
DROP POLICY IF EXISTS "Anyone can view active set_lists by user_id" ON set_lists;

CREATE POLICY "Users can view their own set_lists"
  ON set_lists FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own set_lists"
  ON set_lists FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own set_lists"
  ON set_lists FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own set_lists"
  ON set_lists FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Public can view active setlists for song selection
CREATE POLICY "Anyone can view active set_lists by user_id"
  ON set_lists FOR SELECT
  TO anon, authenticated
  USING (user_id IS NOT NULL AND is_active = true);

-- =====================================================
-- Fix set_list_songs RLS
-- =====================================================

DROP POLICY IF EXISTS "Users can view their own set_list_songs" ON set_list_songs;
DROP POLICY IF EXISTS "Users can insert their own set_list_songs" ON set_list_songs;
DROP POLICY IF EXISTS "Users can update their own set_list_songs" ON set_list_songs;
DROP POLICY IF EXISTS "Users can delete their own set_list_songs" ON set_list_songs;
DROP POLICY IF EXISTS "Anyone can view set_list_songs by user_id" ON set_list_songs;

CREATE POLICY "Users can view their own set_list_songs"
  ON set_list_songs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own set_list_songs"
  ON set_list_songs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own set_list_songs"
  ON set_list_songs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own set_list_songs"
  ON set_list_songs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Public can view set_list_songs for active setlists
CREATE POLICY "Anyone can view set_list_songs by user_id"
  ON set_list_songs FOR SELECT
  TO anon, authenticated
  USING (user_id IS NOT NULL);

-- =====================================================
-- Fix requests RLS
-- =====================================================

DROP POLICY IF EXISTS "Users can view their own requests" ON requests;
DROP POLICY IF EXISTS "Users can insert their own requests" ON requests;
DROP POLICY IF EXISTS "Users can update their own requests" ON requests;
DROP POLICY IF EXISTS "Users can delete their own requests" ON requests;
DROP POLICY IF EXISTS "Anyone can view requests by user_id" ON requests;
DROP POLICY IF EXISTS "Anyone can insert requests with user_id" ON requests;

-- Authenticated users can see their own requests
CREATE POLICY "Users can view their own requests"
  ON requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Public can view requests (for public request page)
CREATE POLICY "Anyone can view requests by user_id"
  ON requests FOR SELECT
  TO anon, authenticated
  USING (user_id IS NOT NULL);

-- Anyone can insert requests (public can submit requests)
CREATE POLICY "Anyone can insert requests with user_id"
  ON requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (user_id IS NOT NULL);

-- Only authenticated owners can update their requests
CREATE POLICY "Users can update their own requests"
  ON requests FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Only authenticated owners can delete their requests
CREATE POLICY "Users can delete their own requests"
  ON requests FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- =====================================================
-- Fix ui_settings RLS
-- =====================================================

DROP POLICY IF EXISTS "Users can view their own ui_settings" ON ui_settings;
DROP POLICY IF EXISTS "Users can insert their own ui_settings" ON ui_settings;
DROP POLICY IF EXISTS "Users can update their own ui_settings" ON ui_settings;
DROP POLICY IF EXISTS "Anyone can view ui_settings by user_id" ON ui_settings;

CREATE POLICY "Users can view their own ui_settings"
  ON ui_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ui_settings"
  ON ui_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ui_settings"
  ON ui_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Public can view ui_settings for theming
CREATE POLICY "Anyone can view ui_settings by user_id"
  ON ui_settings FOR SELECT
  TO anon, authenticated
  USING (user_id IS NOT NULL);

-- =====================================================
-- Verification
-- =====================================================

SELECT 'RLS policies updated successfully' as status;
