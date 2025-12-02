/*
  DIAGNOSTIC SCRIPT - Run this to check the current database state

  This will help identify why songs aren't loading for authenticated users.
*/

-- =====================================================
-- STEP 1: Check if user_id column exists in songs table
-- =====================================================
SELECT
  'songs table columns' as check_type,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'songs'
ORDER BY ordinal_position;

-- =====================================================
-- STEP 2: Check total songs and user_id distribution
-- =====================================================
SELECT
  'Song counts by user_id' as check_type,
  COALESCE(user_id::text, 'NULL') as user_id_value,
  COUNT(*) as count
FROM songs
GROUP BY user_id
ORDER BY count DESC;

-- =====================================================
-- STEP 3: Check if backup table exists and has data
-- =====================================================
SELECT
  'Backup table check' as check_type,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'songs_duplicates_backup')
    THEN 'EXISTS'
    ELSE 'DOES NOT EXIST'
  END as backup_table_status;

-- Check backup table count if exists
SELECT
  'Backup table row count' as check_type,
  COUNT(*) as count
FROM songs_duplicates_backup;

-- =====================================================
-- STEP 4: Check RLS policies on songs table
-- =====================================================
SELECT
  'RLS policies on songs' as check_type,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'songs';

-- =====================================================
-- STEP 5: Check if RLS is enabled on songs table
-- =====================================================
SELECT
  'RLS status for songs' as check_type,
  relname as table_name,
  relrowsecurity as rls_enabled,
  relforcerowsecurity as rls_forced
FROM pg_class
WHERE relname = 'songs';

-- =====================================================
-- STEP 6: Check registered users
-- =====================================================
SELECT
  'Registered users' as check_type,
  id,
  email,
  created_at
FROM auth.users
ORDER BY created_at;

-- =====================================================
-- STEP 7: Check set_lists by user_id
-- =====================================================
SELECT
  'Set lists by user_id' as check_type,
  COALESCE(user_id::text, 'NULL') as user_id_value,
  COUNT(*) as count
FROM set_lists
GROUP BY user_id;

-- =====================================================
-- STEP 8: Check if profiles table exists and has data
-- =====================================================
SELECT
  'Profiles check' as check_type,
  id,
  slug,
  display_name
FROM profiles;

-- =====================================================
-- STEP 9: Direct query to see first 5 songs (bypass RLS for admin)
-- =====================================================
SELECT
  'Sample songs' as check_type,
  id,
  title,
  artist,
  user_id
FROM songs
LIMIT 5;

-- =====================================================
-- STEP 10: Test what a specific user would see
-- =====================================================
-- Test for info@fusion-events.ca (6f0e1a4c-dc8e-4b79-ba14-96c3cfb53ff9)
SELECT
  'Songs for info@fusion-events.ca' as check_type,
  COUNT(*) as count
FROM songs
WHERE user_id = '6f0e1a4c-dc8e-4b79-ba14-96c3cfb53ff9';

-- Test for urequestlive@gmail.com (7254d394-9e8a-4701-a39b-7ee56e517213)
SELECT
  'Songs for urequestlive@gmail.com' as check_type,
  COUNT(*) as count
FROM songs
WHERE user_id = '7254d394-9e8a-4701-a39b-7ee56e517213';

-- =====================================================
-- SUMMARY
-- =====================================================
SELECT 'Run the above queries to diagnose the issue' as summary;
