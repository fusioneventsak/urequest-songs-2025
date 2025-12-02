/*
  CRITICAL FIX - Run this in Supabase SQL Editor

  This fixes all RLS policies to allow authenticated users to access their data.
  The previous RLS policies were blocking access even for authenticated users.
*/

-- =====================================================
-- STEP 1: Fix songs RLS (MOST IMPORTANT)
-- =====================================================

DROP POLICY IF EXISTS "Users can view their own songs" ON songs;
DROP POLICY IF EXISTS "Users can insert their own songs" ON songs;
DROP POLICY IF EXISTS "Users can update their own songs" ON songs;
DROP POLICY IF EXISTS "Users can delete their own songs" ON songs;
DROP POLICY IF EXISTS "Enable read access for all users" ON songs;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON songs;
DROP POLICY IF EXISTS "Enable update for users based on email" ON songs;
DROP POLICY IF EXISTS "Enable delete for users based on email" ON songs;

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
-- STEP 2: Fix set_lists RLS
-- =====================================================

DROP POLICY IF EXISTS "Users can view their own set_lists" ON set_lists;
DROP POLICY IF EXISTS "Users can insert their own set_lists" ON set_lists;
DROP POLICY IF EXISTS "Users can update their own set_lists" ON set_lists;
DROP POLICY IF EXISTS "Users can delete their own set_lists" ON set_lists;
DROP POLICY IF EXISTS "Anyone can view active set_lists by user_id" ON set_lists;
DROP POLICY IF EXISTS "Enable read access for all users" ON set_lists;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON set_lists;
DROP POLICY IF EXISTS "Enable update for users based on email" ON set_lists;
DROP POLICY IF EXISTS "Enable delete for users based on email" ON set_lists;

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
-- STEP 3: Fix set_list_songs RLS
-- =====================================================

DROP POLICY IF EXISTS "Users can view their own set_list_songs" ON set_list_songs;
DROP POLICY IF EXISTS "Users can insert their own set_list_songs" ON set_list_songs;
DROP POLICY IF EXISTS "Users can update their own set_list_songs" ON set_list_songs;
DROP POLICY IF EXISTS "Users can delete their own set_list_songs" ON set_list_songs;
DROP POLICY IF EXISTS "Anyone can view set_list_songs by user_id" ON set_list_songs;
DROP POLICY IF EXISTS "Enable read access for all users" ON set_list_songs;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON set_list_songs;
DROP POLICY IF EXISTS "Enable update for users based on email" ON set_list_songs;
DROP POLICY IF EXISTS "Enable delete for users based on email" ON set_list_songs;

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
-- STEP 4: Fix requests RLS
-- =====================================================

DROP POLICY IF EXISTS "Users can view their own requests" ON requests;
DROP POLICY IF EXISTS "Users can insert their own requests" ON requests;
DROP POLICY IF EXISTS "Users can update their own requests" ON requests;
DROP POLICY IF EXISTS "Users can delete their own requests" ON requests;
DROP POLICY IF EXISTS "Anyone can view requests by user_id" ON requests;
DROP POLICY IF EXISTS "Anyone can insert requests with user_id" ON requests;
DROP POLICY IF EXISTS "Enable read access for all users" ON requests;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON requests;
DROP POLICY IF EXISTS "Enable update for users based on email" ON requests;
DROP POLICY IF EXISTS "Enable delete for users based on email" ON requests;

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
-- STEP 5: Fix ui_settings RLS
-- =====================================================

DROP POLICY IF EXISTS "Users can view their own ui_settings" ON ui_settings;
DROP POLICY IF EXISTS "Users can insert their own ui_settings" ON ui_settings;
DROP POLICY IF EXISTS "Users can update their own ui_settings" ON ui_settings;
DROP POLICY IF EXISTS "Anyone can view ui_settings by user_id" ON ui_settings;
DROP POLICY IF EXISTS "Enable read access for all users" ON ui_settings;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON ui_settings;
DROP POLICY IF EXISTS "Enable update for users based on email" ON ui_settings;

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
-- STEP 6: Verify data has user_id assigned
-- =====================================================

-- Check songs have user_id
SELECT
  'songs' as table_name,
  COUNT(*) as total,
  COUNT(user_id) as with_user_id,
  COUNT(*) - COUNT(user_id) as missing_user_id
FROM songs;

-- Check set_lists have user_id
SELECT
  'set_lists' as table_name,
  COUNT(*) as total,
  COUNT(user_id) as with_user_id,
  COUNT(*) - COUNT(user_id) as missing_user_id
FROM set_lists;

-- =====================================================
-- VERIFICATION
-- =====================================================

SELECT 'RLS policies updated successfully!' as status;
